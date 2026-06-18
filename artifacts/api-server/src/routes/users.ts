import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq, or, ilike, and, ne } from "drizzle-orm";
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

router.get("/search", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { q, limit = "20" } = z
      .object({ q: z.string().min(1), limit: z.string().optional() })
      .parse(req.query);

    const results = await db
      .select()
      .from(users)
      .where(
        and(
          ne(users.id, req.userId!),
          or(
            ilike(users.username, `%${q}%`),
            ilike(users.displayName, `%${q}%`)
          )
        )
      )
      .limit(Math.min(parseInt(limit), 50));

    res.json({ users: results.map(userPublic) });
  } catch (err) {
    logger.error({ err }, "Search users error");
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    res.json(userPublic(user));
  } catch (err) {
    logger.error({ err }, "Get user error");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        displayName: z.string().min(1).max(60).optional(),
        username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
        bio: z.string().max(200).optional(),
        statusText: z.string().max(100).optional(),
        avatarUrl: z.string().url().optional(),
        privacyLastSeen: z.enum(["everyone", "contacts", "nobody"]).optional(),
        privacyProfilePhoto: z.enum(["everyone", "contacts", "nobody"]).optional(),
        privacyReadReceipts: z.boolean().optional(),
      })
      .parse(req.body);

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, req.userId!))
      .returning();

    res.json(userPublic(updated));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid data", details: err.issues });
      return;
    }
    logger.error({ err }, "Update user error");
    res.status(500).json({ error: "Update failed" });
  }
});

router.get("/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, String(req.params.userId)))
      .limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userPublic(user));
  } catch (err) {
    logger.error({ err }, "Get user by id error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
