import React, { useState, useRef, useEffect } from "react";
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Platform, Alert, Text, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { useTheme } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/utils/api";

interface MessageInputProps {
  onSend: (text: string, mediaUrl?: string, type?: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
}

async function uploadMedia(uri: string, mimeType: string): Promise<string> {
  const token = await AsyncStorage.getItem("auth_token");
  const folder = mimeType.startsWith("audio") ? "voice" : "message-media";
  const formData = new FormData();
  const filename = uri.split("/").pop() ?? "media";
  (formData as any).append("file", { uri, name: filename, type: mimeType });
  const res = await fetch(`${BASE_URL}/api/upload/${folder}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
}

function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export default function MessageInput({
  onSend, onTyping, onStopTyping, placeholder = "Pesan...",
}: MessageInputProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleChangeText = (val: string) => {
    setText(val);
    if (val.length > 0) {
      onTyping?.();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onStopTyping?.(), 2000);
    } else {
      onStopTyping?.();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText("");
    onStopTyping?.();
    if (typingTimer.current) clearTimeout(typingTimer.current);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses galeri foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === "video";
    const mimeType = isVideo ? "video/mp4" : "image/jpeg";
    const msgType = isVideo ? "video" : "image";
    setIsUploading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const url = await uploadMedia(asset.uri, mimeType);
      onSend("", url, msgType);
    } catch {
      Alert.alert("Upload gagal", "Tidak dapat mengunggah media.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Izin diperlukan", "Izinkan akses mikrofon untuk merekam pesan suara.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingSecs(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      recordingTimerRef.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    } catch {
      Alert.alert("Error", "Tidak dapat memulai rekaman.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recordingRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    const duration = recordingSecs;
    setRecordingSecs(0);

    if (duration < 1) {
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      return;
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (!uri) return;
      setIsUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const url = await uploadMedia(uri, "audio/m4a");
      onSend("", url, "voice");
    } catch {
      Alert.alert("Error", "Tidak dapat mengirim pesan suara.");
    } finally {
      setIsUploading(false);
      recordingRef.current = null;
    }
  };

  const cancelRecording = async () => {
    if (!recordingRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch {}
    recordingRef.current = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    setIsRecording(false);
    setRecordingSecs(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const canSend = !!text.trim() && !isUploading && !isRecording;

  if (isRecording) {
    return (
      <View style={[styles.container, { backgroundColor: c.sidebar, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={[styles.recordingRow, { backgroundColor: c.surface }]}>
          <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecording}>
            <Feather name="x" size={20} color={c.danger} />
          </TouchableOpacity>
          <Animated.View style={[styles.recordingDot, { backgroundColor: c.danger, transform: [{ scale: pulseAnim }] }]} />
          <Text style={[styles.recordingTimer, { color: c.foreground }]}>{formatDuration(recordingSecs)}</Text>
          <Text style={[styles.recordingLabel, { color: c.mutedForeground }]}>Merekam...</Text>
          <TouchableOpacity
            onPress={stopRecordingAndSend}
            style={[styles.sendRecordingBtn, { backgroundColor: c.primary }]}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.sidebar, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[styles.inputRow, { backgroundColor: c.surface }]}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={handlePickImage}
          disabled={isUploading}
          activeOpacity={0.7}
        >
          <Feather name={isUploading ? "loader" : "image"} size={20} color={isUploading ? c.primary : c.mutedForeground} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { color: c.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={c.mutedForeground}
          value={text}
          onChangeText={handleChangeText}
          multiline
          maxLength={4000}
          onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
          blurOnSubmit={false}
        />

        {text.trim() ? (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: canSend ? c.primary : "transparent" }]}
            onPress={handleSend}
            activeOpacity={0.7}
            disabled={!canSend}
          >
            <Feather name="send" size={18} color={canSend ? "#fff" : c.mutedForeground} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: c.surface }]}
            onPress={startRecording}
            activeOpacity={0.7}
            disabled={isUploading}
          >
            <Feather name="mic" size={18} color={isUploading ? c.mutedForeground : c.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 8 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    borderRadius: 24, paddingLeft: 8, paddingRight: 6, paddingVertical: 6, minHeight: 44,
  },
  attachBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 4 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120, paddingTop: 4, paddingBottom: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  recordingRow: {
    flexDirection: "row", alignItems: "center", borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, gap: 10,
  },
  cancelRecording: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  recordingTimer: { fontSize: 15, fontFamily: "Inter_700Bold", minWidth: 40 },
  recordingLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  sendRecordingBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
