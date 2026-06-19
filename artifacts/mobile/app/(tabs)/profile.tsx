import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Settings, Bell, Bot, HelpCircle, ChevronRight, Pencil, Phone } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import Avatar from "@/components/common/Avatar";
import StreakBadge from "@/components/common/StreakBadge";
import TutorialOverlay from "@/components/common/TutorialOverlay";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { FireIcon, TrophyIcon } from "@/components/common/SvgIcons";
import { BASE_URL } from "@/utils/api";

export default function ProfileScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

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

  const { data: aiData } = useQuery({
    queryKey: ["ai-contacts"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/ai/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  if (!user) return null;

  const streak = streakData?.currentStreak ?? 0;
  const longestStreak = streakData?.longestStreak ?? 0;
  const aiCount = aiData?.contacts?.length ?? 0;

  const menuItems = [
    {
      icon: <Settings size={17} color={c.primary} strokeWidth={1.8} />,
      label: "Settings",
      sublabel: "Theme, profile, privacy",
      color: c.primary,
      onPress: () => router.push("/settings"),
    },
    {
      icon: <Bell size={17} color={c.teal} strokeWidth={1.8} />,
      label: "Notifications",
      sublabel: "Manage alerts",
      color: c.teal,
      onPress: () => router.push("/notifications"),
    },
    {
      icon: <Bot size={17} color={c.accent} strokeWidth={1.8} />,
      label: `AI Friends (${aiCount})`,
      sublabel: "Chat with AI contacts anytime",
      color: c.accent,
      onPress: () => router.push("/(tabs)/contacts"),
    },
    {
      icon: <HelpCircle size={17} color={c.success} strokeWidth={1.8} />,
      label: "Help & Support",
      sublabel: "Get help using DLChat",
      color: c.success,
      onPress: () => {},
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: c.background, flex: 1 }}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[c.primary + "22", "transparent"]}
        style={[styles.heroGradient, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}
      >
        <Reanimated.View entering={FadeInDown.delay(0).springify().damping(20)} style={styles.heroContent}>
          <View style={styles.avatarWrapper}>
            <Avatar uri={user.avatarUrl} name={user.displayName} size={90} />
            {streak > 0 && (
              <View style={styles.streakBadgePos}>
                <StreakBadge streak={streak} size="sm" />
              </View>
            )}
          </View>
          <Text style={[styles.name, { color: c.foreground }]}>{user.displayName}</Text>
          {user.username && (
            <Text style={[styles.handle, { color: c.mutedForeground }]}>@{user.username}</Text>
          )}
          {user.bio ? (
            <Text style={[styles.bio, { color: c.mutedForeground }]}>{user.bio}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
          >
            <Pencil size={13} color={c.foreground} strokeWidth={2} />
            <Text style={[styles.editBtnText, { color: c.foreground }]}>Edit Profile</Text>
          </TouchableOpacity>
        </Reanimated.View>
      </LinearGradient>

      {streak > 0 && (
        <Reanimated.View entering={FadeInDown.delay(80).springify().damping(20)}>
          <View
            style={[
              styles.streakCard,
              {
                backgroundColor: c.surface,
                borderColor: c.glassBorder,
                marginHorizontal: 18,
                marginBottom: 14,
              },
            ]}
          >
            <LinearGradient
              colors={c.streakGradient}
              style={styles.streakAccent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={styles.streakBody}>
              <View style={styles.streakStat}>
                <FireIcon size={32} />
                <View>
                  <Text style={[styles.streakNum, { color: c.foreground }]}>{streak}</Text>
                  <Text style={[styles.streakLabel, { color: c.mutedForeground }]}>Day Streak</Text>
                </View>
              </View>
              <View style={[styles.streakDiv, { backgroundColor: c.border }]} />
              <View style={styles.streakStat}>
                <TrophyIcon size={32} />
                <View>
                  <Text style={[styles.streakNum, { color: c.foreground }]}>{longestStreak}</Text>
                  <Text style={[styles.streakLabel, { color: c.mutedForeground }]}>Best Ever</Text>
                </View>
              </View>
            </View>
          </View>
        </Reanimated.View>
      )}

      {user.phoneNumber ? (
        <Reanimated.View entering={FadeInDown.delay(120).springify().damping(20)}>
          <View
            style={[
              styles.phoneCard,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                marginHorizontal: 18,
                marginBottom: 14,
              },
            ]}
          >
            <Phone size={15} color={c.mutedForeground} strokeWidth={1.7} />
            <Text style={[styles.phoneText, { color: c.mutedForeground }]}>{user.phoneNumber}</Text>
          </View>
        </Reanimated.View>
      ) : null}

      <Reanimated.View entering={FadeInDown.delay(160).springify().damping(20)}>
        <View
          style={[
            styles.menuCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              marginHorizontal: 18,
            },
          ]}
        >
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.menuItem,
                i < menuItems.length - 1 && {
                  borderBottomColor: c.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + "18" }]}>
                {item.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { color: c.foreground }]}>{item.label}</Text>
                <Text style={[styles.menuSub, { color: c.mutedForeground }]}>{item.sublabel}</Text>
              </View>
              <ChevronRight size={15} color={c.mutedForeground} strokeWidth={1.8} />
            </TouchableOpacity>
          ))}
        </View>
      </Reanimated.View>

      <TutorialOverlay
        tutorialKey="profile"
        steps={[
          { icon: "user", title: "Your Profile", description: "Tap Edit Profile to update your name, username, and bio." },
          { icon: "zap", title: "Fire Streak", description: "Chat daily to build your streak. Missing a day resets it!" },
          { icon: "settings", title: "Settings & Theme", description: "Tap Settings to switch dark/light mode and manage preferences." },
        ]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroGradient: { paddingBottom: 0 },
  heroContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 28, paddingTop: 28 },
  avatarWrapper: { position: "relative", marginBottom: 4 },
  streakBadgePos: { position: "absolute", bottom: -4, right: -10 },
  name: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    marginTop: 16,
    marginBottom: 3,
    letterSpacing: -0.4,
  },
  handle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 7 },
  bio: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 16,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  streakCard: { borderRadius: 18, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  streakAccent: { height: 3 },
  streakBody: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  streakStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  streakDiv: { width: StyleSheet.hairlineWidth, height: 44, marginHorizontal: 8 },
  streakNum: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  streakLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  phoneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  phoneText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  menuCard: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
