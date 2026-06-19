import React, { useCallback, useEffect, useRef } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Animated, Easing,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Search, Bell, MessageSquareDashed } from "lucide-react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
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
import { BASE_URL } from "@/utils/api";
import Svg, { Path, Circle, Ellipse, G } from "react-native-svg";

function EmptyChatsIllustration({ primary, muted }: { primary: string; muted: string }) {
  return (
    <Svg width={120} height={100} viewBox="0 0 120 100" fill="none">
      <Ellipse cx="60" cy="90" rx="38" ry="6" fill={muted} opacity={0.18} />
      <Path
        d="M18 20C18 14.477 22.477 10 28 10H92C97.523 10 102 14.477 102 20V62C102 67.523 97.523 72 92 72H68L58 84L48 72H28C22.477 72 18 67.523 18 62V20Z"
        fill={primary}
        opacity={0.1}
      />
      <Path
        d="M22 18C22 12.477 26.477 8 32 8H88C93.523 8 98 12.477 98 18V58C98 63.523 93.523 68 88 68H66L57 80L48 68H32C26.477 68 22 63.523 22 58V18Z"
        fill={primary}
        opacity={0.18}
      />
      <Circle cx="42" cy="38" r="5" fill={primary} opacity={0.5} />
      <Circle cx="57" cy="38" r="5" fill={primary} opacity={0.7} />
      <Circle cx="72" cy="38" r="5" fill={primary} opacity={0.5} />
    </Svg>
  );
}

function ShinyLogo({ color }: { color: string }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3200),
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 850,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 200],
  });

  return (
    <View style={styles.logoWrap}>
      <Text style={[styles.headerTitle, { color }]}>DLChat</Text>
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.30)", "rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: 72, height: "100%" }}
        />
      </Animated.View>
    </View>
  );
}

export default function ChatsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching, error } = useGetConversations({
    query: { queryKey: ["conversations"], enabled: !!token },
  });

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      <View
        style={[
          styles.header,
          {
            borderBottomColor: c.border,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 10,
            backgroundColor: c.headerBg,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <ShinyLogo color={c.foreground} />
          {streakData?.currentStreak > 0 && (
            <StreakBadge streak={streakData.currentStreak} size="sm" />
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
          >
            <Search size={18} color={c.mutedForeground} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
          >
            <Bell size={18} color={c.mutedForeground} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <EmptyChatsIllustration primary={c.danger} muted={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>Could not load chats</Text>
          <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
            Pull to refresh or check your connection
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: c.primary }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          decelerationRate="normal"
          renderItem={({ item, index }) => (
            <Reanimated.View entering={FadeInDown.delay(index * 48).springify().damping(18)}>
              <ChatListItem
                {...item}
                type={item.type as "direct" | "group" | "channel"}
                onPress={() => router.push(`/chat/${item.id}`)}
              />
            </Reanimated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyChatsIllustration primary={c.primary} muted={c.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
                Search for a contact and start chatting
              </Text>
            </View>
          }
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

      <TutorialOverlay
        tutorialKey="chats"
        steps={[
          { icon: "message-circle", title: "Your Conversations", description: "All your chats appear here. Tap any to open." },
          { icon: "edit", title: "Start a Chat", description: "Tap the compose button to search contacts and start chatting." },
          { icon: "users", title: "AI Friends", description: "Visit Contacts to chat with AI friends — always online!" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoWrap: {
    overflow: "hidden",
    position: "relative",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 26,
    paddingVertical: 11,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  fab: { position: "absolute", right: 20 },
});
