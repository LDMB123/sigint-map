---
title: BroadcastChannel API
category: Web APIs
tags: [communication, messaging, cross-tab, chromium143+]
description: Simple cross-tab and cross-worker messaging without SharedWorker complexity
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# BroadcastChannel API

Enables simple message passing between browsing contexts (tabs, windows, iframes) and workers without requiring a SharedWorker intermediary.

## When to Use

- **Theme/appearance sync** — User changes dark mode in one tab, applies everywhere
- **Authentication state sync** — Logout from one tab, reflect in others
- **Real-time data invalidation** — Cache invalidation signals across tabs
- **User preference synchronization** — Settings changes propagate instantly
- **Collaborative features** — Coordinate multi-tab user interactions
- **Analytics events** — Deduplicate or batch events across contexts

## Core Concepts

```typescript
interface BroadcastChannel {
  name: string;
  postMessage(message: unknown): void;
  close(): void;

  onmessage: ((event: MessageEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;

  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}
```

## Basic Usage

### Create and Send Messages

```typescript
// Any browsing context can create/join a channel by name
const channel = new BroadcastChannel('my-app-messages');

// Send message to all other listeners
channel.postMessage({
  type: 'greeting',
  text: 'Hello from tab 1'
});

// Receive messages
channel.onmessage = (event) => {
  console.log('Received:', event.data);
};

// Clean up
// channel.close();
```

### Multiple Listeners

```typescript
const channel = new BroadcastChannel('global-updates');

// Multiple listeners in same context
function setupListeners(): void {
  channel.addEventListener('message', (event) => {
    console.log('Listener 1:', event.data);
  });

  channel.addEventListener('message', (event) => {
    console.log('Listener 2:', event.data);
  });
}

// Both listeners receive same message
channel.postMessage({ status: 'update' });
```

## Real-World Patterns

### Authentication State Sync

```typescript
class AuthenticationBroadcaster {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('auth-events');
    this.setupListeners();
  }

  private setupListeners(): void {
    this.channel.onmessage = (event) => {
      const { type, user, token } = event.data;

      if (type === 'login') {
        this.handleRemoteLogin(user, token);
      } else if (type === 'logout') {
        this.handleRemoteLogout();
      } else if (type === 'token-refresh') {
        this.handleRemoteTokenRefresh(token);
      }
    };
  }

  broadcastLogin(user: User, token: string): void {
    // Store locally
    localStorage.setItem('auth:user', JSON.stringify(user));
    localStorage.setItem('auth:token', token);

    // Notify other tabs
    this.channel.postMessage({
      type: 'login',
      user,
      token
    });

    // Update local state
    this.handleRemoteLogin(user, token);
  }

  broadcastLogout(): void {
    // Clear locally
    localStorage.removeItem('auth:user');
    localStorage.removeItem('auth:token');

    // Notify other tabs
    this.channel.postMessage({ type: 'logout' });

    // Update local state
    this.handleRemoteLogout();
  }

  broadcastTokenRefresh(newToken: string): void {
    localStorage.setItem('auth:token', newToken);
    this.channel.postMessage({
      type: 'token-refresh',
      token: newToken
    });
  }

  private handleRemoteLogin(user: User, token: string): void {
    console.log('Remote login in another tab:', user);
    // Update app state, UI, etc.
  }

  private handleRemoteLogout(): void {
    console.log('Remote logout detected');
    // Clear local state, redirect to login, etc.
  }

  private handleRemoteTokenRefresh(token: string): void {
    console.log('Token refreshed remotely');
    // Update auth headers, etc.
  }
}

const authBroadcaster = new AuthenticationBroadcaster();

// In one tab: user clicks logout
// authBroadcaster.broadcastLogout();
// All other tabs receive 'logout' message instantly
```

### Theme Synchronization

