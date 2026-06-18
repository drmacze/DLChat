import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { FireIcon } from "@/components/common/SvgIcons";

interface StreakBadgeProps {
  streak: number;
  size?: "sm" | "md" | "lg";
}

export default function StreakBadge({ streak, size = "md" }: StreakBadgeProps) {
  const { c } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak > 0) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.2, useNativeDriver: true, tension: 200 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200 }),
      ]).start();
    }
  }, [streak]);

  if (streak <= 0) return null;

  const sizes = {
    sm: { badge: 28, fire: 14, text: 11, px: 8 },
    md: { badge: 36, fire: 18, text: 13, px: 10 },
    lg: { badge: 52, fire: 26, text: 16, px: 14 },
  };
  const s = sizes[size];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <LinearGradient
        colors={c.streakGradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.badge, { height: s.badge, borderRadius: s.badge / 2, paddingHorizontal: s.px }]}
      >
        <FireIcon size={s.fire} />
        <Text style={[styles.count, { fontSize: s.text }]}>{streak}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 3 },
  count: { color: "#fff", fontWeight: "800", fontFamily: "Inter_700Bold" },
});
