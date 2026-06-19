import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, FlatList, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Animated, Easing, Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Search, Bell, MessageSquareDashed, Archive } from "lucide-react-native";
import { Feather } from "@expo/vector-icons";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useGetConversations } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ChatListItem from "@/components/chat/ChatListItem";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import StreakBadge from "@/components/common/StreakBadge";
import TutorialOverlay from "@/components/common/TutorialOverlay";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { BASE_URL } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";

function EmptyChatsIllustration({ primary, muted }: { primary: string; muted: string }) {
  return (
    <Svg width={120} height={100} viewBox="0 0 120 100" fill="none">
      <Ellipse cx="60" cy="90" rx="38" ry="6" fill={muted} opacity={0.18} />
      <Path
        d="M18 20C18 14.477 22.477 10 28 10H92C97.523 10 102 14.477 102 20V62C102 67.523 97.523 72 92 72H68L58 84L48 72H28C22.477 72 18 67.523 18 62V20Z"
        fill={primary} opacity={0.1}
      />
      <Path
        d="M22 18C22 12.477 26.477 8 32 8H88C93.523 8 98 12.477 98 18V58C98 63.523 93.523 68 88 68H66L57 80L48 68H32C26.477 68 22 63.523 22 58V18Z"
        fill={primary} opacity={0.18}
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
        Animated.timing(shimmer, { toValue: 1, duration: 850, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-110, 200] });
  return (
    <View style={styles.logoWrap}>
      <Text style={[styles.headerTitle, { color }]}>DLChat</Text>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]} pointerEvents="none">
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.30)", "rgba(255,255,255,0.12)", "transparent"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ width: 72, height: "100%" }}
        />
      </Animated.View>
    </View>
  );
}

async function getToken() {
  return AsyncStorage.getItem("auth_token");
}

async function apiCall(path: string, method = "POST", body?: object) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const LABEL_FILTERS = [
  { id: "all", label: "Semua" },
  { id: "unread", label: "Belum Dibaca" },
  { id: "personal", label: "Pribadi" },
  { id: "work", label: "Kerja" },
  { id: "family", label: "Keluarga" },
];

async function getConvLabel(convId: string): Promise<string | null> {
  return AsyncStorage.getItem(`conv_label:${convId}`);
}
async function setConvLabel(convId: string, label: string | null) {
  if (label) {
    await AsyncStorage.setItem(`conv_label:${convId}`, label);
  } else {
    await AsyncStorage.removeItem(`conv_label:${convId}`);
  }
}

