import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { notifications, pushTokens } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { page = "1" } = z.object({ page: z.string().optional() }).parse(req.query);
    const pg = parseInt(page);
    const lim = 30;
    const offset = (pg - 1) * lim;

    const [notifs, unreadRow] = await Promise.all([
      db.select().from(notifications)
        .where(eq(notifications.userId, req.userId!))
        .orderBy(desc(notifications.createdAt))
        .limit(lim)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(eq(notifications.userId, req.userId!), eq(notifications.isRead, false))),
    ]);

    res.json({
      notifications: notifs.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        relatedType: n.relatedType,
        relatedId: n.relatedId,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount: unreadRow[0]?.count ?? 0,
    });
  } catch (err) {
    logger.error({ err }, "Get notifications error");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/read-all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.userId!));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Mark all read error");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:notificationId/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, String(req.params.notificationId)), eq(notifications.userId, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Mark read error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/push-token", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { token, platform } = z
      .object({ token: z.string().min(1), platform: z.enum(["ios", "android", "web"]) })
      .parse(req.body);

    await db
      .insert(pushTokens)
      .values({ userId: req.userId!, token, platform })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { userId: req.userId!, platform, updatedAt: sql`now()` },
      });

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Register push token error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/push-token", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.body);

    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.token, token), eq(pushTokens.userId, req.userId!)));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete push token error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
