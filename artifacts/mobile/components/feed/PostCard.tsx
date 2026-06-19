import React, { useRef, useState } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Animated, Share, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

interface PostCardProps {
  post: {
    id: string;
    content?: string | null;
    mediaUrl?: string | null;
    likesCount: number;
    commentsCount: number;
    isLikedByMe: boolean;
    isBookmarked?: boolean;
    createdAt: string;
    author: {
      id: string;
      displayName: string;
      avatarUrl?: string | null;
      username?: string | null;
    };
  };
  onLike: () => void;
  onComment: () => void;
  onBookmarkChange?: (postId: string, bookmarked: boolean) => void;
}

function timeAgo(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m yang lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j yang lalu`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}h yang lalu`;
  return new Date(isoString).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function PostCard({ post, onLike, onComment, onBookmarkChange }: PostCardProps) {
  const { c } = useTheme();
  const { token } = useAuth();
  const [bookmarked, setBookmarked] = useState(post.isBookmarked ?? false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  // Double-tap to like
  const lastTap = useRef<number>(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!post.isLikedByMe) {
        onLike();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      // Heart animation
      heartScale.setValue(0);
      heartOpacity.setValue(1);
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1.2, useNativeDriver: true, speed: 20, bounciness: 12 }),
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.delay(600),
        Animated.timing(heartOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
    lastTap.current = now;
  };

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike();
  };

  const handleBookmark = async () => {
    if (bookmarkLoading || !token) return;
    setBookmarkLoading(true);
    const newState = !bookmarked;
    setBookmarked(newState);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await fetch(`${BASE_URL}/api/posts/${post.id}/bookmark`, {
        method: newState ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onBookmarkChange?.(post.id, newState);
    } catch {
      setBookmarked(!newState);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: post.content
          ? `${post.author.displayName}: "${post.content}" — via DLChat`
          : `Cek post dari ${post.author.displayName} di DLChat`,
        title: "Bagikan post",
      });
    } catch { /* user cancelled */ }
  };

  const isLong = (post.content?.length ?? 0) > 200;

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={post.author.avatarUrl} name={post.author.displayName} size={40} />
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: c.foreground }]}>{post.author.displayName}</Text>
          {post.author.username && (
            <Text style={[styles.authorHandle, { color: c.mutedForeground }]}>@{post.author.username}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.time, { color: c.mutedForeground }]}>{timeAgo(post.createdAt)}</Text>
          <TouchableOpacity
            onPress={handleBookmark}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.bookmarkBtn}
          >
            <Feather
              name={bookmarked ? "bookmark" : "bookmark"}
              size={17}
              color={bookmarked ? c.primary : c.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content with double-tap */}
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap}>
        {post.content ? (
          <View style={styles.contentWrapper}>
            <Text
              style={[styles.content, { color: c.foreground }]}
              numberOfLines={contentExpanded ? undefined : (isLong ? 4 : undefined)}
            >
              {post.content}
            </Text>
            {isLong && !contentExpanded && (
              <TouchableOpacity onPress={() => setContentExpanded(true)}>
                <Text style={[styles.readMore, { color: c.primary }]}>Selengkapnya...</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {post.mediaUrl ? (
          <View style={styles.mediaWrapper}>
            <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
            {/* Double-tap heart overlay */}
            <Animated.View
              style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}
              pointerEvents="none"
            >
              <Feather name="heart" size={80} color="#EF4444" />
            </Animated.View>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: c.border }]}>
        <TouchableOpacity
          style={styles.action}
          onPress={handleLike}
          activeOpacity={0.7}
        >
          <Feather
            name={post.isLikedByMe ? "heart" : "heart"}
            size={20}
            color={post.isLikedByMe ? "#EF4444" : c.mutedForeground}
          />
          <Text style={[styles.actionCount, { color: post.isLikedByMe ? "#EF4444" : c.mutedForeground }]}>
            {post.likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={onComment} activeOpacity={0.7}>
          <Feather name="message-circle" size={20} color={c.mutedForeground} />
          <Text style={[styles.actionCount, { color: c.mutedForeground }]}>{post.commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={handleShare} activeOpacity={0.7}>
          <Feather name="share-2" size={20} color={c.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 10,
    gap: 10,
  },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  authorHandle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bookmarkBtn: { padding: 2 },
  contentWrapper: { paddingHorizontal: 14, paddingBottom: 10 },
  content: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  readMore: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 4 },
  mediaWrapper: { position: "relative" },
  media: { width: "100%", height: 260 },
  heartOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 24,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
