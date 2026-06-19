import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Platform, Modal, FlatList,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateMe, useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useTutorial } from "@/context/TutorialContext";
import Avatar from "@/components/common/Avatar";
import StreakBadge from "@/components/common/StreakBadge";
import { BASE_URL } from "@/utils/api";

type PrivacyLevel = "everyone" | "contacts" | "nobody";

const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  everyone: "Everyone",
  contacts: "Contacts only",
  nobody: "Nobody",
};

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
  title: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8,
    textTransform: "uppercase", marginBottom: 8, marginLeft: 4,
  },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
});

function SettingRow({
  icon, label, sublabel, right, onPress, danger, iconColor,
}: {
  icon: string; label: string; sublabel?: string;
  right?: React.ReactNode; onPress?: () => void; danger?: boolean; iconColor?: string;
}) {
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
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 14,
  },
  iconBg: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontFamily: "Inter_500Medium" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
});

interface SessionItem {
  id: string;
  deviceName?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

function SessionsModal({ visible, onClose, token }: { visible: boolean; onClose: () => void; token: string | null }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions((data.sessions ?? []).sort((a: SessionItem, b: SessionItem) =>
        a.isCurrent ? -1 : b.isCurrent ? 1 : 0
      ));
    } catch {
      Alert.alert("Error", "Could not load sessions.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (visible) fetchSessions();
  }, [visible]);

