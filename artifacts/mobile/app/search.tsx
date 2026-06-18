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
import Avatar from "@/components/common/Avatar";
import colors from "@/constants/colors";

export default function SearchScreen() {
  const c = colors.dark;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const createDirect = useCreateDirectConversation();

  const { data, isLoading } = useSearchUsers({ q: query }, {
    query: {
      queryKey: ["search-users", query],
      enabled: query.length >= 2,
    },
  });

  const users = data?.users ?? [];

  const handleStartChat = (userId: string) => {
    createDirect.mutate(
      { data: { targetUserId: userId } },
      {
        onSuccess: (data) => {
          router.replace(`/chat/${data.id}`);
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.sidebar,
            borderBottomColor: c.border,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: c.foreground }]}
            placeholder="Search by name or username..."
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

      {query.length < 2 ? (
        <View style={styles.hint}>
          <Feather name="search" size={40} color={c.mutedForeground} />
          <Text style={[styles.hintText, { color: c.mutedForeground }]}>Search for users to chat</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={c.primary} /></View>
      ) : (
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
              <Text style={[styles.hintText, { color: c.mutedForeground }]}>No users found</Text>
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
});
