---
name: pwa-badging-notifications
description: PWA engagement with app badges, push notifications, notification actions, and macOS notification center integration
version: 1.0.0
target: chromium-143+
platform: apple-silicon-m-series
os: macos-26.2
pwa-feature: badging-notifications
---

# PWA Badging & Notifications

## Overview

Implement app badges on the macOS Dock icon, push notifications with rich interactions, and seamless macOS notification center integration for PWA engagement.

## Badging API

### Basic Badge Implementation

```javascript
class BadgeManager {
  constructor() {
    this.badgeCount = 0;
    this.init();
  }

  async init() {
    if (!navigator.setAppBadge) {
      console.warn('Badge API not supported on this platform');
      return;
    }

    // Listen for badge updates
    document.addEventListener('notification-received', (e) => {
      this.incrementBadge(e.detail.count || 1);
    });

    // Clear badge on app focus
    window.addEventListener('focus', () => {
      this.clearBadge();
    });
  }

  async setBadge(count) {
    if (!navigator.setAppBadge) return;

    try {
      this.badgeCount = count;
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
      console.log('Badge set to:', count);
    } catch (error) {
      console.error('Failed to set badge:', error);
    }
  }

  async incrementBadge(amount = 1) {
    await this.setBadge(this.badgeCount + amount);
  }

  async decrementBadge(amount = 1) {
    await this.setBadge(Math.max(0, this.badgeCount - amount));
  }

  async clearBadge() {
    await this.setBadge(0);
  }

  async setBadgeFlag(flag = true) {
    if (!navigator.setAppBadge) return;

    try {
      // macOS shows a dot for flag mode (no number)
      if (flag) {
        await navigator.setAppBadge();
      } else {
        await navigator.clearAppBadge();
      }
    } catch (error) {
      console.error('Failed to set badge flag:', error);
    }
  }

  getCurrentBadge() {
    return this.badgeCount;
  }
}

// Global instance
const badgeManager = new BadgeManager();

// Usage
await badgeManager.setBadge(5); // Show "5" on Dock
await badgeManager.setBadgeFlag(true); // Show dot on Dock
await badgeManager.clearBadge(); // Remove badge
```

## Push Notifications

### Service Worker Push Handler

```javascript
// sw.js - Service Worker push event handler

const NOTIFICATION_OPTIONS = {
  badge: '/icons/badge-72.png',
  icon: '/icons/icon-192.png',
  requireInteraction: false,
  vibrate: [200, 100, 200]
};

self.addEventListener('push', (event) => {
  try {
    const data = event.data?.json() ?? {};

    const title = data.title || 'Notification';
    const options = {
      ...NOTIFICATION_OPTIONS,
      body: data.body,
      tag: data.tag || 'notification',
      data: data.data || {},
      actions: data.actions || [],
      badge: data.badge || NOTIFICATION_OPTIONS.badge
    };

    // Update app badge if provided
    if (data.badgeCount !== undefined) {
      navigator.setAppBadge(data.badgeCount);
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    );

    console.log('Push notification shown:', title);
  } catch (error) {
    console.error('Push handler error:', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  console.log('Notification clicked, action:', action);

  // Handle different actions
  const actionHandlers = {
    'open': () => openMainWindow(notificationData.url),
    'reply': () => handleReply(notificationData),
    'archive': () => handleArchive(notificationData),
    'delete': () => handleDelete(notificationData),
    'snooze': () => handleSnooze(notificationData)
  };

  if (action && actionHandlers[action]) {
    actionHandlers[action]();
  } else {
    // Default action - open main window
    openMainWindow(notificationData.url);
  }
});

// Handle notification dismissal
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed');
  // Could track analytics here
});

async function openMainWindow(url) {
  const windowUrl = url || '/';

  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Check if window already open
  for (const client of clients) {
    if (client.url === windowUrl && 'focus' in client) {
      return client.focus();
    }
  }

  // Open new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(windowUrl);
  }
}

async function handleReply(data) {
  const clients = await self.clients.matchAll({ type: 'window' });

  for (const client of clients) {
    client.postMessage({
      type: 'NOTIFICATION_REPLY',
      data: data
    });
  }
}

async function handleArchive(data) {
  console.log('Archived:', data);
  // Remove from notification center
}

async function handleDelete(data) {
  console.log('Deleted:', data);
}

async function handleSnooze(data) {
  console.log('Snoozed:', data);
  // Re-schedule notification later
}
```

### Client-Side Notification Subscription

