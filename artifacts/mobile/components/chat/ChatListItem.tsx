import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";

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
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 24 * 60 * 60 * 1000) return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()];
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getPreviewText(msg: ChatListItemProps["lastMessage"]): string {
  if (!msg) return "No messages yet";
  if (msg.type === "image") return "📷 Photo";
  if (msg.type === "video") return "🎬 Video";
  if (msg.type === "voice") return "🎤 Voice message";
  if (msg.type === "file") return "📎 File";
  if (msg.type === "system") return msg.content ?? "";
  return msg.content ?? "";
}

export default function ChatListItem({ type, title, avatarUrl, lastMessage, unreadCount, isMuted, isPinned, otherUser, onPress }: ChatListItemProps) {
  const { c } = useTheme();
  const displayName = type === "direct" ? (otherUser?.displayName ?? "Unknown") : (title ?? "Untitled");
  const displayAvatar = type === "direct" ? otherUser?.avatarUrl : avatarUrl;
  const isOnline = type === "direct" ? otherUser?.isOnline : false;
  const preview = getPreviewText(lastMessage);
  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Avatar uri={displayAvatar} name={displayName} size={54} isOnline={isOnline} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            {isPinned && <Text style={{ fontSize: 11 }}>📌 </Text>}
            <Text
              style={[styles.name, { color: hasUnread ? c.foreground : c.foreground, fontWeight: hasUnread ? "700" : "600" }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
          </View>
          {lastMessage && (
            <Text style={[styles.time, { color: hasUnread ? c.primary : c.mutedForeground }]}>
              {formatTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, { color: hasUnread ? c.mutedForeground : c.subtleForeground, fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {isMuted ? "🔕 " : ""}{preview}
          </Text>
          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: c.primary }]}>
              <Text style={styles.badgeText}>{unreadCount! > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { flex: 1, marginLeft: 13 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  preview: { fontSize: 14, flex: 1, marginRight: 8 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
