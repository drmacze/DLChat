# DLChat (Dlavie Chat)

A production-ready fullstack social and chat application featuring real-time messaging, AI chat partners, social feeds, and story sharing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)
- Required env: `SESSION_SECRET` — used as JWT signing secret (auto-provisioned by Replit)

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- API: Express 5 + Socket.IO (real-time)
- DB: PostgreSQL + Drizzle ORM
- Auth: Custom JWT + database-backed sessions (username/password)
- Storage: Supabase Storage (optional — requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY secrets)
- Mobile: Expo / React Native (iOS, Android, Web)
- AI: Custom rule-based AI engine (no external API key required)
- Validation: Zod, drizzle-zod
- Build: esbuild

## Where things live

- `artifacts/api-server/` — Express backend (entry: `src/index.ts`)
- `artifacts/mobile/` — Expo mobile app (file-based routing under `app/`)
- `artifacts/whatsapp-bot/` — Optional WhatsApp OTP bot (standalone service)
- `lib/db/` — Shared DB schema (Drizzle) — source of truth
- `lib/api-spec/` — OpenAPI spec + codegen config

## Architecture decisions

- Auth is custom JWT with DB-backed sessions (no Supabase Auth / Clerk). Sessions stored in `sessions` table with hashed tokens for revocability.
- Schema migrations run automatically on server startup via raw SQL in `src/index.ts`.
- Storage is optional: upload routes throw a 503 if Supabase env vars are missing, but all other features work without it.
- AI chat partners use a deterministic rule-based engine — no external LLM API key needed.
- WhatsApp OTP bot is a separate optional service; the app also supports username/password auth without it.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm install` must be run before `pnpm run dev` (dependencies must be installed).
- The server always runs on `PORT` (default 8080 on Replit).
- File uploads require Supabase secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — the rest of the app works without them.
- Mobile app requires `EXPO_PUBLIC_DOMAIN` pointing to the Replit dev domain for API connectivity.
