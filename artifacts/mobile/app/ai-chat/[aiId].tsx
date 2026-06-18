import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import TutorialOverlay from "@/components/common/TutorialOverlay";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const MOOD_EMOJI: Record<string, string> = {
  happy: "😄", chill: "😎", playful: "🤪", flirty: "😏",
  sad: "🥺", excited: "🔥", tired: "😪", sarcastic: "🙃",
};
const COUNTRY_FLAG: Record<string, string> = {
  id: "🇮🇩", us: "🇺🇸", sg: "🇸🇬", jp: "🇯🇵", in: "🇮🇳", br: "🇧🇷", de: "🇩🇪", uk: "🇬🇧",
};

interface AIMessage { id: string; role: "user" | "ai"; content: string; mood?: string; createdAt: string; }
interface AIPersona { id: string; name: string; country: string; gender: string; age: number; avatarEmoji: string; mood: string; personality: string; interests?: string[]; }

function TypingIndicator({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (d: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(d, { toValue: -5, duration: 300, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(300),
      ]));
    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={typingStyles.container}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[typingStyles.dot, { backgroundColor: color, transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}
const typingStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AIChatScreen() {
  const { aiId } = useLocalSearchParams<{ aiId: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [persona, setPersona] = useState<AIPersona | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !aiId) return;
    try {
      const [contactsRes, messagesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/ai/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/ai/contacts/${aiId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const contactsData = await contactsRes.json();
      const messagesData = await messagesRes.json();
      const found = contactsData.contacts?.find((c: AIPersona) => c.id === aiId);
      if (found) setPersona(found);
      const msgs: AIMessage[] = (messagesData.messages ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        role: m.role as "user" | "ai",
        content: m.content as string,
        mood: m.mood as string,
        createdAt: m.createdAt as string,
      }));
      setMessages(msgs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, aiId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, aiTyping]);

  const sendMessage = async () => {
    const content = inputText.trim();
    if (!content || sending || !token) return;
    setInputText("");
    setSending(true);

    const tempUserMsg: AIMessage = {
      id: `temp_${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setAiTyping(true);

    try {
      const res = await fetch(`${BASE_URL}/api/ai/contacts/${aiId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();

      const typingMs: number = data.typingMs ?? 1500;
      await new Promise((resolve) => setTimeout(resolve, Math.min(typingMs, 4000)));

      setAiTyping(false);
      if (data.aiMessage) {
        const aiMsg: AIMessage = {
          id: data.aiMessage.id,
          role: "ai",
          content: data.aiMessage.content,
          mood: data.aiMessage.mood,
          createdAt: data.aiMessage.createdAt,
        };
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          const userMsg: AIMessage = { ...tempUserMsg, id: data.userMessage?.id ?? tempUserMsg.id };
          return [...filtered, userMsg, aiMsg];
        });
        if (persona && data.aiMessage.mood) {
          setPersona((p) => p ? { ...p, mood: data.aiMessage.mood } : p);
        }
      }
    } catch (e) {
      setAiTyping(false);
      console.error("AI chat error", e);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: AIMessage; index: number }) => {
    const isUser = item.role === "user";
    const showTime = index === messages.length - 1 ||
      new Date(messages[index + 1]?.createdAt).getTime() - new Date(item.createdAt).getTime() > 3 * 60 * 1000;

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: c.accent + "33" }]}>
            <Text style={{ fontSize: 16 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
          </View>
        )}
        <View style={styles.msgContent}>
          <View style={[
            styles.bubble,
            isUser
              ? styles.bubbleUser
              : [styles.bubbleAI, { backgroundColor: c.messageThemBg }]
          ]}>
            {isUser ? (
              <LinearGradient colors={c.messageMeGradient} style={styles.bubbleGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.bubbleTextUser}>{item.content}</Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.bubbleTextAI, { color: c.foreground }]}>{item.content}</Text>
            )}
          </View>
          {showTime && (
            <Text style={[styles.msgTime, { color: c.mutedForeground, alignSelf: isUser ? "flex-end" : "flex-start" }]}>
              {!isUser && item.mood ? `${MOOD_EMOJI[item.mood] ?? ""} ` : ""}{formatTime(item.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} size="large" />
        <Text style={[styles.loadingText, { color: c.mutedForeground }]}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 16 : insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
          <Feather name="arrow-left" size={20} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <LinearGradient colors={c.aiGradient} style={styles.headerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={{ fontSize: 20 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
          </LinearGradient>
          <View>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: c.foreground }]}>{persona?.name ?? "AI Friend"}</Text>
              <Text style={{ fontSize: 12 }}>{persona ? COUNTRY_FLAG[persona.country] : ""}</Text>
            </View>
            <Text style={[styles.headerSub, { color: c.mutedForeground }]}>
              {aiTyping ? "typing..." : `${MOOD_EMOJI[persona?.mood ?? "happy"] ?? "😊"} ${persona?.personality ?? "friendly"} • ${persona?.age ?? "?"} y/o`}
            </Text>
          </View>
        </View>
        <View style={[styles.aiBadge, { backgroundColor: c.accent + "22", borderColor: c.accent + "44" }]}>
          <Text style={[styles.aiBadgeText, { color: c.accent }]}>AI</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messageList,
          { paddingBottom: 16, paddingTop: 12 }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <LinearGradient colors={c.aiGradient} style={styles.emptyChatIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: 32 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
            </LinearGradient>
            <Text style={[styles.emptyChatName, { color: c.foreground }]}>Chat with {persona?.name}</Text>
            <Text style={[styles.emptyChatSub, { color: c.mutedForeground }]}>
              Say hi! {persona?.name} is a {persona?.personality}, {persona?.age}-year-old from {COUNTRY_FLAG[persona?.country ?? ""] ?? "🌍"} who loves {persona?.interests?.slice(0, 2).join(" & ")}.
            </Text>
          </View>
        }
        ListFooterComponent={
          aiTyping ? (
            <View style={[styles.msgRow, styles.msgRowAI, { marginTop: 4 }]}>
              <View style={[styles.aiAvatar, { backgroundColor: c.accent + "33" }]}>
                <Text style={{ fontSize: 16 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble, { backgroundColor: c.messageThemBg }]}>
                <TypingIndicator color={c.mutedForeground} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.headerBg, paddingBottom: Platform.OS === "ios" ? insets.bottom : 12 }]}>
        <View style={[styles.inputWrapper, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            style={[styles.input, { color: c.foreground }]}
            placeholder={`Message ${persona?.name ?? "AI"}...`}
            placeholderTextColor={c.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: (inputText.trim() && !sending) ? 1 : 0.4 }]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            <LinearGradient colors={c.primaryGradient} style={styles.sendBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <TutorialOverlay
        tutorialKey="ai_contact"
        steps={[
          { icon: "cpu", title: `Chat with ${persona?.name ?? "AI"}`, description: "This AI friend has a unique personality and mood. Their replies feel natural and personal!" },
          { icon: "smile", title: "Mood System", description: "Watch the emoji in the header — the AI's mood changes over the conversation and affects how they reply." },
          { icon: "zap", title: "Always Online", description: "AI friends are available 24/7, no internet needed for the AI brain." },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  headerName: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  aiBadgeText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  messageList: { paddingHorizontal: 12 },
  msgRow: { flexDirection: "row", marginVertical: 3, alignItems: "flex-end", gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAI: { justifyContent: "flex-start" },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  msgContent: { maxWidth: "78%" },
  bubble: { borderRadius: 18, overflow: "hidden" },
  bubbleUser: {},
  bubbleAI: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleGrad: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleTextUser: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bubbleTextAI: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  typingBubble: { paddingHorizontal: 0, paddingVertical: 0 },
  msgTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3, marginHorizontal: 4 },
  emptyChat: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 14 },
  emptyChatIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyChatName: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyChatSub: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 20 },
  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 10 },
  inputWrapper: { flexDirection: "row", alignItems: "flex-end", borderRadius: 24, borderWidth: 1, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120, paddingVertical: 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  sendBtnGrad: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
});
