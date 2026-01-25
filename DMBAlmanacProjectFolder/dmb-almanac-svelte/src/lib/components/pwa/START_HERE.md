# InstallPrompt Component - START HERE

## What You Got

A production-ready Svelte 5 PWA installation prompt component that automatically shows a non-intrusive banner asking users to install your app.

## The Simplest Possible Setup (30 seconds)

### Step 1: Add to your layout
```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { InstallPrompt } from '$lib/components/pwa';
</script>

<InstallPrompt />
```

### Step 2: Test it
```bash
npm run dev
# Open http://localhost:5173
# Wait 3 seconds - banner slides up from bottom
```

### Step 3: That's it!
Users can now install your app with one click.

## What the Banner Looks Like

**Desktop:**
```
┌─────────────────────────────────────────────┐
│ [icon] Install DMB Almanac        [Not Now][Install][X] │
│        Add to home screen for quick offline access    │
└─────────────────────────────────────────────┘
```

**Mobile:**
```
┌──────────────────────────────┐
│ [icon] Install        [X]     │
│ Description                  │
│ [Not Now]    [Install]       │
└──────────────────────────────┘
```

**iOS Safari:**
```
┌──────────────────────────────┐
│ [icon] Add to Home Screen [X] │
│ Tap Share → Add               │
│ [Not Now] [How to Install]    │
└──────────────────────────────┘
```

## Key Features

- ✅ Auto-shows after 3 seconds (configurable)
- ✅ Users can dismiss for 7 days (configurable)
- ✅ Works on all browsers
- ✅ Special iOS Safari support
- ✅ Mobile responsive
- ✅ Fully accessible (keyboard, screen reader)
- ✅ Tracks analytics
- ✅ Zero setup needed

## Customization (Optional)

### Show after 10 seconds instead of 3
```svelte
<InstallPrompt minTimeOnSite={10000} />
```

### Require user scroll before showing
```svelte
<InstallPrompt requireScroll={true} />
```

### Remember dismissal for 30 days instead of 7
```svelte
<InstallPrompt dismissalDurationDays={30} />
```

### Manual control (show/hide from buttons)
```svelte
<script>
  let installPrompt;

  function triggerInstall() {
    installPrompt.show();
  }
</script>

<InstallPrompt bind:this={installPrompt} minTimeOnSite={0} />
<button onclick={triggerInstall}>Install App</button>
```

## How It Works

1. User visits your app
2. Component waits 3 seconds (or configured time)
3. Banner slides up from bottom
4. User clicks:
   - **Install** → Shows system install dialog
   - **Not now** → Banner disappears for 7 days
   - **X** → Banner disappears for 7 days

That's it. Simple and non-intrusive.

## Understanding Dismissal

When user clicks "Not now" or "X":
- Banner disappears
- localStorage key is set: `pwa-install-prompt-dismissed`
- Banner won't show again for 7 days (default)
- After 7 days, it shows again automatically

To test dismissal behavior:
```javascript
// Check if dismissed
localStorage.getItem('pwa-install-prompt-dismissed');

// Clear dismissal (shows banner again)
localStorage.removeItem('pwa-install-prompt-dismissed');
location.reload();
```

## iOS Users

iOS Safari doesn't have the install Web API, so the component:
1. Detects iOS + Safari
2. Shows different banner: "Add to Home Screen"
3. Provides instructions when user clicks "How to Install"
4. Users can manually add via Safari Share button

## Required for This to Work

Your app needs:
- ✅ HTTPS (or localhost for dev)
- ✅ `/static/manifest.json`
- ✅ `/static/sw.js`
- ✅ Icons at `/static/icons/icon-192.png` and `icon-512.png`

These probably already exist in your DMB Almanac project.

## Testing

### Local testing (1 minute)
```bash
npm run dev
# Open http://localhost:5173
# Wait 3 seconds
# Banner appears
# Click buttons to test
# Reload - banner gone for 7 days
```

### Reset for re-testing
```javascript
// In browser console
localStorage.removeItem('pwa-install-prompt-dismissed');
location.reload();
```

### Check PWA prerequisites
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

## Troubleshooting

### Banner never appears
1. Check HTTPS (or localhost) ✓
2. Check manifest.json exists ✓
3. Check Service Worker registered ✓
4. Check localStorage dismissal: `localStorage.removeItem('pwa-install-prompt-dismissed')`

### Install dialog doesn't open
- Not all browsers support the Web API (Firefox, Safari)
- That's fine - iOS shows manual instructions
- Desktop Firefox users see nothing (acceptable)

### iOS users can't install
- They need to use Safari Share button
- Component provides instructions
- iOS App Clip support coming in future

## Props Reference

```svelte
<!-- All optional, these are defaults -->
<InstallPrompt
  minTimeOnSite={3000}              <!-- ms to wait before showing -->
  requireScroll={false}             <!-- require user scroll first -->
  dismissalDurationDays={7}         <!-- days to remember dismissal -->
/>
```

## Functions

```svelte
<script>
  let promptRef;
</script>

<InstallPrompt bind:this={promptRef} />

<!-- Show banner -->
<button onclick={() => promptRef.show()}>
  Show Install Prompt
</button>

<!-- Hide banner for 7 days -->
<button onclick={() => promptRef.hide()}>
  Dismiss for 7 Days
</button>
```

## Analytics

Automatically tracks three events (if Google Analytics is installed):

- `pwa_install` - When user installs
- `pwa_install_dismissed` - When user dismisses
- `pwa_ios_manual_install` - When iOS user clicks help

Check in Google Analytics > Events section.

## Next Steps

1. **Now** - Add component to layout
2. **Now** - Run `npm run dev` and test
3. **Soon** - Customize timing if desired
4. **Soon** - Check Lighthouse PWA score
5. **Later** - Monitor analytics metrics

## Full Documentation

Need more details? See:

- **QUICKSTART.md** - Quick answers (5 min read)
- **InstallPrompt.README.md** - Features overview
- **InstallPrompt.md** - Complete API reference
- **InstallPrompt.test.md** - Testing guide
- **InstallPromptExamples.svelte** - 10 code examples
- **INSTALL_PROMPT_INDEX.md** - Master index

## Quick FAQs

**Q: Will the banner annoy users?**
A: No. It auto-dismisses for 7 days, doesn't block content.

**Q: Does it work offline?**
A: Component itself works offline once installed. Installation dialog requires network.

**Q: Can I customize colors?**
A: Yes. Use `:global(.install-banner)` in your styles.

**Q: Does it work on iOS?**
A: Yes. Shows manual instructions since iOS Safari lacks Web API.

**Q: Is it accessible?**
A: Yes. Full WCAG 2.1 AA compliance, keyboard navigation, screen reader support.

**Q: Does it break my layout?**
A: No. Fixed position at bottom, doesn't affect page flow.

**Q: Can I show it on demand?**
A: Yes. Use `minTimeOnSite={0}` and `bind:this` with `show()` function.

**Q: What if user already installed?**
A: Banner never shows. Component detects standalone mode automatically.

## Ready?

Add this to `src/routes/+layout.svelte`:

```svelte
<script>
  import { InstallPrompt } from '$lib/components/pwa';
</script>

<InstallPrompt />
```

Then run:
```bash
npm run dev
```

Done! Your PWA now has an install prompt.

---

**Need help?** Read QUICKSTART.md for 5-minute guide.
**Want details?** Read InstallPrompt.README.md for full feature list.
**Building something custom?** See InstallPromptExamples.svelte.
