/**
 * PWA Store - Svelte 5 store for PWA state management
 *
 * Replaces React's ServiceWorkerProvider context
 * Manages service worker registration, updates, and offline status
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Types (used by pwaState derived store)
interface _PWAState {
	isSupported: boolean;
	isReady: boolean;
	hasUpdate: boolean;
	isInstalled: boolean;
	isOffline: boolean;
	registration: ServiceWorkerRegistration | null;
}

// Create individual stores
const isSupported = writable(browser && 'serviceWorker' in navigator);
const isReady = writable(false);
const hasUpdate = writable(false);
const isInstalled = writable(false);
const isOffline = writable(browser ? !navigator.onLine : false);
const registration = writable<ServiceWorkerRegistration | null>(null);

// Combined derived store for convenience
export const pwaState = derived(
	[isSupported, isReady, hasUpdate, isInstalled, isOffline],
	([$isSupported, $isReady, $hasUpdate, $isInstalled, $isOffline]) => ({
		isSupported: $isSupported,
		isReady: $isReady,
		hasUpdate: $hasUpdate,
		isInstalled: $isInstalled,
		isOffline: $isOffline
	})
);

// AbortController for centralized cleanup of all listeners
let globalAbortController: AbortController | null = null;

// Initialization guard to prevent duplicate initialization
let isInitialized = false;

// Export individual stores for selective subscription
export const pwaStore = {
	isSupported: { subscribe: isSupported.subscribe },
	isReady: { subscribe: isReady.subscribe },
	hasUpdate: { subscribe: hasUpdate.subscribe },
	isInstalled: { subscribe: isInstalled.subscribe },
	isOffline: { subscribe: isOffline.subscribe },

	/**
	 * Initialize the PWA store and register service worker
	 * Returns a cleanup function to remove all event listeners
	 * Safe to call multiple times - will cleanup previous initialization
	 */
	async initialize() {
		if (!browser) return;

		// If already initialized, cleanup previous listeners first
		if (isInitialized) {
			console.log('[PWA] Re-initializing - cleaning up previous listeners');
			this.cleanup();
		}

		// Abort any previous initialization first
		globalAbortController?.abort();

		// Create new AbortController for centralized cleanup of ALL listeners
		globalAbortController = new AbortController();
		const signal = globalAbortController.signal;

		// Initialize protocol handler registration (Chrome 96+)
		try {
			const { protocolHandler } = await import('$lib/pwa/protocol');
			protocolHandler.initialize();
			console.log('[PWA] Protocol handler initialized');
		} catch (error) {
			console.warn('[PWA] Protocol handler initialization failed:', error);
			// Continue execution - protocol handler is optional
		}

		// Check if already installed
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

		if (isStandalone) {
			isInstalled.set(true);
		}

		// Set up online/offline listeners with AbortController
		const handleOnline = () => {
			isOffline.set(false);
			document.documentElement.removeAttribute('data-offline');
		};

		const handleOffline = () => {
			isOffline.set(true);
			document.documentElement.setAttribute('data-offline', '');
		};

		// Passive flag: These are information-only events, never prevent default
		window.addEventListener('online', handleOnline, { signal, passive: true });
		window.addEventListener('offline', handleOffline, { signal, passive: true });

		// Listen for display mode changes with AbortController
		const displayModeQuery = window.matchMedia('(display-mode: standalone)');
		const handleDisplayModeChange = (e: MediaQueryListEvent) => {
			isInstalled.set(e.matches);
		};
		displayModeQuery.addEventListener('change', handleDisplayModeChange, { signal });

		// Register service worker
		if (!get(isSupported)) return;

		try {
			const reg = await navigator.serviceWorker.register('/sw.js', {
				scope: '/',
				updateViaCache: 'none'
			});

			registration.set(reg);
			isReady.set(true);

			// Register Periodic Background Sync for data refresh
			if ('periodicSync' in reg) {
				try {
					await reg.periodicSync.register('dmb-data-refresh', {
						minInterval: 24 * 60 * 60 * 1000 // 24 hours
					});
					console.log('[PWA] Periodic Background Sync registered (tag: dmb-data-refresh, interval: 24 hours)');
				} catch (error) {
					console.warn('[PWA] Periodic Background Sync registration failed:', error);
					// Continue execution - periodic sync is optional
				}
			} else {
				console.debug('[PWA] Periodic Background Sync API not supported in this browser');
			}

			// Check for updates - use AbortController signal for all listeners
			const handleUpdateFound = () => {
				// Check if aborted before proceeding
				if (signal.aborted) return;

				const newWorker = reg.installing;
				if (newWorker) {
					const handleStateChange = () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							hasUpdate.set(true);
						}
					};
					// Use same signal for nested listener - will be cleaned up automatically
					newWorker.addEventListener('statechange', handleStateChange, { signal });
				}
			};

			// All listeners use the same AbortController signal
			reg.addEventListener('updatefound', handleUpdateFound, { signal });

			// Handle controller change (new SW activated)
			const handleControllerChange = () => {
				window.location.reload();
			};
			navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { signal });
		} catch (error) {
			console.error('Service Worker registration failed:', error);
		}

		// Mark as initialized
		isInitialized = true;

		// Return cleanup function - just abort the controller
		return () => {
			globalAbortController?.abort();
			globalAbortController = null;
			isInitialized = false;
		};
	},

	/**
	 * Cleanup all event listeners via AbortController
	 */
	cleanup() {
		globalAbortController?.abort();
		globalAbortController = null;
		isInitialized = false;
	},

	/**
	 * Update the service worker (skip waiting)
	 */
	async updateServiceWorker() {
		const reg = get(registration);
		if (reg?.waiting) {
			reg.waiting.postMessage({ type: 'SKIP_WAITING' });
		}
	},

	/**
	 * Check for service worker updates
	 */
	async checkForUpdates() {
		const reg = get(registration);
		if (reg) {
			try {
				await reg.update();
			} catch (error) {
				console.error('Failed to check for updates:', error);
			}
		}
	},

	/**
	 * Request notification permission
	 */
	async requestNotifications(): Promise<NotificationPermission> {
		if (!browser || !('Notification' in window)) {
			return 'denied';
		}
		return Notification.requestPermission();
	}
};
