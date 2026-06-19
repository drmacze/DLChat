import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  messages,
  conversationMembers,
  users,
  messageReactions,
  messageStatus,
  conversations,
  pushTokens,
} from "@workspace/db";
import { eq, and, desc, isNull, lt, inArray, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { broadcastMessage, getIO } from "../socket/index.js";
import { sendPushToUsers } from "../lib/pushNotifications.js";
import { updateStreak } from "./streak.js";

const router = Router({ mergeParams: true });

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

async function isMember(conversationId: string, userId: string) {
  const [m] = await db
    .select()
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
    .limit(1);
  return !!m;
}

async function buildMessageOutput(msg: typeof messages.$inferSelect, userId: string) {
  const [sender] = msg.senderId
    ? await db.select().from(users).where(eq(users.id, msg.senderId)).limit(1)
    : [null];

  const reactions = await db
    .select()
    .from(messageReactions)
    .where(eq(messageReactions.messageId, msg.id));

  const reactionMap: Record<string, { emoji: string; count: number; users: string[] }> = {};
  for (const r of reactions) {
    if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    reactionMap[r.emoji].count++;
    reactionMap[r.emoji].users.push(r.userId);
  }

  let replyTo = null;
  if (msg.replyToMessageId) {
    const [replyMsg] = await db.select({ msg: messages, u: users })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.id, msg.replyToMessageId))
      .limit(1);
    if (replyMsg) {
      replyTo = {
        id: replyMsg.msg.id,
        content: replyMsg.msg.deletedAt ? null : replyMsg.msg.content,
        type: replyMsg.msg.type,
        mediaUrl: replyMsg.msg.mediaUrl,
        senderName: replyMsg.u.displayName,
        createdAt: replyMsg.msg.createdAt.toISOString(),
      };
    }
  }

  const [status] = await db.select().from(messageStatus)
    .where(and(eq(messageStatus.messageId, msg.id), eq(messageStatus.userId, userId)))
    .limit(1);

  return {
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    type: msg.type,
    content: msg.deletedAt ? null : msg.content,
    mediaUrl: msg.deletedAt ? null : msg.mediaUrl,
    replyToMessageId: msg.replyToMessageId,
    replyTo,
    editedAt: msg.editedAt?.toISOString() ?? null,
    deletedAt: msg.deletedAt?.toISOString() ?? null,
    createdAt: msg.createdAt.toISOString(),
    sender: sender ? userPublic(sender) : { id: "", displayName: "Deleted User", isOnline: false, role: "user" as const, username: null, bio: null, avatarUrl: null, lastSeenAt: null },
    reactions: Object.values(reactionMap),
    status: status?.status ?? null,
  };
}

