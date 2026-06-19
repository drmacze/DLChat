import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { stories, storyViews, users, contacts } from "@workspace/db";
import { eq, and, isNull, gt, sql, desc } from "drizzle-orm";
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

async function buildStory(story: typeof stories.$inferSelect, userId: string) {
  const [author] = await db.select().from(users).where(eq(users.id, story.userId)).limit(1);
  const [viewsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storyViews)
    .where(eq(storyViews.storyId, story.id));
  const [myView] = await db
    .select()
    .from(storyViews)
    .where(and(eq(storyViews.storyId, story.id), eq(storyViews.viewerId, userId)))
    .limit(1);

  return {
    id: story.id,
    userId: story.userId,
    type: story.type,
    content: story.content,
    mediaUrl: story.mediaUrl,
    backgroundColor: story.backgroundColor,
    expiresAt: story.expiresAt.toISOString(),
    createdAt: story.createdAt.toISOString(),
    viewCount: viewsRow?.count ?? 0,
    isViewedByMe: !!myView,
    author: author ? userPublic(author) : { id: "", displayName: "Unknown", isOnline: false, role: "user" as const },
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const myContacts = await db
      .select({ contactUserId: contacts.contactUserId })
      .from(contacts)
      .where(eq(contacts.ownerId, req.userId!));

    const contactIds = [...myContacts.map((c) => c.contactUserId), req.userId!];

    const activeStories = await db
      .select()
      .from(stories)
      .where(and(isNull(stories.deletedAt), gt(stories.expiresAt, now)))
      .orderBy(stories.createdAt);

    const grouped: Record<string, { user: typeof users.$inferSelect; stories: typeof stories.$inferSelect[] }> = {};
    for (const story of activeStories) {
      if (!grouped[story.userId]) {
        const [author] = await db.select().from(users).where(eq(users.id, story.userId)).limit(1);
        if (author) grouped[story.userId] = { user: author, stories: [] };
      }
      if (grouped[story.userId]) grouped[story.userId].stories.push(story);
    }

    const result = await Promise.all(
      Object.values(grouped).map(async ({ user, stories: userStories }) => {
        const builtStories = await Promise.all(userStories.map((s) => buildStory(s, req.userId!)));
        const hasUnviewed = builtStories.some((s) => !s.isViewedByMe);
        return { user: userPublic(user), stories: builtStories, hasUnviewed };
      })
    );

    res.json({ stories: result });
  } catch (err) {
    logger.error({ err }, "Get stories error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        type: z.enum(["text", "image", "video"]),
        content: z.string().optional(),
        mediaUrl: z.string().optional(),
        backgroundColor: z.string().optional(),
      })
      .parse(req.body);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [story] = await db
      .insert(stories)
      .values({ ...body, userId: req.userId!, expiresAt })
      .returning();

    res.json(await buildStory(story, req.userId!));
  } catch (err) {
    logger.error({ err }, "Create story error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:storyId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [story] = await db.select().from(stories).where(eq(stories.id, String(req.params.storyId))).limit(1);
    if (!story) { res.status(404).json({ error: "Story not found" }); return; }
    res.json(await buildStory(story, req.userId!));
  } catch (err) {
    logger.error({ err }, "Get story error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:storyId/view", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.insert(storyViews)
      .values({ storyId: String(req.params.storyId), viewerId: req.userId! })
      .onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "View story error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:storyId/viewers", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, String(req.params.storyId)))
      .limit(1);
    if (!story) { res.status(404).json({ error: "Story not found" }); return; }
    if (story.userId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }

    const rows = await db
      .select({ view: storyViews, user: users })
      .from(storyViews)
      .innerJoin(users, eq(storyViews.viewerId, users.id))
      .where(eq(storyViews.storyId, String(req.params.storyId)))
      .orderBy(desc(storyViews.viewedAt));

    res.json({
      viewers: rows.map((r) => ({
        viewedAt: r.view.viewedAt.toISOString(),
        user: userPublic(r.user),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get story viewers error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:storyId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(stories)
      .set({ deletedAt: new Date() })
      .where(and(eq(stories.id, String(req.params.storyId)), eq(stories.userId, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete story error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
