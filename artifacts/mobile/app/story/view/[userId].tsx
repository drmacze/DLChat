import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Animated,
  Dimensions, ActivityIndicator, Alert, Platform, Modal,
  FlatList, ScrollView,
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

interface Viewer {
  viewedAt: string;
  user: { id: string; displayName: string; avatarUrl?: string | null; username?: string | null };
}

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
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ViewersModal({
  visible,
  storyId,
  onClose,
  token,
}: {
  visible: boolean;
  storyId: string;
  onClose: () => void;
  token: string | null;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !storyId || !token) return;
    setLoading(true);
    fetch(`${BASE_URL}/api/stories/${storyId}/viewers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setViewers(d.viewers ?? []))
      .catch(() => Alert.alert("Error", "Could not load viewers."))
      .finally(() => setLoading(false));
  }, [visible, storyId, token]);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={vStyles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[vStyles.sheet, { backgroundColor: c.surface }]}>
          <View style={[vStyles.handle, { backgroundColor: c.border }]} />
          <View style={[vStyles.header, { borderBottomColor: c.border }]}>
            <Text style={[vStyles.title, { color: c.foreground }]}>
              {loading ? "Loading…" : `${viewers.length} Viewer${viewers.length !== 1 ? "s" : ""}`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ margin: 40 }} />
          ) : viewers.length === 0 ? (
            <View style={vStyles.empty}>
              <Feather name="eye-off" size={40} color={c.border} />
              <Text style={[vStyles.emptyText, { color: c.mutedForeground }]}>No one has viewed this story yet</Text>
            </View>
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(item, i) => `${item.user.id}-${i}`}
              contentContainerStyle={{ paddingVertical: 8, paddingBottom: insets.bottom + 16 }}
              renderItem={({ item }) => (
                <View style={vStyles.row}>
                  <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={[vStyles.name, { color: c.foreground }]}>{item.user.displayName}</Text>
                    {item.user.username && (
                      <Text style={[vStyles.userHandle, { color: c.mutedForeground }]}>@{item.user.username}</Text>
                    )}
                  </View>
                  <Text style={[vStyles.time, { color: c.mutedForeground }]}>{getTimeAgo(item.viewedAt)}</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const vStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "65%", minHeight: "35%" },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 2 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 48 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  name: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  userHandle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { token, user: me } = useAuth();
  const [group, setGroup] = useState<StoryGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewersOpen, setViewersOpen] = useState(false);
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
      .catch(() => Alert.alert("Error", "Could not load story."))
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
        <Text style={{ color: "#fff" }}>Story not available</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#aaa" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const story = group.stories[currentIndex];
  const isOwner = me?.id === story.author.id;

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

      <View style={[styles.footer, { paddingBottom: Platform.OS === "web" ? 24 : insets.bottom + 16 }]}>
        {isOwner ? (
          <TouchableOpacity
            style={styles.viewerBtn}
            onPress={() => setViewersOpen(true)}
            activeOpacity={0.8}
          >
            <Feather name="eye" size={15} color="rgba(255,255,255,0.9)" />
            <Text style={styles.viewCountText}>{story.viewCount} viewer{story.viewCount !== 1 ? "s" : ""}</Text>
            <Feather name="chevron-up" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.viewCountAlt}>
            {story.viewCount} {story.viewCount === 1 ? "view" : "views"}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.tapLeft} onPress={goBack} activeOpacity={1} />
      <TouchableOpacity style={styles.tapRight} onPress={advanceStory} activeOpacity={1} />

      {isOwner && (
        <ViewersModal
          visible={viewersOpen}
          storyId={story.id}
          onClose={() => setViewersOpen(false)}
          token={token}
        />
      )}
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
  storyText: {
    color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center",
    fontFamily: "Inter_700Bold",
    textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 1 },
  },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" },
  viewerBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  viewCountText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "Inter_500Medium" },
  viewCountAlt: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular" },
  tapLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: "35%" },
  tapRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: "50%" },
});
