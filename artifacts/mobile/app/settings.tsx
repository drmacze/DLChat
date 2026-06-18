import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useUpdateMe, useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/common/Avatar";
import colors from "@/constants/colors";

export default function SettingsScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { user, updateUser, logout } = useAuth();
  const updateMe = useUpdateMe();
  const logoutMutation = useLogout();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [readReceipts, setReadReceipts] = useState(user?.privacyReadReceipts ?? true);
  const [saved, setSaved] = useState(false);

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
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logoutMutation.mutate(undefined, {
            onSuccess: () => {
              logout();
              router.replace("/(auth)/login");
            },
          });
        },
      },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView
      style={{ backgroundColor: c.background, flex: 1 }}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 40 : insets.bottom + 20 }}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.sidebar,
            borderBottomColor: c.border,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.foreground }]}>Settings</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={updateMe.isPending}>
          {updateMe.isPending ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: saved ? c.success : c.primary }]}>
              {saved ? "Saved!" : "Save"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size={80} />
        <TouchableOpacity style={[styles.changePhoto, { backgroundColor: c.surface }]}>
          <Feather name="camera" size={14} color={c.primary} />
          <Text style={[styles.changePhotoText, { color: c.primary }]}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>PROFILE</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
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
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>PRIVACY</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.switchField}>
            <Text style={[styles.switchLabel, { color: c.foreground }]}>Read Receipts</Text>
            <Switch
              value={readReceipts}
              onValueChange={setReadReceipts}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TouchableOpacity style={[styles.dangerField]} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#EF4444" />
            <Text style={[styles.dangerText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  saveBtn: { padding: 6 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  avatarSection: { alignItems: "center", paddingVertical: 20, gap: 10 },
  changePhoto: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  changePhotoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8, letterSpacing: 0.5 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  field: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  fieldInput: { fontSize: 15, fontFamily: "Inter_400Regular" },
  switchField: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  switchLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  dangerField: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  dangerText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#EF4444" },
});
