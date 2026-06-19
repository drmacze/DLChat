import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetFeed, useLikePost, useUnlikePost } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import PostCard from "@/components/feed/PostCard";
import CommentsSheet from "@/components/feed/CommentsSheet";
import StoryBar from "@/components/stories/StoryBar";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { CameraIcon } from "@/components/common/SvgIcons";
import { BASE_URL } from "@/utils/api";

export default function FeedScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useGetFeed(
    {},
    { query: { queryKey: ["feed"], enabled: !!token } },
  );
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const posts = data?.posts ?? [];

  const { data: storiesData } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/stories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });
  const storyGroups: Array<{
    user: { id: string; displayName: string; avatarUrl?: string | null };
    hasUnviewed: boolean;
  }> = storiesData?.stories ?? [];

  const [commentingPost, setCommentingPost] = useState<{ id: string; count: number } | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const handleLike = (postId: string, isLiked: boolean) => {
    if (isLiked) {
      unlikePost.mutate({ postId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }) });
    } else {
      likePost.mutate({ postId }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }) });
    }
  };

  const handleFAB = () => {
    Alert.alert("Buat Konten", "Mau buat apa?", [
      {
        text: "📝 Post",
        onPress: () => router.push("/post/create"),
      },
      {
        text: "📸 Story",
        onPress: () => router.push("/story/create"),
      },
      { text: "Batal", style: "cancel" },
    ]);
  };

  const TAB_BAR_HEIGHT = 49;
  const fabBottom = Platform.OS === "web"
    ? 100
    : insets.bottom + TAB_BAR_HEIGHT + 16;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: c.headerBg,
            borderBottomColor: c.border,
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 10,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Feed</Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: c.glass, borderColor: c.glassBorder }]}
          onPress={() => router.push("/story/create")}
          activeOpacity={0.7}
        >
          <Feather name="camera" size={18} color={c.mutedForeground} />
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
          decelerationRate="normal"
          ListHeaderComponent={
            (storyGroups.length > 0 || !!user) ? (
              <StoryBar
                stories={storyGroups}
                myUser={user ? { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl ?? null } : undefined}
                onPress={(userId) => router.push(`/story/view/${userId}`)}
                onAddStory={() => router.push("/story/create")}
              />
            ) : null
          }
          renderItem={({ item, index }) => (
            <Reanimated.View entering={FadeInDown.delay(index * 55).springify().damping(18)}>
              <PostCard
                post={{
                  ...(item as any),
                  isBookmarked: bookmarkedIds.has(item.id) || (item as any).isBookmarked,
                }}
                onLike={() => handleLike(item.id, item.isLikedByMe)}
                onComment={() => setCommentingPost({ id: item.id, count: item.commentsCount })}
                onBookmarkChange={(postId, bm) => {
                  setBookmarkedIds((prev) => {
                    const next = new Set(prev);
                    if (bm) next.add(postId); else next.delete(postId);
                    return next;
                  });
                }}
              />
            </Reanimated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CameraIcon size={60} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>Belum ada post</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
                Jadilah yang pertama berbagi momen!
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: c.primary }]}
                onPress={handleFAB}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Buat Post atau Story</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
                queryClient.invalidateQueries({ queryKey: ["stories"] });
              }}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          contentContainerStyle={
            posts.length === 0
              ? { flex: 1 }
              : { paddingBottom: fabBottom + 60 }
          }
        />
      )}

      <View style={[styles.fab, { bottom: fabBottom }]}>
        <FloatingActionButton onPress={handleFAB} icon="plus" size={56} />
      </View>

      <CommentsSheet
        postId={commentingPost?.id ?? null}
        commentsCount={commentingPost?.count}
        onClose={() => setCommentingPost(null)}
        onCommentAdded={() => queryClient.invalidateQueries({ queryKey: ["feed"] })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 10 },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 24, marginTop: 8,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  fab: { position: "absolute", right: 20 },
});