```javascript
class NotificationManager {
  constructor() {
    this.subscription = null;
    this.init();
  }

  async init() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      this.registration = registration;

      // Check existing subscription
      this.subscription = await registration.pushManager.getSubscription();

      if (!this.subscription) {
        console.log('No existing subscription');
      } else {
        console.log('Already subscribed to push');
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async requestPermission() {
    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied');
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe(vapidPublicKey) {
    try {
      if (!this.registration) {
        await this.init();
      }

      const options = {
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      };

      this.subscription = await this.registration.pushManager.subscribe(options);

      console.log('Subscribed to push notifications');

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      throw error;
    }
  }

  async unsubscribe() {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
        console.log('Unsubscribed from push notifications');
        return true;
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
    return false;
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('Subscription sent to server');
    } catch (error) {
      console.error('Failed to send subscription:', error);
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  async isSubscribed() {
    return this.subscription !== null;
  }

  getSubscription() {
    return this.subscription;
  }
}

// Initialize
const notificationManager = new NotificationManager();

// Usage
async function enableNotifications() {
  const hasPermission = await notificationManager.requestPermission();
  if (hasPermission) {
    const vapidKey = 'BCeyxhYkdqbv...'; // From your server
    await notificationManager.subscribe(vapidKey);
  }
}
```

## Notification Actions

### Notifications with Actions

```javascript
class RichNotificationManager {
  async showNotificationWithActions(title, options) {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;

    const notificationOptions = {
      ...options,
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/icons/open.png'
        },
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply.png'
        },
        {
          action: 'archive',
          title: 'Archive',
          icon: '/icons/archive.png'
        },
        {
          action: 'delete',
          title: 'Delete',
          icon: '/icons/delete.png'
        }
      ],
      tag: options.tag || 'notification',
      requireInteraction: true
    };

    return registration.showNotification(title, notificationOptions);
  }

  // Different action sets for different notification types
  async showTaskNotification(task) {
    return this.showNotificationWithActions(
      'Task: ' + task.title,
      {
        body: task.description,
        tag: 'task-' + task.id,
        data: { taskId: task.id, type: 'task' },
        actions: [
          {
            action: 'complete',
            title: 'Complete',
            icon: '/icons/check.png'
          },
          {
            action: 'snooze',
            title: 'Snooze',
            icon: '/icons/snooze.png'
          },
          {
            action: 'delete',
            title: 'Delete',
            icon: '/icons/delete.png'
          }
        ]
      }
    );
  }

  async showMessageNotification(message) {
    return this.showNotificationWithActions(
      'From: ' + message.sender,
      {
        body: message.text,
        tag: 'message-' + message.id,
        data: { messageId: message.id, type: 'message' },
        actions: [
          {
            action: 'reply',
            title: 'Reply',
            icon: '/icons/reply.png'
          },
          {
            action: 'archive',
            title: 'Archive',
            icon: '/icons/archive.png'
          }
        ],
        requireInteraction: true
      }
    );
  }

  async showReminderNotification(reminder) {
    return this.showNotificationWithActions(
      'Reminder: ' + reminder.title,
      {
        body: reminder.description,
        tag: 'reminder-' + reminder.id,
        data: { reminderId: reminder.id, type: 'reminder' },
        actions: [
          {
            action: 'open',
            title: 'Open',
            icon: '/icons/open.png'
          },
          {
            action: 'snooze-5',
            title: 'Snooze 5min',
            icon: '/icons/snooze.png'
          },
          {
            action: 'snooze-15',
            title: 'Snooze 15min',
            icon: '/icons/snooze.png'
          }
        ]
      }
    );
  }
}

// Use in Service Worker
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'complete') {
    handleTaskComplete(event.notification.data.taskId);
  } else if (event.action === 'snooze') {
    handleSnooze(event.notification.data);
  } else if (event.action.startsWith('snooze-')) {
    const minutes = parseInt(event.action.split('-')[1]);
    handleSnoozeMinutes(event.notification.data, minutes);
  }
});
```

## Silent Notifications

```javascript
// Silent push (for periodic updates without user interruption)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  // Check if silent
  if (data.silent) {
    // Update app state without showing notification
    event.waitUntil(
      (async () => {
        // Open IndexedDB and update data
        const db = await openAppDB();
        const tx = db.transaction('data', 'readwrite');
        await tx.store.put({ key: data.key, value: data.value });

        // Notify open clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SILENT_UPDATE',
            data: data
          });
        });
      })()
    );
  } else {
    // Show normal notification
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png'
      })
    );
  }
});
```

