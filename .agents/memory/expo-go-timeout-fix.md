---
name: Expo Go Native Bundle Timeout Fix
description: Why Expo Go shows "request timed out" on first connect and how to fix it in Replit monorepo
---

## The Rule
When Expo Go first connects, the iOS native bundle must already be pre-compiled in Metro's cache. First-compile takes ~23s which exceeds Expo Go's connection timeout, causing "The request timed out."

## Why
Metro compiles the web bundle automatically when the dev server starts, but the native iOS bundle is only compiled on first Expo Go request. On Replit (slower CPU), this takes 23+ seconds — past Expo Go's timeout.

## How to Apply
1. **Pre-warm the bundle**: After Metro starts, curl the bundle endpoint in the background:
   ```bash
   BUNDLE_PATH="/node_modules/.pnpm/expo-router@6.0.24_.../node_modules/expo-router/entry.bundle"
   curl -s --max-time 180 "http://localhost:18115${BUNDLE_PATH}?platform=ios&dev=true&hot=false&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable" -o /tmp/ios_prewarm.js &
   ```
   Get the exact BUNDLE_PATH from: `curl -s "http://localhost:18115/" | grep -o 'src="[^"]*"' | sed 's/?platform=web.*//'`

2. **REACT_NATIVE_PACKAGER_HOSTNAME must be REPLIT_EXPO_DEV_DOMAIN** (not REPLIT_DEV_DOMAIN):
   - REPLIT_EXPO_DEV_DOMAIN → proxied to Metro port (18115) ✓
   - REPLIT_DEV_DOMAIN → main Replit proxy (port 80), doesn't reach Metro ✗

3. **DO NOT use CI=1**: It requires EXPO_TOKEN and crashes Expo CLI without it.

4. **Login prompt is cosmetic**: "It is recommended to log in..." appears AFTER Metro starts. It does not block bundle serving.

## Dev script (correct):
```
EXPO_PACKAGER_PROXY_URL=https://$REPLIT_EXPO_DEV_DOMAIN EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN EXPO_PUBLIC_REPL_ID=$REPL_ID REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_EXPO_DEV_DOMAIN pnpm exec expo start --localhost --port $PORT
```
