import React, { useState } from "react";
import {
  View, Text, Modal, TextInput, TouchableOpacity,
  StyleSheet, Pressable, ScrollView, Switch, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

interface CreatePollModalProps {
  visible: boolean;
  conversationId: string;
  onClose: () => void;
  onCreated: (pollId: string) => void;
}

export default function CreatePollModal({ visible, conversationId, onClose, onCreated }: CreatePollModalProps) {
  const { c } = useTheme();
  const { token } = useAuth();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultiple, setIsMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  };

  const handleCreate = async () => {
    const q = question.trim();
    if (!q) return Alert.alert("Error", "Pertanyaan tidak boleh kosong.");
    const validOpts = options.map((o) => o.trim()).filter(Boolean);
    if (validOpts.length < 2) return Alert.alert("Error", "Tambahkan minimal 2 pilihan.");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/polls`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, question: q, options: validOpts, isMultiple, isAnonymous }),
      });
      const data = await res.json() as { id?: string; error?: string };
      if (data.id) {
        onCreated(data.id);
        setQuestion("");
        setOptions(["", ""]);
        setIsMultiple(false);
        setIsAnonymous(false);
        onClose();
      } else {
        Alert.alert("Error", data.error ?? "Gagal membuat polling.");
      }
    } catch {
      Alert.alert("Error", "Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.background, borderColor: c.border }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: c.border }]} />
          <View style={[styles.titleRow]}>
            <Text style={[styles.title, { color: c.foreground }]}>📊 Buat Polling</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: c.mutedForeground }]}>PERTANYAAN</Text>
            <TextInput
              style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.surface }]}
              placeholder="Tulis pertanyaanmu..."
              placeholderTextColor={c.mutedForeground}
              value={question}
              onChangeText={setQuestion}
              maxLength={200}
              multiline
            />

            <Text style={[styles.label, { color: c.mutedForeground }]}>PILIHAN ({options.length}/10)</Text>
            {options.map((opt, idx) => (
              <View key={idx} style={styles.optRow}>
                <TextInput
                  style={[styles.input, { flex: 1, color: c.foreground, borderColor: c.border, backgroundColor: c.surface }]}
                  placeholder={`Pilihan ${idx + 1}`}
                  placeholderTextColor={c.mutedForeground}
                  value={opt}
                  onChangeText={(v) => updateOption(idx, v)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(idx)} style={styles.removeBtn}>
                    <Feather name="trash-2" size={16} color={c.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {options.length < 10 && (
              <TouchableOpacity style={[styles.addBtn, { borderColor: c.border }]} onPress={addOption}>
                <Feather name="plus" size={16} color={c.primary} />
                <Text style={[styles.addBtnText, { color: c.primary }]}>Tambah Pilihan</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.toggleRow, { borderColor: c.border }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: c.foreground }]}>Pilihan Ganda</Text>
                <Text style={[styles.toggleSub, { color: c.mutedForeground }]}>Boleh pilih lebih dari satu</Text>
              </View>
              <Switch value={isMultiple} onValueChange={setIsMultiple} thumbColor={isMultiple ? c.primary : c.mutedForeground} trackColor={{ false: c.border, true: `${c.primary}60` }} />
            </View>
            <View style={[styles.toggleRow, { borderColor: c.border }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: c.foreground }]}>Anonim</Text>
                <Text style={[styles.toggleSub, { color: c.mutedForeground }]}>Sembunyikan nama pemilih</Text>
              </View>
              <Switch value={isAnonymous} onValueChange={setIsAnonymous} thumbColor={isAnonymous ? c.primary : c.mutedForeground} trackColor={{ false: c.border, true: `${c.primary}60` }} />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: loading ? c.mutedForeground : c.primary }]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Feather name="bar-chart-2" size={18} color="#fff" />
            <Text style={styles.createBtnText}>{loading ? "Membuat..." : "Buat Polling"}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 20, paddingBottom: 36, maxHeight: "85%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 8 },
  optRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 0 },
  removeBtn: { padding: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, borderStyle: "dashed", paddingVertical: 12, justifyContent: "center", marginTop: 4 },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  toggleLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 15, marginTop: 20 },
  createBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
