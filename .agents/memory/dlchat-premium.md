---
name: DLChat Premium Features
description: Full premium bundle implementation — what was added, key patterns, and gotchas to stay consistent with.
---

## Backend Routes Added (conversations.ts)
- GET /api/conversations?archived=true — filter archived
- POST /api/conversations/:id/mute — body: { durationMinutes } (-1=forever, 0=unmute)
- POST /api/conversations/:id/archive — toggle archive
- POST /api/conversations/:id/pin-chat — toggle pin
- DELETE /api/conversations/:id/messages — clear history
- GET /api/conversations/saved — get/create saved-messages conversation
- POST /api/conversations/:id/invite-link — generate group invite
- POST /api/conversations/join/:code — join via invite code
- POST /api/messages/bulk-delete — body: { messageIds: string[] }
- GET /api/link-preview?url= — og-tag scraping with in-memory cache

## Socket (socket/index.ts)
- Server handles "ping" event → emits "pong" back
- On conversation:join broadcasts "message:delivered" for all unread messages

## SocketContext.tsx Patterns
- Heartbeat: setInterval every 25s emitting "ping" while socket is connected
- Reconnect: socket.io reconnection=true, max 30 attempts, delay 1-10s
- AppState listener: reconnects on foreground
- messageQueue state: QueuedMessage[] + enqueueMessage/removeFromQueue exports

## MessageBubble.tsx Key Patterns
- Swipeable (react-native-gesture-handler) wraps the whole row for swipe-to-reply
- renderLeftActions → shows a circular reply icon
- onSwipeableOpen → calls onReply then closes the swipeable
- Double-tap detection with lastTap ref (300ms threshold) → shows quick emoji bar
- Quick emoji bar: 6 emojis ["👍","❤️","😂","😮","😢","🙏"]
- LinearGradient colors must be cast as `[string, string]` not `string[]`

## MessageInput.tsx Key Patterns
- Draft: debounced AsyncStorage.setItem(`draft:${conversationId}`) on text change
- Mentions: detect /@ (\w*)$/ at end of text → filter members → autocomplete list
- Camera: ImagePicker.launchCameraAsync + compressImage (ImageManipulator, 1200px, 0.78 quality)
- Image pick: launchImageLibraryAsync → compress → upload to /api/upload/message-media
- Voice: Audio.Recording.createAsync → stopAndUnload → upload to /api/upload/voice

## ChatListItem.tsx Patterns
- Swipeable with renderRightActions (left swipe reveals Mute + Archive)
- Swipe actions are 72px wide each
- onMute/onArchive callbacks from parent (chats.tsx)

## chat/[conversationId].tsx Patterns
- isSelectMode state: when true, header shows "N dipilih" + trash icon
- Long press opens MessageActionsModal (unchanged), select mode entered via header ⋮ → "Pilih Pesan"
- renderMessage passes onReply, onQuickReact, onSelect, isSelected only when relevant
- showMoreOptions: Alert with Pilih Pesan / Bisukan / Arsipkan / Hapus Riwayat
- conv used before its declaration bug: use convData instead of conv in useCallback deps

## Gotchas
- `conv = convData` is declared mid-function; useCallback closures must reference `convData` not `conv` to avoid TDZ TS error
- LinearGradient colors prop requires `readonly [ColorValue, ColorValue, ...ColorValue[]]` — cast with `as [string, string]`
- Archive filter in chats.tsx uses a separate useQuery (not the generated hook) with ?archived=true
- saved-messages.tsx at /saved-messages route: fetches GET /api/conversations/saved then router.replace to the conversation
