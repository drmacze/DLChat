import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

interface StarredMessage {
  id: string;
  content?: string | null;
  type: string;
  mediaUrl?: string | null;
  createdAt: string;
  conversationId: string;
  sender: { id: string; displayName: string };
  starredAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function StarredMessagesScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [messages, setMessages] = useState<StarredMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStarred = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/messages/starred`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      if (!isRefresh) Alert.alert("Error", "Tidak dapat memuat pesan berbintang.");
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStarred(); }, [fetchStarred]);

  const handleUnstar = async (messageId: string) => {
    if (!token) return;
    try {
      await fetch(`${BASE_URL}/api/messages/${messageId}/star`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      Alert.alert("Gagal", "Tidak dapat menghapus bintang.");
    }
  };

  const getContentPreview = (msg: StarredMessage): string => {
    if (msg.type === "voice" || msg.type === "audio") return "🎤 Pesan suara";
    if (msg.type === "image") return "🖼️ Foto";
    if (msg.type === "video") return "🎥 Video";
    return msg.content ?? "Pesan";
  };

  const getTypeIcon = (type: string): string => {
    if (type === "voice" || type === "audio") return "mic";
    if (type === "image") return "image";
    if (type === "video") return "video";
    return "message-square";
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={c.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.foreground }]}>Pesan Berbintang</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: Platform.OS === "web" ? 60 : insets.top }]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.foreground }]}>Pesan Berbintang</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={messages.length === 0 ? { flex: 1 } : { paddingVertical: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchStarred(true)} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="star" size={56} color={c.border} />
            <Text style={[styles.emptyTitle, { color: c.foreground }]}>Belum ada pesan berbintang</Text>
            <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
              Tahan pesan mana saja lalu ketuk ⭐ untuk menyimpannya di sini.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { backgroundColor: c.surface, borderBottomColor: c.border }]}
            onPress={() => router.push(`/chat/${item.conversationId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${c.primary}20` }]}>
              <Feather name={getTypeIcon(item.type) as any} size={20} color={c.primary} />
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemHeader}>
                <Text style={[styles.senderName, { color: c.foreground }]} numberOfLines={1}>
                  {item.sender.displayName}
                </Text>
                <Text style={[styles.dateText, { color: c.mutedForeground }]}>{formatDate(item.starredAt)}</Text>
              </View>
              <Text style={[styles.messagePreview, { color: c.mutedForeground }]} numberOfLines={2}>
                {getContentPreview(item)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => Alert.alert("Hapus Bintang", "Hapus bintang dari pesan ini?", [
                { text: "Batal", style: "cancel" },
                { text: "Hapus", style: "destructive", onPress: () => handleUnstar(item.id) },
              ])}
              style={styles.unstarBtn}
            >
              <Feather name="star" size={18} color="#FFD700" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  item: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  itemContent: { flex: 1, gap: 3 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  senderName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", flex: 1 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  messagePreview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 17 },
  unstarBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
