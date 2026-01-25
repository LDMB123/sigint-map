# Push Notifications for DMB Almanac PWA

Complete Web Push Notification implementation ready for VAPID server setup.

## Overview

The DMB Almanac PWA includes a production-ready push notification system with:
- User-friendly permission request UX
- Real-time subscription status tracking
- Server integration ready (VAPID protocol)
- Graceful error handling
- Full TypeScript support
- Service Worker integration for notification display

## Features

### Browser Support
- Chrome/Edge 50+
- Firefox 48+
- Safari 15+ (iOS 15.1+)
- Android browsers with Service Workers

### Capabilities
- Subscribe users to Web Push notifications
- Handle permission requests with proper UX
- Receive notifications even when app is closed
- Click-to-open integration
- Unsubscribe management
- Real-time subscription state tracking

## Architecture

### Components

#### 1. **Push Notifications Utility** (`push-notifications.ts`)
Core utility functions for push subscription management.

```typescript
// Check current push state
const state = await getPushState();
// { supported: true, permission: 'granted', subscribed: true, subscription: PushSubscription }

// Request permission and subscribe in one call
const subscription = await requestAndSubscribeToPush(VAPID_PUBLIC_KEY);

// Manual permission request
const permission = await requestPushPermission();

// Subscribe to push
const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);

// Unsubscribe
await unsubscribeFromPush();

// Check if subscribed
const isSubscribed = await isSubscribedToPush();

// Save subscription to server
await saveSubscriptionToServer(subscription);
```

#### 2. **PushNotifications Component** (`PushNotifications.svelte`)
Svelte 5 UI component for managing push subscriptions.

```svelte
<script>
  import { PushNotifications } from '$lib/components/pwa';
  const VAPID_PUBLIC_KEY = 'your-key-from-server';
</script>

<PushNotifications {VAPID_PUBLIC_KEY} />
```

Features:
- Visual subscription status
- Subscribe/unsubscribe buttons
- Error messaging
- Loading states
- Responsive design
- Accessibility support

#### 3. **Service Worker** (`/static/sw.js`)
Already configured to handle push events.

```javascript
self.addEventListener('push', (event) => {
  // event.data contains push payload from server
  // Shows notification automatically
});

self.addEventListener('notificationclick', (event) => {
  // Handle notification click
  // Opens target URL
});
```

## Setup Guide

### 1. Generate VAPID Keys

On your server, generate VAPID key pair:

```bash
# Using web-push npm package
npx web-push generate-vapid-keys

# Output:
# Public Key: BZUI...
# Private Key: ...
```

### 2. Store VAPID Public Key

Add to your app's environment or config:

```typescript
// src/lib/config.ts
export const VAPID_PUBLIC_KEY = 'your-base64-encoded-public-key';
```

### 3. Add Component to App

In your main layout or settings page:

```svelte
<script>
  import { PushNotifications } from '$lib/components/pwa';
  import { VAPID_PUBLIC_KEY } from '$lib/config';
</script>

<main>
  <h1>Notification Settings</h1>

  <PushNotifications
    {VAPID_PUBLIC_KEY}
    onSubscriptionChange={(subscribed) => {
      console.log('Subscription state:', subscribed);
    }}
  />
</main>
```

### 4. Server-Side Integration

Your backend needs to:

1. **Store subscriptions** in database

```typescript
// POST /api/push-subscribe
const subscription = await req.json();
await db.pushSubscriptions.create({
  endpoint: subscription.endpoint,
  auth: subscription.keys.auth,
  p256dh: subscription.keys.p256dh,
  userId: user.id,
  createdAt: new Date(),
});
```

2. **Send push notifications** using web-push library

```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Send to specific user
const subscription = await db.pushSubscriptions.findOne({ userId });
await webpush.sendNotification(
  {
    endpoint: subscription.endpoint,
    keys: {
      auth: subscription.auth,
      p256dh: subscription.p256dh
    }
  },
  JSON.stringify({
    title: 'New DMB Show Announced',
    body: 'Dave Matthews Band announces 2024 tour dates',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'new-show',
    data: {
      url: '/shows/new-2024-tour'
    }
  })
);
```

3. **Handle unsubscription**

```typescript
// POST /api/push-unsubscribe
const { endpoint } = await req.json();
await db.pushSubscriptions.deleteOne({ endpoint });
```

## Usage Examples

### Basic Integration

```svelte
<script>
  import { PushNotifications } from '$lib/components/pwa';
</script>

<!-- Add to settings page or onboarding -->
<PushNotifications vapidPublicKey="your-key" />
```

### Advanced: Manual Control

```svelte
<script>
  import {
    getPushState,
    requestAndSubscribeToPush,
    unsubscribeFromPush
  } from '$lib/utils/push-notifications';

  const VAPID_KEY = 'your-key';

  async function handleEnableNotifications() {
    const subscription = await requestAndSubscribeToPush(VAPID_KEY);
    if (subscription) {
      console.log('User subscribed successfully');
      // Send to server...
    }
  }

  async function handleDisableNotifications() {
    await unsubscribeFromPush();
  }

  let state;
  onMount(async () => {
    state = await getPushState();
  });
</script>

<button on:click={handleEnableNotifications}>
  Enable Notifications
</button>

<button on:click={handleDisableNotifications}>
  Disable Notifications
</button>
```

### with Stores (Reactive)

