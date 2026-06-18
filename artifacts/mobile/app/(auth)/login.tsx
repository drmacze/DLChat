import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import DlavieLogo from "@/components/common/DlavieLogo";
import { RobotIcon, FireIcon, ChatBubbleIcon } from "@/components/common/SvgIcons";
import { useRegisterUser, useLoginUser } from "@workspace/api-client-react";

export default function LoginScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = useRegisterUser();
  const loginMutation = useLoginUser();
  const isPending = registerMutation.isPending || loginMutation.isPending;

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError("");
    registerMutation.reset();
    loginMutation.reset();
  };

  const handleSubmit = () => {
    setError("");
    if (!username.trim()) { setError("Masukkan username"); return; }
    if (!password) { setError("Masukkan password"); return; }
    if (mode === "register" && !displayName.trim()) { setError("Masukkan nama tampilan"); return; }
    if (mode === "register" && password.length < 6) { setError("Password minimal 6 karakter"); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const onSuccess = async (data: { token: string; user: Parameters<typeof setAuth>[1]; isNewUser: boolean }) => {
      await setAuth(data.token, data.user);
      router.replace("/(tabs)/chats");
    };

    const onError = (err: unknown) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const e = err as { data?: { error?: string }; message?: string };
      setError(e?.data?.error ?? e?.message ?? "Terjadi kesalahan. Coba lagi.");
    };

    if (mode === "register") {
      registerMutation.mutate(
        { data: { username: username.trim(), password, displayName: displayName.trim() } },
        { onSuccess: onSuccess as never, onError }
      );
    } else {
      loginMutation.mutate(
        { data: { username: username.trim(), password } },
        { onSuccess: onSuccess as never, onError }
      );
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        style={{ backgroundColor: c.background }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[c.primary + "18", "transparent"]}
          style={styles.heroGradient}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />

        <DlavieLogo size={88} />
        <Text style={[styles.title, { color: c.foreground }]}>DLChat</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          {mode === "login" ? "Masuk ke akunmu" : "Buat akun baru"}
        </Text>

        {/* Mode toggle */}
        <View style={[styles.toggleRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "login" && { backgroundColor: c.primary }]}
            onPress={() => switchMode("login")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: mode === "login" ? "#fff" : c.mutedForeground }]}>
              Masuk
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === "register" && { backgroundColor: c.primary }]}
            onPress={() => switchMode("register")}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, { color: mode === "register" ? "#fff" : c.mutedForeground }]}>
              Daftar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Display name (register only) */}
        {mode === "register" && (
          <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>Nama Tampilan</Text>
            <TextInput
              style={[styles.input, { color: c.foreground }]}
              placeholder="Nama kamu"
              placeholderTextColor={c.mutedForeground}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={64}
              autoFocus
            />
          </View>
        )}

        {/* Username */}
        <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>Username</Text>
          <TextInput
            style={[styles.input, { color: c.foreground }]}
            placeholder="contoh: budi123"
            placeholderTextColor={c.mutedForeground}
            value={username}
            onChangeText={(v) => setUsername(v.replace(/\s/g, ""))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
            autoFocus={mode === "login"}
          />
        </View>

        {/* Password */}
        <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, { color: c.foreground }]}
              placeholder={mode === "register" ? "Minimal 6 karakter" : "Password kamu"}
              placeholderTextColor={c.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={128}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Text style={{ color: c.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" }}>
                {showPassword ? "Sembunyikan" : "Lihat"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: c.danger + "15", borderColor: c.danger + "30" }]}>
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.continueBtn, { opacity: isPending ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
        >
          <LinearGradient colors={c.primaryGradient} style={styles.continueBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueBtnText}>
                {mode === "login" ? "Masuk →" : "Daftar →"}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.features}>
          {([
            { icon: <RobotIcon size={15} />, label: "AI Friends" },
            { icon: <FireIcon size={15} />, label: "Streaks" },
            { icon: <ChatBubbleIcon size={15} />, label: "Real-time Chat" },
          ] as const).map(({ icon, label }) => (
            <View key={label} style={[styles.featureChip, { backgroundColor: c.surface, borderColor: c.border }]}>
              {icon}
              <Text style={[styles.featureText, { color: c.mutedForeground }]}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
          Dengan melanjutkan, kamu menyetujui Syarat Layanan dan Kebijakan Privasi kami.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  heroGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  title: { fontSize: 34, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 8, marginTop: 18 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 28, fontFamily: "Inter_400Regular", lineHeight: 22 },
  toggleRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 20, gap: 4, width: "100%" },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  inputWrap: { width: "100%", borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  input: { fontSize: 16, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  passwordInput: { flex: 1 },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },
  errorBox: { width: "100%", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  continueBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 20, marginTop: 4 },
  continueBtnGradient: { height: 58, alignItems: "center", justifyContent: "center" },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  features: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" },
  featureChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  featureText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular" },
});
