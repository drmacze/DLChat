import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";
import { createAIPersona, generateAIResponse, getDefaultPersonas, type AIPersona, type AIMood, type AICountry, type AIGender } from "../lib/aiEngine.js";

const router = Router();

const personaCache = new Map<string, AIPersona>();
const historyCache = new Map<string, Array<{ role: "user" | "ai"; content: string }>>();

function ck(userId: string, aiId: string) { return `${userId}:${aiId}`; }

async function ensurePersonas(userId: string): Promise<AIPersona[]> {
  const rows = await db.execute(sql`SELECT * FROM ai_contacts WHERE user_id = ${userId}::uuid ORDER BY created_at ASC`);
  if (rows.rows.length > 0) {
    return rows.rows.map((r: Record<string, unknown>) => {
      const p: AIPersona = JSON.parse(r.persona_json as string);
      personaCache.set(ck(userId, p.id), p);
      return p;
    });
  }
  const defaults = getDefaultPersonas();
  for (const p of defaults) {
    await db.execute(sql`
      INSERT INTO ai_contacts (id, user_id, name, country, gender, persona_json, created_at, updated_at)
      VALUES (${p.id}, ${userId}::uuid, ${p.name}, ${p.country}, ${p.gender}, ${JSON.stringify(p)}, now(), now())
      ON CONFLICT DO NOTHING
    `);
    personaCache.set(ck(userId, p.id), p);
  }
  return defaults;
}

router.get("/contacts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const personas = await ensurePersonas(req.userId!);
    res.json({ contacts: personas });
  } catch (err) {
    logger.error({ err }, "AI contacts error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/contacts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { country, gender } = z.object({
      country: z.enum(["id", "us", "sg", "jp", "in", "br", "de", "uk"]),
      gender: z.enum(["male", "female"]),
    }).parse(req.body);
    const p = createAIPersona(country as AICountry, gender as AIGender);
    await db.execute(sql`
      INSERT INTO ai_contacts (id, user_id, name, country, gender, persona_json, created_at, updated_at)
      VALUES (${p.id}, ${req.userId!}::uuid, ${p.name}, ${p.country}, ${p.gender}, ${JSON.stringify(p)}, now(), now())
    `);
    personaCache.set(ck(req.userId!, p.id), p);
    res.json(p);
  } catch (err) {
    logger.error({ err }, "Create AI contact error");
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/contacts/:aiId", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.execute(sql`DELETE FROM ai_contacts WHERE id = ${String(req.params.aiId)} AND user_id = ${req.userId!}::uuid`);
    personaCache.delete(ck(req.userId!, String(req.params.aiId)));
    historyCache.delete(ck(req.userId!, String(req.params.aiId)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete AI contact error");
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/contacts/:aiId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, role, content, mood, created_at FROM ai_messages
      WHERE user_id = ${req.userId!}::uuid AND ai_contact_id = ${String(req.params.aiId)}
      ORDER BY created_at ASC LIMIT 100
    `);
    res.json({ messages: rows.rows.map((r: Record<string, unknown>) => ({ id: r.id, role: r.role, content: r.content, mood: r.mood, createdAt: r.created_at })) });
  } catch (err) {
    logger.error({ err }, "Get AI messages error");
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/contacts/:aiId/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);
    const aiId = String(req.params.aiId);
    const userId = req.userId!;
    const key = ck(userId, aiId);

    let persona = personaCache.get(key);
    if (!persona) {
      const rows = await db.execute(sql`SELECT persona_json FROM ai_contacts WHERE id = ${aiId} AND user_id = ${userId}::uuid`);
      if (!rows.rows[0]) { res.status(404).json({ error: "AI contact not found" }); return; }
      persona = JSON.parse((rows.rows[0] as Record<string, unknown>).persona_json as string) as AIPersona;
      personaCache.set(key, persona);
    }

    if (!historyCache.has(key)) {
      const rows = await db.execute(sql`
        SELECT role, content FROM ai_messages WHERE user_id = ${userId}::uuid AND ai_contact_id = ${aiId}
        ORDER BY created_at DESC LIMIT 20
      `);
      historyCache.set(key, rows.rows.reverse().map((r: Record<string, unknown>) => ({ role: r.role as "user" | "ai", content: r.content as string })));
    }

    const history = historyCache.get(key)!;

    const userMsgId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO ai_messages (id, user_id, ai_contact_id, role, content, mood, created_at)
      VALUES (${userMsgId}, ${userId}::uuid, ${aiId}, 'user', ${content}, 'happy', now())
    `);
    history.push({ role: "user", content });

    const { content: aiContent, newMood, typingMs } = generateAIResponse(history, persona, content);

    persona.mood = newMood as AIMood;
    personaCache.set(key, persona);
    await db.execute(sql`UPDATE ai_contacts SET persona_json = ${JSON.stringify(persona)}, updated_at = now() WHERE id = ${aiId} AND user_id = ${userId}::uuid`);

    const aiMsgId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO ai_messages (id, user_id, ai_contact_id, role, content, mood, created_at)
      VALUES (${aiMsgId}, ${userId}::uuid, ${aiId}, 'ai', ${aiContent}, ${newMood}, now())
    `);
    history.push({ role: "ai", content: aiContent });
    if (history.length > 40) history.splice(0, history.length - 40);

    res.json({
      userMessage: { id: userMsgId, role: "user", content, createdAt: new Date().toISOString() },
      aiMessage: { id: aiMsgId, role: "ai", content: aiContent, mood: newMood, createdAt: new Date().toISOString() },
      typingMs: Math.round(typingMs),
    });
  } catch (err) {
    logger.error({ err }, "AI chat error");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
