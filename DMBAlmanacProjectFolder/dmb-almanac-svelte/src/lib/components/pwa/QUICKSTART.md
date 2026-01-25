# InstallPrompt - Quick Start Guide

## 1. Add to Your App (30 seconds)

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
</script>

<header>DMB Almanac</header>
<main><slot /></main>

<!-- That's it! Banner appears automatically -->
<InstallPrompt />
```

## 2. Verify Prerequisites

Check these files exist:

```bash
# Web App Manifest
ls -la static/manifest.json

# Service Worker
ls -la static/sw.js

# PWA Icons
ls -la static/icons/icon-192.png
ls -la static/icons/icon-512.png
```

## 3. Test It

```bash
# Build and test
npm run dev
# Open browser to http://localhost:5173
# Wait 3 seconds for banner
```

## 4. (Optional) Customize Timing

```svelte
<!-- Show after 10 seconds and require scroll -->
<InstallPrompt
  minTimeOnSite={10000}
  requireScroll={true}
  dismissalDurationDays={14}
/>
```

## 5. (Optional) Manual Control

```svelte
<script>
  let installPrompt;
</script>

<InstallPrompt bind:this={installPrompt} minTimeOnSite={0} />

<button onclick={() => installPrompt.show()}>
  Install App
</button>
```

## What You Get

✅ Auto-detecting install prompt
✅ 7-day dismissal memory (localStorage)
✅ iOS Safari manual instructions
✅ Full accessibility (ARIA, keyboard)
✅ Analytics tracking (gtag)
✅ Mobile responsive design
✅ Dark theme gradient
✅ Smooth animations

## How It Works

```
User visits app
       ↓
Service Worker registered? → No → Skip
       ↓ Yes
Wait minTimeOnSite (3sec)
       ↓
requireScroll enabled?
  → Yes: Wait for scroll
  → No: Continue
       ↓
Show banner (slide up from bottom)
       ↓
User clicks...
  → "Install": Web API install dialog
  → "Not now": Hide for 7 days
  → "X": Hide for 7 days
       ↓
Installation complete
  → Banner disappears
  → localStorage cleared
  → App runs in standalone mode
```

## Testing Checklist

- [ ] Banner slides up from bottom after 3 seconds
- [ ] "Install" button opens system dialog
- [ ] "Not now" button dismisses for 7 days
- [ ] "X" button dismisses for 7 days
- [ ] Reload page - banner doesn't appear (7 days)
- [ ] Clear localStorage - banner reappears
- [ ] iOS Safari shows different banner
- [ ] Mobile layout stacks vertically
- [ ] Animations smooth (60fps)
- [ ] Accessible with screen reader

## Clear Dismissal (Testing)

```javascript
// In browser console
localStorage.removeItem('pwa-install-prompt-dismissed');
location.reload();
```

## Check PWA Status

```javascript
// In browser console
const manifest = !!document.querySelector('link[rel="manifest"]');
const sw = 'serviceWorker' in navigator;
const https = location.protocol === 'https:' || location.hostname === 'localhost';
console.log({
  'Manifest present': manifest,
  'Service Worker': sw,
  'HTTPS/localhost': https
});
```

## For iOS Users

Component automatically detects iOS Safari and shows:
```
┌─────────────────────────┐
│ Add to Home Screen      │
│ Tap Share → Add         │
├─────────────────────────┤
│ Not now | How to Install │
└─────────────────────────┘
```

## Troubleshooting

### Banner never appears?

1. Check HTTPS or localhost: ✓
2. Service Worker registered: ✓
3. manifest.json present: ✓
4. Icons exist: ✓
5. Not already installed: ✓

### Still not working?

```javascript
// Check dismissal flag
console.log('Dismissed:', localStorage.getItem('pwa-install-prompt-dismissed'));

// Clear it
localStorage.removeItem('pwa-install-prompt-dismissed');
location.reload();
```

### On iOS?

- Open in Safari (not Chrome/Firefox)
- Component shows manual instructions
- Follow steps in "How to Install" button

## Styling Customization

Change banner color:

```svelte
<style>
  :global(.install-banner) {
    background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%) !important;
  }
</style>
```

## Analytics

Automatically tracked:
- `pwa_install` - User accepts install
- `pwa_install_dismissed` - User dismisses
- `pwa_ios_manual_install` - iOS instructions clicked

## Props Reference

```typescript
interface InstallPromptProps {
  minTimeOnSite?: number;           // ms before show (default: 3000)
  requireScroll?: boolean;          // Require scroll (default: false)
  dismissalDurationDays?: number;   // Days to remember dismiss (default: 7)
}
```

## Functions

```typescript
export function show(): void       // Force show banner
export function hide(): void       // Force hide banner
```

## Storage

- **Key**: `pwa-install-prompt-dismissed`
- **Scope**: localStorage
- **Value**: Unix timestamp
- **Expires**: After dismissalDurationDays

## Files

```
src/lib/components/pwa/
├── InstallPrompt.svelte      ← Main component (use this)
├── InstallPrompt.md          ← Full API docs
├── InstallPrompt.test.md     ← Testing guide
├── InstallPromptExamples.svelte ← More examples
├── QUICKSTART.md             ← You are here
└── SUMMARY.md                ← Complete overview
```

## Next Steps

1. Add component to layout
2. Build and test
3. Check Lighthouse PWA score
4. Deploy to production
5. Monitor analytics

## Need Help?

See detailed docs:
- **API**: `InstallPrompt.md`
- **Testing**: `InstallPrompt.test.md`
- **Examples**: `InstallPromptExamples.svelte`
- **Summary**: `SUMMARY.md`

## Learn More

- [PWA Install Guide](https://web.dev/articles/install)
- [Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**That's it!** Your PWA now has a professional install prompt. Users can add your app to home screen with one click.