export default function ChatsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [convLabels, setConvLabels] = useState<Record<string, string>>({});

  const { data, isLoading, refetch, isRefetching, error } = useGetConversations({
    query: { queryKey: ["conversations", showArchived], enabled: !!token },
  });

  const { data: archivedData, refetch: refetchArchived, isRefetching: isRefetchingArchived } = useQuery({
    queryKey: ["conversations", "archived"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/conversations?archived=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && showArchived,
  });

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

  const allConvs = showArchived
    ? (archivedData?.conversations ?? [])
    : (data?.conversations ?? []);

  useEffect(() => {
    if (allConvs.length === 0) return;
    Promise.all(allConvs.map((c: any) => getConvLabel(c.id).then((label) => ({ id: c.id as string, label }))))
      .then((results) => {
        const map: Record<string, string> = {};
        results.forEach(({ id, label }: { id: string; label: string | null }) => { if (label) map[id] = label; });
        setConvLabels(map);
      });
  }, [allConvs.length]);

  const displayedConvs = allConvs.filter((conv: any) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return conv.unreadCount > 0;
    return convLabels[conv.id] === activeFilter;
  });

  const handleLabelConv = useCallback((convId: string) => {
    Alert.alert("Beri Label", "Pilih label untuk percakapan ini:", [
      { text: "Pribadi", onPress: () => { setConvLabel(convId, "personal"); setConvLabels((prev) => ({ ...prev, [convId]: "personal" })); } },
      { text: "Kerja", onPress: () => { setConvLabel(convId, "work"); setConvLabels((prev) => ({ ...prev, [convId]: "work" })); } },
      { text: "Keluarga", onPress: () => { setConvLabel(convId, "family"); setConvLabels((prev) => ({ ...prev, [convId]: "family" })); } },
      { text: "Hapus Label", onPress: () => { setConvLabel(convId, null); setConvLabels((prev) => { const n = { ...prev }; delete n[convId]; return n; }); } },
      { text: "Batal", style: "cancel" },
    ]);
  }, []);

  const handleArchive = useCallback(async (convId: string, currentlyArchived: boolean) => {
    try {
      await apiCall(`/conversations/${convId}/archive`);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", "archived"] });
    } catch {
      Alert.alert("Error", "Tidak dapat mengarsipkan percakapan.");
    }
  }, [queryClient]);

  const handleMute = useCallback(async (convId: string, currentlyMuted: boolean) => {
    if (currentlyMuted) {
      await apiCall(`/conversations/${convId}/mute`, "POST", { durationMinutes: 0 });
    } else {
      Alert.alert("Bisukan percakapan", "Pilih durasi:", [
        { text: "1 jam", onPress: () => apiCall(`/conversations/${convId}/mute`, "POST", { durationMinutes: 60 }) },
        { text: "8 jam", onPress: () => apiCall(`/conversations/${convId}/mute`, "POST", { durationMinutes: 480 }) },
        { text: "1 minggu", onPress: () => apiCall(`/conversations/${convId}/mute`, "POST", { durationMinutes: 10080 }) },
        { text: "Selalu", onPress: () => apiCall(`/conversations/${convId}/mute`, "POST", { durationMinutes: -1 }) },
        { text: "Batal", style: "cancel" },
      ]);
    }
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }), 500);
  }, [queryClient]);

  const doRefetch = showArchived ? refetchArchived : refetch;
  const isRefetchingAny = showArchived ? isRefetchingArchived : isRefetching;

  return (
    <View style={[styles.container, { backgroundColor: c.background as string }]}>
      <View style={[styles.header, {
        borderBottomColor: c.border as string,
        paddingTop: Platform.OS === "web" ? 67 : insets.top + 10,
        backgroundColor: c.headerBg as string,
      }]}>
        <View style={styles.headerLeft}>
          <ShinyLogo color={c.foreground as string} />
          {streakData?.currentStreak > 0 && <StreakBadge streak={streakData.currentStreak} size="sm" />}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowArchived((v) => !v)}
            style={[styles.headerBtn, {
              backgroundColor: showArchived ? c.primary as string : c.glass as string,
              borderColor: showArchived ? c.primary as string : c.glassBorder as string,
            }]}
          >
            <Archive size={18} color={showArchived ? "#fff" : c.mutedForeground as string} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={[styles.headerBtn, { backgroundColor: c.glass as string, borderColor: c.glassBorder as string }]}
          >
            <Search size={18} color={c.mutedForeground as string} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              try {
                await fetch(`${BASE_URL}/api/conversations/read-all`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                });
                queryClient.invalidateQueries({ queryKey: ["conversations"] });
              } catch { /* silent */ }
            }}
            style={[styles.headerBtn, { backgroundColor: c.glass as string, borderColor: c.glassBorder as string }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="check-square" size={18} color={c.mutedForeground as string} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={[styles.headerBtn, { backgroundColor: c.glass as string, borderColor: c.glassBorder as string }]}
          >
            <Bell size={18} color={c.mutedForeground as string} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {showArchived && (
        <View style={[styles.archivedBanner, { backgroundColor: c.primary as string }]}>
          <Archive size={14} color="#fff" strokeWidth={2} />
          <Text style={styles.archivedBannerText}>Percakapan Diarsipkan</Text>
          <TouchableOpacity onPress={() => setShowArchived(false)}>
            <Text style={styles.archivedBannerClose}>Kembali</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showArchived && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterRow, { borderBottomColor: c.border as string }]}
        >
          {LABEL_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              onPress={() => setActiveFilter(f.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f.id ? c.primary as string : c.surface as string,
                  borderColor: activeFilter === f.id ? c.primary as string : c.border as string,
                },
              ]}
            >
              <Text style={[
                styles.filterChipText,
                { color: activeFilter === f.id ? "#fff" : c.mutedForeground as string },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading && !showArchived ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.primary as string} size="large" />
        </View>
      ) : error && !showArchived ? (
        <View style={styles.empty}>
          <EmptyChatsIllustration primary={c.danger as string} muted={c.mutedForeground as string} />
          <Text style={[styles.emptyTitle, { color: c.foreground as string }]}>Tidak dapat memuat chat</Text>
          <Text style={[styles.emptySubtitle, { color: c.mutedForeground as string }]}>Tarik ke bawah untuk memuat ulang</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: c.primary as string }]} onPress={() => refetch()}>
            <Text style={styles.retryText}>Coba lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedConvs}
          keyExtractor={(item) => item.id}
          decelerationRate="normal"
          renderItem={({ item, index }) => (
            <Reanimated.View entering={FadeInDown.delay(index * 48).springify().damping(18)}>
              <ChatListItem
                {...item}
                type={item.type as "direct" | "group" | "channel"}
                onPress={() => router.push(`/chat/${item.id}`)}
                onArchive={() => handleArchive(item.id, !!item.isArchived)}
                onMute={() => handleMute(item.id, !!item.isMuted)}
              />
            </Reanimated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyChatsIllustration primary={c.primary as string} muted={c.mutedForeground as string} />
              <Text style={[styles.emptyTitle, { color: c.foreground as string }]}>
                {showArchived ? "Tidak ada chat diarsipkan" : "Belum ada percakapan"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground as string }]}>
                {showArchived ? "Geser chat ke kiri untuk mengarsipkan" : "Cari kontak dan mulai ngobrol"}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingAny}
              onRefresh={doRefetch}
              tintColor={c.primary as string}
              colors={[c.primary as string]}
            />
          }
          contentContainerStyle={
            displayedConvs.length === 0
              ? { flex: 1 }
              : { paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80 }
          }
        />
      )}

      {!showArchived && (
        <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 65 }]}>
          <FloatingActionButton
            onPress={() => setShowFabMenu((v) => !v)}
            icon={showFabMenu ? "x" : "edit-2"}
            size={56}
          />
          {showFabMenu && (
            <View style={[fabMenuStyles.menu, { backgroundColor: c.surface, borderColor: c.border }]}>
              <TouchableOpacity style={fabMenuStyles.item} onPress={() => { setShowFabMenu(false); router.push("/search"); }}>
                <View style={[fabMenuStyles.icon, { backgroundColor: c.primary + "22" }]}>
                  <Feather name="message-circle" size={18} color={c.primary} />
                </View>
                <Text style={[fabMenuStyles.label, { color: c.foreground }]}>Chat Baru</Text>
              </TouchableOpacity>
              <TouchableOpacity style={fabMenuStyles.item} onPress={() => { setShowFabMenu(false); router.push("/new-group" as any); }}>
                <View style={[fabMenuStyles.icon, { backgroundColor: "#8b5cf6" + "22" }]}>
                  <Feather name="users" size={18} color="#8b5cf6" />
                </View>
                <Text style={[fabMenuStyles.label, { color: c.foreground }]}>Buat Grup / Channel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TutorialOverlay
        tutorialKey="chats"
        steps={[
          { icon: "message-circle", title: "Percakapanmu", description: "Semua chat ada di sini. Ketuk untuk membuka." },
          { icon: "archive", title: "Arsipkan Chat", description: "Geser chat ke kiri untuk mengarsipkan atau membisukan." },
          { icon: "users", title: "AI Friends", description: "Kunjungi Kontak untuk chat dengan AI — selalu online!" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoWrap: { overflow: "hidden", position: "relative" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderRadius: 11, borderWidth: StyleSheet.hairlineWidth,
  },
  archivedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  archivedBannerText: { flex: 1, color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
  archivedBannerClose: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", opacity: 0.85 },
  filterRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 21 },
  retryBtn: { marginTop: 10, paddingHorizontal: 26, paddingVertical: 11, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "600", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  fab: { position: "absolute", right: 20 },
});

const fabMenuStyles = StyleSheet.create({
  menu: {
    position: "absolute", bottom: 66, right: 0,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8, minWidth: 200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 10,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
