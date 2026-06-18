import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useUpdateMe } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";

export default function OnboardingScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { updateUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const updateMe = useUpdateMe();

  const handleComplete = () => {
    if (!displayName.trim()) { setError("Please enter your name"); return; }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const body: Record<string, string> = { displayName: displayName.trim() };
    if (username.trim()) body.username = username.trim().toLowerCase();

    updateMe.mutate(
      { data: body },
      {
        onSuccess: (data) => {
          updateUser(data as Parameters<typeof updateUser>[0]);
          router.replace("/(tabs)/chats");
        },
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { error?: string } } };
          setError(e?.response?.data?.error ?? "Failed to save profile");
        },
      }
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: c.background, flex: 1 }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient colors={["#2AABEE20", "transparent"]} style={styles.heroGradient} />
      <View style={styles.icon}><Text style={{ fontSize: 48 }}>👋</Text></View>
      <Text style={[styles.title, { color: c.foreground }]}>Set up profile</Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>Let others know who you are</Text>

      <View style={styles.form}>
        <Text style={[styles.label, { color: c.mutedForeground }]}>Display Name *</Text>
        <View style={[styles.inputContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            style={[styles.input, { color: c.foreground }]}
            placeholder="Your full name"
            placeholderTextColor={c.mutedForeground}
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={60}
            autoFocus
          />
        </View>

        <Text style={[styles.label, { color: c.mutedForeground, marginTop: 16 }]}>Username (optional)</Text>
        <View style={[styles.inputContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.atSign, { color: c.mutedForeground }]}>@</Text>
          <TextInput
            style={[styles.input, { color: c.foreground }]}
            placeholder="username"
            placeholderTextColor={c.mutedForeground}
            value={username}
            onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, ""))}
            maxLength={32}
            autoCapitalize="none"
          />
        </View>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: "#EF444420", borderColor: "#EF444440" }]}>
          <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.btn, { opacity: updateMe.isPending ? 0.6 : 1 }]}
        onPress={handleComplete}
        disabled={updateMe.isPending}
        activeOpacity={0.8}
      >
        <LinearGradient colors={["#2AABEE", "#1A8CC7"]} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {updateMe.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Get Started</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  heroGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  icon: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, fontFamily: "Inter_400Regular" },
  form: { width: "100%", marginBottom: 20 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, height: 52, paddingHorizontal: 14 },
  atSign: { fontSize: 16, marginRight: 2 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  errorBox: { width: "100%", borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  btn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 8 },
  btnGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
