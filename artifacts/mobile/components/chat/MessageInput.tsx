import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  Platform, Alert, Text, Animated, FlatList, Modal, Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { useTheme } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/utils/api";
import CreatePollModal from "./CreatePollModal";

interface MentionMember {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface MessageInputProps {
  onSend: (text: string, mediaUrl?: string, type?: string, extra?: { scheduleAt?: string; isViewOnce?: boolean }) => void;
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
  const folder = mimeType.startsWith("audio") ? "voice" : mimeType.startsWith("application") ? "files" : "message-media";
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

function ScheduleModal({
  visible,
  onClose,
  onSchedule,
}: {
  visible: boolean;
  onClose: () => void;
  onSchedule: (iso: string) => void;
}) {
  const { c } = useTheme();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const options = [
    { label: "5 menit lagi", minutes: 5 },
    { label: "30 menit lagi", minutes: 30 },
    { label: "1 jam lagi", minutes: 60 },
    { label: "3 jam lagi", minutes: 180 },
    { label: "Besok pagi (08:00)", minutes: null, customFn: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }},
    { label: "Besok siang (12:00)", minutes: null, customFn: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(12, 0, 0, 0);
      return d.toISOString();
    }},
    { label: "Besok malam (20:00)", minutes: null, customFn: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(20, 0, 0, 0);
      return d.toISOString();
    }},
  ];

  const handleSelect = (idx: number) => {
    const opt = options[idx];
    let iso: string;
    if (opt.customFn) {
      iso = opt.customFn();
    } else {
      const d = new Date(Date.now() + (opt.minutes! * 60 * 1000));
      iso = d.toISOString();
    }
    onSchedule(iso);
    onClose();
    setSelectedOption(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={[modalStyles.container, { backgroundColor: c.surface as string, borderColor: c.border as string }]}>
          <Text style={[modalStyles.title, { color: c.foreground as string }]}>Jadwalkan Pesan</Text>
          <Text style={[modalStyles.subtitle, { color: c.mutedForeground as string }]}>Pilih waktu pengiriman:</Text>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[modalStyles.option, { borderColor: c.border as string, backgroundColor: selectedOption === idx ? (c.primary as string) + "22" : "transparent" }]}
              onPress={() => handleSelect(idx)}
              activeOpacity={0.7}
            >
              <Feather name="clock" size={16} color={c.primary as string} />
              <Text style={[modalStyles.optionText, { color: c.foreground as string }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[modalStyles.cancelBtn, { borderColor: c.border as string }]} onPress={onClose}>
            <Text style={[modalStyles.cancelText, { color: c.mutedForeground as string }]}>Batal</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
  const [showPollModal, setShowPollModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionMember[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldRecording = useRef(false);

  const recordingRef = React.useRef<Audio.Recording | null>(null);

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

  const handleSend = (scheduleAt?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed, undefined, "text", scheduleAt ? { scheduleAt } : undefined);
    setText("");
    clearDraft();
    onStopTyping?.();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    setMentionQuery(null);
    setMentionSuggestions([]);
    setIsViewOnce(false);
  };

  const handleScheduleSend = (iso: string) => {
    handleSend(iso);
  };

  const handlePickImage = async () => {
    setShowAttachMenu(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses galeri foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 1,
      allowsEditing: false,
      allowsMultipleSelection: false,
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
      onSend("", url, msgType, isViewOnce ? { isViewOnce: true } : undefined);
      setIsViewOnce(false);
    } catch {
      Alert.alert("Upload gagal", "Tidak dapat mengunggah media.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCamera = async () => {
    setShowAttachMenu(false);
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
      onSend("", url, "image", isViewOnce ? { isViewOnce: true } : undefined);
      setIsViewOnce(false);
    } catch {
      Alert.alert("Upload gagal", "Tidak dapat mengunggah foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickDocument = async () => {
    setShowAttachMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const url = await uploadMedia(asset.uri, asset.mimeType ?? "application/octet-stream");
      onSend(asset.name ?? "File", url, "file");
    } catch {
      Alert.alert("Upload gagal", "Tidak dapat mengunggah file.");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    if (Platform.OS === "web") return;
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Izin diperlukan", "Izinkan akses mikrofon untuk merekam pesan suara.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
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
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    const duration = recordingSecs;
    setRecordingSecs(0);
    const recording = recordingRef.current;
    recordingRef.current = null;

    if (duration < 1) {
      try { await recording?.stopAndUnloadAsync(); } catch {}
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      return;
    }

    try {
      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
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
    const recording = recordingRef.current;
    recordingRef.current = null;
    try { await recording?.stopAndUnloadAsync(); } catch {}
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
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
          <Text style={[styles.recordingLabel, { color: c.mutedForeground as string }]}>Merekam... geser ke kiri untuk batal</Text>
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

      {conversationId && (
        <CreatePollModal
          visible={showPollModal}
          conversationId={conversationId}
          onClose={() => setShowPollModal(false)}
          onCreated={(_pollId: string) => { setShowPollModal(false); }}
        />
      )}

      <ScheduleModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleScheduleSend}
      />

      {/* Attach menu popup */}
      {showAttachMenu && (
        <View style={[styles.attachMenu, { backgroundColor: c.surface as string, borderColor: c.border as string }]}>
          <TouchableOpacity style={styles.attachMenuItem} onPress={handleCamera} activeOpacity={0.7}>
            <View style={[styles.attachMenuIcon, { backgroundColor: "#2196F3" }]}>
              <Feather name="camera" size={18} color="#fff" />
            </View>
            <Text style={[styles.attachMenuLabel, { color: c.foreground as string }]}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickImage} activeOpacity={0.7}>
            <View style={[styles.attachMenuIcon, { backgroundColor: "#9C27B0" }]}>
              <Feather name="image" size={18} color="#fff" />
            </View>
            <Text style={[styles.attachMenuLabel, { color: c.foreground as string }]}>Galeri</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachMenuItem} onPress={handlePickDocument} activeOpacity={0.7}>
            <View style={[styles.attachMenuIcon, { backgroundColor: "#FF9800" }]}>
              <Feather name="file" size={18} color="#fff" />
            </View>
            <Text style={[styles.attachMenuLabel, { color: c.foreground as string }]}>File</Text>
          </TouchableOpacity>
          {conversationId && (
            <TouchableOpacity style={styles.attachMenuItem} onPress={() => { setShowAttachMenu(false); setShowPollModal(true); }} activeOpacity={0.7}>
              <View style={[styles.attachMenuIcon, { backgroundColor: "#4CAF50" }]}>
                <Feather name="bar-chart-2" size={18} color="#fff" />
              </View>
              <Text style={[styles.attachMenuLabel, { color: c.foreground as string }]}>Polling</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.attachMenuItem}
            onPress={() => { setShowAttachMenu(false); setIsViewOnce(!isViewOnce); }}
            activeOpacity={0.7}
          >
            <View style={[styles.attachMenuIcon, { backgroundColor: isViewOnce ? (c.danger as string) : "#607D8B" }]}>
              <Feather name="eye-off" size={18} color="#fff" />
            </View>
            <Text style={[styles.attachMenuLabel, { color: c.foreground as string }]}>
              {isViewOnce ? "View Once: ON" : "View Once"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        {isViewOnce && (
          <View style={[styles.viewOnceBadge, { backgroundColor: (c.danger as string) + "22", borderColor: c.danger as string }]}>
            <Feather name="eye-off" size={12} color={c.danger as string} />
            <Text style={[styles.viewOnceText, { color: c.danger as string }]}>View Once aktif — media hanya bisa dilihat sekali</Text>
            <TouchableOpacity onPress={() => setIsViewOnce(false)}>
              <Feather name="x" size={14} color={c.danger as string} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputRow, { backgroundColor: c.surface as string }]}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setShowAttachMenu((v) => !v)}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <Feather
              name={showAttachMenu ? "x" : "plus"}
              size={20}
              color={showAttachMenu ? (c.primary as string) : isUploading ? c.primary as string : c.mutedForeground as string}
            />
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
            onSubmitEditing={Platform.OS === "web" ? () => handleSend() : undefined}
            blurOnSubmit={false}
          />

          {text.trim() ? (
            <TouchableOpacity
              style={[styles.scheduleBtn]}
              onPress={() => setShowScheduleModal(true)}
              activeOpacity={0.7}
              disabled={!canSend}
            >
              <Feather name="clock" size={16} color={canSend ? c.mutedForeground as string : "transparent"} />
            </TouchableOpacity>
          ) : null}

          {text.trim() ? (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: canSend ? c.primary as string : "transparent" }]}
              onPress={() => handleSend()}
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24,
  },
  container: {
    width: "100%", borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden",
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center", paddingTop: 20, paddingHorizontal: 20 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingBottom: 12, paddingHorizontal: 20 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  cancelBtn: {
    alignItems: "center", paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  outerContainer: { borderTopWidth: StyleSheet.hairlineWidth },
  container: { paddingHorizontal: 12, paddingTop: 8 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    borderRadius: 24, paddingLeft: 4, paddingRight: 6, paddingVertical: 6, minHeight: 44,
  },
  attachBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 2 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120, paddingTop: 4, paddingBottom: 4 },
  scheduleBtn: { width: 28, height: 36, alignItems: "center", justifyContent: "center", marginLeft: 2 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  recordingRow: {
    flexDirection: "row", alignItems: "center", borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, gap: 8,
  },
  cancelRecording: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  recordingTimer: { fontSize: 15, fontFamily: "Inter_700Bold", minWidth: 40 },
  recordingLabel: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
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
  attachMenu: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    marginHorizontal: 12, marginBottom: 8, padding: 12,
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  attachMenuItem: { alignItems: "center", gap: 6, width: 60 },
  attachMenuIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  attachMenuLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  viewOnceBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, marginBottom: 6,
  },
  viewOnceText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
});
