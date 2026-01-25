---
name: pwa-share-target
description: Web Share Target API integration for PWA macOS share sheet, file sharing, and cross-app integration
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
pwa-feature: share-target
---

# PWA Share Target Integration

## Overview

Enable PWAs to appear in macOS Share sheets, receive shared content (text, URLs, files, images), and integrate seamlessly with other applications.

## Manifest Share Target Configuration

### Basic Share Target

```json
{
  "name": "My Share App",
  "short_name": "Share",
  "display": "standalone",
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### Advanced Share Target with Files

```json
{
  "name": "Content Hub",
  "short_name": "Hub",
  "display": "standalone",
  "share_target": {
    "action": "/receive-share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "media",
          "accept": [
            "image/*",
            "video/*",
            "audio/*"
          ]
        },
        {
          "name": "documents",
          "accept": [
            "application/pdf",
            "application/msword",
            ".doc",
            ".docx"
          ]
        }
      ]
    }
  }
}
```

### Multiple File Types

```json
{
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "media",
          "accept": [
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/webm",
            "audio/mpeg",
            "audio/wav",
            "audio/webm"
          ]
        }
      ]
    }
  }
}
```

## HTML Share Receive Page

Create a dedicated page to handle incoming shares:

```html
<!-- /public/share.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receiving Share...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .container {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 90%;
      text-align: center;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    h1 {
      color: #333;
      margin-top: 0;
    }

    p {
      color: #666;
    }

    .error {
      background: #fee;
      color: #c00;
      padding: 12px;
      border-radius: 6px;
      margin: 20px 0;
      display: none;
    }

    .preview {
      margin-top: 20px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
      display: none;
    }

    .preview img {
      max-width: 100%;
      border-radius: 6px;
      margin-bottom: 10px;
    }

    .success {
      display: none;
      color: #0a0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sharing Content</h1>
    <div class="spinner" id="spinner"></div>
    <p id="status">Processing your share...</p>

    <div class="preview" id="preview"></div>
    <div class="error" id="error"></div>
    <div class="success" id="success">
      <h2>Share received!</h2>
      <p>Your content has been saved.</p>
    </div>
  </div>

  <script src="/share-handler.js"></script>
</body>
</html>
```

## Service Worker Share Handler

```javascript
// sw.js - Handle incoming shares
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname === '/receive-share' && request.method === 'POST') {
    event.respondWith(handleShareRequest(request));
  }
});

async function handleShareRequest(request) {
  try {
    const formData = await request.formData();
    const shareData = {
      title: formData.get('title'),
      text: formData.get('text'),
      url: formData.get('url'),
      files: [],
      receivedAt: new Date().toISOString()
    };

    // Extract files if present
    for (const entry of formData.entries()) {
      if (entry[0].startsWith('files') && entry[1] instanceof File) {
        shareData.files.push({
          name: entry[1].name,
          type: entry[1].type,
          size: entry[1].size,
          blob: entry[1]
        });
      }
    }

    // Store share in IndexedDB via client
    await notifyClientsOfShare(shareData);

    // Return success response that redirects to app
    return new Response(null, {
      status: 303,
      headers: {
        'Location': '/?shared=true'
      }
    });
  } catch (error) {
    console.error('Share handler error:', error);
    return new Response('Failed to process share', { status: 500 });
  }
}

async function notifyClientsOfShare(shareData) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  for (const client of clients) {
    client.postMessage({
      type: 'SHARE_RECEIVED',
      payload: shareData
    });
  }
}
```

## Client-Side Share Handler

```javascript
// share-handler.js - Process received shares in main app
class ShareHandler {
  constructor() {
    this.shareData = null;
    this.init();
  }

  async init() {
    // Check for share in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') === 'true') {
      await this.loadShare();
    }

