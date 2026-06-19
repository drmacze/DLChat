import { Router } from "express";
import { db } from "@workspace/db";
import { messages } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const translateCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

const LANG_NAMES: Record<string, string> = {
  id: "Indonesian", en: "English", ar: "Arabic", zh: "Chinese (Simplified)",
  ja: "Japanese", ko: "Korean", es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", ru: "Russian", hi: "Hindi", tr: "Turkish",
};

router.post("/:id/translate", requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { targetLang = "en" } = req.body as { targetLang?: string };

  try {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    if (!msg || !msg.content) {
      res.status(404).json({ error: "Message not found or has no content" });
      return;
    }

    const cacheKey = `${msg.content}:${targetLang}`;
    const cached = translateCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      res.json({ original: msg.content, translated: cached.text, targetLang });
      return;
    }

    if (!GROQ_API_KEY) {
      res.status(503).json({ error: "Translation service not configured (GROQ_API_KEY missing)" });
      return;
    }

    const langName = LANG_NAMES[targetLang] ?? targetLang;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the given text to ${langName}. Return ONLY the translated text, no explanations, no quotes.`,
          },
          { role: "user", content: msg.content },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    const translated = data.choices[0]?.message?.content?.trim() ?? msg.content;

    translateCache.set(cacheKey, { text: translated, ts: Date.now() });
    res.json({ original: msg.content, translated, targetLang });
  } catch (err) {
    logger.error({ err }, "Translation failed");
    res.status(500).json({ error: "Translation failed" });
  }
});

export default router;
