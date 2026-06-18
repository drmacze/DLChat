import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useTutorial, TutorialKey } from "@/context/TutorialContext";

interface Step {
  icon: string;
  title: string;
  description: string;
}

interface TutorialOverlayProps {
  tutorialKey: TutorialKey;
  steps: Step[];
}

const { width } = Dimensions.get("window");

export default function TutorialOverlay({ tutorialKey, steps }: TutorialOverlayProps) {
  const { c } = useTheme();
  const { isSeen, markSeen } = useTutorial();
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(40)).current;

  const seen = isSeen(tutorialKey);

  useEffect(() => {
    if (!seen) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [seen]);

  if (seen) return null;

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 30, duration: 200, useNativeDriver: true }),
    ]).start(() => markSeen(tutorialKey));
  };

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="box-none">
      <View style={styles.backdrop} />
      <Animated.View style={[styles.card, { backgroundColor: c.surface, borderColor: c.glassBorder, transform: [{ translateY: slideY }] }]}>
        <LinearGradient
          colors={c.primaryGradient}
          style={styles.cardAccent}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
        <View style={styles.cardContent}>
          <View style={styles.steps}>
            {steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: c.primary + "22" }]}>
                  <Feather name={step.icon as any} size={18} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: c.foreground }]}>{step.title}</Text>
                  <Text style={[styles.stepDesc, { color: c.mutedForeground }]}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={dismiss} activeOpacity={0.8}>
            <LinearGradient colors={c.primaryGradient} style={styles.gotItBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.gotItText}>Got it! 👍</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", bottom: 100, left: 16, right: 16, zIndex: 999 },
  backdrop: { position: "absolute", top: -1000, left: -100, right: -100, bottom: -200 },
  card: { borderRadius: 20, overflow: "hidden", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },
  cardAccent: { height: 3 },
  cardContent: { padding: 20 },
  steps: { gap: 14, marginBottom: 20 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 2 },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  gotItBtn: { borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  gotItText: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
