import React from "react";
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
import { useGetContacts } from "@workspace/api-client-react";
import Avatar from "@/components/common/Avatar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import colors from "@/constants/colors";

export default function ContactsScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useGetContacts({ query: { queryKey: ["contacts"] } });
  const contacts = data?.contacts ?? [];

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
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Contacts</Text>
        <TouchableOpacity onPress={() => router.push("/search")} style={styles.headerBtn}>
          <Feather name="user-plus" size={22} color={c.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={c.primary} size="large" /></View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.contact, { borderBottomColor: c.border }]}
              onPress={() => router.push(`/profile/${item.user.id}`)}
              activeOpacity={0.7}
            >
              <Avatar uri={item.user.avatarUrl} name={item.customName ?? item.user.displayName} size={48} isOnline={item.user.isOnline} />
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: c.foreground }]}>
                  {item.customName ?? item.user.displayName}
                </Text>
                {item.user.username && (
                  <Text style={[styles.contactHandle, { color: c.mutedForeground }]}>@{item.user.username}</Text>
                )}
              </View>
              {item.isFavorite && <Feather name="star" size={16} color="#FFD700" />}
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => router.push("/search")}
              >
                <Feather name="message-circle" size={20} color={c.primary} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={48} color={c.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No contacts yet</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>Search for users to add them</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />}
          contentContainerStyle={contacts.length === 0 ? { flex: 1 } : { paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80 }}
        />
      )}

      <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 20 }]}>
        <FloatingActionButton onPress={() => router.push("/search")} icon="user-plus" size={56} />
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
  headerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  contact: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  contactHandle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  chatBtn: { padding: 6 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  fab: { position: "absolute", right: 20 },
});
