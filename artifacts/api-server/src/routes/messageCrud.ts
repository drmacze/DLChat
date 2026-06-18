import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { messages, messageReactions, conversationMembers, messageStatus, conversations } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { broadcastMessageUpdate, broadcastMessageDeleted, broadcastReaction } from "../socket/index.js";

const router = Router();

async function isMember(conversationId: string, userId: string) {
  const [m] = await db
    .select()
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
    .limit(1);
  return !!m;
}

router.patch("/:messageId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(4000) }).parse(req.body);
    const [msg] = await db.select().from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    if (msg.senderId !== req.userId) { res.status(403).json({ error: "Cannot edit others' messages" }); return; }
    if (msg.deletedAt) { res.status(400).json({ error: "Cannot edit deleted message" }); return; }

    const [updated] = await db.update(messages)
      .set({ content, editedAt: new Date() })
      .where(eq(messages.id, msg.id))
      .returning();

    const output = {
      ...updated,
      editedAt: updated.editedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      deletedAt: updated.deletedAt?.toISOString() ?? null,
    };

    broadcastMessageUpdate(msg.conversationId, output);
    res.json(output);
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
    broadcastMessageDeleted(msg.conversationId, msg.id);
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
    const [msg] = await db.select({ conversationId: messages.conversationId })
      .from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    if (!await isMember(msg.conversationId, req.userId!)) { res.status(403).json({ error: "Not a member" }); return; }

    await db.insert(messageReactions)
      .values({ messageId: String(req.params.messageId), userId: req.userId!, emoji })
      .onConflictDoNothing();

    // Broadcast reaction to all members in real-time
    const reactions = await db.select().from(messageReactions)
      .where(eq(messageReactions.messageId, String(req.params.messageId)));
    const reactionMap: Record<string, { emoji: string; count: number; users: string[] }> = {};
    for (const r of reactions) {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      reactionMap[r.emoji].count++;
      reactionMap[r.emoji].users.push(r.userId);
    }
    broadcastReaction(msg.conversationId, {
      messageId: String(req.params.messageId),
      reactions: Object.values(reactionMap),
    });

    res.json({ success: true, reactions: Object.values(reactionMap) });
  } catch (err) {
    logger.error({ err }, "Add reaction error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:messageId/reactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { emoji } = z.object({ emoji: z.string().min(1).max(10) }).parse(req.body);
    const [msg] = await db.select({ conversationId: messages.conversationId })
      .from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

    await db.delete(messageReactions).where(
      and(
        eq(messageReactions.messageId, String(req.params.messageId)),
        eq(messageReactions.userId, req.userId!),
        eq(messageReactions.emoji, emoji)
      )
    );

    const reactions = await db.select().from(messageReactions)
      .where(eq(messageReactions.messageId, String(req.params.messageId)));
    const reactionMap: Record<string, { emoji: string; count: number; users: string[] }> = {};
    for (const r of reactions) {
      if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      reactionMap[r.emoji].count++;
      reactionMap[r.emoji].users.push(r.userId);
    }
    broadcastReaction(msg.conversationId, {
      messageId: String(req.params.messageId),
      reactions: Object.values(reactionMap),
    });

    res.json({ success: true, reactions: Object.values(reactionMap) });
  } catch (err) {
    logger.error({ err }, "Remove reaction error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
