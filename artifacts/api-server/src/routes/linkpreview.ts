import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() ?? null;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

const previewCache = new Map<string, { data: Record<string, unknown>; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

router.get("/link-preview", requireAuth, async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL required" });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  const cached = previewCache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.json(cached.data);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DLChatBot/1.0)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      const data = { url, domain: getDomain(url), title: getDomain(url), description: null, image: null };
      res.json(data);
      return;
    }

    const text = await response.text();
    const html = text.slice(0, 50000);

    const title = extractMeta(html, "og:title") ?? extractMeta(html, "twitter:title") ?? extractTitle(html) ?? getDomain(url);
    const description = extractMeta(html, "og:description") ?? extractMeta(html, "twitter:description") ?? extractMeta(html, "description");
    const image = extractMeta(html, "og:image") ?? extractMeta(html, "twitter:image");
    const domain = getDomain(url);

    const data = { url, domain, title, description, image };
    previewCache.set(url, { data, ts: Date.now() });
    res.json(data);
  } catch (err) {
    logger.warn({ err, url }, "Link preview fetch failed");
    res.json({ url, domain: getDomain(url), title: getDomain(url), description: null, image: null });
  }
});

export default router;
