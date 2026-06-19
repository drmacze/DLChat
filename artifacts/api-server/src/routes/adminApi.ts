import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { logger } from "../lib/logger.js";
import { sendPushToUsers } from "../lib/pushNotifications.js";
import { getIO } from "../socket/index.js";

const router = Router();

function isAdmin(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const key = req.headers["x-admin-key"] as string | undefined;
  const adminKey = process.env.ADMIN_KEY ?? "dlchat-dev-2024";
  return key === adminKey;
}

function adminGuard(req: any, res: any, next: any) {
  if (!isAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

// ── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", adminGuard, async (_req, res) => {
  try {
    const [usersRow, msgsRow, convsRow, todayRow, pushRow, scheduledRow] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int as count FROM users`),
      db.execute(sql`SELECT COUNT(*)::int as count FROM messages WHERE deleted_at IS NULL`),
      db.execute(sql`SELECT COUNT(*)::int as count FROM conversations`),
      db.execute(sql`SELECT COUNT(DISTINCT sender_id)::int as count FROM messages WHERE created_at > now() - interval '24 hours' AND deleted_at IS NULL`),
      db.execute(sql`SELECT COUNT(*)::int as count FROM push_tokens`),
      db.execute(sql`SELECT COUNT(*)::int as count FROM scheduled_messages WHERE sent_at IS NULL AND send_at > now()`),
    ]);
    const io = getIO();
    let activeSockets = 0;
    try { activeSockets = (await io.fetchSockets()).length; } catch {}
    res.json({
      totalUsers: (usersRow.rows[0] as any).count,
      totalMessages: (msgsRow.rows[0] as any).count,
      totalConversations: (convsRow.rows[0] as any).count,
      activeUsersToday: (todayRow.rows[0] as any).count,
      pushTokens: (pushRow.rows[0] as any).count,
      pendingScheduled: (scheduledRow.rows[0] as any).count,
      activeSockets,
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
  } catch (err) {
    logger.error({ err }, "Admin stats error");
    res.status(500).json({ error: "Failed" });
  }
});

// ── Maintenance Mode ─────────────────────────────────────────────────────────
router.get("/maintenance", adminGuard, async (_req, res) => {
  try {
    const row = await db.execute(sql`SELECT * FROM maintenance_mode WHERE id = 1`);
    res.json(row.rows[0] ?? { is_active: false, message: null });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/maintenance", adminGuard, async (req, res) => {
  const parsed = z.object({
    isActive: z.boolean(),
    message: z.string().max(500).optional(),
    scheduledEndAt: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid" }); return; }
  const { isActive, message, scheduledEndAt } = parsed.data;
  try {
    await db.execute(sql`
      UPDATE maintenance_mode SET
        is_active = ${isActive},
        message = ${message ?? "Sedang dalam pemeliharaan. Mohon tunggu sebentar."},
        scheduled_end_at = ${scheduledEndAt ? new Date(scheduledEndAt) : null},
        updated_at = now()
      WHERE id = 1
    `);
    const io = getIO();
    io.emit("maintenance:update", { isActive, message: message ?? null });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Maintenance update error");
    res.status(500).json({ error: "Failed" });
  }
});

// Public endpoint for mobile app
router.get("/maintenance/status", async (_req, res) => {
  try {
    const row = await db.execute(sql`SELECT is_active, message, scheduled_end_at FROM maintenance_mode WHERE id = 1`);
    const data = row.rows[0] as any;
    res.json({
      isActive: data?.is_active ?? false,
      message: data?.message ?? null,
      scheduledEndAt: data?.scheduled_end_at ?? null,
    });
  } catch {
    res.json({ isActive: false, message: null, scheduledEndAt: null });
  }
});

// ── Broadcast Push Notification ──────────────────────────────────────────────
router.post("/broadcast/push", adminGuard, async (req, res) => {
  const parsed = z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    data: z.record(z.string()).optional(),
    segment: z.enum(["all", "active_7d", "active_30d"]).default("all"),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid" }); return; }
  const { title, body, data, segment } = parsed.data;
  try {
    let tokensQuery: string;
    if (segment === "active_7d") {
      tokensQuery = `SELECT DISTINCT pt.token FROM push_tokens pt JOIN users u ON u.id = pt.user_id WHERE u.last_seen_at > now() - interval '7 days'`;
    } else if (segment === "active_30d") {
      tokensQuery = `SELECT DISTINCT pt.token FROM push_tokens pt JOIN users u ON u.id = pt.user_id WHERE u.last_seen_at > now() - interval '30 days'`;
    } else {
      tokensQuery = `SELECT token FROM push_tokens`;
    }
    const rows = await db.execute(sql.raw(tokensQuery));
    const tokens = rows.rows.map((r: any) => r.token as string);
    await sendPushToUsers(tokens, title, body, { ...data, type: "broadcast" });
    logger.info({ count: tokens.length, segment }, "Broadcast push sent");
    res.json({ ok: true, sent: tokens.length });
  } catch (err) {
    logger.error({ err }, "Broadcast push error");
    res.status(500).json({ error: "Failed" });
  }
});

// ── In-app Broadcast Notification (socket) ───────────────────────────────────
router.post("/broadcast/notification", adminGuard, async (req, res) => {
  const parsed = z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(500),
    type: z.string().default("announcement"),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid" }); return; }
  const { title, body, type } = parsed.data;
  try {
    // Save to DB for all users
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, body)
      SELECT id, ${type}, ${title}, ${body} FROM users
    `);
    const io = getIO();
    io.emit("notification:broadcast", { title, body, type, createdAt: new Date().toISOString() });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Broadcast notification error");
    res.status(500).json({ error: "Failed" });
  }
});

