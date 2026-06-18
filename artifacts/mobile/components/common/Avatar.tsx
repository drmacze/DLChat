import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import colors from "@/constants/colors";

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  isOnline?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColor(name: string): string {
  const palette = [
    "#2AABEE", "#229ED9", "#4CAF50", "#FF5722", "#9C27B0",
    "#FF9800", "#00BCD4", "#E91E63", "#3F51B5", "#009688",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function Avatar({ uri, name, size = 44, isOnline }: AvatarProps) {
  const c = colors.dark;
  const initials = getInitials(name || "?");
  const bgColor = getColor(name || "?");

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
        </View>
      )}
      {isOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              borderWidth: size * 0.06,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#fff",
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  onlineDot: {
    position: "absolute",
    backgroundColor: colors.dark.online,
    borderColor: colors.dark.background,
  },
});
