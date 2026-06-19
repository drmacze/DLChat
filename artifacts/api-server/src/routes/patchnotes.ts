import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { z } from "zod/v4";

const router = Router();

export function isAdminRequest(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const key = req.headers["x-admin-key"] as string | undefined;
  const adminKey = process.env.ADMIN_KEY ?? "dlchat-dev-2024";
  return key === adminKey;
}

router.get("/", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, version, title, content, is_major, created_at
      FROM patch_notes ORDER BY created_at DESC LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, "Get patch notes failed");
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/latest", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, version, title, content, is_major, created_at
      FROM patch_notes ORDER BY created_at DESC LIMIT 1
    `);
    res.json(result.rows[0] ?? null);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/", async (req, res) => {
  if (!isAdminRequest(req as any)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = z.object({
    version: z.string().min(1).max(20),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(5000),
    isMajor: z.boolean().optional().default(false),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  try {
    const result = await db.execute(sql`
      INSERT INTO patch_notes (version, title, content, is_major)
      VALUES (${parsed.data.version}, ${parsed.data.title}, ${parsed.data.content}, ${parsed.data.isMajor})
      RETURNING id, version, title, content, is_major, created_at
    `);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "Create patch note failed");
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/:id", async (req, res) => {
  if (!isAdminRequest(req as any)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { version, title, content, isMajor } = req.body as Record<string, unknown>;
  const { id } = req.params;

  try {
    await db.execute(sql`
      UPDATE patch_notes SET version = ${version as string}, title = ${title as string},
        content = ${content as string}, is_major = ${isMajor ?? false}
      WHERE id::text = ${id}
    `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!isAdminRequest(req as any)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    await db.execute(sql`DELETE FROM patch_notes WHERE id::text = ${req.params.id}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
