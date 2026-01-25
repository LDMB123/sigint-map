# InstallPrompt Component - Testing & Integration Guide

## Pre-Flight Checklist

Before testing the InstallPrompt component, ensure your PWA is properly configured:

### Required Files
- [x] `/static/manifest.json` - Valid Web App Manifest
- [x] `/static/sw.js` - Service Worker
- [x] `/static/icons/` - Icon assets (at least 192px and 512px)
- [x] HTTPS enabled (or localhost)

### Manifest Requirements

```json
{
  "name": "DMB Almanac",
  "short_name": "DMB",
  "start_url": "/?pwa=1",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#030712",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

Must be registered and active:

```javascript
// In +layout.svelte or main entry point
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## Local Testing

### 1. Start Development Server

```bash
npm run dev
# Server running at http://localhost:5173
```

### 2. Chrome DevTools Setup

1. Open Chrome DevTools (F12)
2. Navigate to "Application" tab
3. Check three sections:
   - **Service Workers**: Should show registered with "active" status
   - **Manifest**: Should show parsed manifest.json
   - **Storage > Local Storage**: Should show localhost entry

### 3. Test beforeinstallprompt Event

#### Via DevTools Console

```javascript
// Manually dispatch beforeinstallprompt event
const event = new BeforeInstallPromptEvent('beforeinstallprompt');
Object.defineProperty(event, 'prompt', {
  value: async () => console.log('Prompt called'),
  enumerable: true
});
Object.defineProperty(event, 'userChoice', {
  value: Promise.resolve({ outcome: 'accepted' }),
  enumerable: true
});
window.dispatchEvent(event);
```

#### Via Network Simulation

Chrome will fire `beforeinstallprompt` when:
1. App meets installability criteria
2. User visits for 30+ seconds
3. App isn't already installed
4. HTTPS is enabled

To test locally without delay:

```javascript
// In browser console
const event = new Event('beforeinstallprompt');
event.prompt = () => Promise.resolve();
event.userChoice = Promise.resolve({ outcome: 'accepted' });
window.dispatchEvent(event);
```

### 4. Test Dismissal Persistence

Check localStorage in DevTools:

```javascript
// View dismissal flag
localStorage.getItem('pwa-install-prompt-dismissed');

// Should return: null (not dismissed) or timestamp (dismissed)
// Example: "1705864800000" (Unix timestamp)

// Clear dismissal to reset
localStorage.removeItem('pwa-install-prompt-dismissed');

// Force show the prompt
window.location.reload();
```

## Component Testing Scenarios

### Scenario 1: Initial Load

1. Load app at http://localhost:5173
2. Wait 3 seconds (default minTimeOnSite)
3. Observe banner slide in from bottom
4. Check DevTools Console for `[PWA] Install prompt captured`

### Scenario 2: Dismiss and 7-Day Persistence

1. Load app, wait for banner
2. Click "Not now" button
3. Banner disappears
4. Check localStorage: `pwa-install-prompt-dismissed` key exists
5. Reload page multiple times
6. Banner should NOT appear for 7 days
7. Clear localStorage and reload to reset

### Scenario 3: Installation Flow

1. Load app, wait for banner
2. Click "Install" button
3. Platform-specific install dialog appears
4. Accept installation
5. App installs to home screen/dock
6. Banner disappears
7. localStorage is cleared
8. App is now in `display-mode: standalone`

### Scenario 4: Detect Installed State

1. Open app in standalone mode (from home screen)
2. Banner should NOT appear (app already installed)
3. `isInstalled` state is true
4. DevTools console shows no install prompt events

### Scenario 5: iOS Safari Detection

1. Open app on iOS Safari
2. Different banner appears: "Add to Home Screen"
3. "How to Install" button shows instructions
4. Click the button to see iOS instructions
5. Manual installation steps displayed

### Scenario 6: Manual Control

