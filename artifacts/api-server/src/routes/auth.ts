import { Router } from "express";
import { z } from "zod/v4";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { users, sessions } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { sendOTP, verifyOTP } from "../lib/otp.js";
import { signToken, hashToken } from "../lib/jwt.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: "Too many OTP requests. Try again in 10 minutes." },
});

const verifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: "Too many verification attempts. Try again in 10 minutes." },
});

router.post("/request-otp", otpLimiter, async (req, res) => {
  try {
    const { phoneNumber } = z.object({ phoneNumber: z.string().min(7) }).parse(req.body);
    await sendOTP(phoneNumber);
    res.json({ message: "OTP sent", phoneNumber });
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    if (e && typeof e === "object" && "status" in e) {
      res.status(e.status as number).json({ error: e.message, code: e.code });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid phone number" });
      return;
    }
    logger.error({ err }, "OTP request error");
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/verify-otp", verifyLimiter, async (req, res) => {
  try {
    const { phoneNumber, code } = z
      .object({ phoneNumber: z.string().min(7), code: z.string().min(4) })
      .parse(req.body);

    const approved = await verifyOTP(phoneNumber, code);
    if (!approved) {
      res.status(400).json({ error: "Invalid or expired OTP", code: "OTP_INVALID" });
      return;
    }

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    const isNewUser = !user;

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          phoneNumber,
          displayName: phoneNumber,
        })
        .returning();
    }

    const token = signToken({ userId: user.id, sessionId: crypto.randomUUID() });
    const tokenHash = hashToken(token);

    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash,
        deviceName: req.headers["user-agent"]?.substring(0, 100),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      })
      .returning();

    const userProfile = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      statusText: user.statusText,
      role: user.role,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      privacyLastSeen: user.privacyLastSeen,
      privacyProfilePhoto: user.privacyProfilePhoto,
      privacyReadReceipts: user.privacyReadReceipts,
      createdAt: user.createdAt.toISOString(),
    };

    res.json({ token, user: userProfile, isNewUser });
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    if (e && typeof e === "object" && "status" in e) {
      res.status(e.status as number).json({ error: e.message, code: e.code });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    logger.error({ err }, "Verify OTP error");
    res.status(500).json({ error: "Verification failed" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      phoneNumber: user.phoneNumber,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      statusText: user.statusText,
      role: user.role,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      privacyLastSeen: user.privacyLastSeen,
      privacyProfilePhoto: user.privacyProfilePhoto,
      privacyReadReceipts: user.privacyReadReceipts,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Get me error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, req.sessionId!));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Logout error");
    res.status(500).json({ error: "Logout failed" });
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
