import { Router, Response } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import {
  conversations,
  conversationMembers,
  messages,
  users,
  blockedUsers,
  messageStatus,
} from "@workspace/db";
import { eq, and, desc, isNull, sql, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { broadcastMessage, getIO } from "../socket/index.js";

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

async function getMembership(conversationId: string, userId: string) {
  const [member] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);
  return member;
}

// GET /saved — must be before /:conversationId
router.get("/saved", requireAuth, async (req: AuthRequest, res) => {
  try {
    const existing = await db.execute(sql`
      SELECT conversation_id FROM saved_messages WHERE user_id = ${req.userId}
    `);
    if (existing.rows.length > 0) {
      const convId = (existing.rows[0] as { conversation_id: string }).conversation_id;
      return await getConvDetail(convId, req.userId!, res);
    }
    const [conv] = await db.insert(conversations).values({
      type: "direct",
      title: "Pesan Tersimpan",
      createdBy: req.userId!,
    }).returning();
    await db.insert(conversationMembers).values({
      conversationId: conv.id,
      userId: req.userId!,
      role: "owner",
    });
    await db.execute(sql`
      INSERT INTO saved_messages (user_id, conversation_id) VALUES (${req.userId}, ${conv.id})
      ON CONFLICT (user_id) DO UPDATE SET conversation_id = ${conv.id}
    `);
    return await getConvDetail(conv.id, req.userId!, res);
  } catch (err) {
    logger.error({ err }, "Saved messages error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /join/:inviteCode — must be before /:conversationId
router.post("/join/:inviteCode", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await db.execute(sql`
      SELECT conversation_id FROM channel_invites
      WHERE invite_code = ${req.params.inviteCode}
      AND (expires_at IS NULL OR expires_at > NOW())
    `);
    if (!result.rows.length) {
      res.status(404).json({ error: "Undangan tidak valid atau sudah kadaluarsa" });
      return;
    }
    const row = result.rows[0] as { conversation_id: string };
    await db.insert(conversationMembers).values({
      conversationId: row.conversation_id,
      userId: req.userId!,
      role: "member",
    }).onConflictDoNothing();
    return await getConvDetail(row.conversation_id, req.userId!, res);
  } catch (err) {
    logger.error({ err }, "Join invite error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const showArchived = req.query.archived === "true";

    const myConvs = await db
      .select({ conv: conversations, member: conversationMembers })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
      .where(
        and(
          eq(conversationMembers.userId, req.userId!),
          showArchived
            ? sql`${conversationMembers.archivedAt} IS NOT NULL`
            : sql`${conversationMembers.archivedAt} IS NULL`
        )
      )
      .orderBy(desc(conversations.updatedAt));

    const result = await Promise.all(
      myConvs.map(async ({ conv, member }) => {
        const [lastMsg] = await db
          .select({ msg: messages, sender: users })
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(and(eq(messages.conversationId, conv.id), isNull(messages.deletedAt)))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        let otherUser = null;
        let memberCount = null;

        if (conv.type === "direct") {
          const [other] = await db
            .select({ user: users })
            .from(conversationMembers)
            .innerJoin(users, eq(conversationMembers.userId, users.id))
            .where(
              and(
                eq(conversationMembers.conversationId, conv.id),
                sql`${conversationMembers.userId} != ${req.userId!}::uuid`
              )
            )
            .limit(1);
          if (other) otherUser = userPublic(other.user);
        } else {
          const [count] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(conversationMembers)
            .where(eq(conversationMembers.conversationId, conv.id));
          memberCount = count?.count ?? 0;
        }

        const [{ count: unreadCount }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              isNull(messages.deletedAt),
              sql`${messages.id} NOT IN (
                SELECT message_id FROM message_status
                WHERE user_id = ${req.userId!}::uuid AND status = 'read'
              )`
            )
          );

        return {
          id: conv.id,
          type: conv.type,
          title: conv.title,
          avatarUrl: conv.avatarUrl,
          lastMessage: lastMsg
            ? {
                id: lastMsg.msg.id,
                content: lastMsg.msg.content,
                type: lastMsg.msg.type,
                senderName: lastMsg.sender.displayName,
                createdAt: lastMsg.msg.createdAt.toISOString(),
              }
            : null,
          unreadCount: unreadCount ?? 0,
          isPinned: !!member.pinnedAt,
          isMuted: !!(member.mutedUntil && member.mutedUntil > new Date()),
          isArchived: !!member.archivedAt,
          otherUser,
          memberCount,
          updatedAt: conv.updatedAt.toISOString(),
        };
      })
    );

    res.json({ conversations: result });
  } catch (err) {
    logger.error({ err }, "Get conversations error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/direct", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { targetUserId } = z
      .object({ targetUserId: z.string().uuid() })
      .parse(req.body);

    const [blocked] = await db
      .select()
      .from(blockedUsers)
      .where(
        or(
          and(eq(blockedUsers.blockerId, req.userId!), eq(blockedUsers.blockedId, targetUserId)),
          and(eq(blockedUsers.blockerId, targetUserId), eq(blockedUsers.blockedId, req.userId!))
        )
      )
      .limit(1);

    if (blocked) {
      res.status(403).json({ error: "Cannot message this user", code: "USER_BLOCKED" });
      return;
    }

    const myConvs = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, req.userId!));

    const myConvIds = myConvs.map((m) => m.conversationId);

    if (myConvIds.length > 0) {
      const existing = await db
        .select({ conv: conversations })
        .from(conversationMembers)
        .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
        .where(
          and(
            eq(conversationMembers.userId, targetUserId),
            eq(conversations.type, "direct"),
            sql`${conversationMembers.conversationId} = ANY(${sql.raw(`'{${myConvIds.join(",")}}'::uuid[]`)})`
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return await getConvDetail(existing[0].conv.id, req.userId!, res);
      }
    }

    const [conv] = await db
      .insert(conversations)
      .values({ type: "direct", createdBy: req.userId! })
      .returning();

    await db.insert(conversationMembers).values([
      { conversationId: conv.id, userId: req.userId!, role: "member" },
      { conversationId: conv.id, userId: targetUserId, role: "member" },
    ]);

    return await getConvDetail(conv.id, req.userId!, res);
  } catch (err) {
    logger.error({ err }, "Create direct conv error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/group", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        title: z.string().min(1).max(100),
        memberIds: z.array(z.string().uuid()).min(1),
        avatarUrl: z.string().optional(),
      })
      .parse(req.body);

    const [conv] = await db
      .insert(conversations)
      .values({ type: "group", title: body.title, avatarUrl: body.avatarUrl, createdBy: req.userId!, isPublic: false })
      .returning();

    const members = [
      { conversationId: conv.id, userId: req.userId!, role: "owner" as const },
      ...body.memberIds
        .filter((id) => id !== req.userId)
        .map((id) => ({ conversationId: conv.id, userId: id, role: "member" as const })),
    ];
    await db.insert(conversationMembers).values(members);

    const systemMsg = await db.insert(messages).values({
      conversationId: conv.id,
      type: "system",
      content: `Group "${body.title}" dibuat`,
    }).returning();

    broadcastMessage(conv.id, { type: "system", message: systemMsg[0] });

    return await getConvDetail(conv.id, req.userId!, res);
  } catch (err) {
    logger.error({ err }, "Create group error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/channel", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        title: z.string().min(1).max(100),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        avatarUrl: z.string().optional(),
      })
      .parse(req.body);

    const [conv] = await db
      .insert(conversations)
      .values({
        type: "channel",
        title: body.title,
        description: body.description,
        avatarUrl: body.avatarUrl,
        createdBy: req.userId!,
        isPublic: body.isPublic ?? true,
      })
      .returning();

    await db.insert(conversationMembers).values({
      conversationId: conv.id,
      userId: req.userId!,
      role: "owner",
    });

    return await getConvDetail(conv.id, req.userId!, res);
  } catch (err) {
    logger.error({ err }, "Create channel error");
    res.status(500).json({ error: "Server error" });
  }
});

