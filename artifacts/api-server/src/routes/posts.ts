import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { posts, postLikes, postComments, users } from "@workspace/db";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

function userPublic(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    isOnline: u.isOnline,
    lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    role: u.role,
  };
}

async function buildPost(post: typeof posts.$inferSelect, userId: string) {
  const [author] = await db.select().from(users).where(eq(users.id, post.userId)).limit(1);
  const [likesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postLikes)
    .where(eq(postLikes.postId, post.id));
  const [myLike] = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, post.id), eq(postLikes.userId, userId)))
    .limit(1);
  const [commentsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postComments)
    .where(and(eq(postComments.postId, post.id), isNull(postComments.deletedAt)));
  const comments = await db
    .select({ comment: postComments, user: users })
    .from(postComments)
    .innerJoin(users, eq(postComments.userId, users.id))
    .where(and(eq(postComments.postId, post.id), isNull(postComments.deletedAt)))
    .orderBy(desc(postComments.createdAt))
    .limit(5);

  return {
    id: post.id,
    userId: post.userId,
    content: post.content,
    mediaUrl: post.mediaUrl,
    visibility: post.visibility,
    likesCount: likesRow?.count ?? 0,
    commentsCount: commentsRow?.count ?? 0,
    isLikedByMe: !!myLike,
    createdAt: post.createdAt.toISOString(),
    author: author ? userPublic(author) : { id: "", displayName: "Deleted User", isOnline: false, role: "user" as const },
    comments: comments.map((c) => ({
      id: c.comment.id,
      postId: c.comment.postId,
      content: c.comment.content,
      createdAt: c.comment.createdAt.toISOString(),
      author: userPublic(c.user),
    })),
  };
}

router.get("/feed", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { page = "1", limit = "20" } = z
      .object({ page: z.string().optional(), limit: z.string().optional() })
      .parse(req.query);
    const pg = parseInt(page);
    const lim = Math.min(parseInt(limit), 50);
    const offset = (pg - 1) * lim;

    const feed = await db
      .select()
      .from(posts)
      .where(and(isNull(posts.deletedAt), eq(posts.visibility, "public")))
      .orderBy(desc(posts.createdAt))
      .limit(lim + 1)
      .offset(offset);

    const hasMore = feed.length > lim;
    const result = await Promise.all(feed.slice(0, lim).map((p) => buildPost(p, req.userId!)));
    res.json({ posts: result, hasMore });
  } catch (err) {
    logger.error({ err }, "Get feed error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        content: z.string().max(2000).optional(),
        mediaUrl: z.string().url().optional(),
        visibility: z.enum(["public", "contacts", "private"]).default("public"),
      })
      .parse(req.body);

    if (!body.content && !body.mediaUrl) {
      res.status(400).json({ error: "Post must have content or media" }); return;
    }

    const [post] = await db.insert(posts).values({ ...body, userId: req.userId! }).returning();
    const result = await buildPost(post, req.userId!);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Create post error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/user/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { page = "1" } = z.object({ page: z.string().optional() }).parse(req.query);
    const pg = parseInt(page);
    const lim = 20;
    const offset = (pg - 1) * lim;

    const userPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, String(req.params.userId)), isNull(posts.deletedAt)))
      .orderBy(desc(posts.createdAt))
      .limit(lim + 1)
      .offset(offset);

    const hasMore = userPosts.length > lim;
    const result = await Promise.all(userPosts.slice(0, lim).map((p) => buildPost(p, req.userId!)));
    res.json({ posts: result, hasMore });
  } catch (err) {
    logger.error({ err }, "Get user posts error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:postId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [post] = await db.select().from(posts).where(eq(posts.id, String(req.params.postId))).limit(1);
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    if (post.userId !== req.userId) { res.status(403).json({ error: "Cannot delete others' posts" }); return; }
    await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, post.id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete post error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:postId/like", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.insert(postLikes).values({ postId: String(req.params.postId), userId: req.userId! }).onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Like post error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:postId/like", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(postLikes).where(
      and(eq(postLikes.postId, String(req.params.postId)), eq(postLikes.userId, req.userId!))
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Unlike post error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:postId/comments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(1000) }).parse(req.body);
    const [comment] = await db
      .insert(postComments)
      .values({ postId: String(req.params.postId), userId: req.userId!, content })
      .returning();
    const [author] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    res.json({
      id: comment.id,
      postId: comment.postId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: author ? userPublic(author) : { id: "", displayName: "Unknown", isOnline: false, role: "user" as const },
    });
  } catch (err) {
    logger.error({ err }, "Add comment error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:postId/comments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({ comment: postComments, user: users })
      .from(postComments)
      .innerJoin(users, eq(postComments.userId, users.id))
      .where(and(eq(postComments.postId, String(req.params.postId)), isNull(postComments.deletedAt)))
      .orderBy(postComments.createdAt)
      .limit(100);
    res.json({
      comments: rows.map((r) => ({
        id: r.comment.id,
        content: r.comment.content,
        createdAt: r.comment.createdAt.toISOString(),
        author: userPublic(r.user),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get comments error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:postId/comments/:commentId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(postComments)
      .set({ deletedAt: new Date() })
      .where(and(eq(postComments.id, String(req.params.commentId)), eq(postComments.userId, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete comment error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
