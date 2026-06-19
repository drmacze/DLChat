import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated,
  ScrollView, Modal, Pressable,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import TutorialOverlay from "@/components/common/TutorialOverlay";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const MOOD_COLORS: Record<string, readonly [string, string]> = {
  happy:     ["#FFD60A", "#FF9500"],
  chill:     ["#30D5C8", "#007AFF"],
  playful:   ["#FF6B35", "#F7B731"],
  flirty:    ["#FF2D55", "#FF6B9D"],
  sad:       ["#5B8CFF", "#3A5EC8"],
  excited:   ["#FF5722", "#FF9800"],
  tired:     ["#8E8E93", "#636366"],
  sarcastic: ["#BF5AF2", "#9B59B6"],
};

const MOOD_EMOJI: Record<string, string> = {
  happy: "😄", chill: "😎", playful: "🤪", flirty: "😏",
  sad: "🥺", excited: "🔥", tired: "😪", sarcastic: "🙃",
};

const MOOD_LABEL: Record<string, string> = {
  happy: "Happy 😄", chill: "Chill 😎", playful: "Playful 🤪",
  flirty: "Flirty 😏", sad: "Sad 🥺", excited: "Excited 🔥",
  tired: "Tired 😪", sarcastic: "Sarcastic 🙃",
};

const COUNTRY_FLAG: Record<string, string> = {
  id: "🇮🇩", us: "🇺🇸", sg: "🇸🇬", jp: "🇯🇵",
  in: "🇮🇳", br: "🇧🇷", de: "🇩🇪", uk: "🇬🇧",
};

const COUNTRY_NAME: Record<string, string> = {
  id: "Indonesia", us: "United States", sg: "Singapore", jp: "Japan",
  in: "India", br: "Brazil", de: "Germany", uk: "United Kingdom",
};

const PERSONALITY_COLOR: Record<string, string> = {
  bubbly: "#FF6B9D", chill: "#30D5C8", mysterious: "#9B59B6",
  nerdy: "#3498DB", sporty: "#2ECC71", artsy: "#E67E22",
  romantic: "#FF2D55", adventurous: "#F39C12", witty: "#9B59B6", empathetic: "#27AE60",
};

function getLevelInfo(count: number) {
  if (count < 10)  return { label: "New Friend",   emoji: "👋", color: "#8E8E93" };
  if (count < 30)  return { label: "Good Friend",  emoji: "😊", color: "#34C759" };
  if (count < 100) return { label: "Close Friend", emoji: "💛", color: "#FFD60A" };
  if (count < 300) return { label: "Best Friend",  emoji: "❤️", color: "#FF2D55" };
  return           { label: "Soul Friend",  emoji: "💎", color: "#BF5AF2" };
}

function getQuickReplies(messages: AIMessage[], aiTyping: boolean): string[] {
  if (aiTyping) return [];
  if (messages.length === 0) return ["Hai!", "Halo kamu!", "Apa kabar?", "Lagi apa nih?"];
  const last = messages[messages.length - 1];
  if (last?.role === "ai") {
    const c = last.content.toLowerCase();
    if (/kabar|gimana|how are/.test(c)) return ["Baik banget 😊", "Lumayan~", "Alhamdulillah!", "Biasa aja nih"];
    if (/hobi|suka|interest|hobby/.test(c)) return ["Gaming!", "Nonton series", "Dengerin musik", "Scroll-scrollan 😅"];
    if (/makan|lapar|food|hungry/.test(c)) return ["Udah makan 😊", "Belum nih lapar", "Habis makan~", "Lagi cari makan wkwk"];
    if (/tidur|sleep|ngantuk/.test(c)) return ["Masih melek~", "Udah ngantuk juga", "Belum mau tidur", "Good night! 🌙"];
    if (last.mood === "flirty") return ["Hehe~", "Apaan sih 😂", "Kamu gimana?", "Iya juga sih 😊"];
  }
  return ["Haha~", "Serius?", "Wah oke!", "Terus terus?", "Beneran?!"];
}

