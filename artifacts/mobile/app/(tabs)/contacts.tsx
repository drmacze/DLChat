import React, { useState } from "react";
import { View, Text, FlatList, SectionList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGetContacts } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/common/Avatar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import TutorialOverlay from "@/components/common/TutorialOverlay";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { RobotIcon, StarIcon, PeopleIcon, GlobeIcon } from "@/components/common/SvgIcons";

import { BASE_URL } from "@/utils/api";

const MOOD_EMOJI: Record<string, string> = {
  happy: "😄", chill: "😎", playful: "🤪", flirty: "😏", sad: "🥺", excited: "🔥", tired: "😪", sarcastic: "🙃",
};
const COUNTRY_FLAG: Record<string, string> = {
  id: "🇮🇩", us: "🇺🇸", sg: "🇸🇬", jp: "🇯🇵", in: "🇮🇳", br: "🇧🇷", de: "🇩🇪", uk: "🇬🇧",
};

interface AIPersona { id: string; name: string; country: string; gender: string; age: number; avatarEmoji: string; mood: string; personality: string; }

export default function ContactsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGetContacts({ query: { queryKey: ["contacts"], enabled: !!token } });

  const { data: aiData, isLoading: aiLoading, refetch: aiRefetch } = useQuery({
    queryKey: ["ai-contacts"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/ai/contacts`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  const contacts = data?.contacts ?? [];
  const aiContacts: AIPersona[] = aiData?.contacts ?? [];

  const AIContactCard = ({ item }: { item: AIPersona }) => (
    <TouchableOpacity
      style={[styles.aiCard, { backgroundColor: c.surface, borderColor: c.glassBorder }]}
      onPress={() => router.push(`/ai-chat/${item.id}`)}
      activeOpacity={0.75}
    >
      <LinearGradient colors={c.aiGradient} style={styles.aiAvatarBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={{ fontSize: 22 }}>{item.avatarEmoji}</Text>
      </LinearGradient>
      <Text style={[styles.aiName, { color: c.foreground }]} numberOfLines={1}>{item.name}</Text>
      <View style={styles.aiMeta}>
        {COUNTRY_FLAG[item.country] ? (
          <Text style={{ fontSize: 12 }}>{COUNTRY_FLAG[item.country]}</Text>
        ) : (
          <GlobeIcon size={14} />
        )}
        <Text style={{ fontSize: 12 }}>{MOOD_EMOJI[item.mood] ?? "😊"}</Text>
      </View>
      <Text style={[styles.aiAge, { color: c.mutedForeground }]}>{item.age}y</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Contacts</Text>
        <TouchableOpacity onPress={() => router.push("/search")} style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
          <Feather name="user-plus" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* AI Friends Section */}
            <View style={styles.sectionHeader}>
              <LinearGradient colors={c.aiGradient} style={styles.sectionIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <RobotIcon size={16} />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: c.foreground }]}>AI Friends</Text>
              <Text style={[styles.sectionSub, { color: c.mutedForeground }]}>Always online</Text>
            </View>
            {aiLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                horizontal
                data={aiContacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AIContactCard item={item} />}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={[styles.aiEmpty, { color: c.mutedForeground }]}>Belum ada AI friends</Text>
                }
              />
            )}

            {/* Real Contacts Section Header */}
            {contacts.length > 0 && (
              <View style={[styles.realContactsHeader, { borderTopColor: c.border }]}>
                <Feather name="users" size={16} color={c.mutedForeground} />
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>My Contacts</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.contact, { borderBottomColor: c.border }]}
            onPress={() => router.push(`/profile/${item.user.id}`)}
            activeOpacity={0.7}
          >
            <Avatar uri={item.user.avatarUrl} name={item.customName ?? item.user.displayName} size={50} isOnline={item.user.isOnline} />
            <View style={styles.contactInfo}>
              <Text style={[styles.contactName, { color: c.foreground }]}>{item.customName ?? item.user.displayName}</Text>
              {item.user.username && <Text style={[styles.contactHandle, { color: c.mutedForeground }]}>@{item.user.username}</Text>}
            </View>
            {item.isFavorite && <StarIcon size={18} />}
            <TouchableOpacity style={[styles.chatBtn, { backgroundColor: c.primary + "18", borderRadius: 20 }]} onPress={() => router.push("/search")}>
              <Feather name="message-circle" size={18} color={c.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          contacts.length === 0 ? (
            <View style={styles.empty}>
              <PeopleIcon size={52} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No contacts yet</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>Search for users to add as contacts</Text>
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isRefetching || aiLoading} onRefresh={() => { refetch(); aiRefetch(); }} tintColor={c.primary} />}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 20 }]}>
        <FloatingActionButton onPress={() => router.push("/search")} icon="user-plus" size={56} />
      </View>

      <TutorialOverlay
        tutorialKey="contacts"
        steps={[
          { icon: "cpu", title: "AI Friends", description: "These AI friends are always online! Chat with them anytime — they have unique personalities and moods." },
          { icon: "users", title: "Real Contacts", description: "Your added contacts appear below the AI friends section." },
          { icon: "user-plus", title: "Add Contacts", description: "Tap the + button or FAB to search for and add real users." },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, gap: 10 },
  sectionIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1 },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aiCard: { width: 90, borderRadius: 16, padding: 12, alignItems: "center", gap: 6, borderWidth: 1 },
  aiAvatarBg: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  aiName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "center" },
  aiMeta: { flexDirection: "row", gap: 4 },
  aiAge: { fontSize: 11, fontFamily: "Inter_400Regular" },
  aiEmpty: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  realContactsHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  contact: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  contactHandle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  chatBtn: { padding: 8 },
  empty: { alignItems: "center", paddingTop: 40, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  fab: { position: "absolute", right: 20 },
});
