import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import colors from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface MessageInputProps {
  onSend: (text: string, mediaUrl?: string, type?: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  placeholder?: string;
}

async function uploadMedia(uri: string, mimeType: string): Promise<string> {
  const token = await AsyncStorage.getItem("auth_token");
  const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  const formData = new FormData();
  const filename = uri.split("/").pop() ?? "media";
  (formData as any).append("file", { uri, name: filename, type: mimeType });

  const res = await fetch(`${BASE_URL}/api/upload/message-media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url;
}

export default function MessageInput({ onSend, onTyping, onStopTyping, placeholder = "Message..." }: MessageInputProps) {
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      Alert.alert("Permission needed", "Please allow access to your photo library.");
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
      Alert.alert("Upload failed", "Could not upload the media. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const canSend = !!text.trim() && !isUploading;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.sidebar,
          borderTopColor: c.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
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

        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: canSend ? c.primary : "transparent" }]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!canSend}
        >
          <Feather name="send" size={18} color={canSend ? "#fff" : c.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 44,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