// ── App Announcements (popups) ───────────────────────────────────────────────
router.get("/announcements", adminGuard, async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM app_announcements ORDER BY created_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.post("/announcements", adminGuard, async (req, res) => {
  const parsed = z.object({
    title: z.string().min(1).max(100),
    message: z.string().min(1).max(1000),
    type: z.enum(["info", "warning", "success", "error"]).default("info"),
    expiresAt: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid" }); return; }
  const { title, message, type, expiresAt } = parsed.data;
  try {
    const result = await db.execute(sql`
      INSERT INTO app_announcements (title, message, type, expires_at)
      VALUES (${title}, ${message}, ${type}, ${expiresAt ? new Date(expiresAt) : null})
      RETURNING *
    `);
    const ann = result.rows[0];
    const io = getIO();
    io.emit("announcement:new", ann);
    res.json(ann);
  } catch (err) {
    logger.error({ err }, "Create announcement error");
    res.status(500).json({ error: "Failed" });
  }
});

router.delete("/announcements/:id", adminGuard, async (req, res) => {
  try {
    await db.execute(sql`UPDATE app_announcements SET is_active = false WHERE id::text = ${req.params.id}`);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// Public: active announcements for app
router.get("/announcements/active", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT * FROM app_announcements
      WHERE is_active = true AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC LIMIT 5
    `);
    res.json(rows.rows);
  } catch { res.json([]); }
});

// ── Users ────────────────────────────────────────────────────────────────────
router.get("/users", adminGuard, async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const page = parseInt((req.query.page as string) ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const rows = await db.execute(sql`
      SELECT id, username, display_name, role, is_online, last_seen_at, created_at,
             (SELECT COUNT(*)::int FROM messages WHERE sender_id = users.id AND deleted_at IS NULL) as msg_count
      FROM users
      WHERE ${q ? sql`(username ILIKE ${'%' + q + '%'} OR display_name ILIKE ${'%' + q + '%'})` : sql`TRUE`}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const countRow = await db.execute(sql`SELECT COUNT(*)::int as count FROM users WHERE ${q ? sql`(username ILIKE ${'%' + q + '%'} OR display_name ILIKE ${'%' + q + '%'})` : sql`TRUE`}`);
    res.json({ users: rows.rows, total: (countRow.rows[0] as any).count });
  } catch (err) {
    logger.error({ err }, "Admin users list error");
    res.status(500).json({ error: "Failed" });
  }
});

// ── Scheduled Messages ───────────────────────────────────────────────────────
router.get("/scheduled", adminGuard, async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT sm.*, u.display_name as sender_name, c.title as conv_title
      FROM scheduled_messages sm
      JOIN users u ON u.id = sm.sender_id
      JOIN conversations c ON c.id = sm.conversation_id
      WHERE sm.sent_at IS NULL
      ORDER BY sm.send_at ASC LIMIT 100
    `);
    res.json(rows.rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/scheduled/:id", adminGuard, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM scheduled_messages WHERE id::text = ${req.params.id} AND sent_at IS NULL`);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Patch Notes (forwarded) ──────────────────────────────────────────────────
router.get("/patchnotes", adminGuard, async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM patch_notes ORDER BY created_at DESC LIMIT 50`);
    res.json(rows.rows);
  } catch { res.status(500).json({ error: "Failed" }); }
});

export { isAdmin };
export default router;
