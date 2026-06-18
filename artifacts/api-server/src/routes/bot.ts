import { Router } from "express";
import { db } from "@workspace/db";
import { otpCodes } from "@workspace/db";
import { eq, isNull, gt, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

const BOT_SECRET = process.env["BOT_WEBHOOK_SECRET"];

function requireBotSecret(req: any, res: any, next: any) {
  const secret = req.headers["x-bot-secret"] ?? req.query.secret;
  if (!BOT_SECRET || secret !== BOT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/**
 * GET /api/bot/pending
 * Bot polls this to get OTPs that need to be sent.
 * Returns list of {id, phoneNumber, code} where sentAt is null and not expired.
 */
router.get("/pending", requireBotSecret, async (_req, res) => {
  try {
    const now = new Date();
    const pending = await db
      .select({
        id: otpCodes.id,
        phoneNumber: otpCodes.phoneNumber,
        code: otpCodes.code,
        createdAt: otpCodes.createdAt,
      })
      .from(otpCodes)
      .where(
        // Not yet sent by bot AND not expired
        isNull(otpCodes.sentAt) && gt(otpCodes.expiresAt, now) as any
      );

    res.json({ otps: pending });
  } catch (err) {
    logger.error({ err }, "Bot pending OTPs error");
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/bot/confirm
 * Bot calls this after sending the WhatsApp message to mark OTP as sent.
 * Body: { id: string }
 */
router.post("/confirm", requireBotSecret, async (req, res) => {
  try {
    const { id } = req.body as { id: string };
    if (!id) { res.status(400).json({ error: "Missing id" }); return; }

    await db
      .update(otpCodes)
      .set({ sentAt: new Date() })
      .where(eq(otpCodes.id, id));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Bot confirm error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
