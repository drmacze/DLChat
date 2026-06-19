import React from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera } from "lucide-react-native";
import { useGetFeed, useLikePost, useUnlikePost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import PostCard from "@/components/feed/PostCard";
import FloatingActionButton from "@/components/common/FloatingActionButton";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { CameraIcon } from "@/components/common/SvgIcons";

export default function FeedScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useGetFeed(
    {},
    { query: { queryKey: ["feed"], enabled: !!token } },
  );
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
        >
          <Camera size={18} color={c.mutedForeground} strokeWidth={1.8} />
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
          renderItem={({ item, index }) => (
            <Reanimated.View entering={FadeInDown.delay(index * 55).springify().damping(18)}>
              <PostCard
                post={item as Parameters<typeof PostCard>[0]["post"]}
                onLike={() => handleLike(item.id, item.isLikedByMe)}
                onComment={() => {}}
              />
            </Reanimated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CameraIcon size={60} />
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>No posts yet</Text>
              <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
                Share your first moment with friends
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          contentContainerStyle={
            posts.length === 0
              ? { flex: 1 }
              : { paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 80 }
          }
        />
      )}

      <View style={[styles.fab, { bottom: Platform.OS === "web" ? 100 : insets.bottom + 20 }]}>
        <FloatingActionButton onPress={() => {}} icon="camera" size={56} />
      </View>
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
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 10 },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  fab: { position: "absolute", right: 20 },
});
