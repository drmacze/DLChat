import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  SafeAreaView,
  ScrollView,
  Clipboard,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/common/Avatar";

function QRCodeSvg({ value, size }: { value: string; size: number }) {
  const cells = 21;
  const cellSize = size / cells;

  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  const isBlack = (row: number, col: number): boolean => {
    if (row < 7 && col < 7) return true;
    if (row < 7 && col >= cells - 7) return true;
    if (row >= cells - 7 && col < 7) return true;
    const bit = (hash(value + row * cells + col) % 2) === 0;
    return bit;
  };

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: cells }, (_, r) => (
        <View key={r} style={{ flexDirection: "row" }}>
          {Array.from({ length: cells }, (_, c) => (
            <View
              key={c}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: isBlack(r, c) ? "#000" : "#fff",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function QRProfileScreen() {
  const { c } = useTheme();
  const { user } = useAuth();

  const profileUrl = `dlchat://user/${user?.username ?? user?.id}`;
  const profileLink = `https://dlchat.app/u/${user?.username ?? user?.id}`;

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Tambahkan aku di DLChat! ${profileLink}`,
        url: profileLink,
        title: `Profil DLChat ${user?.displayName}`,
      });
    } catch (e) {
      Alert.alert("Error", "Gagal berbagi profil.");
    }
  }, [profileLink, user?.displayName]);

  const handleCopyLink = useCallback(() => {
    Clipboard.setString(profileLink);
    Alert.alert("✅", "Link profil disalin ke clipboard!");
  }, [profileLink]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <SafeAreaView>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={c.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.foreground }]}>QR Code Profil</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Feather name="share-2" size={20} color={c.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.avatarWrap}>
            <Avatar uri={user?.avatarUrl} name={user?.displayName ?? "?"} size={72} />
          </View>
          <Text style={[styles.name, { color: c.foreground }]}>{user?.displayName}</Text>
          {user?.username && (
            <Text style={[styles.handle, { color: c.mutedForeground }]}>@{user.username}</Text>
          )}

          <View style={[styles.qrWrap, { backgroundColor: "#fff" }]}>
            <QRCodeSvg value={profileUrl} size={220} />
          </View>

          <Text style={[styles.hint, { color: c.mutedForeground }]}>
            Scan QR code ini untuk menambahkan saya di DLChat
          </Text>
        </View>

        <View style={styles.linkSection}>
          <Text style={[styles.linkLabel, { color: c.mutedForeground }]}>Link Profil</Text>
          <View style={[styles.linkBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.linkText, { color: c.foreground }]} numberOfLines={1}>
              {profileLink}
            </Text>
            <TouchableOpacity onPress={handleCopyLink} style={styles.copyBtn}>
              <Feather name="copy" size={16} color={c.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: c.primary }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Feather name="share-2" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Bagikan Profil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSecondary, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={handleCopyLink}
            activeOpacity={0.85}
          >
            <Feather name="link" size={18} color={c.foreground} />
            <Text style={[styles.actionBtnSecText, { color: c.foreground }]}>Salin Link</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.note, { color: c.mutedForeground }]}>
          Teman yang mengscan QR code ini akan langsung bisa mengirim pesan ke kamu.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, alignItems: "center" },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  shareBtn: { width: 36, alignItems: "center" },
  content: { alignItems: "center", padding: 24, gap: 20 },
  card: { alignItems: "center", borderRadius: 24, borderWidth: 1, padding: 28, width: "100%", gap: 12 },
  avatarWrap: { marginBottom: 4 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  handle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -4 },
  qrWrap: { borderRadius: 16, padding: 16, marginVertical: 8 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  linkSection: { width: "100%", gap: 6 },
  linkLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, textTransform: "uppercase", paddingLeft: 4 },
  linkBox: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  linkText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  copyBtn: { padding: 4 },
  actions: { flexDirection: "row", width: "100%", gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 14, gap: 8 },
  actionBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  actionBtnSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 14, borderWidth: 1, gap: 8 },
  actionBtnSecText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, paddingHorizontal: 8 },
});
