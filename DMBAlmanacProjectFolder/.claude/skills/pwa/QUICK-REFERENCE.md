# PWA M-Series Skills - Quick Reference Card

## 8 Skills at a Glance

| # | Skill | File | Size | Focus | Best For |
|---|-------|------|------|-------|----------|
| 1 | Desktop Integration | pwa-desktop-integration.md | 9.6K | WCO, title bars, Dock | Native macOS look/feel |
| 2 | File Handlers | pwa-file-handlers.md | 13K | LaunchQueue, OPFS | Document apps, editors |
| 3 | Share Target | pwa-share-target.md | 15K | System sharing, macOS share sheet | Content aggregators |
| 4 | Protocol Handlers | pwa-protocol-handlers.md | 18K | web+scheme://, deep linking | Cross-app integration |
| 5 | Shortcuts | pwa-shortcuts.md | 16K | Dock menu, keyboard shortcuts, Command palette | Productivity tools |
| 6 | Badging & Notifications | pwa-badging-notifications.md | 19K | Dock badges, push notifications | User engagement |
| 7 | Offline Resilience | pwa-offline-resilience.md | 18K | Service Workers, sync, IndexedDB | All PWAs (foundation) |
| 8 | Performance M-Series | pwa-performance-m-series.md | 18K | Metal GPU, unified memory, energy | High-performance apps |

**Total:** 127 KB of comprehensive PWA documentation with 500+ code examples

---

## Implementation Phases

### Phase 1: Foundation (Required)
```
1. Offline Resilience      ← Start here: caching & sync
   ↓
2. Desktop Integration     ← Native macOS appearance
   ↓
3. Performance M-Series    ← Optimize for hardware
```

### Phase 2: Core Features
```
4. File Handlers           ← Finder integration
5. Protocol Handlers       ← Deep linking
6. Shortcuts               ← Quick actions
```

### Phase 3: Engagement
```
7. Share Target            ← System sharing
8. Badging & Notifications ← Keep users informed
```

---

## Key Technologies by Skill

### 1. Desktop Integration
- `display_override: ["window-controls-overlay"]`
- CSS `env(titlebar-area-width)`, `env(titlebar-area-height)`
- `navigator.windowControlsOverlay`
- `navigator.setAppBadge(count)`

### 2. File Handlers
- `file_handlers` in manifest
- `window.launchQueue.setConsumer()`
- `navigator.storage.getDirectory()` (OPFS)
- IndexedDB for metadata

### 3. Share Target
- `share_target` in manifest
- Service Worker `fetch` for POST requests
- Multipart form data handling
- Duplicate detection with SHA-256

