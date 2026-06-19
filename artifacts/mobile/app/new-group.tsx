import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/common/Avatar";
import { BASE_URL } from "@/utils/api";
import { useSearchUsers } from "@workspace/api-client-react";

interface UserResult {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export default function NewGroupScreen() {
  const { c } = useTheme();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"group" | "channel">("group");

  const { data } = useSearchUsers({ q: query }, {
    query: {
      queryKey: ["search-new-group", query],
      enabled: query.length >= 2,
    },
  });

  const users = ((data as any)?.users ?? []) as UserResult[];
  const filteredUsers = users.filter((u) => !selected.find((s) => s.id === u.id));

  const toggleUser = useCallback((user: UserResult) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === user.id);
      if (exists) return prev.filter((s) => s.id !== user.id);
      return [...prev, user];
    });
  }, []);

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert("Nama Kosong", "Masukkan nama grup terlebih dahulu.");
      return;
    }
    if (selected.length === 0) {
      Alert.alert("Anggota Kosong", "Tambahkan minimal 1 anggota.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === "group" ? "/api/conversations/group" : "/api/conversations/channel";
      const body = activeTab === "group"
        ? { title: name, memberIds: selected.map((u) => u.id) }
        : { title: name, description: groupDesc || undefined, memberIds: selected.map((u) => u.id) };

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Gagal membuat grup");
      }

      const data = await res.json();
      router.replace(`/chat/${data.id}`);
    } catch (err: any) {
      Alert.alert("Gagal", err.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border, paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Buat Grup Baru</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary, opacity: loading ? 0.6 : 1 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.createBtnText}>Buat</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Tab: Group / Channel */}
      <View style={[styles.tabRow, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        {(["group", "channel"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: c.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Feather
              name={tab === "group" ? "users" : "hash"}
              size={16}
              color={activeTab === tab ? c.primary : c.mutedForeground}
            />
            <Text style={[styles.tabText, { color: activeTab === tab ? c.primary : c.mutedForeground }]}>
              {tab === "group" ? "Grup" : "Channel"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* Group Info */}
            <View style={[styles.section, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.iconRow}>
                <View style={[styles.iconWrap, { backgroundColor: c.primary + "22" }]}>
                  <Feather name={activeTab === "group" ? "users" : "hash"} size={28} color={c.primary} />
                </View>
                <View style={{ flex: 1, gap: 10 }}>
                  <View style={[styles.inputWrap, { borderColor: c.border, backgroundColor: c.background }]}>
                    <TextInput
                      value={groupName}
                      onChangeText={setGroupName}
                      placeholder={activeTab === "group" ? "Nama Grup..." : "Nama Channel..."}
                      placeholderTextColor={c.mutedForeground}
                      style={[styles.input, { color: c.foreground }]}
                      maxLength={64}
                    />
                  </View>
                  {activeTab === "channel" && (
                    <View style={[styles.inputWrap, { borderColor: c.border, backgroundColor: c.background }]}>
                      <TextInput
                        value={groupDesc}
                        onChangeText={setGroupDesc}
                        placeholder="Deskripsi (opsional)..."
                        placeholderTextColor={c.mutedForeground}
                        style={[styles.input, { color: c.foreground }]}
                        maxLength={200}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Selected members */}
            {selected.length > 0 && (
              <View style={[styles.selectedWrap, { borderBottomColor: c.border }]}>
                <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
                  ANGGOTA ({selected.length})
                </Text>
                <View style={styles.selectedList}>
                  {selected.map((u) => (
                    <TouchableOpacity key={u.id} style={styles.selectedChip} onPress={() => toggleUser(u)}>
                      <Avatar uri={u.avatarUrl} name={u.displayName} size={36} />
                      <Text style={[styles.chipName, { color: c.foreground }]} numberOfLines={1}>
                        {u.displayName.split(" ")[0]}
                      </Text>
                      <View style={[styles.removeChip, { backgroundColor: c.mutedForeground }]}>
                        <Feather name="x" size={10} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Search bar */}
            <View style={[styles.searchWrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
              <Feather name="search" size={16} color={c.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari user untuk ditambahkan..."
                placeholderTextColor={c.mutedForeground}
                style={[styles.searchInput, { color: c.foreground }]}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")}>
                  <Feather name="x-circle" size={16} color={c.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {query.length > 0 && query.length < 2 && (
              <Text style={[styles.hint, { color: c.mutedForeground }]}>Ketik minimal 2 huruf...</Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.userRow, { borderBottomColor: c.border }]}
            onPress={() => toggleUser(item)}
            activeOpacity={0.7}
          >
            <Avatar uri={item.avatarUrl} name={item.displayName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: c.foreground }]}>{item.displayName}</Text>
              {item.username && (
                <Text style={[styles.userHandle, { color: c.mutedForeground }]}>@{item.username}</Text>
              )}
            </View>
            <View style={[
              styles.checkCircle,
              {
                backgroundColor: selected.find((s) => s.id === item.id) ? c.primary : "transparent",
                borderColor: selected.find((s) => s.id === item.id) ? c.primary : c.border,
              },
            ]}>
              {selected.find((s) => s.id === item.id) && (
                <Feather name="check" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.length >= 2 ? (
            <Text style={[styles.hint, { color: c.mutedForeground }]}>Tidak ada user ditemukan.</Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  createBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14, fontFamily: "Inter_700Bold" },
  tabRow: {
    flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  section: {
    margin: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14,
  },
  iconRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  inputWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12 },
  input: { height: 44, fontSize: 15, fontFamily: "Inter_400Regular" },
  selectedWrap: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 10, fontFamily: "Inter_700Bold" },
  selectedList: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  selectedChip: { alignItems: "center", gap: 4, width: 60, position: "relative" },
  chipName: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  removeChip: {
    position: "absolute", top: -2, right: 2, width: 16, height: 16,
    borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userName: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  userHandle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  hint: { textAlign: "center", paddingVertical: 20, fontSize: 14, fontFamily: "Inter_400Regular" },
});