```svelte
<script>
  let installPrompt;

  function testShow() {
    installPrompt.show();
  }

  function testHide() {
    installPrompt.hide();
  }
</script>

<InstallPrompt bind:this={installPrompt} minTimeOnSite={0} />

<button onclick={testShow}>Show Prompt</button>
<button onclick={testHide}>Hide Prompt</button>
```

Test:
1. Click "Show Prompt" - banner appears
2. Click "Hide Prompt" - banner disappears
3. Verify localStorage has dismissal flag set
4. Reload page - banner should not appear

### Scenario 7: Scroll Requirement

```svelte
<InstallPrompt requireScroll={true} minTimeOnSite={3000} />
```

Test:
1. Load app, wait 3 seconds
2. Banner does NOT appear yet
3. Scroll down the page
4. Banner appears after scroll
5. Verify `hasScrolled` is true in state

### Scenario 8: Custom Timing

```svelte
<InstallPrompt minTimeOnSite={10000} dismissalDurationDays={14} />
```

Test:
1. Load app
2. Wait 10 seconds (longer delay)
3. Banner appears
4. Dismiss it
5. Clear other local storage keys, leave dismissal flag
6. Reload and wait 14 days (or manually set localStorage timestamp to 13 days ago)
7. Banner should appear again after 14 days

## Integration Testing Checklist

### Rendering
- [ ] Banner renders with correct styling
- [ ] Icon displays correctly
- [ ] Title reads "Install DMB Almanac"
- [ ] Description is visible
- [ ] Buttons have correct labels

### Interactivity
- [ ] "Install" button triggers install flow
- [ ] "Not now" button dismisses banner
- [ ] Close button (X) dismisses banner
- [ ] Buttons are clickable and respond
- [ ] Clicking buttons doesn't cause errors

### State Management
- [ ] `shouldShow` controls visibility
- [ ] `isDismissed` prevents re-showing
- [ ] `isInstalled` detected correctly
- [ ] `canInstall` reflects app state
- [ ] All states update reactively

### Storage
- [ ] localStorage key is set on dismiss
- [ ] localStorage key is cleared on install
- [ ] Dismissal timestamp is accurate
- [ ] Expiration logic works (7+ days)

### Accessibility
- [ ] Focus moves to banner on show
- [ ] Keyboard navigation works (Tab)
- [ ] ARIA labels read correctly in screen reader
- [ ] High contrast mode displays correctly
- [ ] Reduced motion animations disabled

### Responsive Design
- [ ] Desktop (>640px): Horizontal layout
- [ ] Mobile (<640px): Vertical layout
- [ ] Buttons stack on mobile
- [ ] Text wraps correctly
- [ ] No overflow issues

### Platform Support
- [ ] Chrome/Chromium: Shows Web API prompt
- [ ] Firefox: Gracefully handles missing API
- [ ] Safari: Shows manual instructions
- [ ] iOS Safari: Special banner appears
- [ ] Mobile browsers: Works correctly

### Analytics
- [ ] `pwa_install` event fires on install
- [ ] `pwa_install_dismissed` event fires on dismiss
- [ ] `pwa_ios_manual_install` event fires on iOS button
- [ ] Events appear in Google Analytics

## Performance Testing

### Lighthouse PWA Audit

Run production build:

```bash
npm run build
npm run preview
```

Open Lighthouse in Chrome DevTools:

```
Lighthouse > PWA
```

Should see:
- [x] Installable (no errors)
- [x] Service Worker present
- [x] Manifest present
- [x] Icons present
- [x] Start URL responds offline
- [x] Display mode is standalone
- [x] Theme color matches manifest

### Core Web Vitals

Check that component doesn't negatively impact:
- [x] LCP (Largest Contentful Paint)
- [x] INP (Interaction to Next Paint)
- [x] CLS (Cumulative Layout Shift)

Component itself has minimal impact due to:
- Lazy loading via $effect
- No layout shifts (fixed positioning)
- No heavy JavaScript on initial load

## Debug Commands

### Console Helpers

Add to DevTools console for quick testing:

