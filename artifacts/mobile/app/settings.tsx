import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUpdateMe, useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useTutorial } from "@/context/TutorialContext";
import Avatar from "@/components/common/Avatar";
import StreakBadge from "@/components/common/StreakBadge";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={sectionStyles.wrapper}>
      <Text style={[sectionStyles.title, { color: c.mutedForeground }]}>{title}</Text>
      <View style={[sectionStyles.card, { backgroundColor: c.surface, borderColor: c.border }]}>{children}</View>
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, marginBottom: 24 },
  title: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
});

function SettingRow({ icon, label, sublabel, right, onPress, danger, iconColor }: { icon: string; label: string; sublabel?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean; iconColor?: string }) {
  const { c } = useTheme();
  const color = danger ? c.danger : (iconColor ?? c.primary);
  const content = (
    <View style={[rowStyles.row, { borderBottomColor: c.border }]}>
      <View style={[rowStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={17} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.label, { color: danger ? c.danger : c.foreground }]}>{label}</Text>
        {sublabel ? <Text style={[rowStyles.sub, { color: c.mutedForeground }]}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={16} color={c.mutedForeground} /> : null)}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  return content;
}
const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  iconBg: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontFamily: "Inter_500Medium" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
});

export default function SettingsScreen() {
  const { c, theme, toggleTheme } = useTheme();
  const { resetAll } = useTutorial();
  const insets = useSafeAreaInsets();
  const { user, updateUser, logout, token } = useAuth();
  const updateMe = useUpdateMe();
  const logoutMutation = useLogout();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [readReceipts, setReadReceipts] = useState(user?.privacyReadReceipts ?? true);
  const [saved, setSaved] = useState(false);

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/streak`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  const { data: aiData } = useQuery({
    queryKey: ["ai-contacts"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/ai/contacts`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  const aiCount = aiData?.contacts?.length ?? 0;
  const streak = streakData?.currentStreak ?? 0;

  const handleSave = () => {
    if (!displayName.trim()) return;
    updateMe.mutate(
      { data: { displayName: displayName.trim(), username: username.trim() || undefined, bio: bio.trim() || undefined, privacyReadReceipts: readReceipts } },
      {
        onSuccess: (data: unknown) => {
          updateUser(data as Parameters<typeof updateUser>[0]);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => {
        logoutMutation.mutate(undefined, { onSuccess: () => { logout(); router.replace("/(auth)/login"); } });
      }},
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={{ backgroundColor: c.background, flex: 1 }} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
          <Feather name="arrow-left" size={20} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: c.foreground }]}>Settings</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: saved ? c.success : c.primary }]}
          disabled={updateMe.isPending}
        >
          {updateMe.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{saved ? "Saved ✓" : "Save"}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={88} />
        <Text style={[styles.avatarName, { color: c.foreground }]}>{user.displayName}</Text>
        <Text style={[styles.avatarPhone, { color: c.mutedForeground }]}>{user.phoneNumber}</Text>
      </View>

      {/* Appearance */}
      <Section title="Appearance">
        <SettingRow
          icon={theme === "dark" ? "moon" : "sun"}
          label="Theme"
          sublabel={theme === "dark" ? "Dark Mode" : "Light Mode"}
          iconColor={theme === "dark" ? "#818CF8" : "#F59E0B"}
          right={
            <Switch
              value={theme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
          }
        />
      </Section>

      {/* Streak */}
      {streak > 0 && (
        <Section title="Activity">
          <SettingRow
            icon="zap"
            label="Daily Streak"
            sublabel={`${streak} days • Best: ${streakData?.longestStreak ?? streak} days`}
            iconColor={c.streak}
            right={<StreakBadge streak={streak} size="sm" />}
          />
        </Section>
      )}

      {/* AI Friends */}
      <Section title="AI Friends">
        <SettingRow
          icon="cpu"
          label="AI Contacts"
          sublabel={`${aiCount} AI friend${aiCount !== 1 ? "s" : ""} active`}
          iconColor={c.accent}
          onPress={() => router.push("/(tabs)/contacts")}
        />
        <View style={[rowStyles.row, { borderBottomColor: c.border }]}>
          <View style={[rowStyles.iconBg, { backgroundColor: c.accent + "18" }]}>
            <Text style={{ fontSize: 16 }}>🌍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[rowStyles.label, { color: c.foreground }]}>Add New AI Friend</Text>
            <Text style={[rowStyles.sub, { color: c.mutedForeground }]}>Choose country & gender</Text>
          </View>
          <TouchableOpacity
            style={[styles.addAIBtn, { backgroundColor: c.accent }]}
            onPress={() => router.push("/(tabs)/contacts")}
          >
            <Text style={styles.addAIText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </Section>

      {/* Profile */}
      <Section title="Profile">
        <View style={[styles.field, { borderBottomColor: c.border }]}>
          <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Display Name</Text>
          <TextInput style={[styles.fieldInput, { color: c.foreground }]} value={displayName} onChangeText={setDisplayName} placeholderTextColor={c.mutedForeground} />
        </View>
        <View style={[styles.field, { borderBottomColor: c.border }]}>
          <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Username</Text>
          <TextInput
            style={[styles.fieldInput, { color: c.foreground }]}
            value={username}
            onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, ""))}
            placeholder="@username"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Bio</Text>
          <TextInput style={[styles.fieldInput, { color: c.foreground }]} value={bio} onChangeText={setBio} placeholder="Tell others about yourself" placeholderTextColor={c.mutedForeground} multiline />
        </View>
      </Section>

      {/* Privacy */}
      <Section title="Privacy">
        <SettingRow
          icon="eye"
          label="Read Receipts"
          sublabel="Show when you've read messages"
          right={<Switch value={readReceipts} onValueChange={setReadReceipts} trackColor={{ false: c.border, true: c.primary }} thumbColor="#fff" />}
        />
        <SettingRow icon="lock" label="Last Seen" sublabel="Everyone can see" iconColor={c.teal} onPress={() => {}} />
      </Section>

      {/* App */}
      <Section title="App">
        <SettingRow
          icon="refresh-cw"
          label="Reset Tutorials"
          sublabel="Show all onboarding tips again"
          iconColor={c.warning}
          onPress={() => { resetAll(); Alert.alert("Done!", "All tutorials have been reset."); }}
        />
        <SettingRow icon="info" label="Version" sublabel="1.0.0 — DLChat Pro Max" iconColor={c.mutedForeground} />
      </Section>

      {/* Account */}
      <Section title="Account">
        <SettingRow icon="log-out" label="Logout" onPress={handleLogout} danger />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 },
  pageTitle: { flex: 1, fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 4 },
  avatarName: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 10 },
  avatarPhone: { fontSize: 14, fontFamily: "Inter_400Regular" },
  field: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.3, marginBottom: 4 },
  fieldInput: { fontSize: 15, fontFamily: "Inter_400Regular" },
  addAIBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  addAIText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
