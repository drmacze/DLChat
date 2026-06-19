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
  const [statusText, setStatusText] = useState((user as any)?.statusText ?? "");
  const [readReceipts, setReadReceipts] = useState(user?.privacyReadReceipts ?? true);
  const [lastSeen, setLastSeen] = useState<PrivacyLevel>((user?.privacyLastSeen as PrivacyLevel) ?? "everyone");
  const [profilePhoto, setProfilePhoto] = useState<PrivacyLevel>((user?.privacyProfilePhoto as PrivacyLevel) ?? "everyone");
  const [saved, setSaved] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState("");
  const [autoReplySaving, setAutoReplySaving] = useState(false);

  // PIN state
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinStep, setPinStep] = useState<"enter" | "confirm" | "current">("enter");
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [currentPinInput, setCurrentPinInput] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState("");

  // Font size
  const [fontSize, setFontSize] = useState(1); // 0=small 1=normal 2=large 3=xlarge
  const FONT_SIZES = ["Kecil", "Normal", "Besar", "Sangat Besar"];

  // Load PIN status
  React.useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/api/auth/pin/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setPinEnabled(d.pinEnabled ?? false))
      .catch(() => {});
  }, [token]);

  const handlePinSetup = async () => {
    if (!token) return;
    if (pinStep === "current" && pinEnabled) {
      if (currentPinInput.length !== 4) { setPinError("Masukkan PIN saat ini (4 digit)."); return; }
      setPinStep("enter");
      setPinError("");
      return;
    }
    if (pinStep === "enter") {
      if (pinInput.length !== 4) { setPinError("PIN harus 4 digit."); return; }
      setPinStep("confirm");
      setPinError("");
      return;
    }
    if (pinStep === "confirm") {
      if (pinConfirm !== pinInput) { setPinError("PIN tidak cocok. Coba lagi."); setPinConfirm(""); return; }
      setPinSaving(true);
      try {
        const res = await fetch(`${BASE_URL}/api/auth/pin`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pinInput, currentPin: currentPinInput || undefined }),
        });
        const d = await res.json();
        if (res.ok) {
          setPinEnabled(true);
          setPinModalOpen(false);
          setPinInput(""); setPinConfirm(""); setCurrentPinInput(""); setPinStep("enter");
          Alert.alert("Berhasil", "PIN verifikasi dua langkah telah diaktifkan.");
        } else {
          setPinError(d.error ?? "Gagal mengatur PIN.");
        }
      } catch { setPinError("Koneksi gagal."); }
      finally { setPinSaving(false); }
    }
  };

  const handlePinDisable = () => {
    if (!pinEnabled) { setPinModalOpen(true); setPinStep(pinEnabled ? "current" : "enter"); return; }
    Alert.prompt?.("Masukkan PIN Saat Ini", "Untuk menonaktifkan verifikasi dua langkah", async (pin) => {
      if (!pin || pin.length !== 4) return;
      try {
        const res = await fetch(`${BASE_URL}/api/auth/pin`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const d = await res.json();
        if (res.ok) { setPinEnabled(false); Alert.alert("Berhasil", "Verifikasi dua langkah dinonaktifkan."); }
        else Alert.alert("Gagal", d.error ?? "PIN salah.");
      } catch { Alert.alert("Error", "Koneksi gagal."); }
    }, "secure-text");
  };

  React.useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/api/users/me/auto-reply`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setAutoReplyEnabled(d.autoReplyEnabled ?? false);
        setAutoReplyMessage(d.autoReplyMessage ?? "");
      })
      .catch(() => {});
  }, [token]);

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

  const handleSaveAutoReply = async () => {
    if (!token) return;
    setAutoReplySaving(true);
    try {
      await fetch(`${BASE_URL}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ autoReplyEnabled, autoReplyMessage: autoReplyMessage.trim() || null }),
      });
      Alert.alert("Tersimpan", "Pengaturan balasan otomatis disimpan.");
    } catch {
      Alert.alert("Error", "Gagal menyimpan pengaturan.");
    } finally {
      setAutoReplySaving(false);
    }
  };

  const handleSave = () => {
    if (!displayName.trim()) return;
    updateMe.mutate(
      {
        data: {
          displayName: displayName.trim(),
          username: username.trim() || undefined,
          bio: bio.trim() || undefined,
          statusText: statusText.trim() || undefined,
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

        <Section title="Status Kustom">
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Status Kamu</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.foreground }]}
              value={statusText}
              onChangeText={setStatusText}
              placeholder="😊 Tersedia untuk ngobrol..."
              placeholderTextColor={c.mutedForeground}
              maxLength={150}
            />
            <Text style={[{ color: c.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 }]}>
              {statusText.length}/150 karakter
            </Text>
          </View>
        </Section>

        <Section title="Balasan Otomatis">
          <View style={[rowStyles.row, { borderBottomColor: c.border }]}>
            <View style={[rowStyles.iconBg, { backgroundColor: c.warning + "18" }]}>
              <Feather name="zap" size={17} color={c.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[rowStyles.label, { color: c.foreground }]}>Aktifkan Balasan Otomatis</Text>
              <Text style={[rowStyles.sub, { color: c.mutedForeground }]}>
                {autoReplyEnabled ? "Aktif — membalas saat kamu offline" : "Nonaktif"}
              </Text>
            </View>
            <Switch
              value={autoReplyEnabled}
              onValueChange={setAutoReplyEnabled}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
          </View>
          {autoReplyEnabled && (
            <View style={[styles.field, { borderBottomColor: c.border }]}>
              <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Pesan Balasan</Text>
              <TextInput
                style={[styles.fieldInput, { color: c.foreground, minHeight: 56 }]}
                value={autoReplyMessage}
                onChangeText={setAutoReplyMessage}
                placeholder="Saya sedang tidak tersedia, akan segera membalas. 🙏"
                placeholderTextColor={c.mutedForeground}
                multiline
                maxLength={500}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={handleSaveAutoReply}
            disabled={autoReplySaving}
            style={[styles.autoReplyBtn, { backgroundColor: c.primary }]}
          >
            {autoReplySaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.autoReplyBtnText}>Simpan Pengaturan</Text>
            )}
          </TouchableOpacity>
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

        <Section title="Ukuran Font Chat">
          <View style={[styles.field, { borderBottomWidth: 0 }]}>
            <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>Ukuran teks pesan</Text>
            <View style={[fontStyles.track, { backgroundColor: c.surface, borderColor: c.border }]}>
              {FONT_SIZES.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setFontSize(i)}
                  style={[
                    fontStyles.segment,
                    fontSize === i && { backgroundColor: c.primary },
                  ]}
                >
                  <Text style={[
                    fontStyles.segText,
                    { color: fontSize === i ? "#fff" : c.mutedForeground },
                  ]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[fontStyles.preview, { color: c.foreground, fontSize: 12 + fontSize * 3 }]}>
              Halo! Ini adalah pratinjau ukuran font pesan kamu.
            </Text>
          </View>
        </Section>

        <Section title="Security">
          <SettingRow
            icon="lock"
            label="Verifikasi Dua Langkah"
            sublabel={pinEnabled ? "PIN aktif — ketuk untuk ubah" : "Tambahkan PIN untuk keamanan ekstra"}
            iconColor="#8B5CF6"
            onPress={() => {
              if (pinEnabled) {
                handlePinDisable();
              } else {
                setPinModalOpen(true);
                setPinStep("enter");
                setPinInput(""); setPinConfirm(""); setCurrentPinInput(""); setPinError("");
              }
            }}
            right={
              <View style={[pinStyles.badge, { backgroundColor: pinEnabled ? c.success + "22" : c.border + "40" }]}>
                <Text style={[pinStyles.badgeText, { color: pinEnabled ? c.success : c.mutedForeground }]}>
                  {pinEnabled ? "Aktif" : "Nonaktif"}
                </Text>
              </View>
            }
          />
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

      {/* PIN Setup Modal */}
      <Modal visible={pinModalOpen} animationType="slide" transparent>
        <View style={pinStyles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setPinModalOpen(false)} />
          <View style={[pinStyles.sheet, { backgroundColor: c.surface }]}>
            <View style={pinStyles.handleRow}>
              <View style={[pinStyles.handle, { backgroundColor: c.border }]} />
            </View>
            <Text style={[pinStyles.title, { color: c.foreground }]}>
              {pinStep === "current" ? "Masukkan PIN Saat Ini" : pinStep === "enter" ? "Buat PIN Baru" : "Konfirmasi PIN"}
            </Text>
            <Text style={[pinStyles.sub, { color: c.mutedForeground }]}>
              {pinStep === "current"
                ? "Masukkan PIN yang sudah ada untuk melanjutkan"
                : pinStep === "enter"
                ? "Pilih 4 digit PIN untuk keamanan akun"
                : `Ketik ulang PIN: ${pinInput.replace(/./g, "●")}`}
            </Text>

            {/* PIN Dot indicator */}
            <View style={pinStyles.dotRow}>
              {[0, 1, 2, 3].map((i) => {
                const val = pinStep === "current" ? currentPinInput : pinStep === "enter" ? pinInput : pinConfirm;
                return (
                  <View key={i} style={[
                    pinStyles.dot,
                    { backgroundColor: i < val.length ? c.primary : c.border },
                  ]} />
                );
              })}
            </View>

            {pinError ? <Text style={pinStyles.error}>{pinError}</Text> : null}

            {/* Number pad */}
            <View style={pinStyles.numPad}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
                <TouchableOpacity
                  key={i}
                  style={[pinStyles.numKey, { backgroundColor: k === "" ? "transparent" : c.glass, borderColor: c.glassBorder }]}
                  disabled={k === ""}
                  activeOpacity={k === "" ? 1 : 0.7}
                  onPress={() => {
                    if (k === "") return;
                    const setVal = pinStep === "current" ? setCurrentPinInput : pinStep === "enter" ? setPinInput : setPinConfirm;
                    const getVal = pinStep === "current" ? currentPinInput : pinStep === "enter" ? pinInput : pinConfirm;
                    if (k === "⌫") {
                      setVal(getVal.slice(0, -1));
                    } else if (getVal.length < 4) {
                      setVal(getVal + String(k));
                    }
                    setPinError("");
                  }}
                >
                  {k !== "" && (
                    <Text style={[pinStyles.numText, { color: c.foreground }]}>{k}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[pinStyles.confirmBtn, { backgroundColor: c.primary, opacity: pinSaving ? 0.7 : 1 }]}
              onPress={handlePinSetup}
              disabled={pinSaving}
            >
              {pinSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={pinStyles.confirmText}>
                  {pinStep === "current" ? "Lanjutkan" : pinStep === "enter" ? "Selanjutnya" : "Aktifkan PIN"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  autoReplyBtn: { marginHorizontal: 16, marginVertical: 12, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  autoReplyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

const fontStyles = StyleSheet.create({
  track: {
    flexDirection: "row", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10, overflow: "hidden",
  },
  segment: { flex: 1, paddingVertical: 8, alignItems: "center" },
  segText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  preview: {
    marginTop: 12, fontFamily: "Inter_400Regular", lineHeight: 22,
    padding: 10, borderRadius: 10,
  },
});

const pinStyles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 38, height: 4, borderRadius: 2 },
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 24, paddingHorizontal: 24 },
  dotRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 8 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  error: { color: "#EF4444", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
  numPad: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 32, gap: 12, marginBottom: 20, marginTop: 16 },
  numKey: {
    width: "29%", aspectRatio: 1.6, alignItems: "center", justifyContent: "center",
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
  },
  numText: { fontSize: 22, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  confirmBtn: { marginHorizontal: 24, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  confirmText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
