import React, { useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/utils/api";
import { useTheme } from "@/context/ThemeContext";

export default function SavedMessagesRedirect() {
  const { c } = useTheme();

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("auth_token");
        const res = await fetch(`${BASE_URL}/api/conversations/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (data.id) {
          router.replace(`/chat/${data.id}`);
        }
      } catch {
        router.back();
      }
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: c.background as string }]}>
      <ActivityIndicator color={c.primary as string} size="large" />
      <Text style={[styles.text, { color: c.mutedForeground as string }]}>Membuka Pesan Tersimpan...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  text: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
