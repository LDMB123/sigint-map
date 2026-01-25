/**
 * Push Notification Utilities for DMB Almanac PWA
 * Provides utilities for subscribing to and managing Web Push notifications
 * Ready for VAPID server implementation
 *
 * Usage:
 * ```typescript
 * // Check if push is supported and get current state
 * const state = await getPushState();
 * console.log(state); // { supported: true, permission: 'default', subscribed: false }
 *
 * // Request notification permission (call after user interaction)
 * const permission = await requestPushPermission();
 * if (permission === 'granted') {
 *   // Subscribe to push notifications
 *   const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
 *   if (subscription) {
 *     // Send subscription to server for storage
 *     await sendSubscriptionToServer(subscription);
 *   }
 * }
 *
 * // Check current subscription
 * const state = await getPushState();
 * if (state.subscribed) {
 *   console.log('User is subscribed to push notifications');
 * }
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Push_API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/notification
 */

/**
 * State of push notification capability and subscription
 */
export interface PushSubscriptionState {
  /** Is push notification API supported by this browser */
  supported: boolean;
  /** Current notification permission level */
  permission: NotificationPermission;
  /** Is user currently subscribed to push notifications */
  subscribed: boolean;
  /** Current push subscription object if subscribed */
  subscription?: PushSubscription;
}

/**
 * Error that occurred during push operations
 */
export type PushErrorCode = 'unsupported' | 'permission_denied' | 'subscription_failed' | 'unknown';

export class PushError extends Error {
  code: PushErrorCode;
  originalError?: Error;

  constructor(code: PushErrorCode, message: string, originalError?: Error) {
    super(message);
    this.name = 'PushError';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Get current push notification state
 * Checks browser support, permission level, and current subscription status
 *
 * @returns Promise resolving to current push state
 *
 * @example
 * ```typescript
 * const state = await getPushState();
 * if (state.supported && state.permission === 'granted') {
 *   // Push notifications are available and user has granted permission
 * }
 * ```
 */
export async function getPushState(): Promise<PushSubscriptionState> {
  const supported = 'PushManager' in window && 'serviceWorker' in navigator;

  if (!supported) {
    return {
      supported: false,
      permission: 'denied',
      subscribed: false,
    };
  }

  const permission = Notification.permission;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return {
      supported: true,
      permission,
      subscribed: !!subscription,
      subscription: subscription ?? undefined,
    };
  } catch (error) {
    console.error('[Push] Failed to get push state:', error);
    return {
      supported: true,
      permission,
      subscribed: false,
    };
  }
}

/**
 * Request notification permission from user
 * Must be called as result of user interaction (click, tap, etc)
 * Shows browser's permission dialog
 *
 * @returns Promise resolving to granted/denied/default
 *
 * @example
 * ```typescript
 * const handleNotificationClick = async () => {
 *   const permission = await requestPushPermission();
 *   if (permission === 'granted') {
 *     const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
 *     // Save subscription to server...
 *   }
 * };
 * ```
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('[Push] Permission request failed:', error);
    throw new PushError(
      'permission_denied',
      'Failed to request notification permission',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Subscribe user to push notifications
 * Requires notification permission to be granted first
 *
 * @param vapidPublicKey - Base64-encoded VAPID public key from server
 * @returns Promise resolving to PushSubscription or null if subscription fails
 *
 * @example
 * ```typescript
 * const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
 * if (subscription) {
 *   const response = await fetch('/api/push-subscribe', {
 *     method: 'POST',
 *     body: JSON.stringify(subscription),
 *   });
 * }
 * ```
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  // Validate VAPID key before attempting subscription
  const validation = validateVAPIDKey(vapidPublicKey);
  if (!validation.valid) {
    console.error('[Push] Invalid VAPID key:', validation.error);
    throw new PushError(
      'subscription_failed',
      `Invalid VAPID key: ${validation.error}`
    );
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('[Push] Subscription successful:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
    });

    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('NotAllowedError')) {
        throw new PushError(
          'permission_denied',
          'User denied push notification permission',
          error
        );
      }

      if (error.message.includes('NotSupportedError')) {
        throw new PushError(
          'unsupported',
          'Push notifications not supported by this browser',
          error
        );
      }
    }

    throw new PushError(
      'subscription_failed',
      'Failed to subscribe to push notifications',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Unsubscribe user from push notifications
 * Removes current push subscription
 *
 * @returns Promise resolving when unsubscription is complete
 *
 * @example
 * ```typescript
 * const handleUnsubscribe = async () => {
 *   await unsubscribeFromPush();
 *   // Notify server that user unsubscribed
 * };
 * ```
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed successfully');
    }
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    throw new PushError(
      'unknown',
      'Failed to unsubscribe from push notifications',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if user is currently subscribed to push
 * Convenience wrapper around getPushState
 *
 * @returns Promise resolving to true if subscribed
 */
export async function isSubscribedToPush(): Promise<boolean> {
  const state = await getPushState();
  return state.subscribed;
}

/**
 * Send push subscription to server for storage
 * Server will use subscription to send push messages via VAPID
 *
 * @param subscription - PushSubscription object from subscribeToPush
 * @param serverEndpoint - API endpoint to POST subscription to (default: /api/push-subscribe)
 * @returns Promise resolving when subscription is saved on server
 *
 * @example
 * ```typescript
 * const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
 * if (subscription) {
 *   await saveSubscriptionToServer(subscription);
 * }
 * ```
 */
export async function saveSubscriptionToServer(
  subscription: PushSubscription,
  serverEndpoint: string = '/api/push-subscribe'
): Promise<Response> {
  const response = await fetch(serverEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        auth: subscription.getKey('auth'),
        p256dh: subscription.getKey('p256dh'),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `[Push] Server returned ${response.status}: ${response.statusText}`
    );
  }

