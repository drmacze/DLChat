import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { messages, messageReactions, conversationMembers, messageStatus, conversations, users } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { broadcastMessageUpdate, broadcastMessageDeleted, broadcastReaction, broadcastMessage, getIO } from "../socket/index.js";

const router = Router();

async function isMember(conversationId: string, userId: string) {
  const [m] = await db
    .select()
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
    .limit(1);
  return !!m;
}

// GET /api/messages/starred — must be before /:messageId routes
router.get("/starred", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        m.id, m.conversation_id as "conversationId", m.content, m.type, m.media_url as "mediaUrl",
        m.created_at as "createdAt", sm.created_at as "starredAt",
        u.id as "senderId", u.display_name as "senderDisplayName"
      FROM starred_messages sm
      JOIN messages m ON m.id = sm.message_id
      JOIN users u ON u.id = m.sender_id
      WHERE sm.user_id = ${req.userId}
        AND m.deleted_at IS NULL
      ORDER BY sm.created_at DESC
      LIMIT 200
    `);
    const msgs = rows.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      conversationId: r.conversationId,
      content: r.content,
      type: r.type,
      mediaUrl: r.mediaUrl,
      createdAt: (r.createdAt as Date)?.toISOString?.() ?? r.createdAt,
      starredAt: (r.starredAt as Date)?.toISOString?.() ?? r.starredAt,
      sender: { id: r.senderId, displayName: r.senderDisplayName },
    }));
    res.json({ messages: msgs });
  } catch (err) {
    logger.error({ err }, "Get starred messages error");
    res.status(500).json({ error: "Server error" });
  }
});

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

router.post("/:messageId/pin", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [msg] = await db.select().from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
    if (!await isMember(msg.conversationId, req.userId!)) { res.status(403).json({ error: "Not a member" }); return; }

    const result = await db.execute(sql`
      UPDATE messages SET is_pinned = NOT is_pinned WHERE id = ${msg.id}
      RETURNING is_pinned
    `);
    const isPinned = (result.rows[0] as Record<string, boolean>)?.is_pinned ?? false;
    getIO()?.to(`conv:${msg.conversationId}`).emit("message:pin", {
      messageId: msg.id, isPinned, conversationId: msg.conversationId,
    });
    res.json({ success: true, isPinned });
  } catch (err) {
    logger.error({ err }, "Pin message error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:messageId/star", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [msg] = await db.select({ id: messages.id }).from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!msg) { res.status(404).json({ error: "Message not found" }); return; }

    const existing = await db.execute(sql`
      SELECT 1 FROM starred_messages WHERE user_id = ${req.userId} AND message_id = ${msg.id}
    `);
    let isStarred: boolean;
    if (existing.rows.length > 0) {
      await db.execute(sql`DELETE FROM starred_messages WHERE user_id = ${req.userId} AND message_id = ${msg.id}`);
      isStarred = false;
    } else {
      await db.execute(sql`INSERT INTO starred_messages (user_id, message_id) VALUES (${req.userId}, ${msg.id})`);
      isStarred = true;
    }
    res.json({ success: true, isStarred });
  } catch (err) {
    logger.error({ err }, "Star message error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:messageId/forward", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetConversationId } = z.object({ targetConversationId: z.string().uuid() }).parse(req.body);
    const [origMsg] = await db.select().from(messages).where(eq(messages.id, String(req.params.messageId))).limit(1);
    if (!origMsg) { res.status(404).json({ error: "Message not found" }); return; }
    if (origMsg.deletedAt) { res.status(400).json({ error: "Cannot forward deleted message" }); return; }
    if (!await isMember(targetConversationId, req.userId!)) { res.status(403).json({ error: "Not a member of target conversation" }); return; }

    const [newMsg] = await db.insert(messages).values({
      conversationId: targetConversationId,
      senderId: req.userId!,
      type: origMsg.type as any,
      content: origMsg.content,
      mediaUrl: origMsg.mediaUrl,
      forwardedFromMessageId: origMsg.id,
    }).returning();

    const [senderUser] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    const output = {
      id: newMsg.id,
      conversationId: targetConversationId,
      senderId: newMsg.senderId,
      type: newMsg.type,
      content: newMsg.content,
      mediaUrl: newMsg.mediaUrl,
      forwardedFromMessageId: origMsg.id,
      createdAt: newMsg.createdAt.toISOString(),
      editedAt: null,
      deletedAt: null,
      isPinned: false,
      reactions: [],
      replyTo: null,
      sender: senderUser ? {
        id: senderUser.id,
        displayName: senderUser.displayName,
        avatarUrl: senderUser.avatarUrl,
        isOnline: senderUser.isOnline,
      } : { id: req.userId!, displayName: "Unknown", avatarUrl: null, isOnline: false },
    };

    broadcastMessage(targetConversationId, output);
    res.json(output);
  } catch (err) {
    logger.error({ err }, "Forward message error");
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

router.post("/bulk-delete", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { messageIds } = z.object({ messageIds: z.array(z.string().uuid()).min(1).max(100) }).parse(req.body);
    const deleted: string[] = [];
    for (const messageId of messageIds) {
      const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
      if (!msg || msg.senderId !== req.userId || msg.deletedAt) continue;
      await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, msg.id));
      broadcastMessageDeleted(msg.conversationId, msg.id);
      deleted.push(msg.id);
    }
    res.json({ success: true, deleted });
  } catch (err) {
    logger.error({ err }, "Bulk delete error");
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