## macOS Notification Center Integration

### Group Notifications

```javascript
class macOSNotificationManager {
  async showGroupedNotification(group, notifications) {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;

    // On macOS, use tag to group notifications
    for (const notification of notifications) {
      await registration.showNotification(notification.title, {
        body: notification.body,
        icon: '/icon-192.png',
        tag: `group-${group}`, // Groups notifications in Notification Center
        data: notification.data
      });
    }
  }

  // Stack notifications efficiently
  async showStackedNotification(title, notifications) {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;

    const summary = `${notifications.length} new items`;

    await registration.showNotification(title, {
      body: summary,
      icon: '/icon-192.png',
      tag: 'stack-notification',
      data: {
        notifications: notifications,
        type: 'stack'
      },
      requireInteraction: false
    });
  }
}
```

## Notification Request UI

```html
<!-- Notification permission request UI -->
<div id="notification-prompt" class="notification-prompt" style="display: none;">
  <div class="prompt-content">
    <div class="prompt-icon">
      <svg viewBox="0 0 24 24" width="48" height="48">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V2c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 3.36 6 5.92 6 9v5l-2 2v1h16v-1l-2-2z"/>
      </svg>
    </div>
    <h2>Enable Notifications?</h2>
    <p>Get instant updates and alerts from our app.</p>
    <div class="prompt-buttons">
      <button id="enable-notifications" class="btn-primary">Enable</button>
      <button id="dismiss-prompt" class="btn-secondary">Not Now</button>
    </div>
  </div>
</div>

<style>
.notification-prompt {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  max-width: 350px;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.prompt-icon {
  text-align: center;
  color: #667eea;
  margin-bottom: 16px;
}

.prompt-content h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.prompt-content p {
  color: #666;
  margin: 0 0 16px 0;
}

.prompt-buttons {
  display: flex;
  gap: 8px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
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
</style>

<script>
// Smart prompt timing
class NotificationPrompt {
  constructor() {
    this.showPromptAfterDelay();
  }

  showPromptAfterDelay() {
    // Show after 5 seconds of user engagement
    setTimeout(() => {
      if (Notification.permission === 'default') {
        this.showPrompt();
      }
    }, 5000);
  }

  showPrompt() {
    const prompt = document.getElementById('notification-prompt');
    prompt.style.display = 'block';

    document.getElementById('enable-notifications').addEventListener('click', () => {
      this.requestNotifications();
      prompt.style.display = 'none';
    });

    document.getElementById('dismiss-prompt').addEventListener('click', () => {
      prompt.style.display = 'none';
      // Don't show again for 7 days
      localStorage.setItem('notificationPromptDismissed', Date.now() + 7 * 24 * 60 * 60 * 1000);
    });
  }

  async requestNotifications() {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await notificationManager.subscribe(VAPID_KEY);
      console.log('Notifications enabled');
    }
  }
}

new NotificationPrompt();
</script>
```

## Testing Notifications

### Send Test Notification

```javascript
// In DevTools console on running PWA
const registration = await navigator.serviceWorker.ready;

// Test local notification
registration.showNotification('Test Notification', {
  body: 'This is a test notification',
  icon: '/icon-192.png',
  badge: '/badge-72.png',
  actions: [
    { action: 'open', title: 'Open' },
    { action: 'close', title: 'Close' }
  ]
});

// Test badge
navigator.setAppBadge(5);
```

### Server-Side Test Script

```javascript
// Node.js - Send test push
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:test@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const subscription = {
  endpoint: 'user-subscription-endpoint',
  keys: {
    auth: 'auth-key',
    p256dh: 'p256dh-key'
  }
};

webpush.sendNotification(subscription, JSON.stringify({
  title: 'Test Notification',
  body: 'This is a test push notification',
  icon: '/icon-192.png',
  badge: '/badge-72.png',
  badgeCount: 1,
  data: { url: '/messages' }
}));
```

## Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Badge API | 81+ | 81+ | No | No |
| Push Notifications | 50+ | 79+ | No | 44+ |
| Notification Actions | 53+ | 79+ | No | 48+ |
| Notification Grouping | 51+ | 79+ | No | 48+ |
| Require Interaction | 47+ | 79+ | No | 48+ |

## References

- [Badging API](https://w3c.github.io/badging/)
- [Push API](https://w3c.github.io/push-api/)
- [Notification API](https://notifications.spec.whatwg.org/)
- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
