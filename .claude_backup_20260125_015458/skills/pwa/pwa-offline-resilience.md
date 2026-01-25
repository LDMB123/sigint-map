---
name: pwa-offline-resilience
description: Offline-first PWA architecture with Service Worker strategies, Background Sync, IndexedDB, and network resilience for macOS
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
pwa-feature: offline-resilience
---

# PWA Offline Resilience

## Overview

Build robust PWAs that work seamlessly offline with smart caching strategies, background synchronization, IndexedDB storage, and graceful network degradation.

## Service Worker Caching Strategies

### Cache-First Strategy

Best for static assets that rarely change.

```javascript
// sw.js - Cache-first strategy
const CACHE_NAME = 'v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/js/app.js',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Return offline page
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      })
  );
});
```

### Network-First Strategy

Best for API data that should be fresh when possible.

```javascript
// Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Always cache successful API responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open('api-cache-v1').then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached response
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline error response
              return new Response(JSON.stringify({
                error: 'Offline',
                message: 'Network request failed and no cached response available'
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
  );
});
```

### Stale-While-Revalidate Strategy

Best for content that can be slightly stale.

```javascript
// Serve from cache immediately, update in background
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((response) => {
        // Update cache in background
        if (response.ok) {
          const responseClone = response.clone();
          caches.open('content-cache-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });

      // Return cached response immediately, or fetch if not cached
      return cachedResponse || fetchPromise;
    })
  );
});
```

## Background Sync API

### Sync Queue Implementation

```javascript
// sw.js - Background sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(processSyncQueue());
  } else if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function processSyncQueue() {
  try {
    const db = await openSyncDB();
    const items = await getAllSyncItems(db);

    for (const item of items) {
      try {
        // Send item to server
        const response = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body)
        });

        if (response.ok) {
          // Remove from queue
          await removeSyncItem(db, item.id);
        } else if (response.status >= 400 && response.status < 500) {
          // Client error - don't retry
          await removeSyncItem(db, item.id);
        }
        // 5xx errors will be retried on next sync
      } catch (error) {
        console.warn('Sync item failed:', error);
        // Will retry on next sync event
      }
    }
  } catch (error) {
    console.error('Sync queue processing error:', error);
    throw error; // Retry sync
  }
}

async function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sync-db', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getAllSyncItems(db) {
  return new Promise((resolve) => {
    const request = db.transaction('queue').store.getAll();
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeSyncItem(db, id) {
  return new Promise((resolve) => {
    const request = db.transaction('queue', 'readwrite').store.delete(id);
    request.onsuccess = () => resolve();
  });
}

async function syncData() {
  console.log('Background sync triggered');
  // Implement periodic data sync
}
```

### Client-Side Sync Queue

```javascript
// App code - Queue actions for sync
class OfflineSyncQueue {
  constructor() {
    this.db = null;
    this.init();
  }

  async init() {
    this.db = await this.openDB();
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('sync-db', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async queueAction(action) {
    return new Promise((resolve, reject) => {
      const request = this.db.transaction('queue', 'readwrite')
        .store.add({
          ...action,
          queuedAt: Date.now(),
          retries: 0
        });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async createTask(taskData) {
    if (navigator.onLine) {
      // Try to send immediately
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });

        if (response.ok) {
          return response.json();
        }
      } catch (error) {
        console.warn('Failed to create task, queuing for later:', error);
      }
    }

    // Queue for background sync
    await this.queueAction({
      url: '/api/tasks',
      method: 'POST',
      body: taskData,
      type: 'create-task'
    });

    // Register sync
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-queue');
    }

    return { offline: true, data: taskData };
  }

  async updateTask(taskId, updates) {
    if (navigator.onLine) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });

        if (response.ok) {
          return response.json();
        }
      } catch (error) {
        console.warn('Failed to update task, queuing for later');
      }
    }

    // Queue update
    await this.queueAction({
      url: `/api/tasks/${taskId}`,
      method: 'PUT',
      body: updates,
      type: 'update-task'
    });

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-queue');
    }

    return { offline: true, data: updates };
  }
}

const syncQueue = new OfflineSyncQueue();
```

## Periodic Background Sync

```javascript
// Register periodic sync (macOS support via Chromium 124+)
async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    console.warn('Periodic Background Sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Sync every 24 hours
    await registration.periodicSync.register('sync-data', {
      minInterval: 24 * 60 * 60 * 1000 // 24 hours
    });

    console.log('Periodic sync registered');
  } catch (error) {
    console.warn('Failed to register periodic sync:', error);
  }
}

// Service Worker - Handle periodic sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      (async () => {
        try {
          // Fetch fresh data
          const response = await fetch('/api/data');
          const data = await response.json();

          // Store in IndexedDB
          const db = await openAppDB();
          const tx = db.transaction('data', 'readwrite');
          await tx.store.clear();
          await tx.store.put({ key: 'app-data', value: data });

          // Notify clients
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'DATA_UPDATED',
              data: data
            });
          });
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      })()
    );
  }
});
```

## Network Status Detection

