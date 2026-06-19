/**
 * extras.ts — Additional feature endpoints:
 * Block/Unblock users, Post Bookmarks, Mark-all-read, Profile stats, PIN
 */
import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { users, blockedUsers, posts, postLikes, postComments, contacts, conversationMembers, messageStatus } from "@workspace/db";
import { eq, and, desc, isNull, sql, ne } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import * as crypto from "crypto";

const router = Router();

// ─── Block / Unblock ──────────────────────────────────────────────────────────

// POST /users/:id/block
router.post("/users/:id/block", requireAuth, async (req: AuthRequest, res) => {
  const targetId = req.params.id;
  if (targetId === req.userId) return res.status(400).json({ error: "Cannot block yourself" });
  try {
    await db.execute(sql`
      INSERT INTO blocked_users (id, blocker_id, blocked_id)
      VALUES (gen_random_uuid(), ${req.userId}, ${targetId})
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `);
    res.json({ blocked: true });
  } catch (err) {
    logger.error({ err }, "Block user error");
    res.status(500).json({ error: "Failed to block" });
  }
});

// DELETE /users/:id/block
router.delete("/users/:id/block", requireAuth, async (req: AuthRequest, res) => {
  const targetId = req.params.id;
  try {
    await db.delete(blockedUsers).where(
      and(eq(blockedUsers.blockerId, req.userId!), eq(blockedUsers.blockedId, targetId))
    );
    res.json({ blocked: false });
  } catch (err) {
    logger.error({ err }, "Unblock user error");
    res.status(500).json({ error: "Failed to unblock" });
  }
});

