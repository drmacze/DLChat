import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, Image, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

const BG_COLORS = [
  "#1a1a2e", "#16213e", "#0f3460", "#533483",
  "#e94560", "#f5a623", "#2ecc71", "#3498db",
];

export default function StoryCreateScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [tab, setTab] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses galeri.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!token) return;
    if (tab === "text" && !text.trim()) {
      Alert.alert("Kosong", "Tulis sesuatu untuk story kamu!");
      return;
    }
    if (tab === "image" && !imageUri) {
      Alert.alert("Pilih gambar", "Pilih gambar untuk story kamu!");
      return;
    }
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      if (tab === "image" && imageUri) {
        const formData = new FormData();
        const filename = imageUri.split("/").pop() ?? "story.jpg";
        (formData as any).append("file", { uri: imageUri, name: filename, type: "image/jpeg" });
        const uploadRes = await fetch(`${BASE_URL}/api/upload/story-media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
      }
      const body = tab === "text"
        ? { type: "text", content: text.trim(), backgroundColor: bgColor }
        : { type: "image", mediaUrl };
      const res = await fetch(`${BASE_URL}/api/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Post failed");
      Alert.alert("Berhasil!", "Story kamu sudah diposting 🎉");
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat memposting story.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.foreground }]}>Buat Story</Text>
        <TouchableOpacity
          style={[styles.postBtn, { backgroundColor: posting ? c.surface : c.primary }]}
          onPress={handlePost}
          disabled={posting}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {(["text", "image"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && [styles.tabActive, { borderBottomColor: c.primary }]]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? c.primary : c.mutedForeground }]}>
              {t === "text" ? "📝 Teks" : "🖼️ Foto"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {tab === "text" ? (
          <>
            <View style={[styles.preview, { backgroundColor: bgColor }]}>
              <Text style={[styles.previewText, !text && styles.previewPlaceholder]}>
                {text || "Tulis sesuatu..."}
              </Text>
            </View>
            <TextInput
              style={[styles.textInput, { color: c.foreground, backgroundColor: c.surface, borderColor: c.border }]}
              placeholder="Cerita apa hari ini? ✨"
              placeholderTextColor={c.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={300}
            />
            <Text style={[styles.charCount, { color: c.mutedForeground }]}>{text.length}/300</Text>
            <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>Pilih Warna</Text>
            <View style={styles.colorGrid}>
              {BG_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, bgColor === color && styles.colorBtnActive]}
                  onPress={() => setBgColor(color)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity style={styles.changeImageBtn} onPress={pickImage}>
                  <Feather name="refresh-cw" size={16} color="#fff" />
                  <Text style={styles.changeImageText}>Ganti Foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.imagePicker, { borderColor: c.border, backgroundColor: c.surface }]}
                onPress={pickImage}
              >
                <Feather name="image" size={48} color={c.mutedForeground} />
                <Text style={[styles.imagePickerText, { color: c.mutedForeground }]}>Ketuk untuk pilih foto</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 56, alignItems: "center" },
  postBtnText: { color: "#fff", fontWeight: "700", fontFamily: "Inter_700Bold", fontSize: 14 },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: {},
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 16 },
  preview: { borderRadius: 16, height: 200, alignItems: "center", justifyContent: "center", padding: 20 },
  previewText: { color: "#fff", fontSize: 20, fontWeight: "600", textAlign: "center", fontFamily: "Inter_600SemiBold" },
  previewPlaceholder: { opacity: 0.5, fontStyle: "italic" },
  textInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular", minHeight: 80 },
  charCount: { textAlign: "right", fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: -8 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorBtn: { width: 44, height: 44, borderRadius: 22 },
  colorBtnActive: { borderWidth: 3, borderColor: "#fff" },
  imagePreviewContainer: { position: "relative", borderRadius: 16, overflow: "hidden" },
  imagePreview: { width: "100%", height: 300, borderRadius: 16 },
  changeImageBtn: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  changeImageText: { color: "#fff", fontSize: 13, fontFamily: "Inter_400Regular" },
  imagePicker: { height: 250, borderWidth: 2, borderStyle: "dashed", borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 12 },
  imagePickerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