```typescript
class ThemeBroadcaster {
  private channel: BroadcastChannel;
  private currentTheme: 'light' | 'dark' = 'light';

  constructor() {
    this.channel = new BroadcastChannel('theme-settings');
    this.setupListeners();
    this.loadThemeFromStorage();
  }

  private setupListeners(): void {
    this.channel.onmessage = (event) => {
      const { type, theme } = event.data;

      if (type === 'theme-change') {
        this.applyTheme(theme);
      }
    };
  }

  private loadThemeFromStorage(): void {
    const saved = localStorage.getItem('user:theme');
    if (saved) {
      this.applyTheme(saved as 'light' | 'dark');
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  setTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem('user:theme', theme);

    // Notify all tabs (including this one via message event)
    this.channel.postMessage({
      type: 'theme-change',
      theme
    });

    // Also apply locally immediately (don't wait for message)
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Update CSS variables
    const isDark = theme === 'dark';
    document.documentElement.style.setProperty(
      '--color-bg',
      isDark ? '#1a1a1a' : '#ffffff'
    );
    document.documentElement.style.setProperty(
      '--color-text',
      isDark ? '#e0e0e0' : '#1a1a1a'
    );

    console.log(`Theme changed to ${theme}`);
  }

  getTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }
}

const themeBroadcaster = new ThemeBroadcaster();

// User clicks theme toggle
// themeBroadcaster.setTheme('dark');
// All tabs instantly update to dark theme
```

### Cache Invalidation Signal

```typescript
class CacheInvalidationBroadcaster {
  private channel: BroadcastChannel;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();

  constructor() {
    this.channel = new BroadcastChannel('cache-events');
    this.setupListeners();
  }

  private setupListeners(): void {
    this.channel.onmessage = (event) => {
      const { type, keys } = event.data;

      if (type === 'invalidate') {
        this.invalidateKeys(keys);
      } else if (type === 'clear') {
        this.clearCache();
      }
    };
  }

  private invalidateKeys(keys: string[]): void {
    for (const key of keys) {
      this.cache.delete(key);
    }
    console.log(`Invalidated ${keys.length} cache entries`);
  }

  private clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    return entry ? entry.data : null;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  broadcastInvalidation(keys: string[]): void {
    this.invalidateKeys(keys);
    this.channel.postMessage({
      type: 'invalidate',
      keys
    });
  }

  broadcastClear(): void {
    this.clearCache();
    this.channel.postMessage({ type: 'clear' });
  }
}

const cache = new CacheInvalidationBroadcaster();

// After data mutation
// cache.broadcastInvalidation(['user:1', 'user:2', 'posts:recent']);
// All tabs clear these cache keys
```

### User Activity Tracking

```typescript
class ActivityBroadcaster {
  private channel: BroadcastChannel;
  private idleTimeout: number = 5 * 60 * 1000; // 5 minutes
  private idleTimer: number | null = null;
  private isIdle: boolean = false;

  constructor() {
    this.channel = new BroadcastChannel('activity-tracking');
    this.setupListeners();
    this.setupActivityListeners();
  }

  private setupListeners(): void {
    this.channel.onmessage = (event) => {
      const { type } = event.data;

      if (type === 'activity') {
        // Another tab is active, mark this tab as secondary
        console.log('Activity detected in another tab');
      }
    };
  }

  private setupActivityListeners(): void {
    const reportActivity = () => {
      if (this.idleTimer) clearTimeout(this.idleTimer);

      if (this.isIdle) {
        // Transitioning from idle to active
        this.isIdle = false;
        this.channel.postMessage({
          type: 'activity',
          timestamp: Date.now(),
          tabId: this.getTabId()
        });
      }

      // Schedule idle check
      this.idleTimer = window.setTimeout(() => {
        this.isIdle = true;
        console.log('Tab is now idle');
      }, this.idleTimeout);
    };

    // Listen for user activity
    document.addEventListener('mousemove', reportActivity);
    document.addEventListener('keydown', reportActivity);
    document.addEventListener('click', reportActivity);

    // Initial idle timer
    reportActivity();
  }

  private getTabId(): string {
    let tabId = sessionStorage.getItem('tab:id');
    if (!tabId) {
      tabId = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('tab:id', tabId);
    }
    return tabId;
  }

  isTabActive(): boolean {
    return !this.isIdle;
  }
}

const activity = new ActivityBroadcaster();

// Check if current tab is active before performing expensive operations
if (activity.isTabActive()) {
  await performExpensiveComputation();
}
```

### Settings Synchronization