interface AIMessage { id: string; role: "user" | "ai"; content: string; mood?: string; createdAt: string; }
interface AIPersona { id: string; name: string; country: string; gender: string; age: number; avatarEmoji: string; mood: string; personality: string; interests?: string[]; }

function TypingIndicator({ moodColor }: { moodColor: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkAnim = (d: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(350),
      ]));
    const a1 = mkAnim(dot1, 0); const a2 = mkAnim(dot2, 160); const a3 = mkAnim(dot3, 320);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 12 }}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={{
          width: 9, height: 9, borderRadius: 5, backgroundColor: moodColor,
          opacity: d,
          transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] }) }],
        }} />
      ))}
    </View>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ProfileModal({
  visible, onClose, persona, msgCount,
}: {
  visible: boolean; onClose: () => void;
  persona: AIPersona; msgCount: number;
}) {
  const { c } = useTheme();
  const level = getLevelInfo(msgCount);
  const moodCols = MOOD_COLORS[persona.mood] ?? MOOD_COLORS.happy;
  const personaColor = PERSONALITY_COLOR[persona.personality] ?? (c.primary as string);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.profileSheet, { backgroundColor: c.background as string }]} onPress={() => {}}>
          <View style={styles.sheetHandle} />

          <LinearGradient colors={moodCols as unknown as [string, string]} style={styles.profileBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={[styles.profileAvatarBig, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              <Text style={{ fontSize: 48 }}>{persona.avatarEmoji}</Text>
            </View>
          </LinearGradient>

          <View style={styles.profileBody}>
            <View style={styles.profileNameRow}>
              <Text style={[styles.profileName, { color: c.foreground as string }]}>{persona.name}</Text>
              <Text style={{ fontSize: 20 }}>{COUNTRY_FLAG[persona.country] ?? "🌍"}</Text>
            </View>
            <Text style={[styles.profileSub, { color: c.mutedForeground as string }]}>
              {persona.age} years old • {COUNTRY_NAME[persona.country] ?? persona.country}
            </Text>

            <View style={styles.profileBadgeRow}>
              <View style={[styles.levelBadge, { backgroundColor: level.color + "22", borderColor: level.color + "55" }]}>
                <Text style={{ fontSize: 12 }}>{level.emoji}</Text>
                <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
              </View>
              <View style={[styles.personalityBadge, { backgroundColor: personaColor + "22", borderColor: personaColor + "55" }]}>
                <Text style={[styles.personalityText, { color: personaColor }]}>✦ {persona.personality}</Text>
              </View>
              <View style={[styles.moodBadge, { backgroundColor: (moodCols[0]) + "22", borderColor: (moodCols[0]) + "44" }]}>
                <Text style={[styles.moodBadgeText, { color: moodCols[0] as string }]}>{MOOD_LABEL[persona.mood] ?? persona.mood}</Text>
              </View>
            </View>

            {(persona.interests?.length ?? 0) > 0 && (
              <View style={styles.interestSection}>
                <Text style={[styles.interestTitle, { color: c.mutedForeground as string }]}>INTERESTS</Text>
                <View style={styles.interestPills}>
                  {persona.interests!.map((interest, i) => (
                    <View key={i} style={[styles.interestPill, { backgroundColor: c.surface as string, borderColor: c.border as string }]}>
                      <Text style={[styles.interestPillText, { color: c.foreground as string }]}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.statsRow, { borderTopColor: c.border as string }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: c.foreground as string }]}>{msgCount}</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground as string }]}>Messages</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.border as string }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: c.foreground as string }]}>{level.emoji}</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground as string }]}>Level</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.border as string }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: c.foreground as string }]}>∞</Text>
                <Text style={[styles.statLabel, { color: c.mutedForeground as string }]}>Always Online</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: c.surface as string }]} onPress={onClose}>
            <Feather name="x" size={18} color={c.mutedForeground as string} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
  const [showProfile, setShowProfile] = useState(false);

  const moodAccentAnim = useRef(new Animated.Value(1)).current;
  const currentMood = persona?.mood ?? "happy";
  const moodColors = MOOD_COLORS[currentMood] ?? MOOD_COLORS.happy;

  const pulseMoodAccent = useCallback(() => {
    Animated.sequence([
      Animated.timing(moodAccentAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      Animated.timing(moodAccentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [moodAccentAnim]);

  const loadData = useCallback(async () => {
    if (!token || !aiId) return;
    try {
      const [contactsRes, messagesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/ai/contacts`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/ai/contacts/${aiId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const contactsData = await contactsRes.json();
      const messagesData = await messagesRes.json();
      const found = contactsData.contacts?.find((p: AIPersona) => p.id === aiId);
      if (found) setPersona(found);
      const msgs: AIMessage[] = (messagesData.messages ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string, role: m.role as "user" | "ai",
        content: m.content as string, mood: m.mood as string,
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

  const sendMessage = async (overrideText?: string) => {
    const content = (overrideText ?? inputText).trim();
    if (!content || sending || !token) return;
    setInputText("");
    setSending(true);

    const tempUserMsg: AIMessage = { id: `temp_${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
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
      await new Promise((r) => setTimeout(r, Math.min(typingMs, 4000)));

      setAiTyping(false);
      if (data.aiMessage) {
        const aiMsg: AIMessage = {
          id: data.aiMessage.id, role: "ai",
          content: data.aiMessage.content, mood: data.aiMessage.mood,
          createdAt: data.aiMessage.createdAt,
        };
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
          const userMsg: AIMessage = { ...tempUserMsg, id: data.userMessage?.id ?? tempUserMsg.id };
          return [...filtered, userMsg, aiMsg];
        });
        if (data.aiMessage.mood) {
          setPersona((p) => p ? { ...p, mood: data.aiMessage.mood } : p);
          pulseMoodAccent();
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
    const msgMoodCols = item.mood ? MOOD_COLORS[item.mood] : moodColors;

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <LinearGradient colors={moodColors as unknown as [string, string]} style={styles.aiAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={{ fontSize: 15 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
          </LinearGradient>
        )}
        <View style={styles.msgContent}>
          {isUser ? (
            <LinearGradient colors={c.messageMeGradient as [string, string]} style={styles.bubbleGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.bubbleTextUser}>{item.content}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.bubbleAI, {
              backgroundColor: c.messageThemBg as string,
              borderLeftColor: (msgMoodCols?.[0] ?? c.accent) as string,
            }]}>
              <Text style={[styles.bubbleTextAI, { color: c.foreground as string }]}>{item.content}</Text>
            </View>
          )}
          {showTime && (
            <Text style={[styles.msgTime, { color: c.mutedForeground as string, alignSelf: isUser ? "flex-end" : "flex-start" }]}>
              {!isUser && item.mood ? `${MOOD_EMOJI[item.mood] ?? ""} ` : ""}
              {formatTime(item.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const quickReplies = getQuickReplies(messages, aiTyping || sending);
  const level = getLevelInfo(messages.filter(m => m.role === "user").length);
  const personaColor = PERSONALITY_COLOR[persona?.personality ?? ""] ?? (c.primary as string);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background as string }]}>
        <LinearGradient colors={moodColors as unknown as [string, string]} style={styles.loadingAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={{ fontSize: 36 }}>🤖</Text>
        </LinearGradient>
        <ActivityIndicator color={moodColors[0] as string} size="large" style={{ marginTop: 16 }} />
        <Text style={[styles.loadingText, { color: c.mutedForeground as string }]}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background as string }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: c.border as string, paddingTop: Platform.OS === "web" ? 16 : insets.top + 6 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.glass as string, borderColor: c.glassBorder as string }]}>
          <Feather name="arrow-left" size={20} color={c.foreground as string} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowProfile(true)} activeOpacity={0.8}>
          <View style={styles.avatarWrapper}>
            <LinearGradient colors={moodColors as unknown as [string, string]} style={styles.headerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: 20 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
            </LinearGradient>
            <View style={[styles.onlineDot, { backgroundColor: moodColors[0] as string }]} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: c.foreground as string }]}>{persona?.name ?? "AI Friend"}</Text>
              <Text style={{ fontSize: 13 }}>{persona ? COUNTRY_FLAG[persona.country] : ""}</Text>
              <View style={[styles.levelPill, { backgroundColor: level.color + "22" }]}>
                <Text style={[styles.levelPillText, { color: level.color }]}>{level.emoji} {level.label}</Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: c.mutedForeground as string }]}>
              {aiTyping
                ? "✨ typing..."
                : `${MOOD_LABEL[persona?.mood ?? "happy"] ?? "😊"} • ${persona?.personality ?? "friendly"}`}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowProfile(true)} style={[styles.infoBtn, { backgroundColor: personaColor + "18", borderColor: personaColor + "33" }]}>
          <Feather name="info" size={16} color={personaColor} />
        </TouchableOpacity>
      </View>

      {/* ── Mood Accent Bar ── */}
      <Animated.View style={{ opacity: moodAccentAnim }}>
        <LinearGradient colors={moodColors as unknown as [string, string]} style={styles.moodBar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
      </Animated.View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messageList, { paddingBottom: 16, paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <LinearGradient colors={moodColors as unknown as [string, string]} style={styles.emptyChatIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: 40 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
            </LinearGradient>
            <Text style={[styles.emptyChatName, { color: c.foreground as string }]}>
              {persona?.name ?? "AI Friend"}
            </Text>
            <View style={[styles.emptyChatPersonality, { backgroundColor: personaColor + "18", borderColor: personaColor + "33" }]}>
              <Text style={[styles.emptyChatPersonalityText, { color: personaColor }]}>✦ {persona?.personality}</Text>
            </View>
            <Text style={[styles.emptyChatSub, { color: c.mutedForeground as string }]}>
              {persona?.age} y/o from {COUNTRY_FLAG[persona?.country ?? ""] ?? "🌍"} • {MOOD_LABEL[persona?.mood ?? "happy"]}
            </Text>
            {(persona?.interests?.length ?? 0) > 0 && (
              <View style={styles.emptyInterests}>
                {persona!.interests!.slice(0, 4).map((interest, i) => (
                  <View key={i} style={[styles.emptyPill, { backgroundColor: c.surface as string, borderColor: c.border as string }]}>
                    <Text style={[styles.emptyPillText, { color: c.foreground as string }]}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.emptyChatHint, { color: c.mutedForeground as string }]}>
              👇 Tap a quick reply or type a message
            </Text>
          </View>
        }
        ListFooterComponent={
          aiTyping ? (
            <View style={[styles.msgRow, styles.msgRowAI, { marginTop: 4 }]}>
              <LinearGradient colors={moodColors as unknown as [string, string]} style={styles.aiAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={{ fontSize: 15 }}>{persona?.avatarEmoji ?? "🤖"}</Text>
              </LinearGradient>
              <View style={[styles.typingBubble, { backgroundColor: c.messageThemBg as string, borderLeftColor: moodColors[0] as string }]}>
                <TypingIndicator moodColor={moodColors[0] as string} />
              </View>
            </View>
          ) : null
        }
      />

      {/* ── Quick Replies ── */}
      {quickReplies.length > 0 && !sending && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={[styles.quickRepliesBar, { borderTopColor: c.border as string }]}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
        >
          {quickReplies.map((reply, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.quickReply, { borderColor: (moodColors[0] as string) + "60", backgroundColor: (moodColors[0] as string) + "12" }]}
              onPress={() => sendMessage(reply)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickReplyText, { color: moodColors[0] as string }]}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Input Bar ── */}
      <View style={[styles.inputBar, { borderTopColor: c.border as string, backgroundColor: c.headerBg as string, paddingBottom: Platform.OS === "ios" ? insets.bottom : 12 }]}>
        <View style={[styles.inputWrapper, { backgroundColor: c.surface as string, borderColor: c.border as string }]}>
          <TextInput
            style={[styles.input, { color: c.foreground as string }]}
            placeholder={`Message ${persona?.name ?? "AI"}...`}
            placeholderTextColor={c.mutedForeground as string}
            value={inputText}
            onChangeText={setInputText}
            multiline maxLength={2000}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { opacity: (inputText.trim() && !sending) ? 1 : 0.4 }]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || sending}
          >
            <LinearGradient colors={moodColors as unknown as [string, string]} style={styles.sendBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name="send" size={18} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Profile Modal ── */}
      {persona && (
        <ProfileModal
          visible={showProfile}
          onClose={() => setShowProfile(false)}
          persona={persona}
          msgCount={messages.length}
        />
      )}

      <TutorialOverlay
        tutorialKey="ai_contact"
        steps={[
          { icon: "cpu", title: `Chat with ${persona?.name ?? "AI"}`, description: "This AI friend has a unique personality and mood. Their replies feel natural and personal!" },
          { icon: "smile", title: "Live Mood System", description: "Watch the color bar below the header — it shows the AI's current mood and changes in real-time!" },
          { icon: "info", title: "Tap Profile", description: "Tap the header or the ⓘ button to see the AI's full profile, interests, and your friendship level." },
          { icon: "zap", title: "Quick Replies", description: "Use the quick reply chips above the input for fast, contextual responses." },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarWrapper: { position: "relative" },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "white" },
  headerNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  headerName: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  levelPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  levelPillText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1 },

  moodBar: { height: 3, width: "100%" },

  messageList: { paddingHorizontal: 12 },
  msgRow: { flexDirection: "row", marginVertical: 3, alignItems: "flex-end", gap: 8 },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAI: { justifyContent: "flex-start" },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  msgContent: { maxWidth: "78%" },
  bubbleGrad: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleTextUser: { color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bubbleAI: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3 },
  bubbleTextAI: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  typingBubble: { borderRadius: 18, borderLeftWidth: 3 },
  msgTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3, marginHorizontal: 4 },

  emptyChat: { alignItems: "center", paddingTop: 50, paddingHorizontal: 32, gap: 12 },
  emptyChatIcon: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyChatName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  emptyChatPersonality: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  emptyChatPersonalityText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptyChatSub: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyInterests: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 4 },
  emptyPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  emptyPillText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyChatHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 },

  quickRepliesBar: { borderTopWidth: StyleSheet.hairlineWidth, maxHeight: 52 },
  quickReply: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  quickReplyText: { fontSize: 14, fontFamily: "Inter_400Regular", fontWeight: "500" },

  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 8 },
  inputWrapper: { flexDirection: "row", alignItems: "flex-end", borderRadius: 24, borderWidth: 1, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120, paddingVertical: 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  sendBtnGrad: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  profileSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32, overflow: "hidden" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginTop: 12, marginBottom: 0 },
  profileBanner: { height: 140, alignItems: "center", justifyContent: "center" },
  profileAvatarBig: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  profileBody: { paddingHorizontal: 24, paddingTop: 16 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  profileName: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  profileSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 14 },
  profileBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  levelText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  personalityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  personalityText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  moodBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  moodBadgeText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  interestSection: { marginBottom: 20 },
  interestTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10, fontFamily: "Inter_700Bold" },
  interestPills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  interestPillText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  statsRow: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 4 },
  statNum: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 40 },
  closeBtn: { position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
