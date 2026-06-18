import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import colors from "@/constants/colors";

export default function NotificationsScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useGetNotifications({}, { query: { queryKey: ["notifications"] } });
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = data?.notifications ?? [];

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.sidebar,
            borderBottomColor: c.border,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.foreground }]}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
          <Text style={[styles.markAllText, { color: c.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={c.primary} size="large" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.notif,
                {
                  borderBottomColor: c.border,
                  backgroundColor: item.isRead ? "transparent" : c.surface,
                },
              ]}
            >
              <View style={[styles.notifDot, { backgroundColor: item.isRead ? "transparent" : c.primary }]} />
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: c.foreground }]}>{item.title}</Text>
                <Text style={[styles.notifBody, { color: c.mutedForeground }]}>{item.body}</Text>
                <Text style={[styles.notifTime, { color: c.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bell" size={48} color={c.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No notifications</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  markAllBtn: { padding: 6 },
  markAllText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  notif: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  notifBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  notifTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
