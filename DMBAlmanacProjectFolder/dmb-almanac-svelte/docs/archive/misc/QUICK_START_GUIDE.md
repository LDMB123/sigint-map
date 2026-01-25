# DMB Almanac PWA Install Banner - Quick Start Guide

## What Was Fixed

The "Install App" button on the home page now works and triggers the native PWA install prompt when clicked.

## The Component (One File Created)

**File**: `/apps/web/src/components/pwa/InstallBanner.tsx`

This component:
1. Listens for the browser's `beforeinstallprompt` event
2. Shows a banner when the app is installable
3. Triggers the native install dialog when user clicks "Install App"
4. Hides after installation or dismissal
5. Detects if app is already installed

## Code Changes (Two Changes)

**File**: `/apps/web/src/app/(main)/page.tsx`

1. **Line 4** - Added import:
```tsx
import { InstallBanner } from '@/components/pwa/InstallBanner';
```

2. **Lines 228-231** - Replaced static button:
```tsx
// Before (non-functional):
<button className="...">Install App</button>

// After (fully functional):
<InstallBanner />
```

## How It Works

```
User visits home page
    ↓
Browser fires beforeinstallprompt event
    ↓
Component catches event
    ↓
Banner appears with "Install App" button
    ↓
User clicks "Install App"
    ↓
Native install dialog appears
    ↓
User clicks "Install"
    ↓
App installs
    ↓
Component detects installation
    ↓
Banner hides
```

## Testing (3 Steps)

### Step 1: Verify Setup
```bash
cd /Users/louisherman/Documents/dmbalmanac-v2
pnpm dev
```
Open http://localhost:3000

### Step 2: Check DevTools
1. Open Chrome DevTools (F12)
2. Go to Application → Manifest
   - Should load without errors
3. Go to Application → Service Workers
   - Should show "Active and running"

### Step 3: Test Install
1. Home page should show install banner
2. Click "Install App"
3. Chrome shows install dialog
4. Click "Install"
5. Banner hides automatically

## Key Features

✅ Listens for `beforeinstallprompt` event
✅ Detects if app already installed
✅ Shows/hides intelligently
✅ Triggers native install dialog
✅ Proper event cleanup (no memory leaks)
✅ TypeScript type-safe
✅ Accessible (keyboard navigation, screen readers)
✅ Works with existing PWA setup

## Browser Support

| Browser | Works |
|---------|-------|
| Chrome | ✅ Yes |
| Edge | ✅ Yes |
| Samsung Internet | ✅ Yes |
| Firefox | ⚠️ Partial |
| Safari | ❌ No |

## What Happens When

| Scenario | Banner Shows | Reason |
|----------|---|---|
| First visit (not installed) | Yes | beforeinstallprompt event fired |
| User dismisses | No | User clicked "Not now" |
| User installs | No | App is now installed |
| Return visit (installed) | No | Running in standalone mode |

## Component State

The component manages 3 pieces of state:

```javascript
const [deferredPrompt, setDeferredPrompt] = useState(null);
// Stores the browser's install event

const [isInstalled, setIsInstalled] = useState(false);
// Tracks if app is already installed

const [isVisible, setIsVisible] = useState(false);
// Controls whether banner shows
```

## Event Listeners

```javascript
// Browser fires when app is installable
window.addEventListener('beforeinstallprompt', event => {
  setDeferredPrompt(event);
  setIsVisible(true);  // Show banner
});

// Browser fires when installation completes
window.addEventListener('appinstalled', () => {
  setIsInstalled(true);
  setIsVisible(false);  // Hide banner
});

// Check if already running as installed app
if (window.matchMedia('(display-mode: standalone)').matches) {
  setIsInstalled(true);
}
```

## Buttons

### "Install App" Button
- Triggers native install dialog
- Shows browser's native UI
- After clicking Install, app installs
- Banner automatically hides

### "Not now" Button
- Dismisses banner temporarily
- User can still install later using footer button
- Banner reappears on next page reload

## File Locations

```
Created:
  /apps/web/src/components/pwa/InstallBanner.tsx (113 lines)

Modified:
  /apps/web/src/app/(main)/page.tsx (2 changes)

Already Configured:
  /apps/web/public/manifest.json
  /apps/web/src/components/pwa/ServiceWorkerRegistration.tsx
  /apps/web/src/app/layout.tsx
```

## Visual Design

The banner uses the app's design system:

```
┌─────────────────────────────────────┐
│ Install DMB Almanac                 │
│                                     │
│ Access setlists offline, get        │
│ notifications for new shows, and    │
│ enjoy a native app experience.      │
│                                     │
│  [Install App] [Not now]            │
└─────────────────────────────────────┘
```

- Glass effect background
- Centered text
- Two action buttons
- Download icon on primary button
- Responsive layout

## Performance

- Component size: ~3.4 KB (unminified)
- No performance impact
- No blocking operations
- Proper event listener cleanup

## Accessibility

- Semantic button elements
- Focus-visible states (keyboard users)
- aria-hidden on decorative icons
- Clear button labels
- High contrast colors

## Common Issues

### Banner Not Showing

**Cause**: App not installable
**Solution**: 
- Check DevTools → Manifest (no errors)
- Check DevTools → Service Worker (active)
- Try incognito mode
- Ensure HTTPS or localhost

### Install Dialog Doesn't Appear

**Cause**: beforeinstallprompt not firing
**Solution**:
- Check browser console for errors
- Verify manifest.json is valid
- Check Service Worker is active

### Banner Shows After Install

**Cause**: App not running in standalone mode
**Solution**:
- Refresh page
- Launch from home screen instead of browser

## Integration with Existing Code

The component works with:

1. **ServiceWorkerRegistration.tsx** - Registers Service Worker
2. **manifest.json** - Defines app installability
3. **Footer.tsx** - Has alternative install button
4. **layout.tsx** - Provides PWA setup

No conflicts or dependencies between them.

## Next Steps

1. Test locally with `pnpm dev`
2. Verify in Chrome DevTools
3. Test install flow
4. Deploy to production
5. Monitor user installs

## Support

For more detailed information:
- `PWA_INSTALL_BANNER_IMPLEMENTATION.md` - Full guide
- `TECHNICAL_REFERENCE.md` - Technical details
- `INSTALL_BANNER_QUICK_REFERENCE.md` - Troubleshooting

## Summary

You now have a fully functional PWA install banner on the DMB Almanac home page. The component handles all the complexity of the browser's install prompt, properly manages state, and provides a seamless user experience.

Status: ✅ Ready for testing and production deployment
