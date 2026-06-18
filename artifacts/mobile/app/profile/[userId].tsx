import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGetUserById, useCreateDirectConversation, useAddContact, useBlockUser } from "@workspace/api-client-react";
import Avatar from "@/components/common/Avatar";
import colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function UserProfileScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: user, isLoading } = useGetUserById(userId!, { query: { queryKey: ["user", userId] } });
  const createDirect = useCreateDirectConversation();
  const addContact = useAddContact();
  const blockUser = useBlockUser();

  const handleMessage = () => {
    if (!userId) return;
    createDirect.mutate(
      { data: { targetUserId: userId } },
      { onSuccess: (data: unknown) => router.push(`/chat/${(data as { id: string }).id}`) }
    );
  };

  const handleAddContact = () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addContact.mutate({ data: { userId } as unknown as Parameters<typeof addContact.mutate>[0]["data"] });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!user) return null;

  return (
    <ScrollView
      style={{ backgroundColor: c.background, flex: 1 }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 20 }}
    >
      <LinearGradient
        colors={["#2AABEE30", "transparent"]}
        style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}
      >
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { paddingHorizontal: 16, paddingVertical: 8 }]}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={90} isOnline={user.isOnline} />
          <Text style={[styles.name, { color: c.foreground }]}>{user.displayName}</Text>
          {user.username && (
            <Text style={[styles.handle, { color: c.mutedForeground }]}>@{user.username}</Text>
          )}
          {user.bio && (
            <Text style={[styles.bio, { color: c.mutedForeground }]}>{user.bio}</Text>
          )}
          <Text style={[styles.status, { color: user.isOnline ? c.online : c.mutedForeground }]}>
            {user.isOnline ? "Online" : user.lastSeenAt ? `Last seen ${new Date(user.lastSeenAt).toLocaleDateString()}` : "Offline"}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: c.primary }]}
          onPress={handleMessage}
          activeOpacity={0.8}
        >
          <Feather name="message-circle" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={handleAddContact}
          activeOpacity={0.8}
        >
          <Feather name="user-plus" size={18} color={c.foreground} />
          <Text style={[styles.actionBtnSecondaryText, { color: c.foreground }]}>Add Contact</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {},
  heroContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24, paddingTop: 10 },
  name: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", marginTop: 12, marginBottom: 2 },
  handle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 4 },
  bio: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  status: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8 },
  actions: { flexDirection: "row", paddingHorizontal: 16, marginTop: 16, gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 14, gap: 8 },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  actionBtnSecondary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 14, borderWidth: 1, gap: 8 },
  actionBtnSecondaryText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
