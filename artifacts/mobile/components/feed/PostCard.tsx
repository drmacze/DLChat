import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Avatar from "@/components/common/Avatar";
import colors from "@/constants/colors";

interface PostCardProps {
  post: {
    id: string;
    content?: string | null;
    mediaUrl?: string | null;
    likesCount: number;
    commentsCount: number;
    isLikedByMe: boolean;
    createdAt: string;
    author: { id: string; displayName: string; avatarUrl?: string | null; username?: string | null };
  };
  onLike: () => void;
  onComment: () => void;
}

function timeAgo(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function PostCard({ post, onLike, onComment }: PostCardProps) {
  const c = colors.dark;

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike();
  };

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
      <View style={styles.header}>
        <Avatar uri={post.author.avatarUrl} name={post.author.displayName} size={40} />
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: c.foreground }]}>{post.author.displayName}</Text>
          {post.author.username && (
            <Text style={[styles.authorHandle, { color: c.mutedForeground }]}>@{post.author.username}</Text>
          )}
        </View>
        <Text style={[styles.time, { color: c.mutedForeground }]}>{timeAgo(post.createdAt)}</Text>
      </View>

      {post.content ? (
        <Text style={[styles.content, { color: c.foreground }]}>{post.content}</Text>
      ) : null}

      {post.mediaUrl ? (
        <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
      ) : null}

      <View style={[styles.actions, { borderTopColor: c.border }]}>
        <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
          <Feather
            name="heart"
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
        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <Feather name="share" size={20} color={c.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 10,
  },
  authorInfo: { flex: 1, marginLeft: 10 },
  authorName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  authorHandle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  time: { fontSize: 13, fontFamily: "Inter_400Regular" },
  content: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 10, fontFamily: "Inter_400Regular" },
  media: { width: "100%", height: 260 },
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
