import { db } from "@workspace/db";
import { otpCodes } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "./logger.js";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOTP(phoneNumber: string): Promise<void> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing OTP for this phone (only one active OTP at a time)
  await db.delete(otpCodes).where(eq(otpCodes.phoneNumber, phoneNumber));

  // Store in database — bot will pick it up
  await db.insert(otpCodes).values({ phoneNumber, code, expiresAt });

  logger.info({ phoneNumber }, "OTP stored in DB — waiting for bot to deliver");

  // Dev fallback: also log to console
  if (process.env.NODE_ENV === "development") {
    console.log(`\n[DEV OTP] Phone: ${phoneNumber}  Code: ${code}\n`);
  }
}

export async function verifyOTP(
  phoneNumber: string,
  code: string
): Promise<boolean> {
  const now = new Date();

  const [stored] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phoneNumber, phoneNumber),
        gt(otpCodes.expiresAt, now)
      )
    )
    .limit(1);

  if (!stored) return false;

  // Increment attempts
  await db
    .update(otpCodes)
    .set({ attempts: stored.attempts + 1 })
    .where(eq(otpCodes.id, stored.id));

  // Max 5 attempts
  if (stored.attempts >= 5) {
    await db.delete(otpCodes).where(eq(otpCodes.id, stored.id));
    return false;
  }

  if (stored.code !== code) return false;

  // Valid — delete used OTP
  await db.delete(otpCodes).where(eq(otpCodes.id, stored.id));
  return true;
}
