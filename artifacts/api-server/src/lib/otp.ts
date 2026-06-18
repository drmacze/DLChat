import twilio from "twilio";
import { logger } from "./logger.js";

const OTP_PROVIDER = process.env["OTP_PROVIDER"] || "twilio";
const TWILIO_ACCOUNT_SID = process.env["TWILIO_ACCOUNT_SID"];
const TWILIO_AUTH_TOKEN = process.env["TWILIO_AUTH_TOKEN"];
const TWILIO_VERIFY_SERVICE_SID = process.env["TWILIO_VERIFY_SERVICE_SID"];

const isTwilioConfigured =
  !!TWILIO_ACCOUNT_SID && !!TWILIO_AUTH_TOKEN && !!TWILIO_VERIFY_SERVICE_SID;

// Dev-mode in-memory OTP store (not for production)
const devOtpStore = new Map<string, { code: string; expiresAt: number }>();

function generateDevOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getTwilioClient() {
  return twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
}

export async function sendOTP(phoneNumber: string): Promise<void> {
  if (OTP_PROVIDER === "twilio" && isTwilioConfigured) {
    const client = getTwilioClient();
    await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: phoneNumber, channel: "sms" });
    return;
  }

  // Dev fallback: store in memory and log to console
  const code = generateDevOtp();
  devOtpStore.set(phoneNumber, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  logger.warn(
    { phoneNumber, code },
    "DEV MODE: Twilio not configured — OTP logged here instead of SMS"
  );
  // Also print plainly so it's easy to spot in the terminal
  console.log(`\n[DEV OTP] Phone: ${phoneNumber}  Code: ${code}\n`);
}

export async function verifyOTP(
  phoneNumber: string,
  code: string
): Promise<boolean> {
  if (OTP_PROVIDER === "twilio" && isTwilioConfigured) {
    const client = getTwilioClient();
    const result = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phoneNumber, code });
    return result.status === "approved";
  }

  // Dev fallback: check in-memory store
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
