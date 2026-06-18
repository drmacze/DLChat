import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { messages, messageReactions, conversationMembers, messageStatus } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.patch("/:messageId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const [msg] = await db.select().from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    if (msg.senderId !== req.userId) { res.status(403).json({ error: "Cannot edit others' messages" }); return; }
    const [updated] = await db.update(messages).set({ content, editedAt: new Date() }).where(eq(messages.id, msg.id)).returning();
    res.json({ ...updated, editedAt: updated.editedAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "Edit message error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:messageId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [msg] = await db.select().from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    if (msg.senderId !== req.userId) { res.status(403).json({ error: "Cannot delete others' messages" }); return; }
    await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, msg.id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete message error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:messageId/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.insert(messageStatus)
      .values({ messageId: String(req.params.messageId), userId: req.userId!, status: "read" })
      .onConflictDoUpdate({
        target: [messageStatus.messageId, messageStatus.userId],
        set: { status: "read", updatedAt: new Date() },
      });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Mark read error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:messageId/reactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { emoji } = z.object({ emoji: z.string().min(1).max(10) }).parse(req.body);
    await db.insert(messageReactions)
      .values({ messageId: String(req.params.messageId), userId: req.userId!, emoji })
      .onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Add reaction error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:messageId/reactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { emoji } = z.object({ emoji: z.string().min(1).max(10) }).parse(req.body);
    await db.delete(messageReactions).where(
      and(
        eq(messageReactions.messageId, String(req.params.messageId)),
        eq(messageReactions.userId, req.userId!),
        eq(messageReactions.emoji, emoji)
      )
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Remove reaction error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
