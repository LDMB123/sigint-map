---
name: M-Series PWA Skills Index
description: Complete index of 8 PWA skills optimized for M-series Apple Silicon Macs with macOS 26.2 and Chromium 143+
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
---

# M-Series PWA Skills - Complete Index

8 comprehensive PWA development skills optimized for Apple Silicon M-series Macs with macOS 26.2 and Chromium 143+.

## Quick Navigation

### 1. PWA Desktop Integration
**File:** `/pwa-desktop-integration.md`

Comprehensive guide to native macOS PWA experiences with Window Controls Overlay, custom title bars, and seamless desktop integration.

**Key Topics:**
- Window Controls Overlay (WCO) with display_override
- CSS title bar customization with env() variables
- macOS Dock integration and app badges
- Translucent title bars and blur effects
- Window management and fullscreen APIs
- Performance optimization for Metal GPU rendering

**Best For:** Building PWAs that feel like native macOS applications with custom UI frameworks integrated into the window frame.

---

### 2. PWA File Handlers
**File:** `/pwa-file-handlers.md`

File system integration enabling PWAs to open files from macOS Finder, register for file types, and access the Origin Private File System (OPFS).

**Key Topics:**
- file_handlers manifest configuration
- LaunchQueue API for handling file opens
- MIME type registration and file associations
- Origin Private File System (OPFS) storage
- OPFS + IndexedDB integration patterns
- Drag and drop file handling
- Large file processing with chunking
- File metadata tracking in IndexedDB

**Best For:** Document editors, image viewers, data processors that need to open files directly from Finder.

---

### 3. PWA Share Target
**File:** `/pwa-share-target.md`

Integration with macOS Share sheets, enabling PWAs to receive shared content from other applications (text, URLs, files, images).

**Key Topics:**
- share_target manifest configuration
- Handling multiple file types in shares
- Service Worker share request handling
- Client-side share processing
- Batch share deduplication
- Share with background sync support
- Notification center integration
- HTML form handling for shared content

**Best For:** Content aggregation apps, note-taking tools, messaging clients that benefit from system-wide sharing.

---

### 4. PWA Protocol Handlers
**File:** `/pwa-protocol-handlers.md`

