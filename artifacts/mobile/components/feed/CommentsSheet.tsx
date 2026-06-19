import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Modal, View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Animated,
  ActivityIndicator, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    username?: string | null;
  };
}

interface Props {
  postId: string | null;
  commentsCount?: number;
  onClose: () => void;
  onCommentAdded?: () => void;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function CommentsSheet({ postId, commentsCount, onClose, onCommentAdded }: Props) {
  const { c } = useTheme();
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const listRef = useRef<FlatList>(null);

  const fetchComments = useCallback(async () => {
    if (!postId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      Alert.alert("Error", "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [postId, token]);

  useEffect(() => {
    if (postId) {
      setComments([]);
      fetchComments();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [postId]);

  const handleSubmit = async () => {
    const content = text.trim();
    if (!content || !postId || !token || submitting) return;
    setText("");
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to post");
      const comment: Comment = await res.json();
      setComments((prev) => [...prev, comment]);
      onCommentAdded?.();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    } catch {
      setText(content);
      Alert.alert("Error", "Could not post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (commentId: string, authorId: string) => {
    if (authorId !== user?.id) return;
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${BASE_URL}/api/posts/${postId}/comments/${commentId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            onCommentAdded?.();
          } catch {
            Alert.alert("Error", "Could not delete comment.");
          }
        },
      },
    ]);
  };

  return (
    <Modal
      transparent
      animationType="none"
      visible={!!postId}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: c.surface, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <Text style={[styles.title, { color: c.foreground }]}>
              Comments{commentsCount !== undefined ? ` · ${commentsCount}` : ""}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.background }]}>
              <Feather name="x" size={18} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={c.primary} size="large" />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={comments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={
                  comments.length === 0
                    ? { flex: 1 }
                    : { paddingVertical: 8, paddingHorizontal: 4 }
                }
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Feather name="message-circle" size={44} color={c.border} />
                    <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                      No comments yet.{"\n"}Be the first!
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onLongPress={() => handleDelete(item.id, item.author.id)}
                    style={styles.commentRow}
                  >
                    <Avatar uri={item.author.avatarUrl} name={item.author.displayName} size={34} />
                    <View style={[styles.bubble, { backgroundColor: c.background }]}>
                      <View style={styles.metaRow}>
                        <Text style={[styles.authorName, { color: c.foreground }]}>
                          {item.author.displayName}
                        </Text>
                        <Text style={[styles.timeText, { color: c.mutedForeground }]}>
                          {timeAgo(item.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.commentText, { color: c.foreground }]}>
                        {item.content}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            <View
              style={[
                styles.inputBar,
                {
                  borderTopColor: c.border,
                  backgroundColor: c.surface,
                  paddingBottom: insets.bottom + 8,
                },
              ]}
            >
              <Avatar uri={user?.avatarUrl} name={user?.displayName ?? "Me"} size={32} />
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: c.background, color: c.foreground, borderColor: c.border },
                ]}
                value={text}
                onChangeText={setText}
                placeholder="Write a comment…"
                placeholderTextColor={c.mutedForeground}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!text.trim() || submitting}
                style={[
                  styles.sendBtn,
                  { backgroundColor: text.trim() ? c.primary : c.border },
                ]}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "78%",
    minHeight: "50%",
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    alignSelf: "center", marginTop: 10, marginBottom: 2,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 48 },
  emptyText: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 22,
  },
  commentRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 6,
    gap: 10, alignItems: "flex-start",
  },
  bubble: { flex: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  authorName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  timeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 12, paddingTop: 10, gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 90,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
});