```typescript
class SettingsBroadcaster {
  private channel: BroadcastChannel;
  private settings: Map<string, unknown> = new Map();

  constructor() {
    this.channel = new BroadcastChannel('settings-sync');
    this.setupListeners();
    this.loadSettings();
  }

  private setupListeners(): void {
    this.channel.onmessage = (event) => {
      const { type, key, value } = event.data;

      if (type === 'setting-changed') {
        this.settings.set(key, value);
        this.applySetting(key, value);
      } else if (type === 'request-sync') {
        this.respondWithSettings();
      }
    };
  }

  private loadSettings(): void {
    const saved = localStorage.getItem('app:settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([key, value]) => {
        this.settings.set(key, value);
      });
    }
  }

  private applySetting(key: string, value: unknown): void {
    console.log(`Applied setting: ${key} = ${value}`);
    // Update UI, state, etc.
  }

  private respondWithSettings(): void {
    const settings = Object.fromEntries(this.settings);
    this.channel.postMessage({
      type: 'settings-response',
      settings
    });
  }

  setSetting(key: string, value: unknown): void {
    this.settings.set(key, value);

    // Save to local storage
    const all = Object.fromEntries(this.settings);
    localStorage.setItem('app:settings', JSON.stringify(all));

    // Broadcast to other tabs
    this.channel.postMessage({
      type: 'setting-changed',
      key,
      value
    });

    // Apply locally
    this.applySetting(key, value);
  }

  getSetting(key: string): unknown {
    return this.settings.get(key);
  }

  // New tab joins and needs current settings
  requestSync(): void {
    this.channel.postMessage({ type: 'request-sync' });
  }
}

const settings = new SettingsBroadcaster();

// User changes setting in one tab
settings.setSetting('notifications:enabled', false);

// All other tabs receive the change via BroadcastChannel
```

## Advanced Patterns

### Message Acknowledgment Pattern

```typescript
class AcknowledgedBroadcaster {
  private channel: BroadcastChannel;
  private pendingAcks: Map<string, {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: number;
  }> = new Map();

  constructor() {
    this.channel = new BroadcastChannel('ack-messages');
    this.setupListeners();
  }

  private setupListeners(): void {
    this.channel.onmessage = (event) => {
      const { id, type, data, ackId } = event.data;

      if (ackId) {
        // This is an acknowledgment
        const pending = this.pendingAcks.get(ackId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve();
          this.pendingAcks.delete(ackId);
        }
      } else {
        // This is a new message - send ack
        this.channel.postMessage({
          type: 'ack',
          ackId: id
        });

        console.log(`Received message: ${type}`, data);
      }
    };
  }

  async broadcastWithAck(message: unknown, timeoutMs: number = 5000): Promise<void> {
    const id = Math.random().toString(36).substr(2, 9);

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pendingAcks.delete(id);
        reject(new Error('Message acknowledgment timeout'));
      }, timeoutMs);

      this.pendingAcks.set(id, { resolve, reject, timeout });
      this.channel.postMessage({ ...message, id });
    });
  }
}

const broadcaster = new AcknowledgedBroadcaster();

// Send message and wait for at least one other tab to acknowledge
try {
  await broadcaster.broadcastWithAck({ type: 'critical-update', data: {} });
  console.log('Message acknowledged');
} catch {
  console.log('No ack received - operation failed');
}
```

## Error Handling

```typescript
const channel = new BroadcastChannel('error-channel');

// Handle message errors (deserialization failures, etc.)
channel.onmessageerror = (event) => {
  console.error('Failed to deserialize message:', event);
  // Message contained data that couldn't be cloned
};

// Try-catch around postMessage for oversized data
try {
  channel.postMessage({
    type: 'large-data',
    data: new Uint8Array(100 * 1024 * 1024) // 100MB
  });
} catch (error) {
  console.error('Failed to send message:', error);
  // Data too large to transfer
}
```

## Performance Considerations

```typescript
// Debounce frequent messages
function createDebouncedBroadcaster(channel: BroadcastChannel, delayMs: number = 100) {
  let pending: unknown = null;
  let timer: number | null = null;

  return function broadcast(message: unknown): void {
    pending = message;

    if (!timer) {
      timer = window.setTimeout(() => {
        channel.postMessage(pending);
        timer = null;
      }, delayMs);
    }
  };
}

const channel = new BroadcastChannel('throttled-updates');
const broadcast = createDebouncedBroadcaster(channel, 500);

// High-frequency updates are batched
for (let i = 0; i < 100; i++) {
  broadcast({ count: i });
}
// Only last message is actually sent
```

## Browser Support

**Chromium 143+ baseline** — BroadcastChannel API is fully supported across all browsing contexts including windows, tabs, iframes, workers, and service workers.

## Related APIs

- **Web Locks API** — Coordinate exclusive access to resources
- **Shared Workers** — Share execution context across tabs
- **Service Workers** — Intercept network requests for all tabs
- **Storage Events** — Listen for localStorage changes (same-origin only)
