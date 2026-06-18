import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { contacts, blockedUsers, users } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

router.get("/blocked", requireAuth, async (req: AuthRequest, res) => {
  try {
    const blocked = await db
      .select({ user: users })
      .from(blockedUsers)
      .innerJoin(users, eq(blockedUsers.blockedId, users.id))
      .where(eq(blockedUsers.blockerId, req.userId!));

    res.json({ blocked: blocked.map((r) => userPublic(r.user)) });
  } catch (err) {
    logger.error({ err }, "Get blocked error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await db
      .select({ contact: contacts, user: users })
      .from(contacts)
      .innerJoin(users, eq(contacts.contactUserId, users.id))
      .where(eq(contacts.ownerId, req.userId!));

    res.json({
      contacts: result.map((r) => ({
        id: r.contact.id,
        customName: r.contact.customName,
        isFavorite: r.contact.isFavorite,
        createdAt: r.contact.createdAt.toISOString(),
        user: userPublic(r.user),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get contacts error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        phoneNumber: z.string().optional(),
        username: z.string().optional(),
        customName: z.string().optional(),
      })
      .parse(req.body);

    if (!body.phoneNumber && !body.username) {
      res.status(400).json({ error: "Provide phoneNumber or username" });
      return;
    }

    let targetUser;
    if (body.phoneNumber) {
      [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, body.phoneNumber))
        .limit(1);
    } else {
      [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, body.username!))
        .limit(1);
    }

    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (targetUser.id === req.userId) {
      res.status(400).json({ error: "Cannot add yourself" });
      return;
    }

    const [contact] = await db
      .insert(contacts)
      .values({
        ownerId: req.userId!,
        contactUserId: targetUser.id,
        customName: body.customName,
      })
      .onConflictDoUpdate({
        target: [contacts.ownerId, contacts.contactUserId],
        set: { customName: body.customName },
      })
      .returning();

    res.json({
      id: contact.id,
      customName: contact.customName,
      isFavorite: contact.isFavorite,
      createdAt: contact.createdAt.toISOString(),
      user: userPublic(targetUser),
    });
  } catch (err) {
    logger.error({ err }, "Add contact error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:contactId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.id, String(req.params.contactId)),
          eq(contacts.ownerId, req.userId!)
        )
      );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete contact error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/block", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    await db
      .insert(blockedUsers)
      .values({ blockerId: req.userId!, blockedId: userId })
      .onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Block user error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/block/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.blockerId, req.userId!),
          eq(blockedUsers.blockedId, String(req.params.userId))
        )
      );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Unblock user error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
