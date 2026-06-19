---
name: DLChat expo-audio Migration
description: expo-av replaced with expo-audio; correct API names and call order for player + recorder hooks
---

## VoicePlayer (MessageBubble.tsx)
- Use BOTH `useAudioPlayer(source)` AND `useAudioPlayerStatus(player)` — the status hook is required for reactive re-renders of `playing`, `currentTime`, `duration`
- `player.play()` / `player.pause()` for control; read state from `status.playing`, `status.currentTime`, `status.duration`

## Recording (MessageInput.tsx)
- `const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)` at component level
- Start sequence: `await recorder.prepareToRecordAsync()` → `recorder.record()` (sync, no await)
- Stop: `await recorder.stop()`, then read `recorder.uri`
- AudioMode properties: `allowsRecording` (not `allowsRecordingIOS`), `playsInSilentMode` (not `playsInSilentModeIOS`)

**Why:** expo-av deprecated in SDK 54, removed in SDK 55. expo-audio has different API surface — notably `record()` is sync and requires `prepareToRecordAsync()` first, and AudioMode keys dropped iOS/Android suffixes.