```typescript
// src/lib/stores/notifications.ts
import { writable } from 'svelte/store';
import {
  getPushState,
  requestAndSubscribeToPush,
  type PushSubscriptionState
} from '$lib/utils/push-notifications';

export const pushState = writable<PushSubscriptionState>({
  supported: false,
  permission: 'default',
  subscribed: false
});

export async function initializePushState() {
  const state = await getPushState();
  pushState.set(state);
}

export async function requestPushNotifications(vapidKey: string) {
  const subscription = await requestAndSubscribeToPush(vapidKey);
  if (subscription) {
    await initializePushState(); // Refresh state
  }
  return subscription;
}
```

Then use in components:

```svelte
<script>
  import { pushState, requestPushNotifications } from '$lib/stores/notifications';
</script>

{#if $pushState.subscribed}
  <p>You're receiving notifications</p>
{:else}
  <button on:click={() => requestPushNotifications('key')}>
    Enable Notifications
  </button>
{/if}
```

## Push Payload Format

The Service Worker expects push payloads in this format:

```json
{
  "title": "New DMB Show",
  "body": "Dave Matthews Band announces concert",
  "icon": "/icons/icon-192.png",
  "badge": "/icons/icon-72.png",
  "tag": "unique-notification-id",
  "requireInteraction": false,
  "data": {
    "url": "/shows/123"
  }
}
```

Service Worker automatically:
1. Shows notification to user
2. Handles notification clicks to open `data.url`
3. Closes notification after interaction

## Error Handling

The utility provides detailed error information:

```typescript
try {
  const subscription = await subscribeToPush(VAPID_KEY);
} catch (error) {
  if (error.code === 'permission_denied') {
    console.log('User denied notification permission');
  } else if (error.code === 'unsupported') {
    console.log('Browser does not support push notifications');
  } else if (error.code === 'subscription_failed') {
    console.log('Failed to subscribe:', error.originalError);
  }
}
```

The PushNotifications component automatically handles errors and displays user-friendly messages.

## Lighthouse PWA Audit

Push notifications support contributes to PWA score:
- Web Push Protocol support (✓)
- Notification API support (✓)
- Service Worker message handling (✓)
- User engagement tracking

## Security Considerations

### VAPID Keys
- Keep **private key** secret on server only
- Share **public key** with client via environment
- Rotate keys periodically

### Permissions
- Request permission **after** user interaction
- Show clear value proposition before asking
- Respect user's choice if they decline

### Subscriptions
- Store with user ID for targeted notifications
- Validate endpoints before sending
- Handle unsubscription immediately

### Network
- Send subscriptions over HTTPS only
- Validate push payloads on server
- Rate limit push sends per user

## Debugging

### Check Service Worker
1. Open DevTools → Application → Service Workers
2. Verify `sw.js` is registered and active
3. Check for errors in console

### Test Subscription
```typescript
const state = await getPushState();
console.log('Push state:', state);
// Should show { supported: true, permission: 'granted', subscribed: true }
```

### View Cache Status
In DevTools → Application → Storage → IndexedDB
- Service Worker maintains sync queue in IndexedDB
- Undelivered notifications are retried

### Log Push Events
Service Worker logs all push events to console:
```
[SW] Push received: New DMB Show
[SW] Notification shown: 123456
[SW] Notification clicked: /shows/123
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | 50+ | Full support |
| Edge | 15+ | Full support |
| Firefox | 48+ | Full support |
| Safari | 15+ | iOS 15.1+, macOS 12+ |
| Opera | 37+ | Full support |
| Samsung Internet | 4+ | Full support |

## File Reference

- **Utility**: `/src/lib/utils/push-notifications.ts` (460 lines)
  - `getPushState()` - Check current state
  - `requestPushPermission()` - Request permission
  - `subscribeToPush()` - Subscribe to push
  - `unsubscribeFromPush()` - Unsubscribe
  - `saveSubscriptionToServer()` - Save to server
  - `isPushSupported()` - Check browser support
  - `requestAndSubscribeToPush()` - Combined flow

- **Component**: `/src/lib/components/pwa/PushNotifications.svelte` (300+ lines)
  - Manages UI state
  - Handles subscribe/unsubscribe flows
  - Shows permission errors
  - Integrates with server API

- **Service Worker**: `/static/sw.js` (lines 766-815)
  - Push event listener
  - Notification display
  - Click handling

## Next Steps

1. Generate VAPID keys on your server
2. Set `VAPID_PUBLIC_KEY` in app config
3. Add `<PushNotifications>` component to app
4. Implement server-side `/api/push-subscribe` and `/api/push-unsubscribe` endpoints
5. Set up push notification sending in your backend
6. Test with Chrome DevTools → Application → Service Workers
7. Monitor push delivery success rate

## References

- [MDN Web Push Protocol](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push npm package](https://github.com/web-push-libs/web-push)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/notification)
- [Service Worker Fetch Events](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Troubleshooting

### "Push not supported" error
- Requires HTTPS (http://localhost is ok for dev)
- Requires valid Service Worker registration
- Some browsers may require user gesture

### "Permission denied" error
- User clicked deny on permission prompt
- Browser may have permissions blocked
- Clear site data and try again
- Check browser notification settings

### Subscriptions not saving
- Check `/api/push-subscribe` endpoint exists
- Verify database write permissions
- Check browser console for error details
- Ensure subscription endpoint is valid

### Notifications not appearing
- Verify Service Worker is registered
- Check push payload format matches expected
- Verify endpoint is still valid (subscriptions expire)
- Check browser notification settings

## Contributing

For issues or improvements to push notification system:
1. Check `.claude/AGENT_ROSTER.md` for push-notification-specialist
2. Review existing tests in `/src/lib/components/pwa/`
3. Submit pull request with test coverage
