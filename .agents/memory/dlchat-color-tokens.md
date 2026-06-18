---
name: DLChat Color Tokens
description: Which color tokens exist in the new iOS26-style palette and which were removed
---

# DLChat Color Tokens (new palette)

## Tokens that EXIST
background, backgroundGradient, surface, surfaceGradient, surfaceHigh, overlay, glass, glassBorder,
foreground, mutedForeground, subtleForeground, border, primary, primaryGradient, accent, teal, success,
warning, danger, streak, streakGradient, headerBg, tabBarBg, messageMeGradient, messageThemBg,
aiGradient, mode, tint

## Tokens REMOVED from old version (don't use)
- `secondarySurface` → use `c.surface`
- `sidebar` → use `c.headerBg` or `c.surface`
- `radius` → use numeric values directly in StyleSheet

## MessageBubble pattern
- Sent (isMe): wrap content in `<LinearGradient colors={c.messageMeGradient}>` 
- Received (!isMe): `backgroundColor: c.messageThemBg`
- Reply preview bg (isMe): `rgba(0,0,0,0.15)`, (!isMe): `c.surface`

**Why:** The new color scheme uses a streamlined token set. Old components referencing removed tokens cause TypeScript errors and visual regressions.
