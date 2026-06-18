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
import { eq, and, desc, isNull, sql, or, gt } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { broadcastMessage } from "../socket/index.js";

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

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const myConvs = await db
      .select({ conv: conversations, member: conversationMembers })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
      .where(eq(conversationMembers.userId, req.userId!))
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
          unreadCount: await (async () => {
            const [{ count }] = await db
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
            return count ?? 0;
          })(),
          isPinned: !!member.pinnedAt,
          isMuted: !!(member.mutedUntil && member.mutedUntil > new Date()),
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
      content: `Group "${body.title}" created`,
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

export default router;
