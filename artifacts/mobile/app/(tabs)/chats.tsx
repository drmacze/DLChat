import React, { useCallback, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGetConversations } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import ChatListItem from "@/components/chat/ChatListItem";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import StreakBadge from "@/components/common/StreakBadge";
import TutorialOverlay from "@/components/common/TutorialOverlay";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function ChatsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching, error } = useGetConversations({ query: { queryKey: ["conversations"] } });

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/streak`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (!socket) return;
    const handler = () => queryClient.invalidateQueries({ queryKey: ["conversations"] });
    socket.on("message:new", handler);
    return () => { socket.off("message:new", handler); };
  }, [socket, queryClient]);

  const conversations = data?.conversations ?? [];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}>
        <LinearGradient colors={[c.background, c.background]} style={StyleSheet.absoluteFill} />
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: c.foreground }]}>DLChat</Text>
          {streakData?.currentStreak > 0 && (
            <StreakBadge streak={streakData.currentStreak} size="sm" />
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push("/search")} style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
            <Feather name="search" size={20} color={c.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/notifications")} style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
            <Feather name="bell" size={20} color={c.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={c.primary} size="large" /></View>
      ) : error ? (
        <View style={styles.empty}>
          <Feather name="alert-circle" size={48} color={c.danger} />
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>Could not load chats</Text>
          <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>Pull to refresh or check connection</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: c.primary }]} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              {...item}
              type={item.type as "direct" | "group" | "channel"}
              onPress={() => router.push(`/chat/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>💬</Text>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>Search for a contact and start chatting!</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} colors={[c.primary]} />}
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : { paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80 }}
        />
      )}

      <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 20 }]}>
        <FloatingActionButton onPress={() => router.push("/search")} icon="edit" size={56} />
      </View>

      <TutorialOverlay
        tutorialKey="chats"
        steps={[
          { icon: "message-circle", title: "Your Conversations", description: "All your chats appear here. Tap any to open." },
          { icon: "edit", title: "Start a Chat", description: "Tap the blue button to search for contacts and start chatting." },
          { icon: "users", title: "AI Friends", description: "Visit Contacts tab to chat with your AI friends — they're always online!" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  fab: { position: "absolute", right: 20 },
});
