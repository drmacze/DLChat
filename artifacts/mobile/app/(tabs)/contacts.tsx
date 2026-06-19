import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, TextInput, Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserPlus, MessageCircle, Bot, Users } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useGetContacts } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/common/Avatar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import TutorialOverlay from "@/components/common/TutorialOverlay";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { StarIcon, PeopleIcon, GlobeIcon } from "@/components/common/SvgIcons";
import Svg, { Circle } from "react-native-svg";
import { BASE_URL } from "@/utils/api";

const MOOD_COLORS: Record<string, readonly [string, string]> = {
  happy:     ["#F5BC60", "#E09030"],
  chill:     ["#3AADA6", "#2A8880"],
  playful:   ["#F08050", "#D85830"],
  flirty:    ["#E080A8", "#C05888"],
  sad:       ["#7C79F0", "#5654C0"],
  excited:   ["#E07838", "#C05820"],
  tired:     ["#888884", "#606060"],
  sarcastic: ["#A880E0", "#8060C0"],
};

const COUNTRY_LABEL: Record<string, string> = {
  id: "ID", us: "US", sg: "SG", jp: "JP",
  in: "IN", br: "BR", de: "DE", uk: "UK",
};

const PERSONALITY_COLOR: Record<string, string> = {
  bubbly: "#E080A8", chill: "#3AADA6", mysterious: "#A880E0",
  nerdy: "#7C79F0", sporty: "#3CB87A", artsy: "#E09030",
  romantic: "#E06080", adventurous: "#E07838", witty: "#8480EC", empathetic: "#3AADA6",
};

interface AIPersona {
  id: string; name: string; country: string; gender: string;
  age: number; avatarEmoji: string; mood: string; personality: string;
}

function MoodDot({ mood, size = 8 }: { mood: string; size?: number }) {
  const cols = MOOD_COLORS[mood] ?? MOOD_COLORS.happy;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={cols[0]} />
    </Svg>
  );
}

type SortMode = "az" | "online" | "recent";