    // Listen for shares from Service Worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SHARE_RECEIVED') {
          this.processShare(event.data.payload);
        }
      });
    }
  }

  async loadShare() {
    // Get share data from IndexedDB
    const share = await this.getShareFromDB();
    if (share) {
      this.processShare(share);
    }
  }

  async processShare(shareData) {
    console.log('Processing share:', shareData);

    const container = document.getElementById('container') || document.body;

    if (shareData.files && shareData.files.length > 0) {
      await this.processFiles(shareData.files);
    }

    if (shareData.text) {
      this.displayText(shareData.text);
    }

    if (shareData.url) {
      this.displayUrl(shareData.url);
    }

    if (shareData.title) {
      document.title = shareData.title;
    }

    // Store in app state
    await this.saveShareToApp(shareData);
  }

  async processFiles(files) {
    const preview = document.getElementById('preview');
    preview.style.display = 'block';
    preview.innerHTML = '';

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file.blob);
        img.style.maxWidth = '100%';
        preview.appendChild(img);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file.blob);
        video.controls = true;
        video.style.maxWidth = '100%';
        preview.appendChild(video);
      } else if (file.type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = URL.createObjectURL(file.blob);
        audio.controls = true;
        preview.appendChild(audio);
      } else {
        const div = document.createElement('div');
        div.textContent = `File: ${file.name} (${file.type})`;
        preview.appendChild(div);
      }
    }

    // Save files to OPFS
    if ('storage' in navigator) {
      await this.saveFilesToOPFS(files);
    }
  }

  async saveFilesToOPFS(files) {
    const root = await navigator.storage.getDirectory();
    const shareDir = await root.getDirectoryHandle('shares', { create: true });

    for (const file of files) {
      const handle = await shareDir.getFileHandle(file.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(file.blob);
      await writable.close();
    }
  }

  displayText(text) {
    const preview = document.getElementById('preview');
    preview.style.display = 'block';
    const para = document.createElement('p');
    para.textContent = text;
    preview.appendChild(para);
  }

  displayUrl(url) {
    const preview = document.getElementById('preview');
    preview.style.display = 'block';
    const link = document.createElement('a');
    link.href = url;
    link.textContent = url;
    link.target = '_blank';
    preview.appendChild(link);
  }

  async saveShareToApp(shareData) {
    if (!window.indexedDB) return;

    const db = await this.openShareDB();
    const tx = db.transaction('shares', 'readwrite');
    const store = tx.objectStore('shares');

    await store.add({
      ...shareData,
      id: Date.now(),
      processed: false
    });
  }

  async openShareDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('share-app', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('shares')) {
          const store = db.createObjectStore('shares', { keyPath: 'id' });
          store.createIndex('receivedAt', 'receivedAt');
        }
      };
    });
  }

  async getShareFromDB() {
    const db = await this.openShareDB();
    return new Promise((resolve) => {
      const request = db.transaction('shares').store.getAll();
      request.onsuccess = () => {
        resolve(request.result[0] || null);
      };
    });
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ShareHandler();
  });
} else {
  new ShareHandler();
}
```

## Testing Share Target

### 1. Set Up Test Page

```html
<!-- /public/test-share.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Test Share Target</title>
</head>
<body>
  <h1>Test Share Target</h1>

  <div>
    <h2>Share Text</h2>
    <button onclick="shareText()">Share Text</button>
  </div>

  <div>
    <h2>Share URL</h2>
    <button onclick="shareUrl()">Share URL</button>
  </div>

  <div>
    <h2>Share File</h2>
    <input type="file" id="fileInput" multiple>
    <button onclick="shareFiles()">Share Files</button>
  </div>

  <script>
    async function shareText() {
      if (!navigator.share) {
        console.error('Share API not supported');
        return;
      }

      try {
        await navigator.share({
          title: 'Test Share',
          text: 'This is a test message',
          url: window.location.href
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }

    async function shareUrl() {
      await navigator.share({
        title: 'Check this out',
        url: 'https://example.com'
      });
    }

    async function shareFiles() {
      const input = document.getElementById('fileInput');
      if (!input.files.length) {
        alert('Select files first');
        return;
      }

      if (!navigator.canShare) {
        console.error('Share API not supported');
        return;
      }

      const files = Array.from(input.files);
      await navigator.share({
        files: files,
        title: 'Sharing files'
      });
    }
  </script>
</body>
</html>
```

### 2. Debug Share Requests

```javascript
// In DevTools when share page is loading:
console.log('Request URL:', window.location.href);
console.log('Request method:', document.location.search);

// Check if PWA sees share_target:
fetch('/manifest.json')
  .then(r => r.json())
  .then(manifest => console.log('Share target:', manifest.share_target));
```

### 3. macOS Testing

```bash
# Test with native Share Sheet
# 1. Open PWA
# 2. Use macOS Share button in Safari or Finder
# 3. Your PWA should appear in share extension list
# 4. Select PWA to share content
```

## Advanced Patterns

### Batch Share Processing

```javascript
async function processBatchShare(shareDataList) {
  const db = await initShareDB();
  const tx = db.transaction('shares', 'readwrite');

  for (const shareData of shareDataList) {
    // Deduplicate by URL
    const existing = await tx.store.index('url').get(shareData.url);
    if (!existing) {
      await tx.store.add({
        ...shareData,
        id: Date.now() + Math.random(),
        synced: false
      });
    }
  }
}
```

### Share with Background Sync

```javascript
// Queue share for sync if offline
async function queueShareForSync(shareData) {
  const db = await initShareDB();
  const tx = db.transaction('shareQueue', 'readwrite');

  await tx.store.add({
    ...shareData,
    queued: true,
    queuedAt: Date.now()
  });

  // Register background sync
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-shares');
  }
}

// In Service Worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shares') {
    event.waitUntil(syncQueuedShares());
  }
});
```

### Share with Duplicate Detection

```javascript
async function deduplicateShares(shareData) {
  const db = await initShareDB();
  const tx = db.transaction('shares');

  // Check by URL
  if (shareData.url) {
    const existing = await tx.store.index('url').get(shareData.url);
    if (existing) {
      console.log('Duplicate share detected');
      return false;
    }
  }

  // Check by content hash
  if (shareData.text) {
    const hash = await hashText(shareData.text);
    const existing = await tx.store.index('contentHash').get(hash);
    if (existing) {
      console.log('Duplicate content detected');
      return false;
    }
  }

  return true;
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Share Target API | 71+ | 79+ | No | No |
| Files in Share | 94+ | 94+ | No | No |
| POST method | 71+ | 79+ | No | No |
| Web Share API | 61+ | 79+ | 15.1+ | 71+ |

## References

- [Web Share Target API](https://wicg.github.io/web-share-target/)
- [Web Share API](https://w3c.github.io/web-share/)
- [macOS PWA Share Integration](https://developer.apple.com/documentation/webkit/pwa)