  console.log('[Push] Subscription saved to server');
  return response;
}

/**
 * Decode base64 VAPID key to Uint8Array for validation
 * Internal helper that returns Uint8Array for byte-level inspection
 *
 * @param base64String - Base64-encoded VAPID public key
 * @returns Uint8Array of decoded bytes
 * @private
 */
function decodeVAPIDKeyToBytes(base64String: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Decode base64 to binary string
  const rawData = atob(base64);

  // Convert binary string to Uint8Array
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert base64 VAPID public key to BufferSource
 * VAPID public keys are transmitted as base64, but PushManager requires BufferSource
 *
 * @param base64String - Base64-encoded VAPID public key from server
 * @returns BufferSource suitable for PushManager.subscribe()
 *
 * @private
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  // Type assertion needed because Uint8Array<ArrayBufferLike> is not directly
  // assignable to BufferSource in strict TypeScript, even though it's valid at runtime
  return decodeVAPIDKeyToBytes(base64String) as unknown as BufferSource;
}

/**
 * Validate VAPID public key format
 * VAPID keys must be 65 bytes (uncompressed P-256 curve point)
 * and start with 0x04 (uncompressed point format indicator)
 *
 * @param vapidPublicKey - Base64-encoded VAPID public key
 * @returns Object with valid flag and optional error message
 *
 * @example
 * ```typescript
 * const result = validateVAPIDKey(VAPID_PUBLIC_KEY);
 * if (!result.valid) {
 *   console.error('Invalid VAPID key:', result.error);
 * }
 * ```
 */
export function validateVAPIDKey(vapidPublicKey: string): { valid: boolean; error?: string } {
  if (!vapidPublicKey || typeof vapidPublicKey !== 'string') {
    return { valid: false, error: 'VAPID key must be a non-empty string' };
  }

  try {
    // Decode and validate the key format
    const bytes = decodeVAPIDKeyToBytes(vapidPublicKey);

    // VAPID public keys must be exactly 65 bytes
    // (uncompressed P-256 elliptic curve point: 1 byte prefix + 32 bytes x + 32 bytes y)
    if (bytes.length !== 65) {
      return {
        valid: false,
        error: `VAPID key must be 65 bytes when decoded, got ${bytes.length} bytes`
      };
    }

    // First byte must be 0x04 (uncompressed point format)
    // 0x04 indicates an uncompressed point, which includes both x and y coordinates
    if (bytes[0] !== 0x04) {
      return {
        valid: false,
        error: `VAPID key must start with 0x04 (uncompressed point format), got 0x${bytes[0].toString(16).padStart(2, '0')}`
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to decode VAPID key: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check browser support for push notifications
 * Quick helper to test if this browser/device supports Web Push
 *
 * @returns true if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Request and subscribe to push notifications in one call
 * Handles both permission request and subscription
 * Recommended for user-initiated flows
 *
 * @param vapidPublicKey - Base64-encoded VAPID public key from server
 * @param onPermissionDenied - Optional callback if user denies permission
 * @returns Promise resolving to subscription or null if failed
 *
 * @example
 * ```typescript
 * const subscription = await requestAndSubscribeToPush(VAPID_PUBLIC_KEY, () => {
 *   console.log('User denied notification permission');
 * });
 * ```
 */
export async function requestAndSubscribeToPush(
  vapidPublicKey: string,
  onPermissionDenied?: () => void
): Promise<PushSubscription | null> {
  try {
    const permission = await requestPushPermission();

    if (permission !== 'granted') {
      onPermissionDenied?.();
      return null;
    }

    return await subscribeToPush(vapidPublicKey);
  } catch (error) {
    console.error('[Push] Request and subscribe failed:', error);
    return null;
  }
}
