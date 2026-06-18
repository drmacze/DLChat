import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ActionSheetIOS,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetConversation,
  useGetMessages,
  useSendMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import Avatar from "@/components/common/Avatar";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

type MessageItem = {
  id: string;
  content?: string | null;
  mediaUrl?: string | null;
  type: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  senderId: string;
  sender: { id: string; displayName: string; avatarUrl?: string | null; isOnline?: boolean };
  reactions: Array<{ emoji: string; count: number; users: string[] }>;
  replyTo?: { content?: string | null; senderName: string; mediaUrl?: string | null } | null;
  status?: string | null;
};

export default function ChatRoomScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation, sendTyping, stopTyping } = useSocket();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [localMessages, setLocalMessages] = useState<MessageItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestMessageId = useRef<string | null>(null);
  const sendMessage = useSendMessage();

  const { data: convData } = useGetConversation(conversationId!, {
    query: { queryKey: ["conversation", conversationId] },
  });

  const { data: messagesData, isLoading } = useGetMessages(conversationId!, {}, {
    query: {
      queryKey: ["messages", conversationId],
    },
  });

  useEffect(() => {
    if (messagesData?.messages) {
      setLocalMessages(messagesData.messages as MessageItem[]);
      setHasMore((messagesData as any).hasMore ?? false);
      if (messagesData.messages.length > 0) {
        oldestMessageId.current = (messagesData.messages[0] as MessageItem).id;
      }
    }
  }, [messagesData]);

  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: MessageItem) => {
      setLocalMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Mark as read
      socket.emit("message:read", { messageId: msg.id, conversationId });
      // Invalidate conversation list for unread badge
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    };

    const handleMessageUpdated = (msg: MessageItem) => {
      setLocalMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, ...msg } : m));
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setLocalMessages((prev) => prev.map((m) =>
        m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null, mediaUrl: null } : m
      ));
    };

    const handleReaction = ({ messageId, reactions }: { messageId: string; reactions: MessageItem["reactions"] }) => {
      setLocalMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    };

    const handleMessageRead = ({ messageId }: { messageId: string }) => {
      setLocalMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, status: "read" } : m));
    };

    const handleTypingStart = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setTypingUsers((prev) => new Set([...prev, userId]));
    };
    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:reaction", handleReaction);
    socket.on("message:read", handleMessageRead);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:reaction", handleReaction);
      socket.off("message:read", handleMessageRead);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, conversationId, user?.id]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoadingMore || !oldestMessageId.current) return;
    setIsLoadingMore(true);
    try {
      const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const token = await import("@react-native-async-storage/async-storage").then(
        (m) => m.default.getItem("auth_token")
      );
      const res = await fetch(
        `${BASE_URL}/api/conversations/${conversationId}/messages?before=${oldestMessageId.current}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data: { messages: MessageItem[]; hasMore: boolean } = await res.json();
      if (data.messages.length > 0) {
        oldestMessageId.current = data.messages[0].id;
        setLocalMessages((prev) => [...data.messages, ...prev]);
      }
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      console.warn("Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, conversationId]);

  const handleSend = useCallback((text: string, mediaUrl?: string, type?: string) => {
    if (!conversationId) return;
    sendMessage.mutate(
      {
        conversationId,
        data: {
          content: text || undefined,
          type: (type as any) || "text",
          mediaUrl: mediaUrl || undefined,
          replyToMessageId: replyingTo?.id,
        },
      },
      {
        onSuccess: () => setReplyingTo(null),
        onError: () => Alert.alert("Error", "Failed to send message. Please try again."),
      }
    );
  }, [conversationId, replyingTo]);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const token = await import("@react-native-async-storage/async-storage").then(
        (m) => m.default.getItem("auth_token")
      );
      await fetch(`${BASE_URL}/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      });
    } catch {}
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const token = await import("@react-native-async-storage/async-storage").then(
        (m) => m.default.getItem("auth_token")
      );
      const res = await fetch(`${BASE_URL}/api/messages/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) Alert.alert("Error", "Could not delete message.");
    } catch {
      Alert.alert("Error", "Could not delete message.");
    }
  }, []);

  const handleLongPress = useCallback((msg: MessageItem) => {
    const isMe = msg.senderId === user?.id;
    const options = isMe
      ? ["Reply", "React 👍", "React ❤️", "React 😂", "Delete", "Cancel"]
      : ["Reply", "React 👍", "React ❤️", "React 😂", "Cancel"];
    const destructiveIdx = isMe ? 4 : undefined;
    const cancelIdx = isMe ? 5 : 4;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIdx, cancelButtonIndex: cancelIdx },
        (idx) => {
          if (idx === 0) setReplyingTo(msg);
          else if (idx === 1) handleReact(msg.id, "👍");
          else if (idx === 2) handleReact(msg.id, "❤️");
          else if (idx === 3) handleReact(msg.id, "😂");
          else if (isMe && idx === 4) {
            Alert.alert("Delete Message", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => handleDeleteMessage(msg.id) },
            ]);
          }
        }
      );
    } else {
      Alert.alert("Message Options", "", [
        { text: "Reply", onPress: () => setReplyingTo(msg) },
        { text: "React 👍", onPress: () => handleReact(msg.id, "👍") },
        { text: "React ❤️", onPress: () => handleReact(msg.id, "❤️") },
        { text: "React 😂", onPress: () => handleReact(msg.id, "😂") },
        ...(isMe ? [{ text: "Delete", style: "destructive" as const, onPress: () => handleDeleteMessage(msg.id) }] : []),
        { text: "Cancel", style: "cancel" as const },
      ]);
    }
  }, [user?.id, handleReact, handleDeleteMessage]);

  const conv = convData;
  const otherUser = conv?.type === "direct"
    ? conv.members.find((m: { userId: string; user: { displayName: string; avatarUrl?: string | null; isOnline?: boolean } }) => m.userId !== user?.id)?.user
    : null;
  const displayName = conv?.type === "direct"
    ? (otherUser?.displayName ?? "Chat")
    : (conv?.title ?? "Group Chat");

  const renderMessage = useCallback(({ item, index }: { item: MessageItem; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMessage = localMessages[index + 1];
    const showAvatar = !isMe && (!prevMessage || prevMessage.senderId !== item.senderId);
    return (
      <MessageBubble
        message={item}
        isMe={isMe}
        showAvatar={showAvatar}
        onLongPress={() => handleLongPress(item)}
      />
    );
  }, [user?.id, localMessages, handleLongPress]);

  const reversedMessages = [...localMessages].reverse();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.sidebar, borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Avatar uri={otherUser?.avatarUrl} name={displayName} size={38} isOnline={otherUser?.isOnline} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: c.foreground }]} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.headerStatus, { color: typingUsers.size > 0 ? c.primary : otherUser?.isOnline ? c.online : c.mutedForeground }]}>
            {typingUsers.size > 0 ? "typing..." : otherUser?.isOnline ? "online" : "offline"}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="more-vertical" size={22} color={c.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isLoadingMore ? <ActivityIndicator color={c.primary} style={{ padding: 12 }} /> : null
            }
            ListHeaderComponent={
              typingUsers.size > 0 ? (
                <View style={styles.typingIndicator}>
                  <Text style={[styles.typingText, { color: c.mutedForeground }]}>typing...</Text>
                </View>
              ) : null
            }
            removeClippedSubviews
            maxToRenderPerBatch={20}
            windowSize={10}
          />
        )}

        {replyingTo && (
          <View style={[styles.replyBar, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            <View style={[styles.replyBarLine, { backgroundColor: c.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyBarName, { color: c.primary }]}>{replyingTo.sender.displayName}</Text>
              <Text style={[styles.replyBarContent, { color: c.mutedForeground }]} numberOfLines={1}>
                {replyingTo.content ?? (replyingTo.type !== "text" ? `[${replyingTo.type}]` : "Media")}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
              <Feather name="x" size={18} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        <MessageInput
          onSend={handleSend}
          onTyping={() => sendTyping(conversationId!)}
          onStopTyping={() => stopTyping(conversationId!)}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  typingIndicator: { paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { fontSize: 13, fontStyle: "italic", fontFamily: "Inter_400Regular" },
  replyBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  replyBarLine: { width: 3, height: "100%", borderRadius: 2 },
  replyBarName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  replyBarContent: { fontSize: 12, fontFamily: "Inter_400Regular" },
  replyBarClose: { padding: 4 },
});
