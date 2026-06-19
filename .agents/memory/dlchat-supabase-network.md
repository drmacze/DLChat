---
name: DLChat Supabase Networking
description: Supabase PostgreSQL TCP is blocked from Replit sandbox; only Supabase Storage (HTTPS) works
---

## Network constraint
- Replit dev sandbox cannot resolve or reach `db.*.supabase.co` on port 5432 — `getaddrinfo ENOTFOUND`
- Drizzle-kit push to Supabase also fails for the same reason
- `drizzle-kit push` hangs at "Pulling schema from database..." and then exits 1

## Architecture decision
- **Database**: Always use Replit built-in `DATABASE_URL` (Replit PostgreSQL) — it IS persistent across restarts
- **File storage**: Supabase Storage via HTTPS (port 443) works fine — use for images, voice, video uploads
- SUPABASE_DATABASE_URL should NOT be used as the db connection string in this environment

**Why:** Replit sandbox blocks outbound TCP to non-standard ports / external DB hosts. HTTPS (port 443) is allowed, so Supabase Storage SDK works. The Replit PostgreSQL is durable and not lost on restarts.

**How to apply:** lib/db/src/index.ts and drizzle.config.ts must use DATABASE_URL only. Storage.ts can use SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY over HTTPS.
