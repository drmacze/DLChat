import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { BASE_URL } from "@/utils/api";

const SCREEN_W = Dimensions.get("window").width;
const CELL = (SCREEN_W - 4) / 3;

type MediaItem = {
  id: string;
  type: "image" | "video" | "file" | "voice";
  mediaUrl: string;
  content: string | null;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl?: string | null };
};

type Tab = "all" | "image" | "video" | "file";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function MediaGalleryScreen() {
  const { conversationId, title } = useLocalSearchParams<{ conversationId: string; title?: string }>();
  const { c } = useTheme();
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["media-gallery", conversationId, tab],
    queryFn: async () => {
      const typeParam = tab === "all" ? "" : `?type=${tab}`;
      const res = await fetch(`${BASE_URL}/api/messages/media/${conversationId}${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal memuat media");
      return res.json() as Promise<{ media: MediaItem[] }>;
    },
    enabled: !!conversationId,
  });

  const media = data?.media ?? [];

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "all", label: "Semua", icon: "grid" },
    { key: "image", label: "Foto", icon: "image" },
    { key: "video", label: "Video", icon: "film" },
    { key: "file", label: "File", icon: "file" },
  ];

  const renderCell = useCallback(({ item }: { item: MediaItem }) => {
    if (item.type === "image") {
      return (
        <TouchableOpacity style={styles.cell} onPress={() => setSelected(item)} activeOpacity={0.8}>
          <Image source={{ uri: item.mediaUrl }} style={styles.cellImg} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (item.type === "video") {
      return (
        <TouchableOpacity style={[styles.cell, { backgroundColor: "#111" }]} onPress={() => setSelected(item)} activeOpacity={0.8}>
          <Feather name="play-circle" size={32} color="#fff" />
        </TouchableOpacity>
      );
    }
    const ext = item.mediaUrl.split(".").pop()?.toUpperCase() ?? "FILE";
    const getIcon = () => {
      const e = ext.toLowerCase();
      if (e === "pdf") return "file-text";
      if (["mp3", "m4a", "ogg", "wav"].includes(e)) return "music";
      if (["zip", "rar"].includes(e)) return "archive";
      return "file";
    };
    return (
      <TouchableOpacity
        style={[styles.fileCell, { backgroundColor: c.surface as string, borderColor: c.border as string }]}
        onPress={() => Alert.alert("File", item.content ?? item.mediaUrl)}
        activeOpacity={0.8}
      >
        <Feather name={getIcon() as any} size={24} color={c.primary as string} />
        <Text style={[styles.fileCellName, { color: c.foreground as string }]} numberOfLines={2}>
          {item.content ?? `${ext} file`}
        </Text>
        <Text style={[styles.fileCellDate, { color: c.mutedForeground as string }]}>
          {formatDate(item.createdAt)}
        </Text>
      </TouchableOpacity>
    );
  }, [c]);

  return (
    <View style={[styles.root, { backgroundColor: c.background as string }]}>
      <SafeAreaView>
        <View style={[styles.header, { borderBottomColor: c.border as string }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={c.foreground as string} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.foreground as string }]}>
              {title ?? "Media & File"}
            </Text>
            <Text style={[styles.headerSub, { color: c.mutedForeground as string }]}>
              {media.length} item{media.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        <View style={[styles.tabs, { borderBottomColor: c.border as string }]}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && { borderBottomColor: c.primary as string, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.key)}
            >
              <Feather name={t.icon as any} size={14} color={tab === t.key ? c.primary as string : c.mutedForeground as string} />
              <Text style={[styles.tabLabel, { color: tab === t.key ? c.primary as string : c.mutedForeground as string }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator size="large" color={c.primary as string} style={{ marginTop: 60 }} />
      ) : media.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="image" size={48} color={c.mutedForeground as string} />
          <Text style={[styles.emptyText, { color: c.mutedForeground as string }]}>Belum ada media</Text>
        </View>
      ) : (tab === "image" || tab === "video" || tab === "all" || tab === "file") ? (
        <FlatList
          data={tab === "file" ? media.filter(m => m.type === "file" || m.type === "voice") : media.filter(m => tab === "all" ? (m.type === "image" || m.type === "video") : m.type === tab)}
          renderItem={renderCell}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
          ListFooterComponent={
            tab === "all" ? (
              <View>
                {media.filter(m => m.type === "file").length > 0 && (
                  <View>
                    <Text style={[styles.sectionLabel, { color: c.mutedForeground as string }]}>File & Dokumen</Text>
                    {media.filter(m => m.type === "file").map((item) => (
                      <View key={item.id}>{renderCell({ item })}</View>
                    ))}
                  </View>
                )}
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={media.filter(m => m.type === "file" || m.type === "voice")}
          renderItem={renderCell}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
        />
      )}

      {selected && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setSelected(null)}>
          <View style={styles.lightbox}>
            <TouchableOpacity style={styles.lightboxClose} onPress={() => setSelected(null)}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
            {selected.type === "image" && (
              <Image source={{ uri: selected.mediaUrl }} style={styles.lightboxImg} resizeMode="contain" />
            )}
            {selected.type === "video" && (
              <View style={styles.lightboxVideo}>
                <Feather name="play-circle" size={64} color="#fff" />
                <Text style={styles.lightboxVideoText}>Video tidak dapat diputar langsung di sini</Text>
              </View>
            )}
            <View style={styles.lightboxMeta}>
              <Text style={styles.lightboxSender}>{selected.sender.displayName}</Text>
              <Text style={styles.lightboxDate}>{formatDate(selected.createdAt)}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 36, alignItems: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  tabLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  grid: { paddingBottom: 20 },
  cell: { width: CELL, height: CELL, alignItems: "center", justifyContent: "center", margin: 1 },
  cellImg: { width: CELL, height: CELL },
  fileCell: { margin: 8, marginHorizontal: 12, borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  fileCellName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  fileCellDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_500Medium", paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  lightbox: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  lightboxClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  lightboxImg: { width: SCREEN_W, height: SCREEN_W * 1.2 },
  lightboxVideo: { alignItems: "center", gap: 12 },
  lightboxVideoText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_400Regular" },
  lightboxMeta: { position: "absolute", bottom: 60, left: 20 },
  lightboxSender: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  lightboxDate: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
