import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";
import { PinIcon, MuteIcon, PhotoIcon, VideoIcon, MicIcon, PaperclipIcon } from "@/components/common/SvgIcons";

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

type MediaPreview = { isMedia: true; icon: React.ReactNode; label: string } | { isMedia: false; text: string };

function getPreview(msg: ChatListItemProps["lastMessage"]): MediaPreview {
  if (!msg) return { isMedia: false, text: "No messages yet" };
  if (msg.type === "image") return { isMedia: true, icon: <PhotoIcon size={16} />, label: "Photo" };
  if (msg.type === "video") return { isMedia: true, icon: <VideoIcon size={16} />, label: "Video" };
  if (msg.type === "voice") return { isMedia: true, icon: <MicIcon size={16} />, label: "Voice message" };
  if (msg.type === "file") return { isMedia: true, icon: <PaperclipIcon size={16} />, label: "File" };
  if (msg.type === "system") return { isMedia: false, text: msg.content ?? "" };
  return { isMedia: false, text: msg.content ?? "" };
}

export default function ChatListItem({ type, title, avatarUrl, lastMessage, unreadCount, isMuted, isPinned, otherUser, onPress }: ChatListItemProps) {
  const { c } = useTheme();
  const displayName = type === "direct" ? (otherUser?.displayName ?? "Unknown") : (title ?? "Untitled");
  const displayAvatar = type === "direct" ? otherUser?.avatarUrl : avatarUrl;
  const isOnline = type === "direct" ? otherUser?.isOnline : false;
  const preview = getPreview(lastMessage);
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
            {isPinned && <View style={{ marginRight: 4 }}><PinIcon size={13} /></View>}
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
          {preview.isMedia ? (
            <View style={[styles.mediaPreview, { flex: 1, marginRight: 8 }]}>
              {isMuted && <View style={{ marginRight: 3 }}><MuteIcon size={13} /></View>}
              {preview.icon}
              <Text style={[styles.preview, { color: hasUnread ? c.mutedForeground : c.subtleForeground, fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular", flex: 1 }]} numberOfLines={1}>
                {" "}{preview.label}
              </Text>
            </View>
          ) : (
            <View style={[styles.mediaPreview, { flex: 1, marginRight: 8 }]}>
              {isMuted && <View style={{ marginRight: 3 }}><MuteIcon size={13} /></View>}
              <Text style={[styles.preview, { color: hasUnread ? c.mutedForeground : c.subtleForeground, fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular", flex: 1 }]} numberOfLines={1}>
                {preview.text}
              </Text>
            </View>
          )}
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
  mediaPreview: { flexDirection: "row", alignItems: "center" },
  preview: { fontSize: 14, flex: 1, marginRight: 8 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
