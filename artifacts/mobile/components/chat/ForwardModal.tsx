import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  FlatList, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/common/Avatar";
import { BASE_URL } from "@/utils/api";

interface ForwardModalProps {
  visible: boolean;
  messageId: string | null;
  onClose: () => void;
  onForwarded?: () => void;
}

interface Conversation {
  id: string;
  type: string;
  title: string | null;
  displayName: string;
  avatarUrl?: string | null;
}

export default function ForwardModal({ visible, messageId, onClose, onForwarded }: ForwardModalProps) {
  const { c } = useTheme();
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !token) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, token]);

  const handleForward = async (targetConversationId: string) => {
    if (!messageId || !token) return;
    setForwarding(targetConversationId);
    try {
      const res = await fetch(`${BASE_URL}/api/messages/${messageId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetConversationId }),
      });
      if (!res.ok) throw new Error("Forward failed");
      onForwarded?.();
      onClose();
    } catch {
      Alert.alert("Gagal", "Tidak dapat meneruskan pesan.");
    } finally {
      setForwarding(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: c.background, borderColor: c.border }]}>
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Text style={[styles.title, { color: c.foreground }]}>Teruskan Pesan</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ padding: 24 }} />
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, { borderBottomColor: c.border }]}
                  onPress={() => handleForward(item.id)}
                  activeOpacity={0.7}
                  disabled={!!forwarding}
                >
                  <Avatar uri={item.avatarUrl} name={item.displayName ?? item.title ?? "?"} size={44} />
                  <Text style={[styles.itemName, { color: c.foreground }]} numberOfLines={1}>
                    {item.displayName ?? item.title ?? "Group"}
                  </Text>
                  {forwarding === item.id ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : (
                    <Feather name="corner-up-right" size={18} color={c.mutedForeground} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: c.mutedForeground }]}>Tidak ada percakapan</Text>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  container: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: StyleSheet.hairlineWidth, maxHeight: "60%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  item: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  itemName: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  empty: { textAlign: "center", padding: 24, fontFamily: "Inter_400Regular" },
});
