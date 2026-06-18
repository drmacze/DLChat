import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { reports, posts, messages, stories } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/admin.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z
      .object({
        targetType: z.enum(["user", "post", "message", "story"]),
        targetId: z.string().uuid(),
        reason: z.string().min(1).max(500),
        details: z.string().max(2000).optional(),
      })
      .parse(req.body);

    await db.insert(reports).values({ ...body, reporterId: req.userId! });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Create report error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/reports", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, page = "1" } = z
      .object({ status: z.enum(["pending", "resolved", "rejected"]).optional(), page: z.string().optional() })
      .parse(req.query);
    const pg = parseInt(page);
    const lim = 20;
    const offset = (pg - 1) * lim;

    let query = db.select().from(reports).orderBy(desc(reports.createdAt)).limit(lim).offset(offset);
    if (status) {
      query = query.where(eq(reports.status, status)) as typeof query;
    }
    const result = await query;
    res.json({
      reports: result.map((r) => ({
        id: r.id,
        reporterId: r.reporterId,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Get reports error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/reports/:reportId", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [report] = await db.select().from(reports).where(eq(reports.id, String(req.params.reportId))).limit(1);
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }
    res.json({
      id: report.id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Get report error");
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/admin/reports/:reportId", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = z.object({ status: z.enum(["resolved", "rejected"]) }).parse(req.body);
    await db.update(reports)
      .set({ status, resolvedAt: new Date() })
      .where(eq(reports.id, String(req.params.reportId)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Update report error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/admin/content/:type/:id", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const type = req.params.type;
    const id = String(req.params.id);
    if (type === "post") await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id));
    else if (type === "message") await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, id));
    else if (type === "story") await db.update(stories).set({ deletedAt: new Date() }).where(eq(stories.id, id));
    else { res.status(400).json({ error: "Invalid content type" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete content error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