export default function ContactsScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const { data, isLoading, refetch, isRefetching } = useGetContacts({
    query: { queryKey: ["contacts"], enabled: !!token },
  });

  const { data: aiData, isLoading: aiLoading, refetch: aiRefetch } = useQuery({
    queryKey: ["ai-contacts"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/ai/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const allContacts = data?.contacts ?? [];
  const aiContacts: AIPersona[] = aiData?.contacts ?? [];

  const onlineCount = allContacts.filter((c: any) => c.user?.isOnline).length;

  const handleBlockContact = async (contactUserId: string, displayName: string) => {
    Alert.alert(
      "Blokir Pengguna",
      `Blokir ${displayName}? Mereka tidak bisa mengirim pesan ke kamu.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Blokir",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${BASE_URL}/api/users/${contactUserId}/block`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              refetch();
              Alert.alert("Berhasil", `${displayName} telah diblokir.`);
            } catch {
              Alert.alert("Error", "Gagal memblokir pengguna.");
            }
          },
        },
      ]
    );
  };

  const cycleSortMode = () => {
    setSortMode((prev) => prev === "az" ? "online" : prev === "online" ? "recent" : "az");
  };

  const sortLabel: Record<SortMode, string> = { az: "A–Z", online: "Online", recent: "Terbaru" };

  const contacts = useMemo(() => {
    let list = [...allContacts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c: any) =>
        (c.customName ?? c.user?.displayName ?? "").toLowerCase().includes(q) ||
        (c.user?.username ?? "").toLowerCase().includes(q)
      );
    }
    if (sortMode === "az") {
      list.sort((a: any, b: any) =>
        (a.customName ?? a.user?.displayName ?? "").localeCompare(b.customName ?? b.user?.displayName ?? "")
      );
    } else if (sortMode === "online") {
      list.sort((a: any, b: any) => (b.user?.isOnline ? 1 : 0) - (a.user?.isOnline ? 1 : 0));
    } else {
      list.sort((a: any, b: any) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    }
    return list;
  }, [allContacts, searchQuery, sortMode]);

  const AIContactCard = ({ item, index }: { item: AIPersona; index: number }) => {
    const moodCols = MOOD_COLORS[item.mood] ?? MOOD_COLORS.happy;
    const personaColor = PERSONALITY_COLOR[item.personality] ?? c.primary;
    const countryCode = COUNTRY_LABEL[item.country] ?? item.country.toUpperCase();

    return (
      <Reanimated.View entering={FadeInDown.delay(index * 60).springify().damping(20)}>
        <TouchableOpacity
          style={[styles.aiCard, { backgroundColor: c.surface, borderColor: c.glassBorder }]}
          onPress={() => router.push(`/ai-chat/${item.id}`)}
          activeOpacity={0.72}
        >
          <View style={[styles.aiAvatarRing, { borderColor: moodCols[0] + "66" }]}>
            <LinearGradient
              colors={moodCols as unknown as [string, string]}
              style={styles.aiAvatarBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.aiAvatarInitial}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.aiMoodRow}>
            <MoodDot mood={item.mood} size={7} />
            <Text style={[styles.aiMoodText, { color: moodCols[0] }]}>{item.mood}</Text>
          </View>

          <Text style={[styles.aiName, { color: c.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={[styles.aiPersonalityTag, { backgroundColor: personaColor + "18" }]}>
            <Text style={[styles.aiPersonalityText, { color: personaColor }]} numberOfLines={1}>
              {item.personality}
            </Text>
          </View>

          <View style={styles.aiMeta}>
            <View style={[styles.countryBadge, { backgroundColor: c.surfaceHigh }]}>
              <Text style={[styles.countryCode, { color: c.mutedForeground }]}>
                {countryCode}
              </Text>
            </View>
            <Text style={[styles.aiAge, { color: c.mutedForeground }]}>{item.age}y</Text>
          </View>
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.foreground }]}>Kontak</Text>
          {onlineCount > 0 && (
            <Text style={[styles.onlineBadge, { color: c.success }]}>
              {onlineCount} online sekarang
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={cycleSortMode}
          style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
        >
          <Text style={[styles.sortLabel, { color: c.primary }]}>{sortLabel[sortMode]}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/search")}
          style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
        >
          <UserPlus size={18} color={c.primary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Local search bar */}
      <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border }]}>
        <GlobeIcon size={16} />
        <TextInput
          style={[styles.searchInput, { color: c.foreground }]}
          placeholder="Cari kontak..."
          placeholderTextColor={c.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={{ color: c.mutedForeground, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        decelerationRate="normal"
        ListHeaderComponent={
          <View>
            <View style={styles.sectionHeader}>
              <LinearGradient
                colors={c.aiGradient}
                style={styles.sectionIconBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Bot size={14} color="#fff" strokeWidth={2} />
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
                renderItem={({ item, index }) => <AIContactCard item={item} index={index} />}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={[styles.aiEmpty, { color: c.mutedForeground }]}>
                    No AI friends yet
                  </Text>
                }
              />
            )}

            {contacts.length > 0 && (
              <View style={[styles.realContactsHeader, { borderTopColor: c.border }]}>
                <Users size={15} color={c.mutedForeground} strokeWidth={1.7} />
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>My Contacts</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <Reanimated.View entering={FadeInDown.delay(index * 50).springify().damping(18)}>
            <TouchableOpacity
              style={[styles.contact, { borderBottomColor: c.border }]}
              onPress={() => router.push(`/profile/${item.user.id}`)}
              onLongPress={() => handleBlockContact(item.user.id, item.customName ?? item.user.displayName)}
              activeOpacity={0.7}
              delayLongPress={400}
            >
              <Avatar
                uri={item.user.avatarUrl}
                name={item.customName ?? item.user.displayName}
                size={50}
                isOnline={item.user.isOnline}
              />
              <View style={styles.contactInfo}>
                <View style={styles.contactNameRow}>
                  <Text style={[styles.contactName, { color: c.foreground }]}>
                    {item.customName ?? item.user.displayName}
                  </Text>
                  {item.user.isOnline && (
                    <View style={[styles.onlineDot, { backgroundColor: c.success }]} />
                  )}
                </View>
                {item.user.username && (
                  <Text style={[styles.contactHandle, { color: c.mutedForeground }]}>
                    @{item.user.username}
                  </Text>
                )}
                {!item.user.isOnline && item.user.lastSeenAt && (
                  <Text style={[styles.lastSeen, { color: c.mutedForeground }]}>
                    {(() => {
                      const diff = (Date.now() - new Date(item.user.lastSeenAt).getTime()) / 1000;
                      if (diff < 3600) return `${Math.floor(diff / 60)}m yang lalu`;
                      if (diff < 86400) return `${Math.floor(diff / 3600)}j yang lalu`;
                      return `${Math.floor(diff / 86400)}h yang lalu`;
                    })()}
                  </Text>
                )}
              </View>
              {item.isFavorite && <StarIcon size={18} />}
              <TouchableOpacity
                style={[styles.chatBtn, { backgroundColor: c.primary + "16" }]}
                onPress={() => router.push("/search")}
              >
                <MessageCircle size={17} color={c.primary} strokeWidth={1.8} />
              </TouchableOpacity>
            </TouchableOpacity>
          </Reanimated.View>
        )}
        ListEmptyComponent={
          allContacts.length === 0 ? (
            <View style={styles.empty}>
              <PeopleIcon size={56} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>Belum ada kontak</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
                Cari pengguna untuk ditambahkan sebagai kontak
              </Text>
            </View>
          ) : contacts.length === 0 && searchQuery ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>Tidak ditemukan</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
                Tidak ada kontak dengan nama "{searchQuery}"
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || aiLoading}
            onRefresh={() => { refetch(); aiRefetch(); }}
            tintColor={c.primary}
          />
        }
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 20 }]}>
        <FloatingActionButton onPress={() => router.push("/search")} icon="user-plus" size={56} />
      </View>

      <TutorialOverlay
        tutorialKey="contacts"
        steps={[
          { icon: "cpu", title: "AI Friends", description: "AI friends are always online! Each has a unique personality and mood." },
          { icon: "users", title: "Real Contacts", description: "Your added contacts appear below the AI section." },
          { icon: "user-plus", title: "Add Contacts", description: "Tap the + button to search and add users." },
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
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
    gap: 10,
  },
  sectionIconBg: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    flex: 1,
    letterSpacing: -0.3,
  },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aiCard: {
    width: 104,
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aiAvatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  aiAvatarBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.95)",
  },
  aiMoodRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  aiMoodText: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  aiName: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  aiPersonalityTag: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8 },
  aiPersonalityText: {
    fontSize: 9,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  aiMeta: { flexDirection: "row", gap: 5, alignItems: "center" },
  countryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  countryCode: { fontSize: 9, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  aiAge: { fontSize: 10, fontFamily: "Inter_400Regular" },
  aiEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  realContactsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  contact: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  lastSeen: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  onlineBadge: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  sortLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  searchBar: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginVertical: 8,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 9, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  contactName: { fontSize: 15.5, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  contactHandle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  chatBtn: { padding: 9, borderRadius: 20 },
  empty: { alignItems: "center", paddingTop: 44, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 6 },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  fab: { position: "absolute", right: 20 },
});
