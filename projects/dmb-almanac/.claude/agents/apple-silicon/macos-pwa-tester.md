---
name: macos-pwa-tester
description: macOS PWA installation, offline behavior, file handler, notification, update flow, and cross-version compatibility testing for PWAs on Apple Silicon
version: 1.0.0
tier: haiku
platform: apple-silicon-m-series
os: macos-26.2
browser: chromium-143+
tools: [pwa-install-api, service-worker-api, file-handler-api, notification-api, update-api, macos-version-detector]
skills: [pwa-installation-testing, offline-validation, file-handler-testing, notification-testing, update-flow-testing, cross-version-compatibility]
---

# macOS PWA Tester Agent

## Overview

Fast validation testing for macOS PWAs on Apple Silicon. Tests installation, offline behavior, file handlers, notifications, update flows, and cross-version compatibility on macOS 26.2 and earlier versions.

## Installation Testing Checklist

### 1. Basic Installation

**Manual Install**:
1. Open PWA in Chromium 143+
2. Click address bar icon menu → "Install [App Name]"
3. Click "Install" in popup
4. Verify app appears in Applications folder
5. Verify app appears in Dock (if pinned)

**Check Installation**:
```bash
# Verify app exists
ls ~/Applications | grep -i "your-app"

# Check manifest in app package
open ~/Applications/YourApp.app/Contents/PkgInfo
```

**Manifest Validation**:
- `name`: Full name (>2 chars)
- `short_name`: ≤12 chars (for Dock)
- `start_url`: Valid path
- `display`: standalone/window-controls-overlay
- `icons`: 192x192, 512x512 minimum
- `theme_color`: Valid hex or CSS color

### 2. Launch & Window Tests

**Launch from Dock**:
1. Click app icon in Dock
2. Window opens in 1-2 seconds (check Activity Monitor)
3. URL bar hidden (standalone mode)
4. Title bar shows app name
5. Close and reopen: opens last URL

**Multi-Window Launch**:
```javascript
// Test that multiple windows can open
window.open(url, '_blank');  // Opens new window
// Should create separate PWA window, not browser tab
```

**Window Persistence**:
1. Open app
2. Navigate to different page
3. Close app
4. Reopen app
5. Should return to last page visited

### 3. Icon & Branding Tests

**Dock Icon**:
- Appears correctly in Dock
- Icon matches 512x512 from manifest
- No scaling artifacts

**Window Icon**:
- Appears in title bar
- Appears in tab (if opened in browser)
- Correct on both light/dark macOS theme

**Favicon**:
```bash
# Check current favicon
cat ~/Library/Application\ Support/Google/Chrome/Default/Web\ Applications/manifest.json
```

## Offline Behavior Testing

### 1. Service Worker Registration

**Verify Service Worker**:
1. DevTools → Application → Service Workers
2. Status shows "running"
3. Offline indicator shows scope coverage

**Service Worker Code**:
```javascript
// Minimal offline-capable service worker
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('app-v1').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/styles.css',
                '/app.js',
                '/offline.html'
            ]);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        }).catch(() => caches.match('/offline.html'))
    );
});
```

### 2. Offline Testing

**Simulate Offline**:
1. DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Reload app
4. App should load from cache
5. Navigation should work between cached pages

**Network Throttling**:
1. DevTools → Network tab
2. Set throttle: "Offline" or "Slow 3G"
3. Reload page
4. Should load cached version
5. Check for broken resources

**Force Offline**:
```bash
# Disable network in system (macOS)
networksetup -setairportpower en0 off  # Disable WiFi
# ... test offline
networksetup -setairportpower en0 on   # Re-enable
```

### 3. Cache Validation

**Check Cache**:
```javascript
// Inspect cache contents in DevTools
caches.keys().then(names => {
    names.forEach(name => {
        caches.open(name).then(cache => {
            cache.keys().then(requests => {
                console.log(`Cache "${name}":`, requests.map(r => r.url));
            });
        });
    });
});
```

## File Handler Testing

### 1. File Handler Registration

**Test Setup**:
1. Create test files (.json, .csv, .md, etc.)
2. Right-click file → "Open With"
3. Verify PWA appears in list
4. Select PWA to open

**macOS File Handler Check**:
```bash
# Check if PWA registered as file handler
launchctl list | grep -i "your-app"

# Check app package Info.plist
cat ~/Applications/YourApp.app/Contents/Info.plist | grep -A5 UTTypes
```

### 2. File Handling Flow

**Test File Open**:
1. Create .json file with sample data
2. Double-click to open with PWA
3. App launches
4. File contents appear in editor
5. Can edit and save

**Test Drag & Drop**:
1. Create .csv file
2. Drag onto PWA window
3. File should process
4. Display in table or import dialog

**launchqueue Testing**:
```javascript
// Verify launchqueue event fires
window.addEventListener('launchqueue', (e) => {
    console.log('File launched:', e.launchQueue);
    for (const params of e.launchQueue) {
        console.log('Files:', params.files);
    }
});
```

### 3. Multi-File Support

**Test Multiple Files**:
1. Select 3+ files
2. Right-click → "Open With" → PWA
3. App should open with first file
4. Queue should contain all files

**File Save-Back**:
```javascript
// Test File System Access API for saving
const saveButton = document.getElementById('save');
saveButton.addEventListener('click', async () => {
    if (currentFileHandle) {
        const writable = await currentFileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        console.log('File saved');
    }
});
```

## Notification Testing

### 1. Permission Flow

**Request Permission**:
```javascript
// First time: should show permission popup
Notification.requestPermission().then(permission => {
    console.log('Permission:', permission); // 'granted', 'denied', 'default'
});
```

