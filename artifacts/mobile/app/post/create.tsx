import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Image, Platform, ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

export default function CreatePostScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses galeri untuk memilih foto.");
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

  const removeImage = () => setImageUri(null);

  const handlePost = async () => {
    if (!token) return;
    if (!content.trim() && !imageUri) {
      Alert.alert("Kosong", "Tulis sesuatu atau tambahkan foto.");
      return;
    }
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split("/").pop() ?? "post.jpg";
        (formData as any).append("file", { uri: imageUri, name: filename, type: "image/jpeg" });
        const uploadRes = await fetch(`${BASE_URL}/api/upload/post-media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Upload gagal");
        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
      }
      const res = await fetch(`${BASE_URL}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: content.trim() || undefined,
          mediaUrl: mediaUrl ?? undefined,
          visibility: "public",
        }),
      });
      if (!res.ok) throw new Error("Post gagal");
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      router.back();
    } catch {
      Alert.alert("Gagal", "Tidak dapat memposting. Coba lagi.");
    } finally {
      setPosting(false);
    }
  };

  const canPost = (content.trim().length > 0 || !!imageUri) && !posting;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomColor: c.border,
            backgroundColor: c.surface,
            paddingTop: Platform.OS === "web" ? 20 : insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: c.background }]}
        >
          <Feather name="x" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Buat Post</Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost}
          style={[
            styles.postBtn,
            { backgroundColor: canPost ? c.primary : c.border },
          ]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={[styles.input, { color: c.foreground }]}
          placeholder="Apa yang ingin kamu bagikan? ✨"
          placeholderTextColor={c.mutedForeground}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={2000}
          autoFocus
        />

        {content.length > 1800 && (
          <Text style={[styles.charCount, { color: content.length >= 2000 ? c.danger : c.mutedForeground }]}>
            {content.length}/2000
          </Text>
        )}

        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity style={styles.removeImage} onPress={removeImage}>
              <Feather name="x" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.toolbar,
          {
            borderTopColor: c.border,
            backgroundColor: c.surface,
            paddingBottom: Platform.OS === "web" ? 12 : insets.bottom + 8,
          },
        ]}
      >
        <TouchableOpacity style={styles.toolbarBtn} onPress={pickImage}>
          <View style={[styles.toolbarIcon, { backgroundColor: c.primary + "18" }]}>
            <Feather name="image" size={20} color={c.primary} />
          </View>
          <Text style={[styles.toolbarLabel, { color: c.mutedForeground }]}>Foto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarBtn} onPress={pickImage}>
          <View style={[styles.toolbarIcon, { backgroundColor: c.accent + "18" }]}>
            <Feather name="camera" size={20} color={c.accent} />
          </View>
          <Text style={[styles.toolbarLabel, { color: c.mutedForeground }]}>Kamera</Text>
        </TouchableOpacity>

        <View style={[styles.visibilityBadge, { backgroundColor: c.background, borderColor: c.border }]}>
          <Feather name="globe" size={13} color={c.mutedForeground} />
          <Text style={[styles.visibilityText, { color: c.mutedForeground }]}>Publik</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold",
  },
  postBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, minWidth: 60, alignItems: "center",
  },
  postBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  body: { padding: 16, gap: 12, minHeight: 200 },
  input: {
    fontSize: 18, fontFamily: "Inter_400Regular",
    lineHeight: 26, minHeight: 120,
  },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  imageContainer: { borderRadius: 16, overflow: "hidden", position: "relative" },
  imagePreview: { width: "100%", height: 260, borderRadius: 16 },
  removeImage: {
    position: "absolute", top: 10, right: 10,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 16,
    width: 30, height: 30, alignItems: "center", justifyContent: "center",
  },
  toolbar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 10, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: { alignItems: "center", gap: 3 },
  toolbarIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  toolbarLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  visibilityBadge: {
    marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  visibilityText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