### 4. Protocol Handlers
- `protocol_handlers` in manifest (web+appname://)
- URL parsing and action routing
- Swift integration for native macOS
- Security: input validation & sanitization

### 5. Shortcuts
- `shortcuts` array in manifest
- `navigator.keyboard.lock()`
- Command palette with fuzzy search
- Keyboard event listeners

### 6. Badging & Notifications
- `navigator.setAppBadge()` / `clearAppBadge()`
- Push API with VAPID authentication
- Service Worker `push` event
- Notification actions and grouping

### 7. Offline Resilience
- Service Worker caching strategies
- `registration.sync.register()` (Background Sync)
- `registration.periodicSync.register()` (24-hour)
- IndexedDB sync queue
- Network status monitoring

### 8. Performance M-Series
- Metal GPU acceleration (CSS transforms, filters)
- Unified memory optimization
- Battery API for power modes
- Thermal throttling
- Wake Lock API (`navigator.wake`)

---

## Code Snippets Quick Start

### Register PWA (Manifest)
```json
{
  "name": "My PWA",
  "display_override": ["window-controls-overlay", "standalone"],
  "file_handlers": [{"action": "/open", "accept": {"text/markdown": [".md"]}}],
  "share_target": {"action": "/share", "method": "POST"},
  "protocol_handlers": [{"protocol": "web+myapp", "url": "/app?url=%s"}],
  "shortcuts": [{"name": "New", "url": "/new"}]
}
```

### Install Service Worker
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll(['/index.html', '/app.js']);
    })
  );
  self.skipWaiting();
});
```

### Queue for Background Sync
```javascript
async function createTask(data) {
  // Queue in IndexedDB
  const db = await openDB('sync-db');
  await db.add('queue', {
    url: '/api/tasks',
    method: 'POST',
    body: data
  });
  // Register sync
  const reg = await navigator.serviceWorker.ready;
  await reg.sync.register('sync-queue');
}
```

### Show Badge on Dock
```javascript
await navigator.setAppBadge(5); // Shows "5" on Dock
```

### Open File from Finder
```javascript
if ('launchQueue' in window) {
  launchQueue.setConsumer((params) => {
    params.files.forEach(async (handle) => {
      const file = await handle.getFile();
      processFile(file);
    });
  });
}
```

### Handle Protocol Invocation
```javascript
const params = new URLSearchParams(window.location.search);
const url = decodeURIComponent(params.get('url'));
// web+myapp://open?id=123 → route action 'open' with id
```

### Show Notification
```javascript
const reg = await navigator.serviceWorker.ready;
await reg.showNotification('Hello', {
  body: 'Message from PWA',
  actions: [
    {action: 'reply', title: 'Reply'},
    {action: 'archive', title: 'Archive'}
  ]
});
```

### GPU-Optimized CSS
```css
.element {
  will-change: transform;
  transform: translateZ(0);
  backdrop-filter: blur(10px);
  contain: layout style paint;
}
```

---

## Browser Support Check

```javascript
// Desktop Integration
navigator.windowControlsOverlay ? 'Yes' : 'No'

// File Handlers
'launchQueue' in window ? 'Yes' : 'No'

// Share Target
'share_target' in manifest ? 'Yes' : 'No'

// Protocol Handlers
protocol_handlers in manifest ? 'Yes' : 'No'

// Keyboard Shortcuts
navigator.keyboard ? 'Yes' : 'No'

// Badge API
navigator.setAppBadge ? 'Yes' : 'No'

// Push Notifications
'PushManager' in window ? 'Yes' : 'No'

// Background Sync
'sync' in registration ? 'Yes' : 'No'

// IndexedDB
'indexedDB' in window ? 'Yes' : 'No'