// GET /users/blocked
router.get("/users/blocked", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT u.id, u.display_name, u.username, u.avatar_url
      FROM blocked_users b
      JOIN users u ON u.id = b.blocked_id
      WHERE b.blocker_id = ${req.userId}
      ORDER BY b.created_at DESC
    `);
    res.json({
      blocked: rows.rows.map((r: any) => ({
        id: r.id,
        displayName: r.display_name,
        username: r.username,
        avatarUrl: r.avatar_url,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get blocked users error");
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// ─── Post Bookmarks ───────────────────────────────────────────────────────────

// POST /posts/:id/bookmark
router.post("/posts/:id/bookmark", requireAuth, async (req: AuthRequest, res) => {
  const postId = req.params.id;
  try {
    await db.execute(sql`
      INSERT INTO post_bookmarks (id, user_id, post_id)
      VALUES (gen_random_uuid(), ${req.userId}, ${postId})
      ON CONFLICT (user_id, post_id) DO NOTHING
    `);
    res.json({ bookmarked: true });
  } catch (err) {
    logger.error({ err }, "Bookmark post error");
    res.status(500).json({ error: "Failed to bookmark" });
  }
});

// DELETE /posts/:id/bookmark
router.delete("/posts/:id/bookmark", requireAuth, async (req: AuthRequest, res) => {
  const postId = req.params.id;
  try {
    await db.execute(sql`
      DELETE FROM post_bookmarks WHERE user_id = ${req.userId} AND post_id = ${postId}
    `);
    res.json({ bookmarked: false });
  } catch (err) {
    logger.error({ err }, "Unbookmark post error");
    res.status(500).json({ error: "Failed to unbookmark" });
  }
});

// GET /posts/bookmarks
router.get("/posts/bookmarks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT p.id, p.content, p.media_url, p.visibility, p.created_at,
             u.id as author_id, u.display_name, u.username, u.avatar_url,
             (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.id) as likes_count,
             (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ${req.userId}) as is_liked,
             (SELECT COUNT(*)::int FROM post_comments pc WHERE pc.post_id = p.id AND pc.deleted_at IS NULL) as comments_count
      FROM post_bookmarks pb
      JOIN posts p ON p.id = pb.post_id AND p.deleted_at IS NULL
      JOIN users u ON u.id = p.user_id
      WHERE pb.user_id = ${req.userId}
      ORDER BY pb.created_at DESC
      LIMIT 50
    `);
    res.json({
      posts: rows.rows.map((r: any) => ({
        id: r.id,
        content: r.content,
        mediaUrl: r.media_url,
        visibility: r.visibility,
        likesCount: r.likes_count ?? 0,
        commentsCount: r.comments_count ?? 0,
        isLikedByMe: (r.is_liked ?? 0) > 0,
        isBookmarked: true,
        createdAt: r.created_at,
        author: {
          id: r.author_id,
          displayName: r.display_name,
          username: r.username,
          avatarUrl: r.avatar_url,
        },
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get bookmarks error");
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

// ─── Mark All Conversations as Read ──────────────────────────────────────────

// POST /conversations/read-all
router.post("/conversations/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    // Mark all unread messages in user's conversations as read
    await db.execute(sql`
      UPDATE message_status
      SET status = 'read', updated_at = now()
      WHERE user_id = ${req.userId} AND status != 'read'
    `);
    // Also update conversation_members last_read
    await db.execute(sql`
      UPDATE conversation_members cm
      SET last_read_at = now()
      WHERE cm.user_id = ${req.userId}
    `);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Mark all read error");
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// ─── Profile Stats ────────────────────────────────────────────────────────────

// GET /users/me/stats
router.get("/users/me/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [meRow] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    const statsRows = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM posts WHERE user_id = ${req.userId} AND deleted_at IS NULL) as posts_count,
        (SELECT COUNT(*)::int FROM contacts WHERE owner_id = ${req.userId}) as contacts_count,
        (SELECT COUNT(*)::int FROM blocked_users WHERE blocker_id = ${req.userId}) as blocked_count,
        (SELECT COUNT(*)::int FROM post_bookmarks WHERE user_id = ${req.userId}) as bookmarks_count
    `);
    const stats = statsRows.rows[0] as any;
    res.json({
      postsCount: stats.posts_count ?? 0,
      contactsCount: stats.contacts_count ?? 0,
      blockedCount: stats.blocked_count ?? 0,
      bookmarksCount: stats.bookmarks_count ?? 0,
      joinedAt: meRow?.createdAt?.toISOString() ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Get stats error");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── PIN (Two-step verification) ─────────────────────────────────────────────

// POST /auth/pin — set/update PIN
router.post("/auth/pin", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pin, currentPin } = z.object({
      pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
      currentPin: z.string().optional(),
    }).parse(req.body);

    const [me] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!me) return res.status(404).json({ error: "User not found" });

    // If PIN is already set, require current PIN
    const pinHash = (me as any).pinHash as string | null;
    const pinEnabled = (me as any).pinEnabled as boolean | null;
    if (pinEnabled && pinHash) {
      if (!currentPin) return res.status(400).json({ error: "Current PIN required" });
      const currentHash = crypto.createHash("sha256").update(currentPin).digest("hex");
      if (currentHash !== pinHash) return res.status(401).json({ error: "Incorrect current PIN" });
    }

    const newHash = crypto.createHash("sha256").update(pin).digest("hex");
    await db.execute(sql`
      UPDATE users SET pin_hash = ${newHash}, pin_enabled = true WHERE id = ${req.userId}
    `);
    res.json({ pinEnabled: true });
  } catch (err) {
    logger.error({ err }, "Set PIN error");
    res.status(500).json({ error: "Failed to set PIN" });
  }
});

// DELETE /auth/pin — disable PIN
router.delete("/auth/pin", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pin } = z.object({ pin: z.string().regex(/^\d{4}$/) }).parse(req.body);
    const [me] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!me) return res.status(404).json({ error: "User not found" });
    const pinHash = (me as any).pinHash as string | null;
    const hash = crypto.createHash("sha256").update(pin).digest("hex");
    if (hash !== pinHash) return res.status(401).json({ error: "Incorrect PIN" });
    await db.execute(sql`UPDATE users SET pin_hash = NULL, pin_enabled = false WHERE id = ${req.userId}`);
    res.json({ pinEnabled: false });
  } catch (err) {
    logger.error({ err }, "Disable PIN error");
    res.status(500).json({ error: "Failed" });
  }
});

// GET /auth/pin/status
router.get("/auth/pin/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`SELECT pin_enabled FROM users WHERE id = ${req.userId}`);
    const row = rows.rows[0] as any;
    res.json({ pinEnabled: !!(row?.pin_enabled) });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
