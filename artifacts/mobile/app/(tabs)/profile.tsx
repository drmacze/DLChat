import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Avatar from "@/components/common/Avatar";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function ProfileScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  if (!user) return null;

  const menuItems = [
    { icon: "settings" as const, label: "Settings", onPress: () => router.push("/settings") },
    { icon: "bell" as const, label: "Notifications", onPress: () => router.push("/notifications") },
    { icon: "lock" as const, label: "Privacy", onPress: () => router.push("/settings") },
    { icon: "help-circle" as const, label: "Help & Support", onPress: () => {} },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: c.background, flex: 1 }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 20 }}
    >
      <LinearGradient
        colors={["#2AABEE30", "transparent"]}
        style={[styles.heroGradient, { paddingTop: Platform.OS === "web" ? 67 : insets.top }]}
      >
        <View style={styles.heroContent}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={80} />
          <Text style={[styles.name, { color: c.foreground }]}>{user.displayName}</Text>
          {user.username && (
            <Text style={[styles.handle, { color: c.mutedForeground }]}>@{user.username}</Text>
          )}
          {user.bio && (
            <Text style={[styles.bio, { color: c.mutedForeground }]}>{user.bio}</Text>
          )}
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={14} color={c.foreground} />
            <Text style={[styles.editBtnText, { color: c.foreground }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={[styles.statsRow, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: c.foreground }]}>0</Text>
          <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Posts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: c.foreground }]}>0</Text>
          <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Contacts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: c.foreground }]}>0</Text>
          <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Groups</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.menuItem, { borderBottomColor: c.border, backgroundColor: c.surface }]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: c.secondarySurface }]}>
              <Feather name={item.icon} size={18} color={c.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: c.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color={c.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroGradient: { paddingBottom: 0 },
  heroContent: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24, paddingTop: 20 },
  name: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold", marginTop: 12, marginBottom: 2 },
  handle: { fontSize: 15, fontFamily: "Inter_400Regular", marginBottom: 4 },
  bio: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 16 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: "hidden",
  },
  stat: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statNum: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth },
  menu: { marginHorizontal: 16, borderRadius: 14, overflow: "hidden", gap: StyleSheet.hairlineWidth },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
});
