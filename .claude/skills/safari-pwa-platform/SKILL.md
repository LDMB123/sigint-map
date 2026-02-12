---
name: safari-pwa-platform
description: >
  Expert in Safari 26.0-26.2 PWA and platform features including zero-manifest
  web apps on iOS, Service Worker improvements, View Transitions, CHIPS cookies,
  WebSocket over HTTP/2-3, Web Extensions, Content Blockers, SwiftUI WebView,
  and device management. Use for building Progressive Web Apps targeting Safari,
  iOS Home Screen apps, or Safari extension development.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
disable-model-invocation: false
---

# Safari 26.0-26.2 PWA & Platform Skill

Expert knowledge of Progressive Web App, extension, and platform features in Safari 26.0 and 26.2.

## Zero-Manifest Web Apps (26.0 - iOS/iPadOS)

**Every website added to Home Screen opens as a web app by default.**

No manifest, no meta tags required. Users can toggle back to "Open in Safari" if preferred.

```html
<!-- Minimal PWA - this is now enough on iOS 26+ -->
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <h1>This is a web app on iOS 26+</h1>
</body>
</html>
```

### Enhanced with Manifest (optional)
```json
{
  "name": "My PWA",
  "short_name": "PWA",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon.svg", "type": "image/svg+xml" }
  ]
}
```

### SVG Icons (26.0)
Safari now supports SVG favicons and interface icons:
```html
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="data:image/svg+xml,<svg>...</svg>">
```

## Service Worker Improvements (26.2)

### Async URL Error Handling
```js
// 26.2: URL errors in fetch handlers are now catchable
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch((error) => {
      // Async URL errors now properly propagate here
      console.error('Fetch failed:', error);
      return caches.match('/offline.html');
    })
  );
});
```

### Service Worker Debugging (26.0 - Web Inspector)
- Automatic inspection via "Inspect Apps and Devices"
- Pause on registration
- Per-worker breakpoints and profiling
- Timeline tab attribution per worker

## CHIPS - Partitioned Cookies (26.2)

Cross-site cookies isolated per top-level site:

```http
HTTP/1.1 200 OK
Set-Cookie: widget_session=abc123; SameSite=None; Secure; Partitioned
```

### Use Cases
- Embedded payment widgets
- Third-party chat widgets
- Social media embed state
- Analytics that respect privacy

### Rules
- Must include `SameSite=None; Secure; Partitioned`
- Partitioned by top-level site (scheme + eTLD+1)
- Each embedding site gets its own cookie jar
- Works with Safari's ITP (Intelligent Tracking Prevention)

## View Transitions (26.2)

```js
// Active transition access
if (document.activeViewTransition) {
  console.log('Transition in progress');
}

// Basic same-document transition
document.startViewTransition(async () => {
  // Update DOM
  await updateContent();
});
```

## WebSocket over HTTP/2 & HTTP/3 (26.0)

```js
// WebSockets now upgrade over HTTP/2 and HTTP/3 automatically
// No code changes needed - Safari handles protocol negotiation
const ws = new WebSocket('wss://example.com/socket');

// Benefits:
// - Multiplexed with other HTTP requests on same connection
// - Better performance on HTTP/3 (QUIC)
// - Reduced connection overhead
```

## Networking: dns-prefetch (26.0 - iOS/iPadOS/visionOS)

```html
<!-- DNS lookup hints now work on mobile Safari -->
<link rel="dns-prefetch" href="//api.example.com">
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="dns-prefetch" href="//fonts.googleapis.com">
```

## Web Extensions

### Safari 26.0 Features
```js
// Web-based packager for TestFlight/App Store distribution
// Commands menu integration (macOS/iPadOS)
// SafariDriver support for automated extension testing

// Shadow DOM access
const shadowRoot = browser.dom.openOrClosedShadowRoot(element);
```

### Safari 26.2 Features
```js
// Check if extension is enabled
const state = await SFSafariExtensionManager.stateOfExtension(bundleId);
if (state.isEnabled) {
  // Extension is active
}

// Deep link to extension settings
SFSafariSettings.openExtensionsSettings();

// Simplified version retrieval
const version = browser.runtime.getVersion(); // synchronous

// Automatic permission migration from app extensions
// Private Browsing settings migration
```