Custom URL scheme registration (web+appname://) for deep linking and cross-application integration on macOS.

**Key Topics:**
- protocol_handlers manifest entry
- Custom URL scheme design patterns
- URL parameter parsing and routing
- Deep linking with query parameters
- Native app integration (Swift)
- Action-based routing (open, create, edit, delete, search, export, import, sync)
- SecurityConsiderations and input validation
- Launch handler configuration

**Best For:** Apps that need to be invoked from other applications or system services with specific actions and data.

---

### 5. PWA Shortcuts & Quick Actions
**File:** `/pwa-shortcuts.md`

Dock right-click menu items and keyboard shortcuts for quick access to common app actions.

**Key Topics:**
- shortcuts array in manifest
- Dock context menu integration
- Keyboard shortcut implementation
- Command palette UI with fuzzy search
- navigator.keyboard API integration
- Keyboard lock for custom shortcuts
- Shortcut display UI and help modal
- Arrow key navigation in command palette

**Best For:** Productivity apps, developers tools, and any app where users repeatedly perform specific actions.

---

### 6. PWA Badging & Notifications
**File:** `/pwa-badging-notifications.md`

Engagement features including Dock badges, push notifications with rich interactions, and macOS notification center integration.

**Key Topics:**
- navigator.setAppBadge() and clearAppBadge()
- Dock badge display (numbers and flags)
- Push notification subscription workflow
- Notification actions and handling
- VAPID authentication for push
- Notification grouping in Notification Center
- Silent notifications for background updates
- Notification permission UX patterns
- Service Worker push event handlers

**Best For:** Communication apps, productivity tools, and applications that need to keep users informed of important updates.

---

### 7. PWA Offline Resilience
**File:** `/pwa-offline-resilience.md`

Offline-first architecture with Service Worker strategies, Background Sync API, IndexedDB storage, and graceful network degradation.

**Key Topics:**
- Cache-first caching strategy
- Network-first strategy with fallback
- Stale-while-revalidate pattern
- Background Sync API for queued actions
- Periodic Background Sync (24-hour intervals)
- Network status detection and monitoring
- IndexedDB app data storage
- Sync queue with retry logic
- Offline page and error handling
- Service Worker lifecycle management

**Best For:** All PWAs, essential for apps that need to work seamlessly offline and sync changes when reconnected.

---

### 8. PWA Performance Optimization - M-Series
**File:** `/pwa-performance-m-series.md`

Apple Silicon M-series specific optimization with Metal GPU acceleration, unified memory benefits, energy efficiency, and thermal management.

**Key Topics:**
- Metal GPU acceleration for CSS/Canvas
- Unified memory optimization patterns
- Hardware-accelerated transforms and effects
- WebGL/Canvas optimization for M1/M2/M3
- Battery API integration for power modes
- Energy efficient animation techniques
- Thermal state monitoring and throttling
- Background tab throttling
- Wake Lock API for presentations
- Performance monitoring with RUM metrics
- Core Web Vitals tracking (LCP, FID, CLS)
- Scheduler.yield() for main thread optimization

**Best For:** High-performance apps that need to leverage M-series capabilities while maintaining excellent battery life and thermal management.

---

## Implementation Roadmap

### Phase 1: Foundation (Start Here)
1. **Desktop Integration** - Set up native window appearance
2. **Offline Resilience** - Implement caching and sync strategies
3. **Performance Optimization** - Profile and optimize for M-series

### Phase 2: Core Features
4. **File Handlers** - Enable Finder integration
5. **Protocol Handlers** - Support deep linking
6. **Shortcuts** - Add quick actions and keyboard shortcuts

### Phase 3: Engagement
7. **Share Target** - Enable system sharing
8. **Badging & Notifications** - Keep users informed

---

## Technology Stack

### Manifest Configuration
All skills leverage comprehensive Web App Manifest settings:
- `display_override`: ["window-controls-overlay", "standalone", "browser"]
- `protocol_handlers`, `file_handlers`, `share_target`, `shortcuts`
- Optimized icons for macOS (192px, 512px, maskable)
- Custom colors and theme settings

### Service Worker
Central to offline resilience:
- Multiple caching strategies
- Background Sync event handlers
- Push notification listeners
- Periodic sync for data freshness

### IndexedDB (via Dexie.js)
Data persistence layer:
- App data storage (tasks, notes, documents)
- Sync queue for offline actions
- User preferences and settings
- File metadata tracking

### macOS Integration APIs
Native experience features:
- Window Controls Overlay for custom UI
- Badge API for Dock indicators
- LaunchQueue for file opening
- Keyboard API for shortcut handling
- Wake Lock for presentations

---

## Performance Targets for M-series

| Metric | Target | Notes |
|--------|--------|-------|
| Lighthouse PWA Score | 95+ | All checks passing |
| Core Web Vitals (LCP) | <1.2s | M-series optimized |
| First Input Delay (FID) | <100ms | Instant responsiveness |
| Cumulative Layout Shift (CLS) | <0.05 | Stable layout |
| FPS (Animations) | 60-120fps | Metal GPU accelerated |
| Memory Usage | <100MB | Unified memory efficient |
| Battery Impact | Minimal | Background throttling |
| Thermal Profile | Cool | Efficient workload distribution |

---

## Browser Compatibility Matrix

### Chrome/Edge Requirements
| Feature | Min Version | M-series | Notes |
|---------|-------------|---------|-------|
| Window Controls Overlay | 99+ | Yes | Full support |
| File Handlers | 102+ | Yes | LaunchQueue included |
| Share Target | 71+ | Yes | With file support 94+ |
| Protocol Handlers | 99+ | Yes | web+scheme support |
| Shortcuts | 96+ | Yes | Dock integration |
| Badge API | 81+ | Yes | Dock display |
| Push Notifications | 50+ | Yes | Full support |
| Background Sync | 49+ | Yes | Standard support |
| Periodic Sync | 80+ | Yes | On macOS via Chromium 124+ |
| IndexedDB | All | Yes | Type-safe with Dexie 4.x |

### Safari Limitations
As of macOS 26.2, Safari supports:
- Basic PWA installation ✓
- Service Workers ✓
- Window Controls Overlay ✗
- File Handlers ✗
- Share Target ✗
- Protocol Handlers ✗
- Badge API ✗
- Background Sync ✗

**Recommendation:** Develop for Chromium-based browsers for full feature support. Provide graceful degradation for Safari.

---

## Testing Procedures

### macOS DevTools Testing
```bash
# 1. Open Chrome/Edge on macOS
# 2. Install as PWA: Menu > Install macOS App
# 3. Right-click Dock icon > Options

# 4. Enable experimental features:
chrome://flags
# Search and enable:
# - Window Controls Overlay
# - File Handling API
# - Web Share Target
```

### Network Simulation
```javascript
// In DevTools Console:
// Offline: Network tab > Throttling > Offline
// Lie-Fi: Network tab > Throttling > 2G
// Check caching: Application > Cache Storage
```

### Performance Profiling
```bash
# Lighthouse PWA audit:
chrome://inspect > Open DevTools > Lighthouse > PWA

# Performance profiling:
DevTools > Performance tab > Record
# Monitor: FPS, CPU, Memory, Thermal state
```

---

## Integration Examples

### Complete PWA Example: Document Editor
Combining all 8 skills:

```javascript
// 1. Desktop Integration - Custom title bar
// 2. File Handlers - Open .md files from Finder
// 3. Share Target - Receive notes from other apps
// 4. Protocol Handlers - web+editor://open?id=123
// 5. Shortcuts - Cmd+N for new doc
// 6. Badging - Show unsaved changes count
// 7. Offline Resilience - Auto-save to IndexedDB
// 8. Performance - Optimized for M-series with Metal GPU
```

### Architecture Pattern
```
Service Worker (offline resilience)
        ↓
IndexedDB (data persistence)
        ↓
Main App (UI/UX with all integrations)
        ↓
macOS Integration APIs
(desktop, file, share, protocol, shortcuts, badging)
        ↓
Metal GPU Rendering (performance)
```

---

## Troubleshooting Guide

### Common Issues

**Window Controls Overlay not showing?**
- Verify `display_override` in manifest
- Check chrome://flags for WCO enabled
- Ensure PWA is installed as macOS app

**Files not opening in PWA?**
- Verify `file_handlers` in manifest
- Check file associations in System Preferences
- Test with LaunchQueue in DevTools

**Push notifications not working?**
- Verify VAPID keys are correct
- Check notification permission granted
- Monitor Service Worker in DevTools

**Offline sync not triggering?**
- Verify Background Sync registered
- Check IndexedDB has sync queue items
- Test with DevTools: Network > Offline > go online

**Poor performance on M-series?**
- Profile with DevTools Performance tab
- Check for layout thrashing and paint operations
- Enable GPU acceleration: will-change, transform

---

## References & Resources

### W3C Specifications
- [Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [Service Workers](https://w3c.github.io/ServiceWorker/)
- [Push API](https://w3c.github.io/push-api/)
- [Background Sync](https://wicg.github.io/background-sync/)
- [IndexedDB](https://w3c.github.io/IndexedDB/)

### macOS PWA Documentation
- [Apple PWA Guide](https://developer.apple.com/documentation/webkit/pwa)
- [Web on macOS](https://webkit.org/blog/13399/webkit-features-in-safari-16-1/)

### Performance Optimization
- [Core Web Vitals](https://web.dev/vitals/)
- [Performance API](https://w3c.github.io/perf-timing-primer/)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)

### Apple Silicon Optimization
- [Apple Silicon Developer](https://developer.apple.com/apple-silicon/)
- [Metal GPU Programming](https://developer.apple.com/metal/)

---

## Next Steps

1. **Review each skill** - Start with Desktop Integration
2. **Choose your PWA type** - Productivity, content, communication
3. **Select relevant skills** - Not all apps need all features
4. **Implement incrementally** - Desktop first, then engagement
5. **Test thoroughly** - DevTools, offline simulation, macOS specifics
6. **Monitor performance** - Use RUM and Lighthouse
7. **Gather user feedback** - Native-like experience is goal

---

## Support & Questions

Each skill document includes:
- ✓ Complete code examples
- ✓ Manifest configurations
- ✓ Testing procedures
- ✓ Browser compatibility
- ✓ Troubleshooting guides
- ✓ Performance optimization tips
- ✓ Security considerations
- ✓ References and specifications

For specific questions about any skill, refer to the detailed documentation file and cross-reference with the other related skills.

---

Created: January 21, 2026
Target Platform: Apple Silicon M-series (M1, M2, M3+)
macOS Version: 26.2+
Chromium Version: 143+
