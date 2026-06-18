import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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

export default function ChatRoomScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation, sendTyping, stopTyping } = useSocket();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const sendMessage = useSendMessage();

  const { data: convData } = useGetConversation(conversationId!, {
    query: { queryKey: ["conversation", conversationId] },
  });

  const { data: messagesData, isLoading } = useGetMessages(conversationId!, {}, {
    query: { queryKey: ["messages", conversationId] },
  });

  const messages = (messagesData?.messages ?? []) as Array<{
    id: string;
    content?: string | null;
    mediaUrl?: string | null;
    type: string;
    createdAt: string;
    editedAt?: string | null;
    senderId: string;
    sender: { id: string; displayName: string; avatarUrl?: string | null };
    reactions: Array<{ emoji: string; count: number; users: string[] }>;
    replyTo?: { content?: string | null; senderName: string } | null;
    status?: string | null;
  }>;

  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg: typeof messages[0]) => {
      queryClient.setQueryData(["messages", conversationId], (old: typeof messagesData) => {
        if (!old) return old;
        return { ...old, messages: [...(old.messages ?? []), msg] };
      });
    };
    const handleTypingStart = ({ userId }: { userId: string }) => {
      if (userId !== user?.id) setTypingUsers((prev) => new Set([...prev, userId]));
    };
    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, conversationId, user?.id]);

  const handleSend = useCallback((text: string) => {
    if (!conversationId) return;
    sendMessage.mutate({ conversationId, data: { content: text, type: "text" } });
  }, [conversationId]);

  const conv = convData;
  const otherUser = conv?.type === "direct"
    ? conv.members.find((m) => m.userId !== user?.id)?.user
    : null;
  const displayName = conv?.type === "direct"
    ? (otherUser?.displayName ?? "Chat")
    : (conv?.title ?? "Group Chat");

  const renderMessage = useCallback(({ item, index }: { item: typeof messages[0]; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMessage = messages[index + 1];
    const showAvatar = !isMe && (!prevMessage || prevMessage.senderId !== item.senderId);
    return (
      <MessageBubble
        message={item}
        isMe={isMe}
        showAvatar={showAvatar}
      />
    );
  }, [user?.id, messages]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.sidebar,
            borderBottomColor: c.border,
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Avatar uri={otherUser?.avatarUrl} name={displayName} size={38} isOnline={otherUser?.isOnline} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: c.foreground }]} numberOfLines={1}>{displayName}</Text>
          <Text style={[styles.headerStatus, { color: otherUser?.isOnline ? c.online : c.mutedForeground }]}>
            {typingUsers.size > 0 ? "typing..." : otherUser?.isOnline ? "online" : "offline"}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Feather name="more-vertical" size={22} color={c.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={c.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
            ListHeaderComponent={
              typingUsers.size > 0 ? (
                <View style={styles.typingIndicator}>
                  <Text style={[styles.typingText, { color: c.mutedForeground }]}>typing...</Text>
                </View>
              ) : null
            }
          />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  typingIndicator: { paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { fontSize: 13, fontStyle: "italic", fontFamily: "Inter_400Regular" },
});
