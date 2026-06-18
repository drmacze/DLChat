import twilio from "twilio";
import { logger } from "./logger.js";

const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_WHATSAPP_FROM = process.env["TWILIO_WHATSAPP_FROM"] || "whatsapp:+14155238886";
const TWILIO_WHATSAPP_CONTENT_SID = process.env["TWILIO_WHATSAPP_CONTENT_SID"];

const isTwilioConfigured = !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_WHATSAPP_CONTENT_SID;

// Dev-mode in-memory OTP store (not for production)
const devOtpStore = new Map<string, { code: string; expiresAt: number }>();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getTwilioClient() {
  return twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
}

export async function sendOTP(phoneNumber: string): Promise<void> {
  const code = generateOtp();

  if (isTwilioConfigured) {
    const client = getTwilioClient();
    const whatsappTo = phoneNumber.startsWith("whatsapp:") ? phoneNumber : `whatsapp:${phoneNumber}`;
    await client.messages.create({
      to: whatsappTo,
      from: TWILIO_WHATSAPP_FROM,
      contentSid: TWILIO_WHATSAPP_CONTENT_SID!,
      contentVariables: JSON.stringify({ "1": code }),
    });
    // Store code for verification
    devOtpStore.set(phoneNumber, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    logger.info({ phoneNumber }, "OTP sent via WhatsApp");
    return;
  }

  // Dev fallback: store in memory and log to console
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
