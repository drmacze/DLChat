---
name: DLChat Project Architecture
description: Key decisions and gotchas for the Dlavie Chat project
---

# Core Stack
- Mobile: Expo ~54 + React Native 0.81.5 in `artifacts/mobile`
- API: Express 5 + Drizzle ORM + PostgreSQL in `artifacts/api-server`
- Realtime: Socket.io with JWT auth middleware
- Auth: Twilio WhatsApp OTP (not SMS) → in-memory OTP store → JWT sessions

# Key Decisions
**Why:** Supabase storage is wired but credentials not set yet — upload returns 503 until SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are added as secrets.

**SocketContext fix:** Must use `useState<Socket | null>` not just `useRef` — consumers need reactive `socket` value, ref gives stale null on first render.

**Typing timeout:** Auto-stops after 5s server-side (typingTimeouts Map in socket/index.ts) and client-side after 2s idle in MessageInput. Both needed to prevent stuck indicators on disconnect.

**Unread count:** Real SQL subquery in conversations.ts GET / route — counts messages not in message_status table for this user.

**TS6305 errors:** Pre-existing project reference warnings about `lib/api-client-react/dist/index.d.ts` not built — safe to ignore, lib uses `src/index.ts` directly via exports field. Not a runtime issue.

# Secrets Required
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WHATSAPP_CONTENT_SID ✅
- JWT_SECRET ✅
- DATABASE_URL ✅
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ❌ (upload will 503 until set)

# Socket Events (server → client)
- message:new, message:updated, message:deleted, message:reaction, message:read
- typing:start, typing:stop
- user:online, user:offline, notification:new
