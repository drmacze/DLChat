import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";
import { PinIcon, MuteIcon, PhotoIcon, VideoIcon, MicIcon, PaperclipIcon } from "@/components/common/SvgIcons";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

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
  isArchived?: boolean;
  otherUser?: { displayName: string; avatarUrl?: string | null; isOnline?: boolean } | null;
  onPress: () => void;
  onArchive?: () => void;
  onMute?: () => void;
  onPin?: () => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 24 * 60 * 60 * 1000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 7 * 24 * 60 * 60 * 1000) return ["Min","Sen","Sel","Rab","Kam","Jum","Sab"][date.getDay()];
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

type MediaPreview = { isMedia: true; icon: React.ReactNode; label: string } | { isMedia: false; text: string };

function getPreview(msg: ChatListItemProps["lastMessage"]): MediaPreview {
  if (!msg) return { isMedia: false, text: "Belum ada pesan" };
  if (msg.type === "image") return { isMedia: true, icon: <PhotoIcon size={16} />, label: "Foto" };
  if (msg.type === "video") return { isMedia: true, icon: <VideoIcon size={16} />, label: "Video" };
  if (msg.type === "voice") return { isMedia: true, icon: <MicIcon size={16} />, label: "Pesan suara" };
  if (msg.type === "file") return { isMedia: true, icon: <PaperclipIcon size={16} />, label: "File" };
  if (msg.type === "system") return { isMedia: false, text: msg.content ?? "" };
  return { isMedia: false, text: msg.content ?? "" };
}

export default function ChatListItem({
  id, type, title, avatarUrl, lastMessage, unreadCount, isMuted, isPinned, isArchived, otherUser,
  onPress, onArchive, onMute, onPin,
}: ChatListItemProps) {
  const { c } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const displayName = type === "direct" ? (otherUser?.displayName ?? "Unknown") : (title ?? "Untitled");
  const displayAvatar = type === "direct" ? otherUser?.avatarUrl : avatarUrl;
  const isOnline = type === "direct" ? otherUser?.isOnline : false;
  const preview = getPreview(lastMessage);
  const hasUnread = (unreadCount ?? 0) > 0;

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const actions = [];

    if (onMute) {
      const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
      actions.push(
        <Animated.View key="mute" style={[styles.swipeAction, styles.swipeMute, { transform: [{ scale }] }]}>
          <TouchableOpacity
            style={styles.swipeActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              swipeRef.current?.close();
              onMute();
            }}
          >
            <Feather name={isMuted ? "volume-2" : "volume-x"} size={20} color="#fff" />
            <Text style={styles.swipeLabel}>{isMuted ? "Bunyikan" : "Bisukan"}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    if (onArchive) {
      const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
      actions.push(
        <Animated.View key="archive" style={[styles.swipeAction, styles.swipeArchive, { transform: [{ scale }] }]}>
          <TouchableOpacity
            style={styles.swipeActionBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              swipeRef.current?.close();
              onArchive();
            }}
          >
            <Feather name={isArchived ? "inbox" : "archive"} size={20} color="#fff" />
            <Text style={styles.swipeLabel}>{isArchived ? "Buka arsip" : "Arsipkan"}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return actions.length ? <View style={styles.swipeActions}>{actions}</View> : null;
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootFriction={8}
      friction={2}
      rightThreshold={60}
    >
      <TouchableOpacity
        style={[styles.container, { backgroundColor: c.background as string, borderBottomColor: c.border as string }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Avatar uri={displayAvatar} name={displayName} size={54} isOnline={isOnline} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              {isPinned && <View style={{ marginRight: 4 }}><PinIcon size={13} /></View>}
              <Text
                style={[styles.name, { color: c.foreground as string, fontWeight: hasUnread ? "700" : "600" }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </View>
            {lastMessage && (
              <Text style={[styles.time, { color: hasUnread ? c.primary as string : c.mutedForeground as string }]}>
                {formatTime(lastMessage.createdAt)}
              </Text>
            )}
          </View>
          <View style={styles.bottomRow}>
            {preview.isMedia ? (
              <View style={[styles.mediaPreview, { flex: 1, marginRight: 8 }]}>
                {isMuted && <View style={{ marginRight: 3 }}><MuteIcon size={13} /></View>}
                {preview.icon}
                <Text style={[styles.preview, { color: hasUnread ? c.mutedForeground as string : c.subtleForeground as string, fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular", flex: 1 }]} numberOfLines={1}>
                  {" "}{preview.label}
                </Text>
              </View>
            ) : (
              <View style={[styles.mediaPreview, { flex: 1, marginRight: 8 }]}>
                {isMuted && <View style={{ marginRight: 3 }}><MuteIcon size={13} /></View>}
                <Text style={[styles.preview, { color: hasUnread ? c.mutedForeground as string : c.subtleForeground as string, fontFamily: hasUnread ? "Inter_500Medium" : "Inter_400Regular", flex: 1 }]} numberOfLines={1}>
                  {preview.text}
                </Text>
              </View>
            )}
            {hasUnread && (
              <View style={[styles.badge, { backgroundColor: c.primary as string }]}>
                <Text style={styles.badgeText}>{unreadCount! > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
            {!hasUnread && isMuted && (
              <Feather name="volume-x" size={14} color={c.mutedForeground as string} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { flex: 1, marginLeft: 13 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mediaPreview: { flexDirection: "row", alignItems: "center" },
  preview: { fontSize: 14, flex: 1, marginRight: 8 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  swipeActions: { flexDirection: "row" },
  swipeAction: { width: 72, alignItems: "center", justifyContent: "center" },
  swipeMute: { backgroundColor: "#8E8E93" },
  swipeArchive: { backgroundColor: "#007AFF" },
  swipeActionBtn: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 4 },
  swipeLabel: { color: "#fff", fontSize: 11, fontFamily: "Inter_500Medium" },
});
