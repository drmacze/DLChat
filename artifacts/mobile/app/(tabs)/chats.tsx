import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetConversations } from "@workspace/api-client-react";
import ChatListItem from "@/components/chat/ChatListItem";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";

export default function ChatsScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching, error } = useGetConversations({
    query: { queryKey: ["conversations"] },
  });

  // Refresh conversation list on new message from socket
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };
    socket.on("message:new", handler);
    return () => { socket.off("message:new", handler); };
  }, [socket, queryClient]);

  const conversations = data?.conversations ?? [];

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="message-circle" size={48} color={c.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: c.foreground }]}>No conversations yet</Text>
      <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
        Search for a contact and start chatting!
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.empty}>
      <Feather name="alert-circle" size={48} color="#EF4444" />
      <Text style={[styles.emptyTitle, { color: c.foreground }]}>Could not load chats</Text>
      <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
        Check your connection and pull to refresh.
      </Text>
      <TouchableOpacity
        style={[styles.retryBtn, { backgroundColor: c.primary }]}
        onPress={() => refetch()}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.sidebar,
            borderBottomColor: c.border,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 10,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Dlavie Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push("/search")} style={styles.headerBtn}>
            <Feather name="search" size={22} color={c.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/notifications")} style={styles.headerBtn}>
            <Feather name="bell" size={22} color={c.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : error ? (
        renderError()
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
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          contentContainerStyle={
            conversations.length === 0
              ? { flex: 1 }
              : { paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80 }
          }
        />
      )}

      <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 20 }]}>
        <FloatingActionButton onPress={() => router.push("/search")} icon="edit" size={56} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  fab: { position: "absolute", right: 20 },
});
