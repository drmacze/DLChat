import twilio from "twilio";
import { logger } from "./logger.js";

const ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"] ?? "";
const AUTH_TOKEN  = process.env["TWILIO_AUTH_TOKEN"] ?? "";
const VERIFY_SID  = process.env["TWILIO_VERIFY_SERVICE_SID"] ?? "";

const client = ACCOUNT_SID && AUTH_TOKEN ? twilio(ACCOUNT_SID, AUTH_TOKEN) : null;

export async function sendOTP(phoneNumber: string): Promise<void> {
  if (!client || !VERIFY_SID) {
    // Dev fallback when Twilio not configured
    const code = String(Math.floor(100000 + Math.random() * 900000));
    console.log(`\n[DEV OTP] Phone: ${phoneNumber}  Code: ${code}\n`);
    logger.warn({ phoneNumber }, "Twilio not configured — OTP only logged to console");
    return;
  }

  await client.verify.v2
    .services(VERIFY_SID)
    .verifications.create({ to: phoneNumber, channel: "whatsapp" })
    .catch(async (err: unknown) => {
      const e = err as { code?: number; message?: string };
      if (e?.code === 60200) {
        // WhatsApp channel not available for this number — fallback to SMS
        logger.info({ phoneNumber }, "WhatsApp not available, falling back to SMS");
        await client!.verify.v2
          .services(VERIFY_SID)
          .verifications.create({ to: phoneNumber, channel: "sms" });
      } else {
        throw err;
      }
    });

  logger.info({ phoneNumber }, "OTP sent via Twilio Verify");
}

export async function verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
  if (!client || !VERIFY_SID) {
    // Dev fallback — always fail (user should see code in console)
    logger.warn("Twilio not configured — cannot verify OTP");
    return false;
  }

  try {
    const check = await client.verify.v2
      .services(VERIFY_SID)
      .verificationChecks.create({ to: phoneNumber, code });
    return check.status === "approved";
  } catch (err: unknown) {
    const e = err as { code?: number };
    // 20404 = verification not found / already used / expired
    if (e?.code === 20404) return false;
    throw err;
  }
}
