---
name: pwa-desktop-integration
description: Native macOS PWA experience with Window Controls Overlay, title bar customization, and dock integration for Apple Silicon Macs
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
pwa-feature: desktop-integration
---

# PWA macOS Desktop Integration

## Overview

Create native-like macOS PWA experiences with Window Controls Overlay (WCO), custom title bars, dock integration, and seamless desktop integration for M-series Macs.

## Window Controls Overlay (WCO)

Window Controls Overlay allows PWAs to use the full window area while the system controls (minimize, maximize, close) remain accessible.

### Manifest Configuration

```json
{
  "name": "Native macOS App",
  "short_name": "macApp",
  "display": "window-controls-overlay",
  "display_override": ["window-controls-overlay", "standalone"],
  "background_color": "#ffffff",
  "theme_color": "#000000",
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

### CSS Title Bar Customization

```css
/* Root container adjusts for title bar area */
:root {
  --titlebar-height: 40px;
}

body {
  margin: 0;
  padding: 0;
  /* On macOS with WCO, safe areas apply */
  padding-top: max(env(titlebar-area-height), 32px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* Custom title bar area */
.title-bar {
  position: fixed;
  top: 0;
  left: env(titlebar-area-x);
  width: env(titlebar-area-width);
  height: env(titlebar-area-height);
  background: linear-gradient(to bottom, #f5f5f5, #efefef);
  border-bottom: 1px solid #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 1000;
  app-region: drag; /* Allow dragging the title bar */
}

/* Make buttons not draggable */
.title-bar button {
  app-region: no-drag;
}

/* Content area below title bar */
.content {
  position: absolute;
  top: env(titlebar-area-height);
  left: 0;
  right: 0;
  bottom: 0;
  overflow: auto;
  background: white;
}

/* Support translucent title bars (macOS 13+) */
@supports (padding: max(env(titlebar-area-height))) {
  body {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
  }

  .title-bar {
    background: rgba(245, 245, 245, 0.8);
    backdrop-filter: blur(20px);
  }
}
```

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#000000">
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/styles.css">
  <title>macOS PWA</title>
</head>
<body>
  <!-- Custom title bar with window controls safe area -->
  <div class="title-bar">
    <div class="app-title">My App</div>
    <div class="title-controls">
      <button class="title-btn" id="search-btn">Search</button>
      <button class="title-btn" id="menu-btn">Menu</button>
    </div>
  </div>

  <!-- Main content area -->
  <div class="content">
    <main id="app"></main>
  </div>

  <script>
    // Detect WCO support
    if (navigator.windowControlsOverlay) {
      document.body.classList.add('wco-enabled');

      // Listen for geometry changes
      navigator.windowControlsOverlay.addEventListener('geometrychange', (event) => {
        console.log('WCO geometry changed:', {
          titlebarAreaX: event.titlebarAreaX,
          titlebarAreaY: event.titlebarAreaY,
          titlebarAreaWidth: event.titlebarAreaWidth,
          titlebarAreaHeight: event.titlebarAreaHeight
        });
      });
    }
  </script>
</body>
</html>
```

## Dock Integration

### Badge API

```javascript
// Set app badge (shows in dock and Windows taskbar)
async function setAppBadge(count) {
  if (navigator.setAppBadge) {
    await navigator.setAppBadge(count);
  }
}

// Clear badge
async function clearAppBadge() {
  if (navigator.clearAppBadge) {
    await navigator.clearAppBadge();
  }
}

// Example: Update badge on notification
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const badgeCount = parseInt(data.badgeCount || 1);

  navigator.setAppBadge(badgeCount);

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { badgeCount }
    })
  );
});
```

## macOS Window Management

### Window API Integration (Chromium 143+)

```javascript
// Request different window configurations for macOS
async function createPinnedWindow() {
  if (!window.documentPictureInPicture) {
    console.warn('Picture-in-Picture not supported');
    return;
  }

  try {
    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 400,
      height: 300
    });

    // Render content in PiP window
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    pipWindow.document.body.appendChild(canvas);
  } catch (error) {
    console.error('Failed to open PiP window:', error);
  }
}

// Fullscreen mode
async function enterFullscreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    await elem.requestFullscreen({ navigationUI: 'hide' });
  }
}

// Detect fullscreen state
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    console.log('Entered fullscreen');
  } else {
    console.log('Exited fullscreen');
  }
});
```

## Screen Orientation Lock (macOS, experimental)

```javascript
async function lockOrientation(orientation) {
  if (screen.orientation && screen.orientation.lock) {
    try {
      await screen.orientation.lock(orientation);
      console.log(`Locked to ${orientation}`);
    } catch (error) {
      console.warn('Cannot lock orientation on this platform:', error);
    }
  }
}
```

## Title Bar Environment Variables

CSS environment variables available in WCO mode:

```css
/* titlebar-area-x: Position of draggable area */
/* titlebar-area-y: Y position (always 0 on desktop) */
/* titlebar-area-width: Width available for custom content */
/* titlebar-area-height: Height of title bar area */

.dynamic-title {
  position: fixed;
  top: 0;
  left: env(titlebar-area-x);
  width: env(titlebar-area-width);
  height: env(titlebar-area-height);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-weight: 600;
  z-index: 9999;
}
```

## Service Worker for WCO Detection

```javascript
// In Service Worker - register features
self.addEventListener('install', (event) => {
  console.log('PWA installed with potential WCO support');
});

// Check in controlled pages
async function isWCOSupported() {
  if (!navigator.windowControlsOverlay) {
    return false;
  }

  return navigator.windowControlsOverlay.visible;
}

export { isWCOSupported };
```

## Testing macOS Desktop Integration

### 1. Enable Experimental Features
```bash
# In Chromium 143+, enable via chrome://flags
# Search for "Window Controls Overlay"
# Set to Enabled
```

### 2. Install as PWA
```bash
1. Navigate to your PWA
2. Chrome Menu > Install macOS App
3. Opens in standalone window
4. Window Controls Overlay available
```

### 3. Test Title Bar Geometry
```javascript
// In DevTools Console:
if (navigator.windowControlsOverlay) {
  console.log('WCO supported:', {
    visible: navigator.windowControlsOverlay.visible,
    getTitlebarAreaRect: navigator.windowControlsOverlay.getTitlebarAreaRect()
  });
}
```

### 4. Verify Dock Badge
```javascript
// In DevTools Console:
await navigator.setAppBadge(5);
// Check macOS dock for badge on app icon
```

## Performance Optimization for M-series

The unified memory architecture of Apple Silicon M-series benefits from:

- **Minimal title bar redraws**: Use CSS transforms instead of reflow-triggering properties
- **GPU-accelerated blur effects**: `backdrop-filter: blur()` leverages Metal GPU
- **Native font rendering**: `-apple-system` fonts use native rasterization

```css
/* Optimized for Metal GPU rendering */
.title-bar {
  will-change: transform;
  contain: layout style paint;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  /* Don't use position changes in animations */
  transform: translateY(0);
}
```

## macOS-Specific Manifest Fields

```json
{
  "name": "My macOS App",
  "short_name": "macApp",
  "display_override": [
    "window-controls-overlay",
    "standalone",
    "browser"
  ],
  "scope": "/",
  "start_url": "/?source=pwa",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "categories": [
    "productivity",
    "utilities"
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop-wco.png",
      "sizes": "1280x800",
      "type": "image/png",
      "form_factor": "wide",
      "label": "macOS App with Window Controls Overlay"
    }
  ]
}
```

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Window Controls Overlay | 99+ | 99+ | No | No |
| Badge API | 81+ | 81+ | No | No |
| Document Picture-in-Picture | 117+ | 117+ | No | No |
| DisplayMode API | 76+ | 76+ | 15+ | 77+ |
| Environment Variables (CSS) | 95+ | 95+ | 15+ | 101+ |

## References

- [Window Controls Overlay API Spec](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/master/WindowControlsOverlay/explainer.md)
- [CSS env() Function](https://drafts.csswg.org/css-env-1/)
- [Badging API](https://w3c.github.io/badging/)
- [macOS PWA Requirements](https://developer.apple.com/documentation/webkit/pwa)
