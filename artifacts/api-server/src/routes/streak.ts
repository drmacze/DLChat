import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

export async function updateStreak(userId: string): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const rows = await db.execute(sql`SELECT * FROM streaks WHERE user_id = ${userId}::uuid`);
    if (rows.rows.length === 0) {
      await db.execute(sql`INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date, updated_at) VALUES (${userId}::uuid, 1, 1, ${today}, now())`);
      return;
    }
    const s = rows.rows[0] as Record<string, unknown>;
    const lastDate = s.last_active_date as string;
    if (lastDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    if (lastDate === yesterdayStr) {
      const newStreak = (s.current_streak as number) + 1;
      const longest = Math.max(newStreak, s.longest_streak as number);
      await db.execute(sql`UPDATE streaks SET current_streak = ${newStreak}, longest_streak = ${longest}, last_active_date = ${today}, updated_at = now() WHERE user_id = ${userId}::uuid`);
    } else {
      await db.execute(sql`UPDATE streaks SET current_streak = 1, last_active_date = ${today}, updated_at = now() WHERE user_id = ${userId}::uuid`);
    }
  } catch (err) {
    logger.error({ err }, "Update streak error");
  }
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await updateStreak(req.userId!);
    const rows = await db.execute(sql`SELECT current_streak, longest_streak, last_active_date FROM streaks WHERE user_id = ${req.userId!}::uuid`);
    if (rows.rows.length === 0) { res.json({ currentStreak: 1, longestStreak: 1, lastActiveDate: new Date().toISOString().split("T")[0] }); return; }
    const s = rows.rows[0] as Record<string, unknown>;
    res.json({ currentStreak: s.current_streak, longestStreak: s.longest_streak, lastActiveDate: s.last_active_date });
  } catch (err) {
    logger.error({ err }, "Get streak error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