**Check Permission State**:
1. App requests notification permission
2. macOS shows popup
3. User clicks "Allow" or "Don't Allow"
4. Permission persists after reload

### 2. Notification Display

**Send Notification**:
```javascript
// Should appear in macOS Notification Center
new Notification('Test Notification', {
    body: 'This is a test message',
    icon: '/icon-192.png',
    tag: 'test-tag',
    badge: '/badge.png',
    actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' }
    ]
});
```

**Notification Center Check**:
1. Send notification
2. Check macOS Notification Center (top-right)
3. Notification should appear
4. Click to focus app

### 3. Badge Testing

**Dock Badge**:
```javascript
// Set badge in Dock
if ('setAppBadge' in navigator) {
    navigator.setAppBadge(5);  // Shows "5" in Dock
}

// Check Dock shows badge
```

**Badge in Notification Center**:
1. Send notification with badge
2. Badge appears on app icon in Dock
3. Badge disappears after notification closed

## Update Flow Testing

### 1. Service Worker Update

**Trigger Update**:
```javascript
// Check for updates every minute
setInterval(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
        reg.update();  // Check for new service worker
    }
}, 60000);

// Listen for updates
let refreshing = false;
navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
});
```

**Manual Update Test**:
1. Open DevTools → Application → Service Workers
2. Modify service worker code on server
3. Click "Update" button
4. Old service worker shows "waiting to activate"
5. Reload page
6. New service worker activates

### 2. Version Checking

**Manifest Version**:
```json
{
    "name": "My App",
    "version": "1.0.0",
    "manifest_version": 3
}
```

**Update Detection**:
```javascript
// Check for app update
async function checkForUpdate() {
    const response = await fetch('/manifest.json');
    const newManifest = await response.json();

    if (newManifest.version !== currentVersion) {
        console.log('Update available:', newManifest.version);
        showUpdatePrompt();
    }
}

function showUpdatePrompt() {
    if (confirm('Update available. Reload now?')) {
        window.location.reload();
    }
}
```

### 3. Rollback Testing

**Service Worker Rollback**:
1. Deploy service worker v1
2. Deploy service worker v2
3. Detect critical bug in v2
4. Rollback manifest to v1
5. Users should get v1 on next update check

## Cross-Version Compatibility Testing

### 1. macOS Version Matrix

**Test on Versions**:
- macOS 13.x (Ventura)
- macOS 14.x (Sonoma)
- macOS 15.x (Sequoia)
- macOS 26.2 (latest)

**Check Feature Support**:

| Feature | macOS 13+ | macOS 14+ | macOS 15+ | macOS 26+ |
|---------|-----------|-----------|-----------|-----------|
| WCO | ✓ | ✓ | ✓ | ✓ |
| File Handlers | ✓ | ✓ | ✓ | ✓ |
| Dock Badge | ✓ | ✓ | ✓ | ✓ |
| Shortcuts | ✗ | ✓ | ✓ | ✓ |
| Dir Picker | ✗ | ✓ | ✓ | ✓ |
| Media Session | ✗ | ✓ | ✓ | ✓ |

### 2. Browser Version Testing

**Test on Chromium**:
- 140.x (legacy)
- 141.x (current)
- 142.x (beta)
- 143+ (latest, targets M-series)

### 3. Hardware Compatibility

**Test on**:
- M4 Mac mini
- M4 MacBook Pro
- M4 Pro/Max variants
- Check CPU/GPU utilization vs Intel

## Automated Test Suite

### Quick Test Script

```javascript
class PWATestSuite {
    async runTests() {
        const results = {
            installation: await this.testInstallation(),
            offline: await this.testOffline(),
            fileHandlers: await this.testFileHandlers(),
            notifications: await this.testNotifications(),
            updates: await this.testUpdates()
        };

        return results;
    }

    async testInstallation() {
        return {
            manifestValid: !!this.getManifest(),
            iconPresent: !!document.querySelector('link[rel="icon"]'),
            startUrlValid: !!this.getManifest()?.start_url
        };
    }

    async testOffline() {
        const reg = await navigator.serviceWorker.getRegistration();
        return {
            swInstalled: !!reg,
            swActive: reg?.active !== undefined
        };
    }

    async testFileHandlers() {
        return {
            fileHandlersInManifest: !!this.getManifest()?.file_handlers,
            launchQueueSupported: 'launchQueue' in window
        };
    }

    async testNotifications() {
        const permission = Notification.permission;
        return {
            permissionState: permission,
            badgeSupported: 'setAppBadge' in navigator
        };
    }

    async testUpdates() {
        const reg = await navigator.serviceWorker.getRegistration();
        return {
            updateCheckable: !!reg?.update,
            updateListenerSetup: true
        };
    }

    getManifest() {
        const link = document.querySelector('link[rel="manifest"]');
        return link ? JSON.parse(localStorage.getItem(link.href)) : null;
    }
}

const tester = new PWATestSuite();
tester.runTests().then(console.log);
```

## System Prompt for Claude (Haiku)

You are a fast PWA tester for macOS. Quick validation:

1. **Installation**: Check manifest (name, icons, display), verify app in Applications folder
2. **Offline**: Enable service worker offline mode in DevTools, verify cached pages load
3. **File Handlers**: Open file with PWA, verify launchqueue event fires
4. **Notifications**: Request permission, send notification, check Notification Center
5. **Updates**: Modify service worker, trigger update check, verify new version loads
6. **Cross-version**: Test on macOS 13, 14, 15, 26.2

Quick checklist:
- Manifest valid?
- Service worker installed?
- App in Dock?
- Offline mode works?
- File handlers register?
- Notifications show?
- Updates check?

Delegate complex optimization to m-series-performance-optimizer or pwa-macos-specialist.

Your goal: Complete PWA validation in <5 minutes per test suite.
