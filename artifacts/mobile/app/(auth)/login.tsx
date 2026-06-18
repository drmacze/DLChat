import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRequestOtp } from "@workspace/api-client-react";
import { useTheme } from "@/context/ThemeContext";
import DlavieLogo from "@/components/common/DlavieLogo";

const COUNTRY_CODES = [
  { code: "+62", name: "ID", flag: "🇮🇩" },
  { code: "+1",  name: "US", flag: "🇺🇸" },
  { code: "+44", name: "UK", flag: "🇬🇧" },
  { code: "+65", name: "SG", flag: "🇸🇬" },
  { code: "+61", name: "AU", flag: "🇦🇺" },
  { code: "+49", name: "DE", flag: "🇩🇪" },
  { code: "+33", name: "FR", flag: "🇫🇷" },
  { code: "+81", name: "JP", flag: "🇯🇵" },
  { code: "+91", name: "IN", flag: "🇮🇳" },
  { code: "+55", name: "BR", flag: "🇧🇷" },
];

export default function LoginScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [error, setError] = useState("");
  const requestOtp = useRequestOtp();

  const selectedCountry = COUNTRY_CODES.find(cc => cc.code === countryCode);

  const handleContinue = async () => {
    const fullPhone = `${countryCode}${phone.replace(/^0/, "")}`;
    if (phone.length < 6) { setError("Please enter a valid phone number"); return; }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestOtp.mutate(
      { data: { phoneNumber: fullPhone } },
      {
        onSuccess: () => router.push({ pathname: "/(auth)/verify", params: { phone: fullPhone } }),
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { error?: string } } };
          setError(e?.response?.data?.error ?? "Failed to send OTP. Please try again.");
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        style={{ backgroundColor: c.background }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Background gradient */}
        <LinearGradient
          colors={[c.primary + "18", "transparent"]}
          style={styles.heroGradient}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />

        <DlavieLogo size={88} />
        <Text style={[styles.title, { color: c.foreground }]}>DLChat</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Enter your phone number to get started
        </Text>

        {/* Phone input */}
        <View style={[styles.phoneContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.codeSelector, { borderRightColor: c.border }]}>
            <Text style={{ fontSize: 18 }}>{selectedCountry?.flag}</Text>
            <Text style={[styles.code, { color: c.foreground }]}>{countryCode}</Text>
          </View>
          <TextInput
            style={[styles.phoneInput, { color: c.foreground }]}
            placeholder="8xx xxxx xxxx"
            placeholderTextColor={c.mutedForeground}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={15}
            autoFocus
          />
        </View>

        {/* Country picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.countryList}
          contentContainerStyle={{ gap: 8 }}
        >
          {COUNTRY_CODES.map((cc) => {
            const selected = countryCode === cc.code;
            return (
              <TouchableOpacity
                key={cc.code}
                style={[
                  styles.countryChip,
                  selected
                    ? { backgroundColor: c.primary, borderColor: c.primary }
                    : { backgroundColor: c.surface, borderColor: c.border },
                ]}
                onPress={() => setCountryCode(cc.code)}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 16 }}>{cc.flag}</Text>
                <Text style={[styles.countryDialCode, { color: selected ? "#fff" : c.mutedForeground }]}>
                  {cc.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: c.danger + "15", borderColor: c.danger + "30" }]}>
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.continueBtn, { opacity: requestOtp.isPending ? 0.6 : 1 }]}
          onPress={handleContinue}
          disabled={requestOtp.isPending}
          activeOpacity={0.85}
        >
          <LinearGradient colors={c.primaryGradient} style={styles.continueBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {requestOtp.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueBtnText}>Continue →</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.features}>
          {["🤖 AI Friends", "🔥 Streaks", "💬 Real-time Chat"].map((f) => (
            <View key={f} style={[styles.featureChip, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.featureText, { color: c.mutedForeground }]}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.{"\n"}A verification code will be sent via WhatsApp.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  heroGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 280 },
  title: { fontSize: 34, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 8, marginTop: 18 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, fontFamily: "Inter_400Regular", lineHeight: 22 },
  phoneContainer: { flexDirection: "row", alignItems: "center", width: "100%", borderRadius: 16, borderWidth: 1, overflow: "hidden", height: 58, marginBottom: 12 },
  codeSelector: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 6, borderRightWidth: 1, height: "100%" },
  code: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingHorizontal: 14 },
  countryList: { width: "100%", marginBottom: 16 },
  countryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 5 },
  countryDialCode: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  errorBox: { width: "100%", borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  continueBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 20, marginTop: 4 },
  continueBtnGradient: { height: 58, alignItems: "center", justifyContent: "center" },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  features: { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" },
  featureChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  featureText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular" },
});
