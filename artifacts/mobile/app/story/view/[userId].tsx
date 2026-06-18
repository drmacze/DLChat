import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Animated,
  Dimensions, ActivityIndicator, Alert, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

const { width } = Dimensions.get("window");
const STORY_DURATION = 5000;

interface Story {
  id: string;
  type: string;
  content?: string | null;
  mediaUrl?: string | null;
  backgroundColor?: string | null;
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  isViewedByMe: boolean;
  author: { id: string; displayName: string; avatarUrl?: string | null };
}

interface StoryGroup {
  user: { id: string; displayName: string; avatarUrl?: string | null };
  stories: Story[];
  hasUnviewed: boolean;
}

function getTimeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hr lalu`;
}

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { token } = useAuth();
  const [group, setGroup] = useState<StoryGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const progress = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!token || !userId) return;
    fetch(`${BASE_URL}/api/stories`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const found = (d.stories as StoryGroup[])?.find((g) => g.user.id === userId);
        setGroup(found ?? null);
      })
      .catch(() => Alert.alert("Error", "Tidak dapat memuat story."))
      .finally(() => setLoading(false));
  }, [token, userId]);

  const markViewed = useCallback(async (storyId: string) => {
    if (!token) return;
    await fetch(`${BASE_URL}/api/stories/${storyId}/view`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [token]);

  const advanceStory = useCallback(() => {
    if (!group) return;
    if (currentIndex < group.stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      router.back();
    }
  }, [group, currentIndex]);

  useEffect(() => {
    if (!group?.stories[currentIndex]) return;
    markViewed(group.stories[currentIndex].id);
    progress.setValue(0);
    progressAnim.current?.stop();
    progressAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    progressAnim.current.start(({ finished }) => { if (finished) advanceStory(); });
    return () => { progressAnim.current?.stop(); };
  }, [group, currentIndex]);

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!group || group.stories.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#fff" }}>Story tidak tersedia</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#aaa" }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const story = group.stories[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: story.backgroundColor ?? "#000" }]}>
      {story.type === "image" && story.mediaUrl ? (
        <Image source={{ uri: story.mediaUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}

      <View style={[styles.overlay, { paddingTop: Platform.OS === "web" ? 40 : insets.top + 8 }]}>
        <View style={styles.progressRow}>
          {group.stories.map((_, idx) => (
            <View key={idx} style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.35)" }]}>
              {idx < currentIndex ? (
                <View style={[styles.progressFill, { width: "100%", backgroundColor: "#fff" }]} />
              ) : idx === currentIndex ? (
                <Animated.View style={[styles.progressFill, {
                  width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  backgroundColor: "#fff",
                }]} />
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.authorRow}>
          <Avatar uri={group.user.avatarUrl} name={group.user.displayName} size={38} />
          <View>
            <Text style={styles.authorName}>{group.user.displayName}</Text>
            <Text style={styles.storyTime}>{getTimeAgo(story.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {story.type === "text" && story.content ? (
        <View style={styles.textContent}>
          <Text style={styles.storyText}>{story.content}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.viewCount}>
          <Feather name="eye" size={13} color="rgba(255,255,255,0.7)" /> {story.viewCount} dilihat
        </Text>
      </View>

      <TouchableOpacity style={styles.tapLeft} onPress={goBack} activeOpacity={1} />
      <TouchableOpacity style={styles.tapRight} onPress={advanceStory} activeOpacity={1} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: 12 },
  progressRow: { flexDirection: "row", gap: 4, marginBottom: 12 },
  progressTrack: { flex: 1, height: 2.5, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorName: { color: "#fff", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  storyTime: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" },
  closeBtn: { marginLeft: "auto" },
  textContent: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    alignItems: "center", justifyContent: "center", padding: 32,
  },
  storyText: { color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center", fontFamily: "Inter_700Bold", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } },
  footer: { position: "absolute", bottom: 30, left: 0, right: 0, alignItems: "center" },
  viewCount: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  tapLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: "35%" },
  tapRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: "50%" },
});