router.get("/:conversationId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const convId = String(req.params.conversationId);
    if (!await isMember(convId, req.userId!)) {
      res.status(403).json({ error: "Not a member" }); return;
    }
    const { before, limit = "50" } = z
      .object({ before: z.string().optional(), limit: z.string().optional() })
      .parse(req.query);

    const lim = Math.min(parseInt(limit), 100);

    let whereClause = and(eq(messages.conversationId, convId), isNull(messages.deletedAt));

    if (before) {
      const [refMsg] = await db.select().from(messages).where(eq(messages.id, before)).limit(1);
      if (refMsg) {
        whereClause = and(eq(messages.conversationId, convId), isNull(messages.deletedAt), lt(messages.createdAt, refMsg.createdAt));
      }
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(whereClause)
      .orderBy(desc(messages.createdAt))
      .limit(lim + 1);
    const hasMore = msgs.length > lim;
    const result = await Promise.all(msgs.slice(0, lim).map((m) => buildMessageOutput(m, req.userId!)));

    res.json({ messages: result.reverse(), hasMore });
  } catch (err) {
    logger.error({ err }, "Get messages error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:conversationId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const convId = String(req.params.conversationId);
    if (!await isMember(convId, req.userId!)) {
      res.status(403).json({ error: "Not a member" }); return;
    }
    const body = z
      .object({
        content: z.string().optional(),
        type: z.enum(["text", "image", "video", "file", "audio", "voice"]).default("text"),
        mediaUrl: z.string().optional(),
        replyToMessageId: z.string().uuid().optional(),
      })
      .parse(req.body);

    if (!body.content && !body.mediaUrl) {
      res.status(400).json({ error: "Message must have content or media" }); return;
    }

    // ── Slow Mode Check ──────────────────────────────────────────────────────
    const convSlowRow = await db.execute(sql`SELECT slow_mode_delay FROM conversations WHERE id = ${convId}`);
    const slowDelay: number = (convSlowRow.rows[0] as any)?.slow_mode_delay ?? 0;
    if (slowDelay > 0) {
      const cooldownRow = await db.execute(sql`
        SELECT last_message_at FROM slow_mode_cooldown
        WHERE user_id = ${req.userId}::uuid AND conversation_id = ${convId}::uuid
      `);
      if (cooldownRow.rows.length > 0) {
        const lastAt = new Date((cooldownRow.rows[0] as any).last_message_at as string).getTime();
        const elapsedSec = (Date.now() - lastAt) / 1000;
        if (elapsedSec < slowDelay) {
          const remaining = Math.ceil(slowDelay - elapsedSec);
          res.status(429).json({ error: `Slow mode aktif. Tunggu ${remaining} detik lagi.`, remainingSeconds: remaining });
          return;
        }
      }
    }

    const [msg] = await db.insert(messages).values({
      conversationId: convId,
      senderId: req.userId!,
      type: body.type,
      content: body.content,
      mediaUrl: body.mediaUrl,
      replyToMessageId: body.replyToMessageId,
    }).returning();

    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, convId));

    // Update slow mode cooldown after successful send
    if (slowDelay > 0) {
      await db.execute(sql`
        INSERT INTO slow_mode_cooldown (user_id, conversation_id, last_message_at)
        VALUES (${req.userId}::uuid, ${convId}::uuid, now())
        ON CONFLICT (user_id, conversation_id) DO UPDATE SET last_message_at = now()
      `);
    }

    const output = await buildMessageOutput(msg, req.userId!);
    broadcastMessage(convId, output);

    // Mark as read for sender
    await db.insert(messageStatus)
      .values({ messageId: msg.id, userId: req.userId!, status: "read" })
      .onConflictDoNothing();

    // Update chat streak for sender (fire and forget)
    setImmediate(() => { updateStreak(req.userId!).catch(() => {}); });

    // Notify other members via push notification
    setImmediate(async () => {
      try {
        const members = await db
          .select({ userId: conversationMembers.userId })
          .from(conversationMembers)
          .where(and(
            eq(conversationMembers.conversationId, convId),
            sql`${conversationMembers.userId} != ${req.userId!}::uuid`
          ));

        const otherUserIds = members.map((m) => m.userId);
        if (otherUserIds.length === 0) return;

        // Get online socket users to skip push for them
        const io = getIO();
        let onlineUserIds = new Set<string>();
        if (io) {
          const sockets = await io.fetchSockets();
          onlineUserIds = new Set(sockets.map((s: any) => s.userId).filter(Boolean));
        }

        const offlineUserIds = otherUserIds.filter((id) => !onlineUserIds.has(id));
        if (offlineUserIds.length === 0) return;

        const tokenRows = await db
          .select({ token: pushTokens.token })
          .from(pushTokens)
          .where(inArray(pushTokens.userId, offlineUserIds));

        const tokens = tokenRows.map((r) => r.token);
        if (tokens.length === 0) return;

        const senderName = output.sender.displayName;
        const preview = body.type !== "text" ? `[${body.type}]` : (body.content?.slice(0, 100) ?? "");

        await sendPushToUsers(tokens, senderName, preview, {
          type: "message",
          conversationId: convId,
          messageId: msg.id,
        });
      } catch (err) {
        logger.error({ err }, "Push notification error");
      }
    });

    res.json(output);
  } catch (err) {
    logger.error({ err }, "Send message error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