```javascript
class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.init();
  }

  init() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOnline() {
    console.log('Back online');
    this.isOnline = true;
    this.notify('online');

    // Trigger sync queue
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.sync.register('sync-queue');
      });
    }
  }

  handleOffline() {
    console.log('Going offline');
    this.isOnline = false;
    this.notify('offline');
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // Notify of current state
    callback(this.isOnline ? 'online' : 'offline');
  }

  notify(status) {
    this.listeners.forEach(listener => listener(status));
  }

  isConnected() {
    return this.isOnline;
  }
}

const networkMonitor = new NetworkMonitor();

// Usage
networkMonitor.subscribe((status) => {
  if (status === 'offline') {
    showOfflineIndicator();
  } else {
    hideOfflineIndicator();
    triggerSync();
  }
});
```

## IndexedDB for Offline Data

### App Data Storage

```javascript
import { openDB } from 'idb';

class AppDataStore {
  async init() {
    this.db = await openDB('app-db', 1, {
      upgrade(db) {
        // Tasks store
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('status', 'status');
        taskStore.createIndex('createdAt', 'createdAt');

        // User store
        const userStore = db.createObjectStore('user', { keyPath: 'id' });

        // Sync queue
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });

        // Settings
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    });
  }

  // Tasks
  async getTasks() {
    return this.db.getAll('tasks');
  }

  async getTasksByStatus(status) {
    return this.db.getAllFromIndex('tasks', 'status', status);
  }

  async addTask(task) {
    return this.db.add('tasks', {
      ...task,
      id: Date.now(),
      createdAt: Date.now(),
      synced: false
    });
  }

  async updateTask(taskId, updates) {
    const task = await this.db.get('tasks', taskId);
    return this.db.put('tasks', { ...task, ...updates, synced: false });
  }

  async deleteTask(taskId) {
    return this.db.delete('tasks', taskId);
  }

  // User
  async setUser(userData) {
    return this.db.put('user', userData);
  }

  async getUser() {
    return this.db.get('user', 1);
  }

  // Settings
  async setSetting(key, value) {
    return this.db.put('settings', { key, value });
  }

  async getSetting(key) {
    const record = await this.db.get('settings', key);
    return record?.value;
  }

  // Sync queue
  async queueForSync(action) {
    return this.db.add('sync-queue', {
      ...action,
      queuedAt: Date.now()
    });
  }

  async getSyncQueue() {
    return this.db.getAll('sync-queue');
  }

  async removeFromSyncQueue(id) {
    return this.db.delete('sync-queue', id);
  }
}

const appDataStore = new AppDataStore();
```

## Offline Page

```html
<!-- offline.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .offline-container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .offline-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: #f5f5f5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
    }

    h1 {
      color: #333;
      margin-bottom: 8px;
      font-size: 28px;
    }

    p {
      color: #666;
      margin-bottom: 24px;
      line-height: 1.6;
    }

    .offline-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5568d3;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .offline-tips {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      text-align: left;
    }

    .offline-tips h2 {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .offline-tips ul {
      list-style: none;
      color: #666;
      font-size: 14px;
    }

    .offline-tips li {
      margin: 8px 0;
    }

    .status {
      margin-top: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 6px;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="offline-icon">📡</div>
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. Some features may be limited.</p>

    <div class="offline-actions">
      <button class="btn-primary" onclick="checkConnection()">Check Connection</button>
      <button class="btn-secondary" onclick="goHome()">Go to Home</button>
    </div>

    <div class="offline-tips">
      <h2>What you can do:</h2>
      <ul>
        <li>View previously loaded content</li>
        <li>Work on your tasks (will sync when online)</li>
        <li>Check your saved data</li>
        <li>Continue working offline</li>
      </ul>
    </div>

    <div class="status">
      Status: <span id="status">Offline</span>
    </div>
  </div>

  <script>
    function checkConnection() {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        alert('Still offline. Check your internet connection.');
      }
    }

    function goHome() {
      window.location.href = '/';
    }

    // Monitor connection
    window.addEventListener('online', () => {
      document.getElementById('status').textContent = 'Back Online!';
      setTimeout(() => window.location.reload(), 1000);
    });

    // Check periodically
    setInterval(() => {
      if (navigator.onLine) {
        window.location.reload();
      }
    }, 5000);
  </script>
</body>
</html>
```

## Testing Offline Resilience

### DevTools Testing

```javascript
// In Chrome DevTools:
// 1. Network tab > Throttling > Offline
// 2. Application > Service Workers > Offline checkbox
// 3. Application > Storage > Verify IndexedDB content
```

### Manual Testing

```bash
# Test offline mode
# 1. Cmd+Space to open Spotlight
# 2. Type "System Preferences"
# 3. Network > Disconnect/Reconnect

# Or use macOS Terminal:
networksetup -setairportpower en0 off  # Turn off WiFi
networksetup -setairportpower en0 on   # Turn on WiFi
```

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Service Workers | 40+ | 17+ | 11.1+ | 44+ |
| Background Sync | 49+ | 79+ | No | No |
| Periodic Sync | 80+ | 80+ | No | No |
| IndexedDB | All | All | All | All |
| Online/Offline Events | All | All | All | All |

## References

- [Service Workers API](https://w3c.github.io/ServiceWorker/)
- [Background Sync API](https://wicg.github.io/background-sync/spec/)
- [Periodic Background Sync](https://wicg.github.io/periodic-background-sync/)
- [IndexedDB API](https://w3c.github.io/IndexedDB/)
