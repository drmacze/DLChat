import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Platform, Alert, Text, Animated, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { useTheme } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/utils/api";

interface MentionMember {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface MessageInputProps {
  onSend: (text: string, mediaUrl?: string, type?: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
  conversationId?: string;
  members?: MentionMember[];
  replyBar?: React.ReactNode;
}

async function compressImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
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

function getDraftKey(conversationId?: string) {
  return conversationId ? `draft:${conversationId}` : null;
}

export default function MessageInput({
  onSend, onTyping, onStopTyping,
  placeholder = "Pesan...",
  conversationId,
  members = [],
  replyBar,
}: MessageInputProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionMember[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    const key = getDraftKey(conversationId);
    if (!key) return;
    AsyncStorage.getItem(key).then((val) => {
      if (val) setText(val);
    });
  }, [conversationId]);

  const saveDraft = useCallback((val: string) => {
    const key = getDraftKey(conversationId);
    if (!key) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      if (val.trim()) {
        AsyncStorage.setItem(key, val);
      } else {
        AsyncStorage.removeItem(key);
      }
    }, 500);
  }, [conversationId]);

  const clearDraft = useCallback(() => {
    const key = getDraftKey(conversationId);
    if (key) AsyncStorage.removeItem(key);
  }, [conversationId]);

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

  const detectMention = (val: string) => {
    const match = val.match(/@(\w*)$/);
    if (match && members.length > 0) {
      const query = match[1].toLowerCase();
      setMentionQuery(query);
      const filtered = members.filter(
        (m) => m.displayName.toLowerCase().includes(query)
      );
      setMentionSuggestions(filtered.slice(0, 5));
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const handleChangeText = (val: string) => {
    setText(val);
    saveDraft(val);
    detectMention(val);
    if (val.length > 0) {
      onTyping?.();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onStopTyping?.(), 2000);
    } else {
      onStopTyping?.();
    }
  };

  const handleMentionSelect = (member: MentionMember) => {
    const newText = text.replace(/@\w*$/, `@${member.displayName} `);
    setText(newText);
    saveDraft(newText);
    setMentionQuery(null);
    setMentionSuggestions([]);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    setText("");
    clearDraft();
    onStopTyping?.();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setMentionQuery(null);
    setMentionSuggestions([]);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses galeri foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === "video";
    let uri = asset.uri;
    const mimeType = isVideo ? "video/mp4" : "image/jpeg";
    const msgType = isVideo ? "video" : "image";

    setIsUploading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (!isVideo) {
        uri = await compressImage(uri);
      }
      const url = await uploadMedia(uri, mimeType);
      onSend("", url, msgType);
    } catch {
      Alert.alert("Upload gagal", "Tidak dapat mengunggah media.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses kamera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setIsUploading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await compressImage(asset.uri);
      const url = await uploadMedia(uri, "image/jpeg");
      onSend("", url, "image");
    } catch {
      Alert.alert("Upload gagal", "Tidak dapat mengunggah foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    if (Platform.OS === "web") return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Izin diperlukan", "Izinkan akses mikrofon untuk merekam pesan suara.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingSecs(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      recordingTimerRef.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    } catch {
      Alert.alert("Error", "Tidak dapat memulai rekaman.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    const duration = recordingSecs;
    setRecordingSecs(0);

    if (duration < 1) {
      try { await recorder.stop(); } catch {}
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      return;
    }

    try {
      await recorder.stop();
      const uri = recorder.uri;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      if (!uri) return;
      setIsUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const url = await uploadMedia(uri, "audio/m4a");
      onSend("", url, "voice");
    } catch {
      Alert.alert("Error", "Tidak dapat mengirim pesan suara.");
    } finally {
      setIsUploading(false);
    }
  };

  const cancelRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try { await recorder.stop(); } catch {}
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    setIsRecording(false);
    setRecordingSecs(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const canSend = !!text.trim() && !isUploading && !isRecording;

  if (isRecording) {
    return (
      <View style={[styles.container, { backgroundColor: c.sidebar as string, borderTopColor: c.border as string, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={[styles.recordingRow, { backgroundColor: c.surface as string }]}>
          <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecording}>
            <Feather name="x" size={20} color={c.danger as string} />
          </TouchableOpacity>
          <Animated.View style={[styles.recordingDot, { backgroundColor: c.danger as string, transform: [{ scale: pulseAnim }] }]} />
          <Text style={[styles.recordingTimer, { color: c.foreground as string }]}>{formatDuration(recordingSecs)}</Text>
          <Text style={[styles.recordingLabel, { color: c.mutedForeground as string }]}>Merekam...</Text>
          <TouchableOpacity
            onPress={stopRecordingAndSend}
            style={[styles.sendRecordingBtn, { backgroundColor: c.primary as string }]}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.outerContainer, { backgroundColor: c.sidebar as string, borderTopColor: c.border as string, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {mentionSuggestions.length > 0 && (
        <View style={[styles.mentionList, { backgroundColor: c.surface as string, borderColor: c.border as string }]}>
          {mentionSuggestions.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => handleMentionSelect(m)}
              style={[styles.mentionItem, { borderBottomColor: c.border as string }]}
            >
              <View style={[styles.mentionAvatar, { backgroundColor: c.primary as string }]}>
                <Text style={styles.mentionAvatarText}>{m.displayName[0]?.toUpperCase()}</Text>
              </View>
              <Text style={[styles.mentionName, { color: c.foreground as string }]}>@{m.displayName}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {replyBar}

      <View style={styles.container}>
        <View style={[styles.inputRow, { backgroundColor: c.surface as string }]}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handleCamera}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <Feather name="camera" size={20} color={isUploading ? c.primary as string : c.mutedForeground as string} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickImage}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <Feather name={isUploading ? "loader" : "image"} size={20} color={isUploading ? c.primary as string : c.mutedForeground as string} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={[styles.input, { color: c.foreground as string }]}
            placeholder={placeholder}
            placeholderTextColor={c.mutedForeground as string}
            value={text}
            onChangeText={handleChangeText}
            multiline
            maxLength={4000}
            onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
            blurOnSubmit={false}
          />

          {text.trim() ? (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: canSend ? c.primary as string : "transparent" }]}
              onPress={handleSend}
              activeOpacity={0.7}
              disabled={!canSend}
            >
              <Feather name="send" size={18} color={canSend ? "#fff" : c.mutedForeground as string} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: c.surface as string }]}
              onPress={startRecording}
              activeOpacity={0.7}
              disabled={isUploading}
            >
              <Feather name="mic" size={18} color={isUploading ? c.mutedForeground as string : c.primary as string} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  container: { paddingHorizontal: 12, paddingTop: 8 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    borderRadius: 24, paddingLeft: 4, paddingRight: 6, paddingVertical: 6, minHeight: 44,
  },
  attachBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 2 },
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
  mentionList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    marginHorizontal: 12,
    maxHeight: 200,
  },
  mentionItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  mentionAvatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  mentionName: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
