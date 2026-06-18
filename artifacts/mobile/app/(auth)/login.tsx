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
import DlavieLogo from "@/components/common/DlavieLogo";

const COUNTRY_CODES = [
  { code: "+1",  name: "US" },
  { code: "+62", name: "ID" },
  { code: "+44", name: "UK" },
  { code: "+65", name: "SG" },
  { code: "+61", name: "AU" },
  { code: "+49", name: "DE" },
  { code: "+33", name: "FR" },
  { code: "+81", name: "JP" },
  { code: "+91", name: "IN" },
  { code: "+55", name: "BR" },
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
          colors={["#2AABEE14", "transparent"]}
          style={styles.heroGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <DlavieLogo size={88} />

        <Text style={[styles.title, { color: c.foreground }]}>Dlavie Chat</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Enter your phone number to get started
        </Text>

        <View style={[styles.phoneContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.codeSelector, { borderRightColor: c.border }]}>
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
                countryCode === cc.code
                  ? { backgroundColor: c.primary, borderColor: c.primary }
                  : { backgroundColor: c.surface, borderColor: c.border },
              ]}
              onPress={() => setCountryCode(cc.code)}
              activeOpacity={0.75}
            >
              <Text style={[styles.countryDialCode, { color: countryCode === cc.code ? "#fff" : c.mutedForeground }]}>
                {cc.code}
              </Text>
              <Text style={[styles.countryName, { color: countryCode === cc.code ? "#ffffffcc" : c.mutedForeground + "99" }]}>
                {cc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#EF444418", borderColor: "#EF444430" }]}>
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
          By continuing, you agree to our Terms of Service and Privacy Policy.{"\n"}A verification code will be sent via SMS.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  heroGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 320 },
  title: { fontSize: 30, fontWeight: "800", fontFamily: "Inter_700Bold", marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 15, textAlign: "center", marginBottom: 32, fontFamily: "Inter_400Regular", lineHeight: 22 },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    height: 56,
    marginBottom: 12,
  },
  codeSelector: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 6, borderRightWidth: 1, height: "100%" },
  code: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  phoneInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", paddingHorizontal: 14 },
  countryList: { width: "100%", marginBottom: 16 },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
    minWidth: 64,
  },
  countryDialCode: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  countryName: { fontSize: 11, fontFamily: "Inter_400Regular" },
  errorBox: { width: "100%", borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 16 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  continueBtn: { width: "100%", borderRadius: 14, overflow: "hidden", marginBottom: 16, marginTop: 4 },
  continueBtnGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  disclaimer: { fontSize: 12, textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular", paddingHorizontal: 8 },
});
