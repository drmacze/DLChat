---
name: DLChat Theme System
description: How theming works across the app — provider setup, hook usage, color tokens
---

# DLChat Theme System

ThemeProvider lives in `artifacts/mobile/context/ThemeContext.tsx` and wraps the entire app in `app/_layout.tsx` (outermost layer, before TutorialProvider).

## Hook usage
All screens and components must use `const { c, theme, toggleTheme } = useTheme()`. Never import `colors.dark` or `colors.light` directly — those are only for ThemeContext internals.

`useColors()` in `hooks/useColors.ts` is a thin alias that returns `useTheme().c` for legacy components.

## Color tokens that DON'T exist (common mistakes)
- `c.secondarySurface` — use `c.surface` instead
- `c.sidebar` — use `c.headerBg` or `c.surface` instead
- `c.radius` — was in old version, removed. Handle border-radius in StyleSheet directly.

## Key gradient tokens
- `c.primaryGradient` — for buttons and sent message bubbles
- `c.messageMeGradient` — gradient for user's own chat bubbles
- `c.messageThemBg` — flat color for received chat bubbles
- `c.aiGradient` — for AI contacts/avatars
- `c.streakGradient` — for streak fire card accent bar

**Why:** Screens that directly use `colors.dark` won't respond to theme toggle and will break in light mode.
