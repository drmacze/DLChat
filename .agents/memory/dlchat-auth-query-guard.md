---
name: DLChat Auth Query Guard
description: Why all authenticated React Query hooks in tab screens need enabled: !!token
---

# Auth Query Guard Pattern

## Rule
Every `useGet*` hook (or `useQuery`) in tab screens that requires authentication must include `enabled: !!token` in its query options.

## Why
Expo Router pre-renders all tab screens in the background even while the user is on the login screen. Without `enabled: !!token`, React Query fires the request immediately with no auth token → server returns 401 → error is cached → after login, user sees "Could not load chats" / "Loading AI friends..." stuck.

## How to apply
- Get `token` from `useAuth()`
- Pass `enabled: !!token` inside the `query:` options object, e.g.:
  ```ts
  const { data } = useGetConversations({ query: { queryKey: ["conversations"], enabled: !!token } });
  ```
- For manual `useQuery` calls with `fetch`, already use `enabled: !!token` — also ensure `token` is used in the Authorization header (not a stale closure)

## Affected screens (fixed)
- `app/(tabs)/chats.tsx` — useGetConversations
- `app/(tabs)/contacts.tsx` — useGetContacts
- `app/(tabs)/feed.tsx` — useGetFeed
- Profile and AI queries already had `enabled: !!token`

## Socket URL
SocketContext uses `BASE_URL` from `utils/api.ts` (not hardcoded `https://${EXPO_PUBLIC_DOMAIN}`). The start script sets `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN` which maps to the API server port 8080.
