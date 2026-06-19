import React, { useState } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Pressable, Alert, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

interface Option {
  label: string;
  sublabel: string;
  value: number;
  emoji: string;
}

const OPTIONS: Option[] = [
  { label: "Nonaktif", sublabel: "Pesan disimpan selamanya", value: 0, emoji: "🔓" },
  { label: "1 Jam", sublabel: "Hapus setelah 1 jam", value: 3600, emoji: "⏱" },
  { label: "24 Jam", sublabel: "Hapus setelah 1 hari", value: 86400, emoji: "🌅" },
  { label: "7 Hari", sublabel: "Hapus setelah 1 minggu", value: 604800, emoji: "📅" },
  { label: "30 Hari", sublabel: "Hapus setelah 1 bulan", value: 2592000, emoji: "🗓" },
  { label: "90 Hari", sublabel: "Hapus setelah 3 bulan", value: 7776000, emoji: "📆" },
];

interface DisappearTimerModalProps {
  visible: boolean;
  conversationId: string;
  currentTimer: number;
  onClose: () => void;
  onUpdated: (newTimer: number) => void;
}

export default function DisappearTimerModal({
  visible, conversationId, currentTimer, onClose, onUpdated,
}: DisappearTimerModalProps) {
  const { c } = useTheme();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(currentTimer);

  const handleSelect = async (value: number) => {
    setSelected(value);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/conversations/${conversationId}/disappear`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ timer: value }),
      });
      if (res.ok) {
        onUpdated(value);
        onClose();
      } else {
        Alert.alert("Error", "Gagal mengubah pengaturan.");
        setSelected(currentTimer);
      }
    } catch {
      Alert.alert("Error", "Gagal terhubung ke server.");
      setSelected(currentTimer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.background, borderColor: c.border }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <View style={styles.titleRow}>
            <Feather name="clock" size={22} color={c.primary} />
            <Text style={[styles.title, { color: c.foreground }]}>Pesan Menghilang</Text>
          </View>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Setelah waktu yang dipilih, pesan baru akan otomatis dihapus dari percakapan ini.
          </Text>

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={[styles.loadingText, { color: c.mutedForeground }]}>Menyimpan...</Text>
            </View>
          )}

          {OPTIONS.map((opt) => {
            const isActive = opt.value === selected;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, isActive && { backgroundColor: `${c.primary}15`, borderColor: c.primary }, { borderColor: c.border }]}
                onPress={() => handleSelect(opt.value)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optLabel, { color: c.foreground }]}>{opt.label}</Text>
                  <Text style={[styles.optSub, { color: c.mutedForeground }]}>{opt.sublabel}</Text>
                </View>
                {isActive && <Feather name="check-circle" size={20} color={c.primary} />}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 20, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 20 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  emoji: { fontSize: 22, width: 30, textAlign: "center" },
  optLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  optSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
