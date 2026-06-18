import { Request, Response, NextFunction } from "express";
import { verifyToken, hashToken } from "../lib/jwt.js";
import { db } from "@workspace/db";
import { sessions, users } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export interface AuthRequest extends Request {
  userId?: string;
  sessionId?: string;
  userRole?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized", code: "NO_TOKEN" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    const tokenHash = hashToken(token);

    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, payload.sessionId),
          eq(sessions.userId, payload.userId),
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt)
        )
      )
      .limit(1);

    if (!session) {
      res.status(401).json({ error: "Session invalid or revoked", code: "SESSION_INVALID" });
      return;
    }

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found", code: "USER_NOT_FOUND" });
      return;
    }

    await db
      .update(sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(sessions.id, session.id));

    req.userId = payload.userId;
    req.sessionId = payload.sessionId;
    req.userRole = user.role;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
  }
}
