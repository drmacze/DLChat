import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRequestOtp } from "@workspace/api-client-react";
import colors from "@/constants/colors";

const COUNTRY_CODES = [
  { flag: "🇺🇸", code: "+1", name: "US" },
  { flag: "🇮🇩", code: "+62", name: "ID" },
  { flag: "🇬🇧", code: "+44", name: "UK" },
  { flag: "🇸🇬", code: "+65", name: "SG" },
  { flag: "🇦🇺", code: "+61", name: "AU" },
  { flag: "🇩🇪", code: "+49", name: "DE" },
  { flag: "🇫🇷", code: "+33", name: "FR" },
  { flag: "🇯🇵", code: "+81", name: "JP" },
  { flag: "🇮🇳", code: "+91", name: "IN" },
  { flag: "🇧🇷", code: "+55", name: "BR" },
];

export default function LoginScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [error, setError] = useState("");
  const requestOtp = useRequestOtp();

  const handleContinue = async () => {
    const fullPhone = `${countryCode}${phone.replace(/^0/, "")}`;
    if (phone.length < 6) {
      setError("Please enter a valid phone number");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    requestOtp.mutate(
      { data: { phoneNumber: fullPhone } },
      {
        onSuccess: () => {
          router.push({ pathname: "/(auth)/verify", params: { phone: fullPhone } });
        },
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
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        style={{ backgroundColor: c.background }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#2AABEE20", "transparent"]}
          style={styles.heroGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={styles.logo}>
          <LinearGradient
            colors={["#2AABEE", "#1A6EDB"]}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoText}>D</Text>
          </LinearGradient>
        </View>

        <Text style={[styles.title, { color: c.foreground }]}>Dlavie Chat</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Enter your phone number to get started
        </Text>

        <View style={[styles.phoneContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.codeSelector, { borderRightColor: c.border }]}>
            <Text style={[styles.flag]}>
              {COUNTRY_CODES.find((cc) => cc.code === countryCode)?.flag ?? "🌍"}
            </Text>
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryList} contentContainerStyle={{ gap: 8 }}>
          {COUNTRY_CODES.map((cc) => (
            <TouchableOpacity
              key={cc.code}
              style={[
                styles.countryChip,
                { backgroundColor: countryCode === cc.code ? c.primary : c.surface, borderColor: c.border },
              ]}
              onPress={() => setCountryCode(cc.code)}
            >
              <Text style={styles.countryFlag}>{cc.flag}</Text>
              <Text style={[styles.countryName, { color: countryCode === cc.code ? "#fff" : c.mutedForeground }]}>
                {cc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#EF444420", borderColor: "#EF444440" }]}>
            <Text style={[styles.errorText, { color: "#EF4444" }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.continueBtn, { opacity: requestOtp.isPending ? 0.6 : 1 }]}
          onPress={handleContinue}
          disabled={requestOtp.isPending}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#2AABEE", "#1A8CC7"]}
            style={styles.continueBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {requestOtp.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueBtnText}>Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: c.mutedForeground }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
          A verification code will be sent via SMS.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  heroGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  logo: { marginBottom: 20 },
  logoGradient: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 44, fontWeight: "900" },
  title: { fontSize: 32, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, fontFamily: "Inter_400Regular", lineHeight: 22 },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    height: 56,
    marginBottom: 12,
  },
  codeSelector: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 6, borderRightWidth: 1, height: "100%" },
  flag: { fontSize: 22 },
  code: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingHorizontal: 14 },
  countryList: { width: "100%", marginBottom: 16 },
  countryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  countryFlag: { fontSize: 16 },
  countryName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  errorBox: { width: "100%", borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  continueBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginBottom: 16, marginTop: 8 },
  continueBtnGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular", paddingHorizontal: 8 },
});
