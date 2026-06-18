import { Router } from "express";
import { z } from "zod/v4";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { users, sessions } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { signToken, hashToken } from "../lib/jwt.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  return timingSafeEqual(derived, storedBuf);
}

function buildUserProfile(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    phoneNumber: user.phoneNumber ?? null,
    username: user.username ?? null,
    displayName: user.displayName,
    bio: user.bio ?? null,
    avatarUrl: user.avatarUrl ?? null,
    statusText: user.statusText ?? null,
    role: user.role,
    isOnline: user.isOnline,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    privacyLastSeen: user.privacyLastSeen,
    privacyProfilePhoto: user.privacyProfilePhoto,
    privacyReadReceipts: user.privacyReadReceipts,
    createdAt: user.createdAt.toISOString(),
  };
}

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Try again in 10 minutes." },
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, password, displayName } = z
      .object({
        username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore"),
        password: z.string().min(6).max(128),
        displayName: z.string().min(1).max(64).trim(),
      })
      .parse(req.body);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Username sudah dipakai" });
      return;
    }

    const passwordHash = hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        username: username.toLowerCase(),
        passwordHash,
        displayName,
      })
      .returning();

    const token = signToken({ userId: user.id, sessionId: crypto.randomUUID() });
    const tokenHash = hashToken(token);

    await db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      deviceName: req.headers["user-agent"]?.substring(0, 100),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ token, user: buildUserProfile(user), isNewUser: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues[0]?.message ?? "Input tidak valid" });
      return;
    }
    logger.error({ err }, "Register error");
    res.status(500).json({ error: "Registrasi gagal" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = z
      .object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
      .parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Username atau password salah" });
      return;
    }

    const token = signToken({ userId: user.id, sessionId: crypto.randomUUID() });
    const tokenHash = hashToken(token);

    await db.insert(sessions).values({
      userId: user.id,
      tokenHash,
      deviceName: req.headers["user-agent"]?.substring(0, 100),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ token, user: buildUserProfile(user), isNewUser: false });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Input tidak valid" });
      return;
    }
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Login gagal" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.userId!)).limit(1);
    if (!user) { res.status(401).json({ error: "User tidak ditemukan" }); return; }
    res.json(buildUserProfile(user));
  } catch (err) {
    logger.error({ err }, "Get me error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, req.sessionId!));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Logout error");
    res.status(500).json({ error: "Logout gagal" });
  }
});

router.get("/sessions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const allSessions = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, req.userId!), isNull(sessions.revokedAt)));
    res.json({
      sessions: allSessions.map((s) => ({
        id: s.id,
        deviceName: s.deviceName,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt.toISOString(),
        lastActiveAt: s.lastActiveAt.toISOString(),
        isCurrent: s.id === req.sessionId,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get sessions error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/sessions/:sessionId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, String(req.params.sessionId)), eq(sessions.userId, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Revoke session error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
