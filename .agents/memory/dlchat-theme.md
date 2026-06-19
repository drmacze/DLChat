---
name: DLChat Theme System
description: How theming works across the app — provider setup, hook usage, color tokens, icon library, animations
---

# DLChat Theme System

ThemeProvider lives in `artifacts/mobile/context/ThemeContext.tsx` and wraps the entire app in `app/_layout.tsx` (outermost layer, before TutorialProvider).

## Hook usage
All screens and components must use `const { c, theme, toggleTheme } = useTheme()`. Never import `colors.dark` or `colors.light` directly. `onboarding.tsx` was historically broken (hardcoded `colors.dark`) — now fixed.

## Color tokens that DON'T exist (common mistakes)
- `c.secondarySurface` — use `c.surface` instead
- `c.radius` — removed, handle border-radius in StyleSheet directly

## Key gradient tokens
- `c.primaryGradient` — for buttons and accents
- `c.messageMeGradient` — gradient for user's own chat bubbles
- `c.messageThemBg` — flat color for received chat bubbles
- `c.aiGradient` — for AI contacts/avatars
- `c.streakGradient` — for streak fire card accent bar
- `c.logoShimmer` — 3-stop transparent→white→transparent for shimmer sweep animation

## Premium Palette (as of redesign — "Obsidian & Cream")
NOT cyberpunk/neon — muted, warm, sophisticated:
- Dark bg: `#0D0D0E` (neutral near-black, NOT blue-tinted like before)
- Surface: `#161618`, surfaceHigh: `#202024`
- Primary: `#7C79F0` (muted periwinkle-violet, like Linear/Notion — not bright)
- Light bg: `#F7F6F3` (warm off-white), light primary: `#5654C0`

**Why:** Old palette (`#080B14` bg, `#4F8EF7` blue, `#7C3AED` purple) felt cyberpunk/gaming. New palette is warm neutral base + refined muted violet accent.

## Icon Library
- `lucide-react-native` installed in `artifacts/mobile` — use for all nav/action icons
- `SvgIcons.tsx` for colored illustrative SVG icons (FireIcon, RobotIcon, ChatBubbleIcon, etc.)
- Feather icons REMOVED from tab screens — replaced with Lucide (MessageCircle, LayoutGrid, Users, User)
- Tab bar SymbolView (iOS): pass name `as any` to satisfy `SFSymbols7_0` type constraint

## DLChat Logo Shimmer Animation
- `ShinyLogo` component in `chats.tsx` uses `Animated.Value` + `LinearGradient` sweep
- `overflow: 'hidden'` on container clips the sweep to the text bounds
- Pattern: `Animated.loop(Animated.sequence([Animated.delay(3200), Animated.timing(...), reset]))`

## Animation Patterns (GSAP/Lenis equivalent)
- `react-native-reanimated` `FadeInDown.delay(index * 48).springify().damping(18)` for staggered list entrance
- FlatList `decelerationRate="normal"` for smooth scroll physics (Lenis equivalent)

## No-Emoji Policy
- Country flags → short text badge (ID, US, SG…) in `countryBadge` style
- Mood emoji → small colored SVG `Circle` dot via `MoodDot` component in contacts.tsx
- AI card avatar: `LinearGradient` circle with name initial (not avatarEmoji character)
- Empty states: custom SVG illustrations, never emoji