### Extension Commands (26.0)
```json
{
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Toggle feature"
    }
  }
}
```

## Content Blockers (26.0)

```json
[
  {
    "trigger": {
      "url-filter": "tracker\\.js",
      "unless-frame-url": ["example\\.com"],
      "request-method": ["GET"]
    },
    "action": {
      "type": "block"
    }
  }
]
```

New fields:
- `unless-frame-url`: Exempt specific frame URLs
- `request-method`: Filter by HTTP method
- `isContentRuleListRedirect`: Detect redirect from content rules

## SwiftUI WebView Integration (26.0)

```swift
import SwiftUI
import WebKit

struct ContentView: View {
    @State private var page = WebPage()

    var body: some View {
        WebView(page)
            .onAppear {
                page.load(URLRequest(url: URL(string: "https://example.com")!))
            }
    }
}

// Observable page state
class CustomPage: WebPage, NavigationDeciding, DialogPresenting {
    func decidePolicyFor(_ action: NavigationAction) -> NavigationPolicy {
        // Custom navigation handling
        return .allow
    }

    func presentDialog(_ dialog: WebDialog) {
        // Custom dialog presentation
    }
}

// Custom URL scheme handling
struct MySchemeHandler: URLSchemeHandler {
    func handle(_ request: URLRequest) async throws -> (Data, URLResponse) {
        // Handle custom://... URLs
        let data = loadLocalContent(for: request.url!)
        let response = URLResponse(url: request.url!, mimeType: "text/html",
                                    expectedContentLength: data.count,
                                    textEncodingName: "utf-8")
        return (data, response)
    }
}
```

### SwiftUI Transferable (26.2)
```swift
// New export types for web content
// .png, .flatRTFD, .rtf, .utf8PlainText
```

## WebKit Native API Features (26.0)

- **Screen Time support**: Parental controls integration
- **Storage restoration**: `localStorage`/`sessionStorage` persistence APIs
- **`backdrop-filter`**: Apply to content behind transparent WebView
- **`obscuredContentInsets`**: Declare UI-obscured regions

### Deprecations
- `WKProcessPool` (deprecated)
- `WKSelectionGranularity` (deprecated)

## Security & Privacy (26.0)

### Fingerprinting Prevention
Safari blocks known fingerprinting scripts from:
- Accessing device characteristics
- Setting persistent storage
- Reading navigational state

### Lockdown Mode
- Safe Font Parser evaluates web fonts in secure sandbox
- Blocks potentially dangerous font features

### Integrity-Policy Header
```http
Integrity-Policy: enforce script
```

### Google Safe Browsing v5
Updated threat detection with v5 protocol support.

## UA String Changes (26.0)

```
// iOS 26+ freezes OS version in UA string
// Don't rely on UA string for iOS version detection
// Use feature detection instead

// Old: Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)
// New: Frozen version number regardless of actual iOS version
```

## Device Management (26.0)

- Managed bookmarks folder
- Managed new tab/window page options:
  - Homepage
  - Blank page
  - Extension new tab page

## Feature Detection Patterns

```js
// Zero-manifest PWA detection
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

// Service Worker
if ('serviceWorker' in navigator) { /* supported */ }

// View Transitions
if ('startViewTransition' in document) { /* supported */ }

// CHIPS support (check via Set-Cookie behavior)
// No direct JS API - server must set Partitioned attribute

// WebSocket over HTTP/2-3 (transparent, no detection needed)
```

## PWA Checklist for Safari 26

### Minimum (works with zero-manifest on iOS 26)
- [x] Responsive viewport meta tag
- [x] HTTPS

### Recommended
- [ ] Web App Manifest with icons
- [ ] Service Worker for offline support
- [ ] SVG favicon
- [ ] `theme-color` meta tag
- [ ] `dns-prefetch` for critical origins

### Advanced
- [ ] CHIPS for cross-site embedded state
- [ ] Trusted Types for XSS prevention
- [ ] Navigation API for SPA routing
- [ ] View Transitions for smooth page changes
- [ ] Event Timing + LCP monitoring