```javascript
// Clear dismissal and show prompt
(() => {
  localStorage.removeItem('pwa-install-prompt-dismissed');
  location.reload();
})();

// Check PWA readiness
(() => {
  const manifest = !!document.querySelector('link[rel="manifest"]');
  const sw = 'serviceWorker' in navigator;
  const https = location.protocol === 'https:' || location.hostname === 'localhost';
  console.log({
    manifest: manifest ? 'OK' : 'MISSING',
    serviceWorker: sw ? 'OK' : 'NOT SUPPORTED',
    https: https ? 'OK' : 'MISSING'
  });
})();

// Simulate installable state
(() => {
  const event = new Event('beforeinstallprompt');
  event.prompt = () => Promise.resolve();
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
})();

// Check iOS detection
(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  console.log({ isIOS, isSafari, isIOSSafari: isIOS && isSafari });
})();
```

### Chrome DevTools Application Tab

**Service Workers**
- Should show: `/sw.js` with "activated and running"
- Check: Offline support works

**Manifest**
- Should show: All required fields
- Check: Icons are valid

**Local Storage**
- Should show: `pwa-install-prompt-dismissed` after dismissal
- Check: Timestamp is current

**Cache Storage**
- Should show: Cache entries from Service Worker
- Check: Assets are cached

## Mobile Testing

### Android Chrome

1. Build and deploy to HTTPS server
2. Open URL on Android device
3. Chrome should show "Install app" button at top
4. Click button to trigger install
5. App appears on home screen
6. Open from home screen (standalone mode)
7. Verify banner doesn't show

### iOS Safari

1. Build and deploy to HTTPS server
2. Open URL on iOS in Safari (NOT in-app browser)
3. Component detects iOS Safari
4. Shows "Add to Home Screen" banner
5. Tap "How to Install"
6. Instructions appear
7. Follow manual steps in Safari

## Continuous Integration

### Pre-commit Checks

```bash
# Type check
npm run check

# Build
npm run build

# Visual regression (if available)
npm run test:visual
```

### CI/CD Pipeline

```yaml
# Example: GitHub Actions
- name: Build PWA
  run: npm run build

- name: Run Lighthouse
  run: npm run lighthouse

- name: Check PWA Audit
  run: npm run pwa:audit
```

## Troubleshooting

### Banner Never Shows

**Causes:**
1. App already installed (check standalone mode)
2. Service Worker not registered
3. beforeinstallprompt event not firing
4. Dismissal flag in localStorage

**Solutions:**
```javascript
// Check each:
console.log('SW registered:', 'serviceWorker' in navigator);
console.log('Dismissed:', localStorage.getItem('pwa-install-prompt-dismissed'));
console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);

// Clear all and retry
localStorage.removeItem('pwa-install-prompt-dismissed');
location.reload();
```

### Installation Dialog Doesn't Appear

**Causes:**
1. Prompt event not captured
2. Browser doesn't support Web API
3. Installation criteria not met

**Solutions:**
```javascript
// Check if event fired
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired!', e);
});

// Test on supported browser (Chrome 67+)
```

### iOS Banner Not Showing

**Causes:**
1. Not on iOS Safari (simulator sometimes doesn't detect)
2. User agent detection failing
3. Navigator check blocking detection

**Solutions:**
```javascript
// Check detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
console.log({ isIOS, isSafari });

// Use real iOS device for testing
```

### localStorage Not Persisting

**Causes:**
1. Private/Incognito browsing
2. localStorage disabled
3. Storage quota exceeded

**Solutions:**
```javascript
// Test localStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage available');
} catch(e) {
  console.log('localStorage not available:', e);
}
```

## Resources

- [Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [beforeinstallprompt API](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Install API](https://web.dev/articles/install)
- [Chrome PWA Checklist](https://web.dev/articles/pwa-checklist)

## Validation Tools

- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Maskable Icon Editor](https://maskable.app/)
- [PWA Builder](https://www.pwabuilder.com/)
