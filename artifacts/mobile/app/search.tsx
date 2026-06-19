import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSearchUsers, useCreateDirectConversation } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/common/Avatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

const TABS = ["Pengguna", "Pesan"] as const;
type Tab = typeof TABS[number];

async function searchMessages(q: string, token: string) {
  const res = await fetch(`${BASE_URL}/api/messages/search?q=${encodeURIComponent(q)}&limit=30`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json() as Promise<{ messages: Array<{ id: string; content: string; createdAt: string; conversationId: string; sender: { id: string; displayName: string; avatarUrl?: string } }> }>;
}

export default function SearchScreen() {
  const { c } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Pengguna");
  const createDirect = useCreateDirectConversation();

  const { data: usersData, isLoading: usersLoading } = useSearchUsers({ q: query }, {
    query: {
      queryKey: ["search-users", query],
      enabled: query.length >= 2 && activeTab === "Pengguna",
    },
  });

  const { data: msgData, isLoading: msgLoading } = useQuery({
    queryKey: ["search-messages", query],
    queryFn: () => searchMessages(query, token!),
    enabled: query.length >= 2 && activeTab === "Pesan" && !!token,
  });

  const users = usersData?.users ?? [];
  const messages = msgData?.messages ?? [];

  const handleStartChat = (userId: string) => {
    createDirect.mutate(
      { data: { targetUserId: userId } },
      {
        onSuccess: (data: unknown) => {
          router.replace(`/chat/${(data as { id: string }).id}`);
        },
      }
    );
  };

  const isLoading = activeTab === "Pengguna" ? usersLoading : msgLoading;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, {
        backgroundColor: c.headerBg,
        borderBottomColor: c.border,
        paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: c.foreground }]}
            placeholder={activeTab === "Pengguna" ? "Cari pengguna..." : "Cari pesan..."}
            placeholderTextColor={c.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.tabs, { borderBottomColor: c.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? c.primary : c.mutedForeground }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {query.length < 2 ? (
        <View style={styles.hint}>
          <Feather name="search" size={40} color={c.mutedForeground} />
          <Text style={[styles.hintText, { color: c.mutedForeground }]}>
            {activeTab === "Pengguna" ? "Ketik nama atau username..." : "Ketik kata kunci pesan..."}
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={c.primary} /></View>
      ) : activeTab === "Pengguna" ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.result, { borderBottomColor: c.border }]}
              onPress={() => handleStartChat(item.id)}
              activeOpacity={0.7}
            >
              <Avatar uri={item.avatarUrl} name={item.displayName} size={46} isOnline={item.isOnline} />
              <View style={styles.resultInfo}>
                <Text style={[styles.resultName, { color: c.foreground }]}>{item.displayName}</Text>
                {item.username && <Text style={[styles.resultHandle, { color: c.mutedForeground }]}>@{item.username}</Text>}
              </View>
              <Feather name="message-circle" size={20} color={c.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.hint}>
              <Text style={[styles.hintText, { color: c.mutedForeground }]}>Pengguna tidak ditemukan</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.result, { borderBottomColor: c.border }]}
              onPress={() => router.push(`/chat/${item.conversationId}`)}
              activeOpacity={0.7}
            >
              <Avatar uri={item.sender?.avatarUrl} name={item.sender?.displayName ?? "?"} size={46} />
              <View style={styles.resultInfo}>
                <Text style={[styles.resultName, { color: c.foreground }]} numberOfLines={1}>
                  {item.sender?.displayName ?? "Pengguna"}
                </Text>
                <Text style={[styles.resultMsg, { color: c.mutedForeground }]} numberOfLines={2}>
                  {item.content}
                </Text>
              </View>
              <Feather name="arrow-right" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.hint}>
              <Text style={[styles.hintText, { color: c.mutedForeground }]}>Pesan tidak ditemukan</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hint: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  hintText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  loading: { padding: 20, alignItems: "center" },
  result: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  resultHandle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  resultMsg: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
});
