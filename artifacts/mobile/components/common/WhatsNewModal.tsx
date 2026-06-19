import React, { useEffect, useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, Pressable, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { BASE_URL } from "@/utils/api";

interface PatchNote {
  id: string;
  version: string;
  title: string;
  content: string;
  is_major: boolean;
  created_at: string;
}

const STORAGE_KEY = "dlchat_last_seen_patch_note";

export function useWhatsNew() {
  const [note, setNote] = useState<PatchNote | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`${BASE_URL}/api/patch-notes/latest`);
        if (!res.ok) return;
        const latest = await res.json() as PatchNote | null;
        if (!latest) return;
        const lastSeen = await AsyncStorage.getItem(STORAGE_KEY);
        if (lastSeen !== latest.id) {
          setNote(latest);
          setVisible(true);
        }
      } catch { }
    }
    const timer = setTimeout(check, 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = async () => {
    if (note) await AsyncStorage.setItem(STORAGE_KEY, note.id);
    setVisible(false);
  };

  return { note, visible, dismiss };
}

interface WhatsNewModalProps {
  note: PatchNote | null;
  visible: boolean;
  onDismiss: () => void;
}

export default function WhatsNewModal({ note, visible, onDismiss }: WhatsNewModalProps) {
  const { c } = useTheme();
  if (!note) return null;

  const lines = note.content.split("\n").filter(Boolean);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={[styles.card, { backgroundColor: c.background, borderColor: c.border }]} onPress={() => {}}>
          <View style={[styles.badge, note.is_major ? styles.badgeMajor : styles.badgeMinor]}>
            <Text style={styles.badgeText}>{note.is_major ? "🚀 Major Release" : "✨ Update"}</Text>
          </View>

          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: c.mutedForeground }]}>VERSI</Text>
            <Text style={[styles.version, { color: c.primary }]}>v{note.version}</Text>
          </View>

          <Text style={[styles.title, { color: c.foreground }]}>{note.title}</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {lines.map((line, i) => {
              const clean = line.replace(/^[•\-]\s*/, "");
              return (
                <View key={i} style={styles.lineRow}>
                  <Text style={[styles.bullet, { color: c.primary }]}>●</Text>
                  <Text style={[styles.lineText, { color: c.foreground }]}>{clean}</Text>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.primary }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>Tutup & Mulai Pakai 🎉</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    maxHeight: "80%",
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  badgeMajor: { backgroundColor: "rgba(108,99,255,0.2)" },
  badgeMinor: { backgroundColor: "rgba(0,217,255,0.15)" },
  badgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#a395ff" },
  versionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  versionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  version: { fontSize: 18, fontFamily: "Inter_700Bold" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28, marginBottom: 16 },
  scroll: { maxHeight: 200, marginBottom: 20 },
  lineRow: { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" },
  bullet: { fontSize: 10, marginTop: 5 },
  lineText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
