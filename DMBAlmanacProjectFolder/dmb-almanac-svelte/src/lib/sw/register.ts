/**
 * Service Worker Registration Utility
 *
 * This module handles service worker registration, updates, and lifecycle management.
 * Use in a client component or useEffect to register the service worker.
 *
 * Usage:
 *   import { registerServiceWorker } from '@/lib/sw/register';
 *
 *   useEffect(() => {
 *     registerServiceWorker();
 *   }, []);
 */

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Register the service worker
 */
// Store cleanup functions for proper memory management
const cleanupFunctions: (() => void)[] = [];

export async function registerServiceWorker(
  config: ServiceWorkerConfig = {}
): Promise<ServiceWorkerRegistration | undefined> {
  if (!isServiceWorkerSupported()) {
    console.debug('[SW] Service workers not supported');
    return;
  }

  // Only register in production or when explicitly enabled
  // Use import.meta.env for SvelteKit (process.env is not available in browser)
  const isDev = import.meta.env?.DEV ?? false;
  const enableSwDev = import.meta.env?.VITE_ENABLE_SW_DEV === 'true';

  if (isDev && !enableSwDev) {
    console.debug('[SW] Skipping SW registration in development');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });

    console.debug('[SW] Service Worker registered successfully');

    // Named handlers for proper cleanup
    const handleUpdateFound = () => {
      const installingWorker = registration.installing;

      if (!installingWorker) return;

      const handleStateChange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.debug('[SW] New content available; please refresh.');
            config.onUpdate?.(registration);
          } else {
            // Content cached for offline use
            console.debug('[SW] Content cached for offline use.');
            config.onSuccess?.(registration);
          }
        }
      };

      installingWorker.addEventListener('statechange', handleStateChange);
      cleanupFunctions.push(() => installingWorker.removeEventListener('statechange', handleStateChange));
    };

    const handleControllerChange = () => {
      console.debug('[SW] New service worker activated');
    };

    // Check for updates on registration
    registration.addEventListener('updatefound', handleUpdateFound);
    cleanupFunctions.push(() => registration.removeEventListener('updatefound', handleUpdateFound));

    // Handle controller change (new SW took over)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    cleanupFunctions.push(() => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange));

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    config.onError?.(error as Error);
    return;
  }
}

/**
 * Cleanup all event listeners registered by the service worker registration
 */
export function cleanupServiceWorkerListeners(): void {
  cleanupFunctions.forEach((cleanup) => cleanup());
  cleanupFunctions.length = 0;
  console.debug('[SW] Cleaned up event listeners');
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.debug('[SW] Service Worker unregistered:', success);
    return success;
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
    return false;
  }
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.debug('[SW] Checked for updates');
  } catch (error) {
    console.error('[SW] Update check failed:', error);
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export async function skipWaiting(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Get the current service worker registration
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  return navigator.serviceWorker.ready;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.debug('[SW] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!isServiceWorkerSupported() || !('PushManager' in window)) {
    console.debug('[SW] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    console.debug('[SW] Push subscription created');
    return subscription;
  } catch (error) {
    console.error('[SW] Push subscription failed:', error);
    return null;
  }
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if the app is running as an installed PWA
 */
export function isInstalledPWA(): boolean {
  // Check display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check iOS standalone mode
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) {
    return true;
  }

  // Check if launched from home screen (via start_url parameter)
  if (window.location.search.includes('source=pwa')) {
    return true;
  }

  return false;
}

/**
 * Register for periodic background sync
 */
export async function registerPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if periodic sync is supported
    if (!('periodicSync' in registration)) {
      console.debug('[SW] Periodic sync not supported');
      return false;
    }

    // Check permission
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    });

    if (status.state !== 'granted') {
      console.debug('[SW] Periodic sync permission not granted');
      return false;
    }

    // Register periodic sync
    await (
      registration as unknown as {
        periodicSync: {
          register: (tag: string, options: { minInterval: number }) => Promise<void>;
        };
      }
    ).periodicSync.register(tag, {
      minInterval,
    });

    console.debug(`[SW] Periodic sync registered: ${tag}`);
    return true;
  } catch (error) {
    console.error('[SW] Periodic sync registration failed:', error);
    return false;
  }
}

/**
 * Check for critical service worker updates
 * Returns true if critical update is available and forces refresh
 */
export async function checkForCriticalUpdates(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();

    // Send check request to service worker
    const response = await new Promise<{ isCritical: boolean }>((resolve) => {
      const timeout = setTimeout(() => {
        channel.port1.close();
        channel.port2.close();
        resolve({ isCritical: false });
      }, 5000);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data);
      };

      if (registration.active) {
        registration.active.postMessage({ type: 'CHECK_CRITICAL_UPDATE' }, [channel.port2]);
      } else {
        clearTimeout(timeout);
        channel.port1.close();
        channel.port2.close();
        resolve({ isCritical: false });
      }
    });

    if (response.isCritical) {
      console.debug('[SW] Critical update detected - reloading page');
      window.location.reload();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[SW] Critical update check failed:', error);
    return false;
  }
}

/**
 * Trigger immediate cache cleanup in the service worker
 */
export async function triggerCacheCleanup(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if (registration.active) {
      registration.active.postMessage({ type: 'CLEANUP_CACHES' });
      console.debug('[SW] Cache cleanup triggered');
    }
  } catch (error) {
    console.error('[SW] Cache cleanup trigger failed:', error);
  }
}

/**
 * Get cache status from service worker
 */
export async function getCacheStatus(): Promise<{
  version: string;
  caches: Record<string, { entries: number; size: string }>;
  totalSize: string;
  totalEntries: number;
} | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();

    const status = await new Promise<{
      version: string;
      caches: Record<string, { entries: number; size: string }>;
      totalSize: string;
      totalEntries: number;
    } | null>((resolve) => {
      const timeout = setTimeout(() => {
        channel.port1.close();
        channel.port2.close();
        resolve(null);
      }, 5000);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data);
      };

      if (registration.active) {
        registration.active.postMessage({ type: 'GET_CACHE_STATUS' }, [channel.port2]);
      } else {
        clearTimeout(timeout);
        channel.port1.close();
        channel.port2.close();
        resolve(null);
      }
    });

    return status;
  } catch (error) {
    console.error('[SW] Get cache status failed:', error);
    return null;
  }
}
