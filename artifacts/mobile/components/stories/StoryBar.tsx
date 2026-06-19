import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";

interface StoryBarProps {
  stories: Array<{
    user: { id: string; displayName: string; avatarUrl?: string | null };
    hasUnviewed: boolean;
  }>;
  onPress: (userId: string) => void;
  onAddStory?: () => void;
  myUser?: { id: string; displayName: string; avatarUrl?: string | null };
}

export default function StoryBar({ stories, onPress, onAddStory, myUser }: StoryBarProps) {
  const { c } = useTheme();

  const myStory = stories.find((s) => s.user.id === myUser?.id);

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {myUser && (
          <TouchableOpacity
            style={styles.item}
            onPress={() => myStory ? onPress(myUser.id) : onAddStory?.()}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.ring,
                {
                  borderColor: myStory ? c.primary : "transparent",
                  backgroundColor: c.background,
                },
              ]}
            >
              <Avatar uri={myUser.avatarUrl} name={myUser.displayName} size={52} />
              {!myStory && (
                <View style={[styles.addBadge, { backgroundColor: c.primary }]}>
                  <Text style={styles.addPlus}>+</Text>
                </View>
              )}
            </View>
            <Text style={[styles.name, { color: c.mutedForeground }]} numberOfLines={1}>
              My Story
            </Text>
          </TouchableOpacity>
        )}

        {stories
          .filter((s) => s.user.id !== myUser?.id)
          .map(({ user, hasUnviewed }) => (
            <TouchableOpacity
              key={user.id}
              style={styles.item}
              onPress={() => onPress(user.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.ring,
                  {
                    borderColor: hasUnviewed ? c.primary : c.border,
                    backgroundColor: c.background,
                  },
                ]}
              >
                <Avatar uri={user.avatarUrl} name={user.displayName} size={52} />
              </View>
              <Text style={[styles.name, { color: c.mutedForeground }]} numberOfLines={1}>
                {user.displayName.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  item: {
    alignItems: "center",
    gap: 5,
    width: 66,
  },
  ring: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    width: 64,
  },
  addBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addPlus: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
});
