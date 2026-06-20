import React from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Pressable,
  ScrollView, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "😍", "🙏", "💯"];

interface Message {
  id: string;
  content?: string | null;
  type: string;
  senderId: string;
  isPinned?: boolean;
  isStarred?: boolean;
  editedAt?: string | null;
}

interface MessageActionsModalProps {
  visible: boolean;
  message: Message | null;
  isMe: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onTranslate?: () => void;
  onSave?: () => void;
}

export default function MessageActionsModal({
  visible, message, isMe,
  onClose, onReact, onReply, onForward, onPin, onStar, onDelete, onCopy,
  onEdit, onTranslate, onSave,
}: MessageActionsModalProps) {
  const { c } = useTheme();
  if (!message) return null;

  const canEdit = isMe && message.type === "text" && !!message.content && !message.editedAt;

  const actions = [
    { icon: "corner-up-left" as const, label: "Balas", onPress: onReply },
    { icon: "share-2" as const, label: "Teruskan", onPress: onForward },
    ...(canEdit && onEdit ? [{ icon: "edit-2" as const, label: "Edit Pesan", onPress: onEdit }] : []),
    { icon: message?.isPinned ? "x-circle" as const : "map-pin" as const, label: message?.isPinned ? "Lepas Pin" : "Pin", onPress: onPin },
    { icon: "star" as const, label: message?.isStarred ? "Batal Bintang" : "Bintangi", onPress: onStar, starActive: message?.isStarred },
    ...(message?.content ? [{ icon: "copy" as const, label: "Salin", onPress: onCopy }] : []),
    ...(message?.content && onTranslate ? [{ icon: "globe" as const, label: "Terjemahkan", onPress: onTranslate }] : []),
    ...(onSave ? [{ icon: "bookmark" as const, label: "Simpan", onPress: onSave }] : []),
    ...(isMe ? [{ icon: "trash-2" as const, label: "Hapus", onPress: onDelete, danger: true }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.emojiRow, { borderBottomColor: c.border }]}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiBtn}
                onPress={() => { onReact(emoji); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.action, { borderBottomColor: c.border }]}
                onPress={() => { action.onPress(); onClose(); }}
                activeOpacity={0.7}
              >
                <Feather
                  name={action.icon}
                  size={20}
                  color={action.danger ? c.danger : (action as any).starActive ? "#FFD700" : c.foreground}
                />
                <Text style={[styles.actionLabel, { color: action.danger ? c.danger : c.foreground }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: 30,
    maxHeight: "65%",
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emojiBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
  },
  emoji: { fontSize: 26 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
