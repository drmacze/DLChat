import React, { useRef } from "react";
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

interface FABProps {
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  size?: number;
}

export default function FloatingActionButton({
  onPress,
  icon = "edit",
  size = 56,
}: FABProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
      Animated.timing(glow, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  const glowSize = glow.interpolate({ inputRange: [0, 1], outputRange: [size + 8, size + 20] });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            width: glowSize,
            height: glowSize,
            borderRadius: size,
            top: -(size * 0.2),
            left: -(size * 0.2),
          },
        ]}
      />
      <Animated.View style={[styles.wrapper, { transform: [{ scale }], width: size, height: size, borderRadius: size / 2 }]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.touchable, { width: size, height: size, borderRadius: size / 2 }]}
        >
          {Platform.OS === "ios" ? (
            <BlurView intensity={20} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: "hidden" }]} />
          ) : null}
          <LinearGradient
            colors={["#2AABEE", "#1A8CC7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: size / 2 }]}
          >
            <View style={styles.innerBorder}>
              <Feather name={icon} size={size * 0.38} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  glow: {
    position: "absolute",
    backgroundColor: "#2AABEE",
    shadowColor: "#2AABEE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  wrapper: {
    shadowColor: "#2AABEE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
    overflow: "visible",
  },
  touchable: {
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  innerBorder: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.25)",
    padding: 2,
  },
});
