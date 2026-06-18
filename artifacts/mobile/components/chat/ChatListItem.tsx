import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Avatar from "@/components/common/Avatar";
import colors from "@/constants/colors";

interface ChatListItemProps {
  id: string;
  type: "direct" | "group" | "channel";
  title?: string | null;
  avatarUrl?: string | null;
  lastMessage?: {
    content?: string | null;
    type: string;
    senderName: string;
    createdAt: string;
  } | null;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  otherUser?: { displayName: string; avatarUrl?: string | null; isOnline?: boolean } | null;
  onPress: () => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getPreviewText(msg: ChatListItemProps["lastMessage"]): string {
  if (!msg) return "No messages yet";
  if (msg.type === "image") return "Photo";
  if (msg.type === "video") return "Video";
  if (msg.type === "voice") return "Voice message";
  if (msg.type === "file") return "File";
  if (msg.type === "system") return msg.content ?? "";
  return msg.content ?? "";
}

export default function ChatListItem({ type, title, avatarUrl, lastMessage, unreadCount, otherUser, onPress }: ChatListItemProps) {
  const c = colors.dark;
  const displayName = type === "direct" ? (otherUser?.displayName ?? "Unknown") : (title ?? "Untitled");
  const displayAvatar = type === "direct" ? otherUser?.avatarUrl : avatarUrl;
  const isOnline = type === "direct" ? otherUser?.isOnline : false;
  const preview = getPreviewText(lastMessage);

  return (
    <TouchableOpacity style={[styles.container, { borderBottomColor: c.border }]} onPress={onPress} activeOpacity={0.7}>
      <Avatar uri={displayAvatar} name={displayName} size={52} isOnline={isOnline} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: c.foreground }]} numberOfLines={1}>{displayName}</Text>
          {lastMessage && (
            <Text style={[styles.time, { color: c.mutedForeground }]}>{formatTime(lastMessage.createdAt)}</Text>
          )}
        </View>
        <View style={styles.preview}>
          <Text style={[styles.previewText, { color: c.mutedForeground }]} numberOfLines={1}>{preview}</Text>
          {(unreadCount ?? 0) > 0 && (
            <View style={[styles.badge, { backgroundColor: c.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  preview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
