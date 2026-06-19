import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { conversationMembers, users } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { broadcastMessage } from "../socket/index.js";
import { sendPushToUsers } from "../lib/pushNotifications.js";

const router = Router();

async function isMember(conversationId: string, userId: string) {
  const [m] = await db.select().from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
    .limit(1);
  return !!m;
}

// POST /api/messages/schedule — schedule a message for later
router.post("/schedule", requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({
    conversationId: z.string().uuid(),
    content: z.string().min(1).max(4000),
    sendAt: z.string(),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
  const { conversationId, content, sendAt } = parsed.data;

  const sendAtDate = new Date(sendAt);
  if (isNaN(sendAtDate.getTime()) || sendAtDate <= new Date()) {
    res.status(400).json({ error: "send_at must be a future datetime" });
    return;
  }
  if (sendAtDate > new Date(Date.now() + 365 * 24 * 3600 * 1000)) {
    res.status(400).json({ error: "Cannot schedule more than 1 year ahead" });
    return;
  }

  try {
    const ok = await isMember(conversationId, req.userId!);
    if (!ok) { res.status(403).json({ error: "Not a member" }); return; }

    const result = await db.execute(sql`
      INSERT INTO scheduled_messages (conversation_id, sender_id, content, send_at)
      VALUES (${conversationId}, ${req.userId}, ${content}, ${sendAtDate})
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "Schedule message error");
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/messages/my-scheduled — list my scheduled messages
router.get("/my-scheduled", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT sm.*, c.title as conv_title, c.type as conv_type
      FROM scheduled_messages sm
      JOIN conversations c ON c.id = sm.conversation_id
      WHERE sm.sender_id = ${req.userId} AND sm.sent_at IS NULL
      ORDER BY sm.send_at ASC
    `);
    res.json(rows.rows);
  } catch (err) {
    logger.error({ err }, "Get scheduled messages error");
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/messages/scheduled/:id — cancel scheduled message
router.delete("/scheduled/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await db.execute(sql`
      DELETE FROM scheduled_messages
      WHERE id::text = ${req.params.id}
        AND sender_id = ${req.userId}
        AND sent_at IS NULL
      RETURNING id
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Not found or already sent" }); return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Cancel scheduled message error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

// ── Scheduled Message Processor ──────────────────────────────────────────────
// Called every minute from index.ts
export async function processScheduledMessages() {
  try {
    const pending = await db.execute(sql`
      SELECT sm.*, u.display_name as sender_name
      FROM scheduled_messages sm
      JOIN users u ON u.id = sm.sender_id
      WHERE sm.sent_at IS NULL AND sm.send_at <= now()
      LIMIT 50
    `);

    if (pending.rows.length === 0) return;

    for (const row of pending.rows) {
      const r = row as any;
      try {
        // Insert the actual message
        const msgResult = await db.execute(sql`
          INSERT INTO messages (conversation_id, sender_id, type, content)
          VALUES (${r.conversation_id}, ${r.sender_id}, 'text', ${r.content})
          RETURNING id, conversation_id, sender_id, type, content, created_at
        `);
        const msg = msgResult.rows[0] as any;

        // Update conversation updated_at
        await db.execute(sql`
          UPDATE conversations SET updated_at = now() WHERE id = ${r.conversation_id}
        `);

        // Mark as sent
        await db.execute(sql`
          UPDATE scheduled_messages SET sent_at = now() WHERE id = ${r.id}
        `);

        // Broadcast via socket
        await broadcastMessage(r.conversation_id, {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          type: msg.type,
          content: msg.content,
          createdAt: msg.created_at,
          sender: { id: r.sender_id, displayName: r.sender_name },
          isScheduled: true,
        });

        // Send push notifications to other members
        const membersRows = await db.execute(sql`
          SELECT pt.token FROM push_tokens pt
          JOIN conversation_members cm ON cm.user_id = pt.user_id
          WHERE cm.conversation_id = ${r.conversation_id}
            AND cm.user_id != ${r.sender_id}
        `);
        const tokens = membersRows.rows.map((t: any) => t.token as string);
        if (tokens.length > 0) {
          await sendPushToUsers(tokens, r.sender_name, r.content, {
            type: "message",
            conversationId: r.conversation_id,
          });
        }

        logger.info({ scheduledId: r.id, msgId: msg.id }, "Scheduled message sent");
      } catch (msgErr) {
        logger.error({ err: msgErr, scheduledId: r.id }, "Failed to send scheduled message");
      }
    }
  } catch (err) {
    logger.error({ err }, "Scheduled message processor error");
  }
}
