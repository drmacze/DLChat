---
name: DLChat SVG Icons & Storage
description: SVG icon system, App Storage setup, and permanent domain configuration
---

# SVG Icons
- All UI emojis replaced with colored SVG components in `artifacts/mobile/components/common/SvgIcons.tsx`
- Icons: RobotIcon, FireIcon, ChatBubbleIcon, GlobeIcon, StarIcon, PeopleIcon, TrophyIcon, CameraIcon, WaveIcon, PhotoIcon, VideoIcon, MicIcon, PaperclipIcon, PinIcon, MuteIcon
- Chat-context emojis kept (mood emojis, country flags, reaction emojis)
- react-native-svg v15.12.1 already installed

# API URL / Permanent Domain
- Central config at `artifacts/mobile/utils/api.ts`
- Prefers `EXPO_PUBLIC_API_URL` (set to permanent `.replit.app` domain for production)
- Falls back to `https://${EXPO_PUBLIC_DOMAIN}` (dev domain)
- **Why:** This allows the published Expo app to use the deployed API without code changes

**How to apply:** When user knows their permanent API domain, set `EXPO_PUBLIC_API_URL=https://<their-domain>` in Replit Secrets.

# App Storage (Replit Object Storage)
- Bucket: replit-objstore-c6b35e75-7b62-44a8-b178-09ecacd4b2f9
- Server files: `artifacts/api-server/src/lib/objectStorage.ts`, `objectAcl.ts`, `routes/storage.ts`
- Routes: POST /api/storage/uploads/request-url, GET /api/storage/public-objects/*, GET /api/storage/objects/*
- storage.ts uses inline Zod schemas (NOT @workspace/api-zod — those types don't exist there)
- CORS allowedHeaders includes "x-bot-secret" for bot routes
