import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { MessageCircle, LayoutGrid, Users, User } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, View, type ColorValue } from "react-native";
import { useTheme } from "@/context/ThemeContext";

function TabIcon({
  icon,
  iosName,
  iosFocused,
  color,
  focused,
}: {
  icon: React.ReactNode;
  iosName: string;
  iosFocused: string;
  color: ColorValue;
  focused: boolean;
}) {
  return (
    <View style={styles.tabIconWrap}>
      {Platform.OS === "ios" ? (
        <SymbolView name={(focused ? iosFocused : iosName) as any} tintColor={color} size={23} />
      ) : (
        icon
      )}
      {focused && (
        <View style={[styles.tabDot, { backgroundColor: color }]} />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { c, theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : c.tabBarBg,
          borderTopColor: c.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          ...(Platform.OS === "web" ? { height: 84 } : { height: 60 }),
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontFamily: "Inter_500Medium",
          marginBottom: Platform.OS === "android" ? 4 : 2,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint={theme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
              style={StyleSheet.absoluteFill}
            />
          ) : Platform.OS === "web" ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tabBarBg }]} />
          ) : null,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={<MessageCircle size={22} color={color} strokeWidth={focused ? 2 : 1.6} />}
              iosName="message"
              iosFocused="message.fill"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={<LayoutGrid size={22} color={color} strokeWidth={focused ? 2 : 1.6} />}
              iosName="square.grid.2x2"
              iosFocused="square.grid.2x2.fill"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={<Users size={22} color={color} strokeWidth={focused ? 2 : 1.6} />}
              iosName="person.2"
              iosFocused="person.2.fill"
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={<User size={22} color={color} strokeWidth={focused ? 2 : 1.6} />}
              iosName="person"
              iosFocused="person.fill"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    gap: 3,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
});
