import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useGetFeed, useLikePost, useUnlikePost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PostCard from "@/components/feed/PostCard";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import { useTheme } from "@/context/ThemeContext";
import { CameraIcon } from "@/components/common/SvgIcons";

export default function FeedScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useGetFeed({}, { query: { queryKey: ["feed"] } });
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const posts = data?.posts ?? [];

  const handleLike = (postId: string, isLiked: boolean) => {
    if (isLiked) {
      unlikePost.mutate({ postId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }) });
    } else {
      likePost.mutate({ postId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }) });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.border, paddingTop: Platform.OS === "web" ? 67 : insets.top + 10 }]}>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Feed</Text>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
          <Feather name="camera" size={20} color={c.foreground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={c.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item as Parameters<typeof PostCard>[0]["post"]}
              onLike={() => handleLike(item.id, item.isLikedByMe)}
              onComment={() => {}}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CameraIcon size={60} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No posts yet</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>Share your first moment with friends</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} colors={[c.primary]} />}
          contentContainerStyle={posts.length === 0 ? { flex: 1 } : { paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 20 }]}>
        <FloatingActionButton onPress={() => {}} icon="plus-circle" size={56} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, textAlign: "center", fontFamily: "Inter_400Regular" },
  fab: { position: "absolute", right: 20 },
});