  const revokeSession = async (sessionId: string, isCurrent: boolean) => {
    Alert.alert(
      isCurrent ? "Sign Out" : "Revoke Session",
      isCurrent
        ? "This will log you out of this device."
        : "This will sign out that device. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isCurrent ? "Sign Out" : "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${BASE_URL}/api/auth/sessions/${sessionId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (isCurrent) {
                logout();
                router.replace("/(auth)/login");
              } else {
                setSessions((prev) => prev.filter((s) => s.id !== sessionId));
              }
            } catch {
              Alert.alert("Error", "Could not revoke session.");
            }
          },
        },
      ]
    );
  };

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <View style={sessStyles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[sessStyles.sheet, { backgroundColor: c.surface }]}>
          <View style={[sessStyles.handle, { backgroundColor: c.border }]} />
          <View style={[sessStyles.header, { borderBottomColor: c.border }]}>
            <Text style={[sessStyles.title, { color: c.foreground }]}>Active Sessions</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ margin: 40 }} />
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 16 }}
              ListEmptyComponent={
                <Text style={[sessStyles.emptyText, { color: c.mutedForeground }]}>No active sessions found.</Text>
              }
              renderItem={({ item }) => (
                <View style={[sessStyles.sessionRow, { borderBottomColor: c.border }]}>
                  <View style={[sessStyles.deviceIcon, { backgroundColor: c.primary + "18" }]}>
                    <Feather
                      name={item.isCurrent ? "smartphone" : "monitor"}
                      size={18}
                      color={c.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={sessStyles.sessionMeta}>
                      <Text style={[sessStyles.deviceName, { color: c.foreground }]}>
                        {item.deviceName ?? "Unknown device"}
                      </Text>
                      {item.isCurrent && (
                        <View style={[sessStyles.currentBadge, { backgroundColor: c.success + "22" }]}>
                          <Text style={[sessStyles.currentText, { color: c.success }]}>This device</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[sessStyles.sessionDetail, { color: c.mutedForeground }]}>
                      {item.ipAddress ? `${item.ipAddress} · ` : ""}Active {formatDate(item.lastActiveAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => revokeSession(item.id, item.isCurrent)}
                    style={[sessStyles.revokeBtn, { borderColor: item.isCurrent ? c.danger + "60" : c.border }]}
                  >
                    <Text style={[sessStyles.revokeText, { color: item.isCurrent ? c.danger : c.mutedForeground }]}>
                      {item.isCurrent ? "Logout" : "Remove"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const sessStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "70%", minHeight: "40%" },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 2 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 14, fontFamily: "Inter_400Regular" },
  sessionRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  deviceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sessionMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  deviceName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  currentBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  currentText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  sessionDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  revokeBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  revokeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
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
  const [lastSeen, setLastSeen] = useState<PrivacyLevel>((user?.privacyLastSeen as PrivacyLevel) ?? "everyone");
  const [profilePhoto, setProfilePhoto] = useState<PrivacyLevel>((user?.privacyProfilePhoto as PrivacyLevel) ?? "everyone");
  const [saved, setSaved] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

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
      {
        data: {
          displayName: displayName.trim(),
          username: username.trim() || undefined,
          bio: bio.trim() || undefined,
          privacyReadReceipts: readReceipts,
          privacyLastSeen: lastSeen,
          privacyProfilePhoto: profilePhoto,
        },
      },
      {
        onSuccess: (data: unknown) => {
          updateUser(data as Parameters<typeof updateUser>[0]);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
        onError: () => {
          Alert.alert("Error", "Could not save settings. Please try again.");
        },
      }
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout", style: "destructive",
        onPress: () => {
          logoutMutation.mutate(undefined, {
            onSuccess: () => { logout(); router.replace("/(auth)/login"); },
          });
        },
      },
    ]);
  };

  const pickPrivacy = (
    current: PrivacyLevel,
    label: string,
    onSelect: (v: PrivacyLevel) => void
  ) => {
    Alert.alert(label, "Who can see this?", [
      { text: "Everyone", onPress: () => onSelect("everyone"), style: current === "everyone" ? "default" : "default" },
      { text: "Contacts only", onPress: () => onSelect("contacts") },
      { text: "Nobody", onPress: () => onSelect("nobody") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (!user) return null;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: c.background, flex: 1 }}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
          >
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

        <View style={styles.avatarSection}>
          <Avatar uri={user.avatarUrl} name={user.displayName} size={88} />
          <Text style={[styles.avatarName, { color: c.foreground }]}>{user.displayName}</Text>
          <Text style={[styles.avatarPhone, { color: c.mutedForeground }]}>{user.phoneNumber}</Text>
        </View>

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

        {streak > 0 && (
          <Section title="Activity">
            <SettingRow
              icon="zap"
              label="Daily Streak"
              sublabel={`${streak} days · Best: ${streakData?.longestStreak ?? streak} days`}
              iconColor={c.streak}
              right={<StreakBadge streak={streak} size="sm" />}
            />
          </Section>
        )}

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

        <Section title="Profile">
          <View style={[styles.field, { borderBottomColor: c.border }]}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Display Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholderTextColor={c.mutedForeground}
            />
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
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others about yourself"
              placeholderTextColor={c.mutedForeground}
              multiline
            />
          </View>
        </Section>

        <Section title="Privacy">
          <SettingRow
            icon="eye"
            label="Read Receipts"
            sublabel="Show when you've read messages"
            right={
              <Switch
                value={readReceipts}
                onValueChange={setReadReceipts}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow
            icon="clock"
            label="Last Seen"
            sublabel={PRIVACY_LABELS[lastSeen]}
            iconColor={c.teal}
            onPress={() => pickPrivacy(lastSeen, "Last Seen", setLastSeen)}
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.privacyVal, { color: c.primary }]}>{PRIVACY_LABELS[lastSeen]}</Text>
                <Feather name="chevron-right" size={16} color={c.mutedForeground} />
              </View>
            }
          />
          <SettingRow
            icon="image"
            label="Profile Photo"
            sublabel={PRIVACY_LABELS[profilePhoto]}
            iconColor={c.accent}
            onPress={() => pickPrivacy(profilePhoto, "Profile Photo", setProfilePhoto)}
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.privacyVal, { color: c.primary }]}>{PRIVACY_LABELS[profilePhoto]}</Text>
                <Feather name="chevron-right" size={16} color={c.mutedForeground} />
              </View>
            }
          />
        </Section>

        <Section title="Security">
          <SettingRow
            icon="shield"
            label="Active Sessions"
            sublabel="See where you're signed in"
            iconColor="#8B5CF6"
            onPress={() => setSessionsOpen(true)}
          />
        </Section>

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

        <Section title="Account">
          <SettingRow icon="log-out" label="Logout" onPress={handleLogout} danger />
        </Section>
      </ScrollView>

      <SessionsModal
        visible={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
        token={token}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
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
  privacyVal: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
