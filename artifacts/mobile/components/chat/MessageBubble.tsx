import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string | null;
    mediaUrl?: string | null;
    type: string;
    createdAt: string;
    editedAt?: string | null;
    deletedAt?: string | null;
    sender: { id: string; displayName: string; avatarUrl?: string | null };
    reactions: Array<{ emoji: string; count: number; users: string[] }>;
    replyTo?: { content?: string | null; senderName: string; mediaUrl?: string | null } | null;
    status?: string | null;
  };
  isMe: boolean;
  showAvatar?: boolean;
  onLongPress?: () => void;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status?: string | null }) {
  if (status === "read") return <Text style={styles.statusRead}>✓✓</Text>;
  if (status === "delivered") return <Text style={styles.statusDelivered}>✓✓</Text>;
  return <Text style={styles.statusSent}>✓</Text>;
}

export default function MessageBubble({ message, isMe, showAvatar = true, onLongPress }: MessageBubbleProps) {
  const c = colors.dark;
  const isDeleted = !!message.deletedAt;

  return (
    <View style={[styles.row, isMe && styles.rowMe]}>
      {!isMe && showAvatar && (
        <View style={[styles.avatar, { backgroundColor: "#2AABEE" }]}>
          {message.sender.avatarUrl ? (
            <Image source={{ uri: message.sender.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{message.sender.displayName[0]?.toUpperCase()}</Text>
          )}
        </View>
      )}
      {!isMe && !showAvatar && <View style={{ width: 32 }} />}

      <TouchableOpacity
        onLongPress={isDeleted ? undefined : onLongPress}
        activeOpacity={0.8}
        style={[
          styles.bubble,
          isMe
            ? [styles.bubbleMe, { backgroundColor: isDeleted ? c.surface : "#2AABEE" }]
            : [styles.bubbleThem, { backgroundColor: c.surface }],
          isDeleted && styles.bubbleDeleted,
        ]}
      >
        {message.replyTo && !isDeleted && (
          <View style={[styles.replyPreview, { borderLeftColor: isMe ? "rgba(255,255,255,0.6)" : c.primary, backgroundColor: isMe ? "rgba(0,0,0,0.15)" : c.secondarySurface }]}>
            <Text style={[styles.replyName, { color: isMe ? "rgba(255,255,255,0.9)" : c.primary }]}>{message.replyTo.senderName}</Text>
            <Text style={[styles.replyContent, { color: isMe ? "rgba(255,255,255,0.7)" : c.mutedForeground }]} numberOfLines={1}>
              {message.replyTo.content ?? (message.replyTo.mediaUrl ? "[media]" : "Message")}
            </Text>
          </View>
        )}

        {isDeleted ? (
          <View style={styles.deletedRow}>
            <Feather name="slash" size={13} color={c.mutedForeground} />
            <Text style={[styles.deletedText, { color: c.mutedForeground }]}>Message deleted</Text>
          </View>
        ) : (
          <>
            {message.type === "image" && message.mediaUrl ? (
              <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
            ) : message.type === "video" && message.mediaUrl ? (
              <View style={[styles.mediaVideoPlaceholder, { backgroundColor: "#000" }]}>
                <Feather name="play-circle" size={40} color="#fff" />
              </View>
            ) : message.type === "audio" || message.type === "voice" ? (
              <View style={styles.audioRow}>
                <Feather name="mic" size={16} color={isMe ? "#fff" : c.primary} />
                <View style={[styles.audioWave, { backgroundColor: isMe ? "rgba(255,255,255,0.3)" : c.border }]} />
              </View>
            ) : null}

            {message.content ? (
              <Text style={[styles.content, { color: isMe ? "#fff" : c.foreground }]}>
                {message.content}
              </Text>
            ) : null}
          </>
        )}

        {!isDeleted && (
          <View style={styles.meta}>
            {message.editedAt && (
              <Text style={[styles.edited, { color: isMe ? "rgba(255,255,255,0.6)" : c.mutedForeground }]}>edited </Text>
            )}
            <Text style={[styles.time, { color: isMe ? "rgba(255,255,255,0.6)" : c.mutedForeground }]}>
              {formatTime(message.createdAt)}
            </Text>
            {isMe && <StatusIcon status={message.status} />}
          </View>
        )}

        {!isDeleted && message.reactions.length > 0 && (
          <View style={styles.reactions}>
            {message.reactions.map((r) => (
              <View key={r.emoji} style={[styles.reaction, { backgroundColor: isMe ? "rgba(0,0,0,0.2)" : c.secondarySurface }]}>
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                <Text style={[styles.reactionCount, { color: isMe ? "rgba(255,255,255,0.8)" : c.mutedForeground }]}>{r.count}</Text>
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
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 6, overflow: "hidden" },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bubble: { maxWidth: "75%", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4 },
  bubbleDeleted: { opacity: 0.6 },
  deletedRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  deletedText: { fontSize: 14, fontStyle: "italic", fontFamily: "Inter_400Regular" },
  replyPreview: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6, borderRadius: 4, paddingVertical: 4, paddingRight: 4 },
  replyName: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  replyContent: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mediaImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 4 },
  mediaVideoPlaceholder: { width: 220, height: 160, borderRadius: 12, marginBottom: 4, alignItems: "center", justifyContent: "center" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  audioWave: { flex: 1, height: 3, borderRadius: 2 },
  content: { fontSize: 15, lineHeight: 20, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 4, gap: 2 },
  edited: { fontSize: 11, fontFamily: "Inter_400Regular" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statusRead: { fontSize: 11, color: "#2AABEE" },
  statusDelivered: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  statusSent: { fontSize: 11, color: "rgba(255,255,255,0.5)" },
  reactions: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 4 },
  reaction: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 2 },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
