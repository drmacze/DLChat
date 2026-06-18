import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.userRole !== "admin" && req.userRole !== "moderator") {
    res.status(403).json({ error: "Forbidden", code: "INSUFFICIENT_ROLE" });
    return;
  }
  next();
}