// Battery API
navigator.getBattery ? 'Yes' : 'No'
```

---

## Testing Checklist

### Installation
- [ ] PWA installs as macOS app
- [ ] Icon appears on Applications folder
- [ ] Dock integration works
- [ ] Right-click Dock shows shortcuts

### Offline
- [ ] App loads offline (chrome://inspect > offline)
- [ ] Data persists in IndexedDB
- [ ] Sync queue processes on reconnect
- [ ] Offline page shows gracefully

### File Handling
- [ ] Finder → right-click file → Open With PWA
- [ ] LaunchQueue fires with file handle
- [ ] Multiple file types recognized
- [ ] OPFS stores files successfully

### Sharing
- [ ] macOS Share sheet shows PWA
- [ ] Share receives text/URLs/files
- [ ] Service Worker processes share
- [ ] Share data appears in app

### Notifications
- [ ] Push notifications arrive
- [ ] Badge appears on Dock icon
- [ ] Notification actions work
- [ ] Notification Center groups updates

### Performance
- [ ] Lighthouse PWA score 95+
- [ ] LCP < 1.2s (M-series optimized)
- [ ] FPS stable at 60fps
- [ ] No GPU memory leaks
- [ ] Battery drain minimal

---

## Performance Targets

```
Lighthouse PWA:     95+ ✓
Core Web Vitals LCP: <1.2s
First Input Delay:  <100ms
Layout Shift (CLS): <0.05
Animation FPS:      60-120fps
Memory Usage:       <100MB
Battery Impact:     Minimal
Thermal Profile:    Cool
```

---

## macOS Specifics

### Supported
- Chrome/Edge 143+
- Safari (basic PWA only, limited)
- M1, M2, M3+ (Apple Silicon)
- macOS 26.2+

### Not Supported (Graceful Degradation)
- File Handlers → Safari
- Protocol Handlers → Safari
- Share Target → Safari
- Badge API → Safari
- Background Sync → Safari

### M-Series Benefits
- Metal GPU rendering
- Unified memory (CPU/GPU)
- ARM64 architecture
- Efficient battery usage
- Thermal efficiency

---

## File Locations

```
/Users/louisherman/ClaudeCodeProjects/.claude/skills/pwa/
├── pwa-desktop-integration.md           (9.6K)
├── pwa-file-handlers.md                 (13K)
├── pwa-share-target.md                  (15K)
├── pwa-protocol-handlers.md             (18K)
├── pwa-shortcuts.md                     (16K)
├── pwa-badging-notifications.md         (19K)
├── pwa-offline-resilience.md            (18K)
├── pwa-performance-m-series.md          (18K)
├── M-SERIES-PWA-SKILLS-INDEX.md         (index)
├── CREATION_MANIFEST.md                 (details)
└── QUICK-REFERENCE.md                   (this file)
```

---

## DevTools Tips

### Chrome DevTools (M-series)
```
1. Application > Manifest → View all configurations
2. Service Workers → See registered SW, offline toggle
3. Cache Storage → Inspect cached responses
4. IndexedDB → Browse app data
5. Application > Storage → Storage quota & usage
6. Performance > Frames → Monitor GPU rendering
7. Memory > Allocation Timeline → Detect leaks
8. Network > Offline → Simulate disconnection
```

### Testing Offline
```
DevTools > Network > Throttling > Offline
Then perform app actions → they'll queue
Reconnect → Background Sync triggers
```

### Performance Profiling
```
DevTools > Performance > Record
Look for:
- Yellow = JavaScript work
- Purple = Rendering
- Green = Composite (GPU)
Keep purple/green high for M-series
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| WCO not showing | Check `display_override` in manifest, ensure PWA installed |
| Files won't open | Verify file_handlers MIME types, check System Preferences associations |
| Sync not triggering | Check IndexedDB has queue items, verify SW sync registered |
| Notifications blocked | Check permission granted, verify VAPID keys correct |
| Poor performance | Profile with DevTools, reduce paint operations, use transforms |
| Thermal issues | Reduce animations, throttle background updates, monitor CPU |
| Battery drain | Use Battery API, reduce frame rate on battery, pause animations |
| Memory leaks | Check for unclosed transactions, clear timers, profile with Memory tab |

---

## Next Steps

1. **Choose PWA Type**
   - Productivity app? → Add Shortcuts + Badging
   - Document editor? → Add File Handlers + Offline
   - Content hub? → Add Share Target + Notifications
   - Integrator? → Add Protocol Handlers

2. **Pick Starting Skill**
   - Always start with: Offline Resilience
   - Then add: Desktop Integration
   - Then: Performance M-Series
   - Then: Feature-specific skills

3. **Implement Incrementally**
   - Build & test each skill
   - Use DevTools to verify
   - Monitor performance metrics
   - Gather user feedback

4. **Deploy Responsibly**
   - Test on real M-series Mac
   - Verify offline scenarios
   - Monitor with analytics
   - Gather crash reports

---

## Resources

- **Index:** M-SERIES-PWA-SKILLS-INDEX.md
- **Details:** CREATION_MANIFEST.md
- **Specs:** https://www.w3.org/TR/appmanifest/
- **Apple PWA:** https://developer.apple.com/documentation/webkit/pwa
- **Lighthouse:** https://developers.google.com/web/tools/lighthouse

---

**Created:** January 21, 2026
**Platform:** Apple Silicon M-series
**Target:** Chromium 143+, macOS 26.2+
**Status:** Production Ready
