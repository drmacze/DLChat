import twilio from "twilio";
import { logger } from "./logger.js";

const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_VERIFY_SERVICE_SID = process.env["TWILIO_VERIFY_SERVICE_SID"];

const isTwilioConfigured =
  !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_VERIFY_SERVICE_SID;

// Dev-mode in-memory OTP store (only used when Twilio is not configured)
const devOtpStore = new Map<string, { code: string; expiresAt: number }>();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getTwilioClient() {
  return twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
}

export async function sendOTP(phoneNumber: string): Promise<void> {
  if (isTwilioConfigured) {
    const client = getTwilioClient();
    await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: phoneNumber,
        channel: "whatsapp",
      });
    logger.info({ phoneNumber }, "OTP sent via Twilio Verify (WhatsApp)");
    return;
  }

  // Dev fallback: store in memory and log to console
  const code = generateOtp();
  devOtpStore.set(phoneNumber, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  logger.warn(
    { phoneNumber, code },
    "DEV MODE: Twilio not configured — OTP logged here instead of WhatsApp"
  );
  console.log(`\n[DEV OTP] Phone: ${phoneNumber}  Code: ${code}\n`);
}

export async function verifyOTP(
  phoneNumber: string,
  code: string
): Promise<boolean> {
  if (isTwilioConfigured) {
    try {
      const client = getTwilioClient();
      const check = await client.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID!)
        .verificationChecks.create({
          to: phoneNumber,
          code,
        });
      return check.status === "approved";
    } catch (err) {
      logger.error({ err, phoneNumber }, "Twilio Verify check error");
      return false;
    }
  }

  // Dev fallback
  const stored = devOtpStore.get(phoneNumber);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    devOtpStore.delete(phoneNumber);
    return false;
  }
  if (stored.code !== code) return false;
  devOtpStore.delete(phoneNumber);
  return true;
}
