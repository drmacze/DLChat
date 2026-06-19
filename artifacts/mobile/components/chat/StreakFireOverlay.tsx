import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
  Easing,
  interpolate,
} from "react-native-reanimated";

const { width: SW, height: SH } = Dimensions.get("window");

const MILESTONES = [5, 10, 20, 50, 100, 200];

export function isMilestone(count: number): boolean {
  return MILESTONES.includes(count);
}

const PARTICLES: { angle: number; dist: number; rise: number; size: number; delay: number }[] = [
  { angle: -60, dist: 55, rise: 180, size: 32, delay: 0 },
  { angle: -30, dist: 70, rise: 210, size: 24, delay: 80 },
  { angle: 0,   dist: 30, rise: 240, size: 40, delay: 40 },
  { angle: 30,  dist: 70, rise: 200, size: 26, delay: 120 },
  { angle: 60,  dist: 55, rise: 170, size: 30, delay: 60 },
  { angle: -80, dist: 90, rise: 150, size: 20, delay: 160 },
  { angle: 80,  dist: 90, rise: 155, size: 22, delay: 100 },
  { angle: -15, dist: 50, rise: 260, size: 36, delay: 20 },
  { angle: 15,  dist: 50, rise: 250, size: 28, delay: 140 },
  { angle: -45, dist: 100, rise: 130, size: 18, delay: 200 },
  { angle: 45,  dist: 100, rise: 140, size: 20, delay: 180 },
  { angle: 5,   dist: 25, rise: 290, size: 44, delay: 10 },
];

function FireParticle({
  angle,
  dist,
  rise,
  size,
  delay,
  active,
}: {
  angle: number;
  dist: number;
  rise: number;
  size: number;
  delay: number;
  active: boolean;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (active) {
      p.value = 0;
      p.value = withDelay(
        delay,
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) })
      );
    } else {
      p.value = 0;
    }
  }, [active]);

  const rad = (angle * Math.PI) / 180;
  const endX = Math.sin(rad) * dist;

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.1, 0.7, 1], [0, 1, 0.9, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 1], [0, endX]) },
      { translateY: interpolate(p.value, [0, 1], [0, -rise]) },
      { scale: interpolate(p.value, [0, 0.15, 0.6, 1], [0.2, 1.3, 1.0, 0.4]) },
    ],
  }));

  return (
    <Animated.Text style={[{ fontSize: size, position: "absolute" }, style]}>
      🔥
    </Animated.Text>
  );
}

interface Props {
  visible: boolean;
  streak: number;
  messagesCount: number;
  onHide: () => void;
}

export default function StreakFireOverlay({ visible, streak, messagesCount, onHide }: Props) {
  const backdrop = useSharedValue(0);
  const fireScale = useSharedValue(0);
  const fireGlow = useSharedValue(0);
  const numScale = useSharedValue(0);
  const labelY = useSharedValue(30);
  const labelOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  const hide = useCallback(() => {
    backdrop.value = withTiming(0, { duration: 400 });
    fireScale.value = withTiming(0, { duration: 300 });
    numScale.value = withTiming(0, { duration: 300 });
    labelOpacity.value = withTiming(0, { duration: 300 });
    ringOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => runOnJS(onHide)(), 400);
  }, [onHide]);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(1, { duration: 350 });

      fireScale.value = withSequence(
        withSpring(1.35, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 150 })
      );

      ringScale.value = withDelay(100, withSpring(1.0, { damping: 8, stiffness: 120 }));
      ringOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));

      fireGlow.value = withDelay(
        200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        )
      );

      numScale.value = withDelay(300, withSpring(1, { damping: 5, stiffness: 180 }));
      labelY.value = withDelay(400, withSpring(0, { damping: 12, stiffness: 140 }));
      labelOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));

      const timer = setTimeout(hide, 2800);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const fireStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fireGlow.value, [0, 1], [0.25, 0.65]),
    transform: [
      { scale: interpolate(fireGlow.value, [0, 1], [1.0, 1.18]) },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringOpacity.value, [0, 1], [0, 0.45]),
    transform: [{ scale: ringScale.value }],
  }));

  const numStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ translateY: labelY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={hide}>
        <View style={styles.root}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />

          <View style={styles.centerCol}>
            <View style={styles.fireContainer}>
              {PARTICLES.map((p, i) => (
                <FireParticle key={i} {...p} active={visible} />
              ))}

              <Animated.View style={[styles.ring, ringStyle]} />
              <Animated.View style={[styles.glow, glowStyle]} />

              <Animated.Text style={[styles.fireBig, fireStyle]}>
                🔥
              </Animated.Text>
            </View>

            <Animated.View style={[styles.textBlock, numStyle]}>
              <Text style={styles.streakNum}>{streak > 0 ? streak : "🔥"}</Text>
            </Animated.View>

            <Animated.View style={[styles.labelsBlock, labelStyle]}>
              {streak > 1 ? (
                <Text style={styles.streakLabel}>HARI BERTURUT-TURUT</Text>
              ) : (
                <Text style={styles.streakLabel}>STREAK DIMULAI!</Text>
              )}
              <Text style={styles.msgLabel}>💬 {messagesCount} pesan dikirim</Text>
            </Animated.View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  centerCol: {
    alignItems: "center",
    gap: 8,
  },
  fireContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: "#FF6B00",
  },
  glow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FF4500",
  },
  fireBig: {
    fontSize: 90,
    textShadowColor: "#FF6B00",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  textBlock: {
    marginTop: 8,
  },
  streakNum: {
    fontSize: 72,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "#FF6B00",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    fontFamily: "Inter_700Bold",
  },
  labelsBlock: {
    alignItems: "center",
    gap: 6,
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFB347",
    letterSpacing: 3,
    fontFamily: "Inter_700Bold",
  },
  msgLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
  },
});
