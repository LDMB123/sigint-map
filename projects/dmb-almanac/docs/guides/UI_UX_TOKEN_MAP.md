# UI/UX Token Map (V1 → V2)

## V1 Token Inventory (from app.css)
###  (323)
- `--safe-area-inset-top`
- `--safe-area-inset-right`
- `--safe-area-inset-bottom`
- `--safe-area-inset-left`
- `--titlebar-area-x`
- `--titlebar-area-y`
- `--titlebar-area-width`
- `--titlebar-area-height`
- `--gpu-transform-hint`
- `--glass-bg`
- `--glass-bg-strong`
- `--glass-bg-subtle`
- `--glass-border`
- `--glass-border-strong`
- `--glass-blur`
- `--glass-blur-strong`
- `--glass-blur-subtle`
- `--glass-saturation`
- `--glow-primary`
- `--glow-primary-strong`
- `--glow-primary-subtle`
- `--glow-secondary`
- `--glow-accent-rust`
- `--glow-accent-green`
- `--color-accent-orange`
- `--color-accent-green`
- `--color-accent-blue`
- `--color-accent-rust`
- `--color-accent-ochre`
- `--spacing-responsive`
- `--shadow-adaptive`
- `--button-bg`
- `--card-border`
- `--gradient-hero`
- `--gradient-hero-size`
- `--gradient-card-shine`
- `--gradient-text-gold`
- `--max-width`
- `--header-height`
- `--color-primary-50`
- `--color-primary-100`
- `--color-primary-200`
- `--color-primary-300`
- `--color-primary-400`
- `--color-primary-500`
- `--color-primary-600`
- `--color-primary-700`
- `--color-primary-800`
- `--color-primary-900`
- `--color-primary-950`
- … 273 more

### misc (10)
- `--dvh`
- `--svh`
- `--lvh`
- `--background`
- `--foreground`
- `--background`
- `--foreground`
- `--background`
- `--foreground`
- `--background`

## V2 Token Strategy
- Use scoped `.ui-v2` tokens to avoid breaking V1.
- Map key V1 tokens to V2 tokens in UI components during migration.
- Keep motion tokens aligned with Chromium 143 motion utilities.