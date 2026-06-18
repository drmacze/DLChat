import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useVerifyOtp, useRequestOtp } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const RESEND_COUNTDOWN = 60;

function ShieldCheckIcon({ size = 44, color = "#2AABEE" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill={color} opacity={0.15} />
      <Path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill="none" />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CountdownRing({ seconds, total, color }: { seconds: number; total: number; color: string }) {
  const size = 44;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        opacity={0.15}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export default function VerifyScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setAuth } = useAuth();
  const verifyOtp = useVerifyOtp();
  const requestOtp = useRequestOtp();

  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(RESEND_COUNTDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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
    if (!phone || countdown > 0 || requestOtp.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    requestOtp.mutate(
      { data: { phoneNumber: phone } },
      {
        onSuccess: () => {
          setError("New code sent!");
          setCode("");
          startCountdown();
        },
        onError: () => setError("Failed to resend. Try again."),
      }
    );
  };

  const isSuccess = error === "New code sent!";
  const canResend = countdown === 0 && !requestOtp.isPending;

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

        {/* Resend section with countdown */}
        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <>
              <View style={styles.countdownRing}>
                <CountdownRing seconds={countdown} total={RESEND_COUNTDOWN} color={c.primary} />
                <Text style={[styles.countdownNumber, { color: c.primary }]}>{countdown}</Text>
              </View>
              <Text style={[styles.resendHint, { color: c.mutedForeground }]}>
                Resend code in <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold" }}>{countdown}s</Text>
              </Text>
            </>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend}
              activeOpacity={0.7}
              style={[styles.resendBtn, { borderColor: c.primary + "40", backgroundColor: c.primary + "12" }]}
            >
              {requestOtp.isPending ? (
                <ActivityIndicator color={c.primary} size="small" />
              ) : (
                <Text style={[styles.resendBtnText, { color: c.primary }]}>Resend code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
          Didn't get it? Check your WhatsApp messages.
        </Text>
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
  resendRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, marginBottom: 12 },
  countdownRing: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  countdownNumber: { position: "absolute", fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resendHint: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, borderWidth: 1, minWidth: 140, alignItems: "center", justifyContent: "center" },
  resendBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  disclaimer: { fontSize: 12, textAlign: "center", fontFamily: "Inter_400Regular", marginTop: 4 },
});
