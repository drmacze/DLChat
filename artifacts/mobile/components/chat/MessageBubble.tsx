import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Alert, Animated,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import FormattedText from "./FormattedText";
import LinkPreview from "./LinkPreview";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageBubbleProps {
  message: {
    id: string;
    content?: string | null;
    mediaUrl?: string | null;
    type: string;
    createdAt: string;
    editedAt?: string | null;
    deletedAt?: string | null;
    isPinned?: boolean;
    isStarred?: boolean;
    forwardedFromMessageId?: string | null;
    sender: { id: string; displayName: string; avatarUrl?: string | null };
    reactions: Array<{ emoji: string; count: number; users: string[] }>;
    replyTo?: { content?: string | null; senderName: string; mediaUrl?: string | null } | null;
    status?: string | null;
  };
  isMe: boolean;
  showAvatar?: boolean;
  onLongPress?: () => void;
  onReply?: () => void;
  onQuickReact?: (emoji: string) => void;
  onSelect?: () => void;
  isSelected?: boolean;
  currentUserId?: string;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function hasUrl(text: string): boolean {
  return /https?:\/\/[^\s]+/i.test(text);
}

function StatusIcon({ status, isMe }: { status?: string | null; isMe: boolean }) {
  if (!isMe) return null;
  if (status === "sending") return <Text style={[styles.statusTick, { color: "rgba(255,255,255,0.4)" }]}>⏱</Text>;
  if (status === "read") return <Text style={[styles.statusTick, { color: "#2AABEE" }]}>✓✓</Text>;
  if (status === "delivered") return <Text style={[styles.statusTick, { color: "rgba(255,255,255,0.7)" }]}>✓✓</Text>;
  return <Text style={[styles.statusTick, { color: "rgba(255,255,255,0.5)" }]}>✓</Text>;
}

function VoicePlayer({ uri, isMe, c }: { uri: string; isMe: boolean; c: Record<string, unknown> }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const durationSecs = status.duration ?? 0;

  const togglePlay = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      Alert.alert("Error", "Tidak dapat memutar audio.");
    }
  };

  const formatDur = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;

  const iconColor = isMe ? "#fff" : (c.primary as string);
  const waveColor = isMe ? "rgba(255,255,255,0.4)" : (c.border as string);
  const progressColor = isMe ? "rgba(255,255,255,0.9)" : (c.primary as string);
  const textColor = isMe ? "rgba(255,255,255,0.7)" : (c.mutedForeground as string);

  return (
    <View style={styles.voicePlayer}>
      <TouchableOpacity onPress={togglePlay} style={[styles.voicePlayBtn, { backgroundColor: isMe ? "rgba(255,255,255,0.2)" : (c.surface as string) }]}>
        <Feather name={status.playing ? "pause" : "play"} size={16} color={iconColor} />
      </TouchableOpacity>
      <View style={styles.voiceWaveContainer}>
        <View style={[styles.voiceWaveBg, { backgroundColor: waveColor }]}>
          <View style={[styles.voiceWaveProgress, { width: `${progress * 100}%`, backgroundColor: progressColor }]} />
        </View>
        <Text style={[styles.voiceDuration, { color: textColor }]}>
          {durationSecs > 0 ? formatDur(durationSecs) : "0:00"}
        </Text>
      </View>
    </View>
  );
}

