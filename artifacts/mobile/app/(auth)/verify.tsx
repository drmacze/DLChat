import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useVerifyOtp, useRequestOtp } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";

export default function VerifyScreen() {
  const c = colors.dark;
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
        onSuccess: async (data) => {
          await setAuth(data.token, data.user as Parameters<typeof setAuth>[1]);
          if (data.isNewUser) {
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

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: c.primary }]}>← Back</Text>
      </TouchableOpacity>

      <LinearGradient colors={["#2AABEE30", "transparent"]} style={styles.heroGradient} />

      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: c.surface }]}>
          <Text style={{ fontSize: 36 }}>💬</Text>
        </View>
        <Text style={[styles.title, { color: c.foreground }]}>Verify number</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Code sent to {phone}
        </Text>

        <View style={[styles.codeContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            style={[styles.codeInput, { color: c.foreground }]}
            placeholder="Enter code"
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
          <View style={[styles.errorBox, { backgroundColor: error === "New code sent!" ? "#22C55E20" : "#EF444420", borderColor: error === "New code sent!" ? "#22C55E40" : "#EF444440" }]}>
            <Text style={[styles.errorText, { color: error === "New code sent!" ? "#22C55E" : "#EF4444" }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.verifyBtn, { opacity: verifyOtp.isPending ? 0.6 : 1 }]}
          onPress={handleVerify}
          disabled={verifyOtp.isPending}
          activeOpacity={0.8}
        >
          <LinearGradient colors={["#2AABEE", "#1A8CC7"]} style={styles.verifyBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {verifyOtp.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={requestOtp.isPending} style={{ marginTop: 16 }}>
          <Text style={[styles.resendText, { color: c.primary }]}>
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
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  icon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, fontFamily: "Inter_400Regular" },
  codeContainer: { width: "100%", borderRadius: 16, borderWidth: 1, height: 64, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  codeInput: { fontSize: 28, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 8, width: "100%", textAlign: "center" },
  errorBox: { width: "100%", borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  verifyBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  verifyBtnGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  verifyBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resendText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
