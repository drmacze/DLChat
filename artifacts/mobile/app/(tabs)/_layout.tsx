import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function TabLayout() {
  const { c, theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : c.tabBarBg,
          borderTopColor: c.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          ...(Platform.OS === "web" ? { height: 84 } : {}),
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 2 },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={85}
              tint={theme === "dark" ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : Platform.OS === "web" ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tabBarBg }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === "ios" ? (
              <SymbolView name={focused ? "message.fill" : "message"} tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === "ios" ? (
              <SymbolView name={focused ? "square.grid.2x2.fill" : "square.grid.2x2"} tintColor={color} size={24} />
            ) : (
              <Feather name="grid" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === "ios" ? (
              <SymbolView name={focused ? "person.2.fill" : "person.2"} tintColor={color} size={24} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            Platform.OS === "ios" ? (
              <SymbolView name={focused ? "person.fill" : "person"} tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