export default function MessageBubble({
  message, isMe, showAvatar = true, onLongPress, onReply, onQuickReact, onSelect, isSelected, currentUserId,
}: MessageBubbleProps) {
  const { c } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const lastTap = useRef(0);
  const [showQuickEmoji, setShowQuickEmoji] = useState(false);
  const emojiTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDeleted = !!message.deletedAt;
  const isVoice = (message.type === "voice" || message.type === "audio") && !!message.mediaUrl;
  const showLinkPreview = !isDeleted && !!message.content && hasUrl(message.content) &&
    message.type === "text";

  const handlePress = () => {
    if (onSelect) {
      onSelect();
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 300 && !isDeleted && onQuickReact) {
      if (emojiTimeout.current) clearTimeout(emojiTimeout.current);
      setShowQuickEmoji(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      emojiTimeout.current = setTimeout(() => setShowQuickEmoji(false), 4000);
    }
    lastTap.current = now;
  };

  const handleQuickEmoji = (emoji: string) => {
    setShowQuickEmoji(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onQuickReact?.(emoji);
  };

  const handleSwipeOpen = () => {
    if (!isDeleted && onReply) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReply();
    }
    swipeRef.current?.close();
  };

  const renderSwipeAction = () => (
    <View style={styles.replyActionWrap}>
      <View style={[styles.replyActionIcon, { backgroundColor: c.surface as string }]}>
        <Feather name="corner-up-left" size={18} color={c.primary as string} />
      </View>
    </View>
  );

  const bubbleContent = (textColor: string, subColor: string) => (
    <>
      {message.forwardedFromMessageId && !isDeleted && (
        <View style={[styles.forwardedLabel, { borderLeftColor: isMe ? "rgba(255,255,255,0.5)" : c.primary as string }]}>
          <Feather name="corner-up-right" size={11} color={isMe ? "rgba(255,255,255,0.7)" : c.mutedForeground as string} />
          <Text style={[styles.forwardedText, { color: isMe ? "rgba(255,255,255,0.7)" : c.mutedForeground as string }]}>Diteruskan</Text>
        </View>
      )}
      {message.replyTo && !isDeleted && (
        <View style={[styles.replyPreview, { borderLeftColor: isMe ? "rgba(255,255,255,0.6)" : c.primary as string, backgroundColor: isMe ? "rgba(0,0,0,0.15)" : c.surface as string }]}>
          <Text style={[styles.replyName, { color: isMe ? "rgba(255,255,255,0.9)" : c.primary as string }]}>{message.replyTo.senderName}</Text>
          <Text style={[styles.replyContent, { color: isMe ? "rgba(255,255,255,0.7)" : c.mutedForeground as string }]} numberOfLines={1}>
            {message.replyTo.content ?? (message.replyTo.mediaUrl ? "[media]" : "Pesan")}
          </Text>
        </View>
      )}
      {message.type === "image" && message.mediaUrl ? (
        <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
      ) : message.type === "video" && message.mediaUrl ? (
        <View style={[styles.mediaVideoPlaceholder, { backgroundColor: "#000" }]}>
          <Feather name="play-circle" size={40} color="#fff" />
        </View>
      ) : isVoice ? (
        <VoicePlayer uri={message.mediaUrl!} isMe={isMe} c={c as Record<string, unknown>} />
      ) : null}
      {message.content && !isDeleted ? (
        <FormattedText text={message.content} style={[styles.content, { color: textColor }]} />
      ) : null}
      {showLinkPreview && message.content && (
        <LinkPreview text={message.content} isMe={isMe} />
      )}
      {!isDeleted && (
        <View style={styles.meta}>
          {message.isStarred && <Feather name="star" size={10} color={isMe ? "rgba(255,255,255,0.7)" : "#FFD700"} style={{ marginRight: 2 }} />}
          {message.editedAt && <Text style={[styles.edited, { color: subColor }]}>edited </Text>}
          <Text style={[styles.time, { color: subColor }]}>{formatTime(message.createdAt)}</Text>
          {isMe && <StatusIcon status={message.status} isMe={isMe} />}
        </View>
      )}
    </>
  );

  const bubbleEl = (
    <View style={[styles.row, isMe && styles.rowMe]}>
      {onSelect && (
        <TouchableOpacity onPress={onSelect} style={styles.selectBtn}>
          <View style={[styles.selectCircle, {
            borderColor: c.primary as string,
            backgroundColor: isSelected ? c.primary as string : "transparent",
          }]}>
            {isSelected && <Feather name="check" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>
      )}

      {!isMe && showAvatar && (
        <View style={[styles.avatar, { backgroundColor: c.primary as string }]}>
          {message.sender.avatarUrl ? (
            <Image source={{ uri: message.sender.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{message.sender.displayName[0]?.toUpperCase()}</Text>
          )}
        </View>
      )}
      {!isMe && !showAvatar && <View style={{ width: 32 }} />}

      <View style={styles.bubbleWrap}>
        {showQuickEmoji && (
          <View style={[styles.quickEmojiBar, isMe ? styles.quickEmojiMe : styles.quickEmojiThem, { backgroundColor: c.headerBg as string, borderColor: c.border as string }]}>
            {QUICK_EMOJIS.map((em) => (
              <TouchableOpacity key={em} onPress={() => handleQuickEmoji(em)} style={styles.quickEmojiBtn}>
                <Text style={styles.quickEmoji}>{em}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={handlePress}
          onLongPress={isDeleted || !!onSelect ? undefined : onLongPress}
          activeOpacity={0.85}
          style={[
            styles.bubble,
            isMe ? [styles.bubbleMe, { backgroundColor: isDeleted ? c.surface as string : undefined }]
                 : [styles.bubbleThem, { backgroundColor: c.messageThemBg as string }],
            isDeleted && styles.bubbleDeleted,
            isSelected && { opacity: 0.7 },
          ]}
        >
          {isDeleted ? (
            <View style={styles.deletedRow}>
              <Feather name="slash" size={13} color={c.mutedForeground as string} />
              <Text style={[styles.deletedText, { color: c.mutedForeground as string }]}>Pesan dihapus</Text>
            </View>
          ) : isMe ? (
            <LinearGradient colors={c.messageMeGradient as [string, string]} style={styles.bubbleMeGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {bubbleContent("#fff", "rgba(255,255,255,0.6)")}
            </LinearGradient>
          ) : (
            <View style={styles.bubbleThemInner}>
              {bubbleContent(c.foreground as string, c.mutedForeground as string)}
            </View>
          )}

          {!isDeleted && message.reactions.length > 0 && (
            <View style={[styles.reactions, isMe ? styles.reactionsMe : styles.reactionsThem]}>
              {message.reactions.map((r) => (
                <View key={r.emoji} style={[styles.reaction, { backgroundColor: isMe ? "rgba(0,0,0,0.2)" : c.surface as string }]}>
                  <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                  <Text style={[styles.reactionCount, { color: isMe ? "rgba(255,255,255,0.85)" : c.mutedForeground as string }]}>{r.count}</Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {message.isPinned && (
          <Feather name="map-pin" size={12} color={c.primary as string} style={styles.pinIcon} />
        )}
      </View>
    </View>
  );

  if (isDeleted || !onReply) {
    return bubbleEl;
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderLeftActions={renderSwipeAction}
      onSwipeableOpen={handleSwipeOpen}
      overshootFriction={8}
      friction={2}
      leftThreshold={50}
    >
      {bubbleEl}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginVertical: 2, paddingHorizontal: 12 },
  rowMe: { flexDirection: "row-reverse" },
  selectBtn: { width: 32, height: 44, alignItems: "center", justifyContent: "center", marginRight: 4 },
  selectCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 6, overflow: "hidden" },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  avatarText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bubbleWrap: { maxWidth: "75%", position: "relative" },
  bubble: { borderRadius: 18, marginHorizontal: 4, overflow: "hidden" },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4 },
  bubbleMeGrad: { paddingHorizontal: 12, paddingVertical: 8 },
  bubbleThemInner: { paddingHorizontal: 12, paddingVertical: 8 },
  bubbleDeleted: { opacity: 0.6, paddingHorizontal: 12, paddingVertical: 8 },
  deletedRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  deletedText: { fontSize: 14, fontStyle: "italic", fontFamily: "Inter_400Regular" },
  forwardedLabel: { flexDirection: "row", alignItems: "center", gap: 4, borderLeftWidth: 2, paddingLeft: 6, marginBottom: 4 },
  forwardedText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  replyPreview: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6, borderRadius: 4, paddingVertical: 4, paddingRight: 4 },
  replyName: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  replyContent: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mediaImage: { width: 220, height: 160, borderRadius: 10, marginBottom: 4 },
  mediaVideoPlaceholder: { width: 220, height: 160, borderRadius: 10, marginBottom: 4, alignItems: "center", justifyContent: "center" },
  voicePlayer: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, minWidth: 160, maxWidth: 220 },
  voicePlayBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  voiceWaveContainer: { flex: 1, gap: 3 },
  voiceWaveBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  voiceWaveProgress: { height: "100%", borderRadius: 2 },
  voiceDuration: { fontSize: 10, fontFamily: "Inter_400Regular" },
  content: { fontSize: 15, lineHeight: 20, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 4, gap: 2 },
  edited: { fontSize: 11, fontFamily: "Inter_400Regular" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statusTick: { fontSize: 11 },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 4, paddingTop: 4, paddingBottom: 2 },
  reactionsMe: { paddingHorizontal: 12, paddingBottom: 6 },
  reactionsThem: { paddingHorizontal: 12, paddingBottom: 6 },
  reaction: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 2 },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pinIcon: { marginHorizontal: 4, marginBottom: 2, alignSelf: "flex-end" },
  replyActionWrap: {
    width: 60, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 8,
  },
  replyActionIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  quickEmojiBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 4,
    marginHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  quickEmojiMe: { alignSelf: "flex-end" },
  quickEmojiThem: { alignSelf: "flex-start" },
  quickEmojiBtn: { padding: 4 },
  quickEmoji: { fontSize: 22 },
});
