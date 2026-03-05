# Design System V2 - Spec (Dormant Draft)

Status: Exploratory design only. The current app does not ship a `VITE_UI_V2` toggle or a `.ui-v2` shell.

## Purpose
Define a coherent, expressive UI foundation for the new DMB Almanac experience while keeping the data layer intact.

## Principles
- Warm, human, music‑centric palette with tactile texture.
- Clear hierarchy: display serif + utility sans.
- Minimal chrome, strong content focus.
- Motion used for staging and orientation, not decoration.

## Fonts
- Display: **Inter** (self-hosted, CSP-safe) with high-contrast weight + tracking
- Body: **Inter** (self-hosted) with tightened line-height
- Optional upgrade: self-host Fraunces + Space Grotesk if CSP allows new font assets

## Tokens (V2)
```css
.ui-v2 {
  --ui2-font-display: var(--font-sans);
  --ui2-font-body: var(--font-sans);
  --ui2-bg: linear-gradient(160deg,
    oklch(0.98 0.04 90) 0%,
    oklch(0.94 0.08 75) 35%,
    oklch(0.90 0.06 160) 100%);
  --ui2-ink: oklch(0.16 0.02 70);
  --ui2-ink-muted: oklch(0.32 0.03 70);
  --ui2-surface: oklch(0.98 0.01 80);
  --ui2-surface-strong: oklch(1 0 0 / 0.9);
  --ui2-border: oklch(0.82 0.02 80);
  --ui2-accent: oklch(0.68 0.18 60);
  --ui2-accent-2: oklch(0.55 0.14 160);
  --ui2-shadow: 0 12px 40px oklch(0.2 0.02 70 / 0.15);
  --ui2-radius: 18px;
  --ui2-radius-lg: 28px;
}
```

## Core Components (V2)
- **Shell**: sticky header, content wrap, slim footer
- **Hero**: large display serif + short subtitle + CTA
- **Card**: rounded surface with subtle border + highlight shadow
- **List Item**: compact layout with secondary metadata
- **Section Header**: serif heading + small utility label
- **Badge**: accent chip for category or status

## Motion Rules
- Page load: stagger reveal (200–500ms), opacity + translateY.
- Hover: 1–2px lift only; avoid continuous animations.
- Reduced motion: disable all transitions for accessibility.

## Accessibility
- Keep 4.5:1 text contrast minimum.
- Preserve native popover + dialog patterns.
- Focus rings remain visible; do not override with `outline: none`.

## Migration Notes
- If revived, scope V2 styles under `.ui-v2` so the current shell stays untouched.
- Add a feature flag only when a real V2 shell exists in code.
