import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import colors from "@/constants/colors";

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string | null;
    mediaUrl?: string | null;
    type: string;
    createdAt: string;
    editedAt?: string | null;
    sender: { id: string; displayName: string; avatarUrl?: string | null };
    reactions: Array<{ emoji: string; count: number; users: string[] }>;
    replyTo?: { content?: string | null; senderName: string } | null;
    status?: string | null;
  };
  isMe: boolean;
  showAvatar?: boolean;
  onLongPress?: () => void;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message, isMe, showAvatar = true, onLongPress }: MessageBubbleProps) {
  const c = colors.dark;

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      {!isMe && showAvatar && (
        <View style={[styles.avatar, { backgroundColor: "#2AABEE" }]}>
          <Text style={styles.avatarText}>{message.sender.displayName[0]?.toUpperCase()}</Text>
        </View>
      )}
      {!isMe && !showAvatar && <View style={{ width: 32 }} />}

      <TouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.8}
        style={[styles.bubble, isMe ? [styles.bubbleMe, { backgroundColor: "#2AABEE" }] : [styles.bubbleThem, { backgroundColor: c.surface }]]}
      >
        {message.replyTo && (
          <View style={[styles.replyPreview, { borderLeftColor: c.primary }]}>
            <Text style={[styles.replyName, { color: c.primary }]}>{message.replyTo.senderName}</Text>
            <Text style={[styles.replyContent, { color: c.mutedForeground }]} numberOfLines={1}>
              {message.replyTo.content ?? "Media"}
            </Text>
          </View>
        )}

        {message.type === "image" && message.mediaUrl ? (
          <Image
            source={{ uri: message.mediaUrl }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        ) : null}

        {message.content ? (
          <Text style={[styles.content, { color: isMe ? "#fff" : c.foreground }]}>
            {message.content}
          </Text>
        ) : null}

        <View style={styles.meta}>
          {message.editedAt && (
            <Text style={[styles.edited, { color: isMe ? "rgba(255,255,255,0.6)" : c.mutedForeground }]}>edited </Text>
          )}
          <Text style={[styles.time, { color: isMe ? "rgba(255,255,255,0.6)" : c.mutedForeground }]}>
            {formatTime(message.createdAt)}
          </Text>
          {isMe && (
            <Text style={[styles.status, { color: "rgba(255,255,255,0.7)" }]}>
              {message.status === "read" ? " ✓✓" : message.status === "delivered" ? " ✓✓" : " ✓"}
            </Text>
          )}
        </View>

        {message.reactions.length > 0 && (
          <View style={styles.reactions}>
            {message.reactions.map((r) => (
              <View key={r.emoji} style={[styles.reaction, { backgroundColor: c.secondarySurface }]}>
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={[styles.reactionCount, { color: c.mutedForeground }]}>{r.count}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2, paddingHorizontal: 12 },
  rowMe: { flexDirection: "row-reverse" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 6 },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4 },
  replyPreview: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6, borderRadius: 2 },
  replyName: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  replyContent: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mediaImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 4 },
  content: { fontSize: 15, lineHeight: 20, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 4 },
  edited: { fontSize: 11, fontFamily: "Inter_400Regular" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  status: { fontSize: 11 },
  reactions: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 4 },
  reaction: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 2 },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
