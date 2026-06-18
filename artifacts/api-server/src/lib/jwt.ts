import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env["JWT_SECRET"] || process.env["SESSION_SECRET"];

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable is required.");
}

export interface JWTPayload {
  userId: string;
  sessionId: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "90d" });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET!) as JWTPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