async function getConvDetail(convId: string, userId: string, res: Response) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const members = await db
    .select({ member: conversationMembers, user: users })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .where(eq(conversationMembers.conversationId, convId));

  const myMember = members.find((m) => m.member.userId === userId);

  res.json({
    id: conv.id,
    type: conv.type,
    title: conv.title,
    description: conv.description,
    avatarUrl: conv.avatarUrl,
    isPublic: conv.isPublic,
    createdAt: conv.createdAt.toISOString(),
    members: members.map((m) => ({
      userId: m.member.userId,
      role: m.member.role,
      joinedAt: m.member.joinedAt.toISOString(),
      user: userPublic(m.user),
    })),
    myRole: myMember?.member.role ?? "member",
    isPinned: !!myMember?.member.pinnedAt,
    isMuted: !!(myMember?.member.mutedUntil && myMember.member.mutedUntil > new Date()),
    isArchived: !!myMember?.member.archivedAt,
  });
}

router.get("/:conversationId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }
    await getConvDetail(String(req.params.conversationId), req.userId!, res);
  } catch (err) {
    logger.error({ err }, "Get conv error");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:conversationId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
    const body = z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
      .parse(req.body);
    await db.update(conversations).set({ ...body, updatedAt: new Date() }).where(eq(conversations.id, String(req.params.conversationId)));
    await getConvDetail(String(req.params.conversationId), req.userId!, res);
  } catch (err) {
    logger.error({ err }, "Update conv error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:conversationId/members", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    await db.insert(conversationMembers).values({
      conversationId: String(req.params.conversationId),
      userId,
      role: "member",
    }).onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Add member error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:conversationId/members/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
    await db.delete(conversationMembers).where(
      and(
        eq(conversationMembers.conversationId, String(req.params.conversationId)),
        eq(conversationMembers.userId, String(req.params.userId))
      )
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Remove member error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:conversationId/leave", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(conversationMembers).where(
      and(
        eq(conversationMembers.conversationId, String(req.params.conversationId)),
        eq(conversationMembers.userId, req.userId!)
      )
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Leave conv error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /:conversationId/mute — toggle mute (durationMinutes: 0=unmute, 60, 480, 10080, -1=forever)
router.post("/:conversationId/mute", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { durationMinutes } = z.object({ durationMinutes: z.number().optional() }).parse(req.body);
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }

    let mutedUntil: Date | null = null;
    const dur = durationMinutes ?? 60;
    if (dur === 0) {
      mutedUntil = null;
    } else if (dur === -1) {
      mutedUntil = new Date("2099-12-31");
    } else {
      mutedUntil = new Date(Date.now() + dur * 60 * 1000);
    }

    await db.update(conversationMembers)
      .set({ mutedUntil })
      .where(and(
        eq(conversationMembers.conversationId, String(req.params.conversationId)),
        eq(conversationMembers.userId, req.userId!)
      ));

    res.json({ success: true, isMuted: !!mutedUntil, mutedUntil: mutedUntil?.toISOString() ?? null });
  } catch (err) {
    logger.error({ err }, "Mute conversation error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /:conversationId/archive — toggle archive
router.post("/:conversationId/archive", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }

    const isNowArchived = !member.archivedAt;
    await db.update(conversationMembers)
      .set({ archivedAt: isNowArchived ? new Date() : null })
      .where(and(
        eq(conversationMembers.conversationId, String(req.params.conversationId)),
        eq(conversationMembers.userId, req.userId!)
      ));

    res.json({ success: true, isArchived: isNowArchived });
  } catch (err) {
    logger.error({ err }, "Archive conversation error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /:conversationId/pin-chat — toggle pin in chat list
router.post("/:conversationId/pin-chat", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }

    const isNowPinned = !member.pinnedAt;
    await db.update(conversationMembers)
      .set({ pinnedAt: isNowPinned ? new Date() : null })
      .where(and(
        eq(conversationMembers.conversationId, String(req.params.conversationId)),
        eq(conversationMembers.userId, req.userId!)
      ));

    res.json({ success: true, isPinned: isNowPinned });
  } catch (err) {
    logger.error({ err }, "Pin chat error");
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /:conversationId/messages — clear chat history
router.delete("/:conversationId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }

    const { forAll } = z.object({ forAll: z.boolean().optional() }).parse(req.body ?? {});

    if (forAll && (member.role === "owner" || member.role === "admin")) {
      await db.update(messages)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(messages.conversationId, String(req.params.conversationId)),
          isNull(messages.deletedAt)
        ));
    } else {
      await db.update(messages)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(messages.conversationId, String(req.params.conversationId)),
          eq(messages.senderId, req.userId!),
          isNull(messages.deletedAt)
        ));
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Clear chat history error");
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /:conversationId/slow-mode — set slow mode delay (owner/admin only)
router.patch("/:conversationId/slow-mode", requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = z.object({ delay: z.number().int().min(0).max(3600) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "delay must be 0-3600 seconds" }); return; }
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }
    if (!["owner", "admin"].includes(member.role)) {
      res.status(403).json({ error: "Only admins and owners can set slow mode" }); return;
    }
    await db.execute(sql`
      UPDATE conversations SET slow_mode_delay = ${parsed.data.delay}
      WHERE id = ${req.params.conversationId}
    `);
    const io = getIO();
    if (io) io.to(`conv:${req.params.conversationId}`).emit("conversation:slow_mode", {
      conversationId: req.params.conversationId, delay: parsed.data.delay,
    });
    res.json({ ok: true, delay: parsed.data.delay });
  } catch (err) {
    logger.error({ err }, "Set slow mode error");
    res.status(500).json({ error: "Server error" });
  }
});

// POST /:conversationId/invite-link — generate group invite link
router.post("/:conversationId/invite-link", requireAuth, async (req: AuthRequest, res) => {
  try {
    const member = await getMembership(String(req.params.conversationId), req.userId!);
    if (!member) { res.status(403).json({ error: "Not a member" }); return; }

    const code = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
    await db.execute(sql`
      INSERT INTO channel_invites (conversation_id, invite_code, created_by)
      VALUES (${req.params.conversationId}, ${code}, ${req.userId})
    `);

    res.json({ success: true, inviteCode: code, inviteLink: `dlchat://invite/${code}` });
  } catch (err) {
    logger.error({ err }, "Create invite link error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
