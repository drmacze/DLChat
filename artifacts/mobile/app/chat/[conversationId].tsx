import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Clipboard,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetConversation,
  useGetMessages,
  useSendMessage,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import MessageBubble from "@/components/chat/MessageBubble";
import MessageInput from "@/components/chat/MessageInput";
import MessageActionsModal from "@/components/chat/MessageActionsModal";
import ForwardModal from "@/components/chat/ForwardModal";
import StreakFireOverlay, { isMilestone } from "@/components/chat/StreakFireOverlay";
import Avatar from "@/components/common/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useTheme } from "@/context/ThemeContext";
import { BASE_URL } from "@/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

type MessageItem = {
  id: string;
  content?: string | null;
  mediaUrl?: string | null;
  type: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  senderId: string;
  isPinned?: boolean;
  isStarred?: boolean;
  forwardedFromMessageId?: string | null;
  sender: { id: string; displayName: string; avatarUrl?: string | null; isOnline?: boolean; lastSeenAt?: string | null };
  reactions: Array<{ emoji: string; count: number; users: string[] }>;
  replyTo?: { content?: string | null; senderName: string; mediaUrl?: string | null } | null;
  status?: string | null;
};

function formatLastSeen(iso: string | null | undefined): string {
  if (!iso) return "Terakhir terlihat baru-baru ini";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Terakhir terlihat baru saja";
  if (diff < 3600) return `Terakhir terlihat ${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `Terakhir terlihat ${Math.floor(diff / 3600)} jam lalu`;
  const days = Math.floor(diff / 86400);
  return `Terakhir terlihat ${days} hari lalu`;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("auth_token");
}

export default function ChatRoomScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useAuth();
  const { socket, reconnectCount, joinConversation, leaveConversation, sendTyping, stopTyping, initiateCall } = useSocket();
  const queryClient = useQueryClient();
  const sendMessage = useSendMessage();

  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [localMessages, setLocalMessages] = useState<MessageItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestMessageId = useRef<string | null>(null);

  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [pinnedMessage, setPinnedMessage] = useState<MessageItem | null>(null);

  const [sessionMsgCount, setSessionMsgCount] = useState(0);
  const [showStreakFire, setShowStreakFire] = useState(false);
  const [streakCount, setStreakCount] = useState(0);

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: async () => {
      const tk = await getToken();
      const res = await fetch(`${BASE_URL}/api/streak`, { headers: { Authorization: `Bearer ${tk}` } });
      return res.json();
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: convData } = useGetConversation(conversationId!, {
    query: { queryKey: ["conversation", conversationId] },
  });

  const { data: messagesData, isLoading } = useGetMessages(conversationId!, {}, {
    query: { queryKey: ["messages", conversationId] },
  });

  useEffect(() => {
    if (messagesData?.messages) {
      const msgs = messagesData.messages as MessageItem[];
      setLocalMessages(msgs);
      setHasMore((messagesData as any).hasMore ?? false);
      if (msgs.length > 0) oldestMessageId.current = msgs[0].id;
      const pinned = msgs.find((m) => m.isPinned);
      if (pinned) setPinnedMessage(pinned);
    }
  }, [messagesData]);

  useEffect(() => {
    if (!conversationId) return;
    joinConversation(conversationId);
    return () => leaveConversation(conversationId);
  }, [conversationId, reconnectCount]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: MessageItem) => {
      setLocalMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      socket.emit("message:read", { messageId: msg.id, conversationId });
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

    const handlePin = ({ messageId, isPinned }: { messageId: string; isPinned: boolean; conversationId: string }) => {
      setLocalMessages((prev) => {
        const updated = prev.map((m) => m.id === messageId ? { ...m, isPinned } : { ...m, isPinned: false });
        const pinned = updated.find((m) => m.isPinned);
        setPinnedMessage(pinned ?? null);
        return updated;
      });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:reaction", handleReaction);
    socket.on("message:read", handleMessageRead);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:pin", handlePin);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:reaction", handleReaction);
      socket.off("message:read", handleMessageRead);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:pin", handlePin);
    };
  }, [socket, conversationId, user?.id]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoadingMore || !oldestMessageId.current) return;
    setIsLoadingMore(true);
    try {
      const token = await getToken();
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
    } catch {}
    finally { setIsLoadingMore(false); }
  }, [hasMore, isLoadingMore, conversationId]);

  const handleSend = useCallback((text: string, mediaUrl?: string, type?: string) => {
    if (!conversationId || !user) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      content: text || null,
      mediaUrl: mediaUrl || null,
      type: type || "text",
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      senderId: user.id,
      isPinned: false,
      isStarred: false,
      forwardedFromMessageId: null,
      sender: { id: user.id, displayName: user.displayName ?? "Me", avatarUrl: (user as any).avatarUrl ?? null, isOnline: true, lastSeenAt: null },
      reactions: [],
      replyTo: replyingTo ? { content: replyingTo.content, senderName: replyingTo.sender.displayName, mediaUrl: replyingTo.mediaUrl } : null,
      status: "sending",
    };

    setLocalMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);

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
        onSuccess: (serverMsg: any) => {
          setLocalMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempId);
            if (withoutTemp.find((m) => m.id === serverMsg.id)) return withoutTemp;
            return [...withoutTemp, { ...serverMsg, status: "sent" }];
          });
          setSessionMsgCount((prev) => {
            const next = prev + 1;
            if (isMilestone(next)) {
              const currentStreak = streakData?.currentStreak ?? 0;
              setStreakCount(currentStreak > 0 ? currentStreak : 1);
              setShowStreakFire(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            return next;
          });
        },
        onError: () => {
          setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
          Alert.alert("Error", "Gagal mengirim pesan. Coba lagi.");
        },
      }
    );
  }, [conversationId, replyingTo, streakData, user]);

  const handleReact = useCallback(async (emoji: string) => {
    if (!selectedMessage) return;
    try {
      const token = await getToken();
      await fetch(`${BASE_URL}/api/messages/${selectedMessage.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ emoji }),
      });
    } catch {}
  }, [selectedMessage]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    Alert.alert("Hapus Pesan", "Pesan ini akan dihapus.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive", onPress: async () => {
          try {
            const token = await getToken();
            await fetch(`${BASE_URL}/api/messages/${messageId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch { Alert.alert("Error", "Tidak dapat menghapus pesan."); }
        }
      },
    ]);
  }, []);

  const handlePin = useCallback(async () => {
    if (!selectedMessage) return;
    try {
      const token = await getToken();
      await fetch(`${BASE_URL}/api/messages/${selectedMessage.id}/pin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Error", "Tidak dapat pin pesan."); }
  }, [selectedMessage]);

  const handleStar = useCallback(async () => {
    if (!selectedMessage) return;
    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/messages/${selectedMessage.id}/star`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLocalMessages((prev) => prev.map((m) =>
        m.id === selectedMessage.id ? { ...m, isStarred: data.isStarred } : m
      ));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { Alert.alert("Error", "Tidak dapat bintangi pesan."); }
  }, [selectedMessage]);

  const handleCopy = useCallback(() => {
    if (selectedMessage?.content) {
      Clipboard.setString(selectedMessage.content);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [selectedMessage]);

  const handleLongPress = useCallback((msg: MessageItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(msg);
    setShowActionsModal(true);
  }, []);

  const handleCall = useCallback((callType: "voice" | "video") => {
    if (!conversationId || !conv) return;
    initiateCall(conversationId, callType);
    router.push({
      pathname: "/call/[conversationId]",
      params: {
        conversationId,
        type: callType,
        displayName,
        avatarUrl: otherUser?.avatarUrl ?? "",
      },
    } as any);
  }, [conversationId, conv]);

  const conv = convData;
  const isAI = (conv as any)?.isAI === true;
  const otherMember = conv?.type === "direct"
    ? conv.members.find((m: { userId: string }) => m.userId !== user?.id)
    : null;
  const otherUser = otherMember?.user ?? null;
  const displayName = conv?.type === "direct"
    ? (otherUser?.displayName ?? "Chat")
    : (conv?.title ?? "Group Chat");

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return localMessages;
    const q = searchQuery.toLowerCase();
    return localMessages.filter((m) => m.content?.toLowerCase().includes(q));
  }, [localMessages, searchQuery]);

  const renderMessage = useCallback(({ item, index }: { item: MessageItem; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMessage = filteredMessages[index + 1];
    const showAvatar = !isMe && (!prevMessage || prevMessage.senderId !== item.senderId);
    return (
      <MessageBubble
        message={item}
        isMe={isMe}
        showAvatar={showAvatar}
        onLongPress={() => handleLongPress(item)}
        currentUserId={user?.id}
      />
    );
  }, [user?.id, filteredMessages, handleLongPress]);

  const reversedMessages = useMemo(() => [...filteredMessages].reverse(), [filteredMessages]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.sidebar, borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerProfile} onPress={() => otherUser && router.push(`/profile/${otherUser.id}` as any)} activeOpacity={0.8}>
          <Avatar uri={otherUser?.avatarUrl} name={displayName} size={36} isOnline={otherUser?.isOnline} />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: c.foreground }]} numberOfLines={1}>{displayName}</Text>
            <Text style={[styles.headerStatus, {
              color: typingUsers.size > 0 ? c.primary
                : otherUser?.isOnline ? c.online
                : c.mutedForeground
            }]} numberOfLines={1}>
              {typingUsers.size > 0 ? "✏️ sedang mengetik..."
                : otherUser?.isOnline ? "● Online"
                : formatLastSeen(otherUser?.lastSeenAt)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSearch((s) => !s)}>
            <Feather name={showSearch ? "x" : "search"} size={20} color={c.foreground} />
          </TouchableOpacity>
          {!isAI && (
            <>
              <TouchableOpacity style={styles.headerBtn} onPress={() => handleCall("voice")}>
                <Feather name="phone" size={20} color={c.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerBtn} onPress={() => handleCall("video")}>
                <Feather name="video" size={20} color={c.primary} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/starred-messages" as any)}>
            <Feather name="star" size={20} color={c.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: c.foreground }]}
            placeholder="Cari pesan..."
            placeholderTextColor={c.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x-circle" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Pinned Message Bar */}
      {pinnedMessage && !showSearch && (
        <TouchableOpacity
          style={[styles.pinnedBar, { backgroundColor: `${c.primary}18`, borderBottomColor: c.border }]}
          activeOpacity={0.8}
        >
          <Feather name="map-pin" size={14} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pinnedLabel, { color: c.primary }]}>Pesan Disematkan</Text>
            <Text style={[styles.pinnedContent, { color: c.mutedForeground }]} numberOfLines={1}>
              {pinnedMessage.content ?? (pinnedMessage.type !== "text" ? `[${pinnedMessage.type}]` : "Media")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setPinnedMessage(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={c.mutedForeground} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Search result count */}
      {showSearch && searchQuery.trim().length > 0 && (
        <View style={[styles.searchResultBar, { backgroundColor: c.surface }]}>
          <Text style={[styles.searchResultText, { color: c.mutedForeground }]}>
            {filteredMessages.length} pesan ditemukan
          </Text>
        </View>
      )}

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
                  <View style={[styles.typingBubble, { backgroundColor: c.surface }]}>
                    <Text style={[styles.typingDots, { color: c.mutedForeground }]}>● ● ●</Text>
                  </View>
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
              <Text style={[styles.replyBarName, { color: c.primary }]}>
                Membalas {replyingTo.sender.displayName}
              </Text>
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

      {/* Message Actions Modal */}
      <MessageActionsModal
        visible={showActionsModal}
        message={selectedMessage as any}
        isMe={selectedMessage?.senderId === user?.id}
        onClose={() => setShowActionsModal(false)}
        onReact={(emoji) => handleReact(emoji)}
        onReply={() => { setReplyingTo(selectedMessage); }}
        onForward={() => setShowForwardModal(true)}
        onPin={handlePin}
        onStar={handleStar}
        onDelete={() => selectedMessage && handleDeleteMessage(selectedMessage.id)}
        onCopy={handleCopy}
      />

      {/* Forward Modal */}
      <ForwardModal
        visible={showForwardModal}
        messageId={selectedMessage?.id ?? null}
        onClose={() => setShowForwardModal(false)}
        onForwarded={() => Alert.alert("✅", "Pesan berhasil diteruskan!")}
      />

      {/* Streak Fire Overlay */}
      <StreakFireOverlay
        visible={showStreakFire}
        streak={streakCount}
        messagesCount={sessionMsgCount}
        onHide={() => setShowStreakFire(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 4,
    paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2,
  },
  headerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerProfile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 2 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerStatus: { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerActions: { flexDirection: "row" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchResultBar: { paddingHorizontal: 16, paddingVertical: 6 },
  searchResultText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pinnedBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14,
    paddingVertical: 8, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinnedLabel: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  pinnedContent: { fontSize: 13, fontFamily: "Inter_400Regular" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  typingIndicator: { paddingHorizontal: 16, paddingVertical: 8, alignItems: "flex-start" },
  typingBubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  typingDots: { fontSize: 16, letterSpacing: 3 },
  replyBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 12,
    paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  replyBarLine: { width: 3, alignSelf: "stretch", borderRadius: 2 },
  replyBarName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  replyBarContent: { fontSize: 12, fontFamily: "Inter_400Regular" },
  replyBarClose: { padding: 4 },
});
