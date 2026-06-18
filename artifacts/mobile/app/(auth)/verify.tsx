import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useVerifyOtp, useRequestOtp } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

function ShieldCheckIcon({ size = 44, color = "#2AABEE" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill={color} opacity={0.15} />
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function VerifyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const { setAuth } = useAuth();
  const verifyOtp = useVerifyOtp();
  const requestOtp = useRequestOtp();

  const handleVerify = () => {
    if (code.length < 4) { setError("Enter the full verification code"); return; }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    verifyOtp.mutate(
      { data: { phoneNumber: phone!, code } },
      {
        onSuccess: async (data: unknown) => {
          const d = data as { token: string; user: Parameters<typeof setAuth>[1]; isNewUser: boolean };
          await setAuth(d.token, d.user);
          if (d.isNewUser) {
            router.replace("/(auth)/onboarding");
          } else {
            router.replace("/(tabs)/chats");
          }
        },
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { error?: string } } };
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(e?.response?.data?.error ?? "Invalid code. Please try again.");
        },
      }
    );
  };

  const handleResend = () => {
    if (!phone) return;
    requestOtp.mutate(
      { data: { phoneNumber: phone } },
      {
        onSuccess: () => setError("New code sent!"),
        onError: () => setError("Failed to resend. Try again."),
      }
    );
  };

  const isSuccess = error === "New code sent!";

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M15 18l-6-6 6-6" stroke={c.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={[styles.backText, { color: c.primary }]}>Back</Text>
      </TouchableOpacity>

      <LinearGradient colors={[c.primary + "14", "transparent"]} style={styles.heroGradient} />

      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: c.primary + "18" }]}>
          <ShieldCheckIcon size={40} color={c.primary} />
        </View>

        <Text style={[styles.title, { color: c.foreground }]}>Verify number</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Code sent to{"\n"}{phone}
        </Text>

        <View style={[styles.codeContainer, { backgroundColor: c.surface, borderColor: code.length > 0 ? c.primary : c.border }]}>
          <TextInput
            style={[styles.codeInput, { color: c.foreground }]}
            placeholder="- - - - - -"
            placeholderTextColor={c.mutedForeground}
            value={code}
            onChangeText={(v) => { setCode(v.replace(/\D/g, "").slice(0, 8)); setError(""); }}
            keyboardType="number-pad"
            maxLength={8}
            autoFocus
            textAlign="center"
          />
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: isSuccess ? c.success + "18" : c.danger + "18", borderColor: isSuccess ? c.success + "30" : c.danger + "30" }]}>
            <Text style={[styles.errorText, { color: isSuccess ? c.success : c.danger }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.verifyBtn, { opacity: verifyOtp.isPending ? 0.6 : 1 }]}
          onPress={handleVerify}
          disabled={verifyOtp.isPending}
          activeOpacity={0.8}
        >
          <LinearGradient colors={c.primaryGradient} style={styles.verifyBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {verifyOtp.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify →</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={requestOtp.isPending} style={{ marginTop: 20 }}>
          <Text style={[styles.resendText, { color: requestOtp.isPending ? c.mutedForeground : c.primary }]}>
            {requestOtp.isPending ? "Sending..." : "Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  heroGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  backText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, fontFamily: "Inter_400Regular", lineHeight: 22 },
  codeContainer: { width: "100%", borderRadius: 16, borderWidth: 1.5, height: 68, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  codeInput: { fontSize: 32, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 10, width: "100%", textAlign: "center" },
  errorBox: { width: "100%", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  verifyBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  verifyBtnGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  verifyBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resendText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
