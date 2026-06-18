import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/common/Avatar";
import StreakBadge from "@/components/common/StreakBadge";
import TutorialOverlay from "@/components/common/TutorialOverlay";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function ProfileScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/streak`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  if (!user) return null;

  const streak = streakData?.currentStreak ?? 0;
  const longestStreak = streakData?.longestStreak ?? 0;

  const menuItems = [
    { icon: "settings" as const, label: "Settings", sublabel: "Theme, profile, privacy", color: c.primary, onPress: () => router.push("/settings") },
    { icon: "bell" as const, label: "Notifications", sublabel: "Manage alerts", color: c.teal, onPress: () => router.push("/notifications") },
    { icon: "cpu" as const, label: "AI Friends", sublabel: "Chat with AI contacts", color: c.accent, onPress: () => router.push("/(tabs)/contacts") },
    { icon: "help-circle" as const, label: "Help & Support", sublabel: "Get help using DLChat", color: c.success, onPress: () => {} },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: c.background, flex: 1 }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero gradient header */}
      <LinearGradient
        colors={[c.primary + "30", "transparent"]}
        style={[styles.heroGradient, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}
      >
        <View style={styles.heroContent}>
          <View style={styles.avatarRow}>
            <Avatar uri={user.avatarUrl} name={user.displayName} size={86} />
            {streak > 0 && (
              <View style={styles.streakAbsolute}>
                <StreakBadge streak={streak} size="sm" />
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: c.foreground }]}>{user.displayName}</Text>
          {user.username && <Text style={[styles.handle, { color: c.mutedForeground }]}>@{user.username}</Text>}
          {user.bio ? (
            <Text style={[styles.bio, { color: c.mutedForeground }]}>{user.bio}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={14} color={c.foreground} />
            <Text style={[styles.editBtnText, { color: c.foreground }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Streak Card */}
      {streak > 0 && (
        <View style={[styles.streakCard, { backgroundColor: c.surface, borderColor: c.glassBorder, marginHorizontal: 16, marginBottom: 16 }]}>
          <LinearGradient colors={c.streakGradient} style={styles.streakCardAccent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
          <View style={styles.streakCardContent}>
            <View style={styles.streakItem}>
              <Text style={{ fontSize: 28 }}>🔥</Text>
              <View>
                <Text style={[styles.streakNum, { color: c.foreground }]}>{streak}</Text>
                <Text style={[styles.streakLabel, { color: c.mutedForeground }]}>Day Streak</Text>
              </View>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: c.border }]} />
            <View style={styles.streakItem}>
              <Text style={{ fontSize: 28 }}>🏆</Text>
              <View>
                <Text style={[styles.streakNum, { color: c.foreground }]}>{longestStreak}</Text>
                <Text style={[styles.streakLabel, { color: c.mutedForeground }]}>Best Streak</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: c.surface, borderColor: c.border, marginHorizontal: 16, marginBottom: 20 }]}>
        {[
          { num: user.postCount ?? 0, label: "Posts" },
          { num: user.contactCount ?? 0, label: "Contacts" },
          { num: user.groupCount ?? 0, label: "Groups" },
        ].map((s, i, arr) => (
          <React.Fragment key={s.label}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: c.foreground }]}>{s.num}</Text>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{s.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: c.border }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Menu */}
      <View style={[styles.menuCard, { backgroundColor: c.surface, borderColor: c.border, marginHorizontal: 16 }]}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, i < menuItems.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + "20" }]}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: c.foreground }]}>{item.label}</Text>
              <Text style={[styles.menuSub, { color: c.mutedForeground }]}>{item.sublabel}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={c.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      <TutorialOverlay
        tutorialKey="profile"
        steps={[
          { icon: "user", title: "Your Profile", description: "This is your public profile. Tap Edit Profile to update your info." },
          { icon: "zap", title: "Streak Fire 🔥", description: "Chat daily to build your streak! Don't miss a day or it resets." },
          { icon: "settings", title: "Settings", description: "Tap Settings to change theme, privacy, and manage AI friends." },
        ]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroGradient: { paddingBottom: 0 },
  heroContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24, paddingTop: 24 },
  avatarRow: { position: "relative", marginBottom: 4 },
  streakAbsolute: { position: "absolute", bottom: -4, right: -8 },
  name: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", marginTop: 14, marginBottom: 2 },
  handle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 6 },
  bio: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 14 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  editBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  streakCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  streakCardAccent: { height: 3 },
  streakCardContent: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20 },
  streakItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  streakDivider: { width: 1, height: 40, marginHorizontal: 16 },
  streakNum: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  streakLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsRow: { flexDirection: "row", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  stat: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statNum: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth },
  menuCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  menuIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
