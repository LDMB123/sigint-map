/**
 * Push Notification Manager for DMB Almanac PWA
 * Handles VAPID-based Web Push notification subscription, permission flows,
 * and server-side integration.
 *
 * Usage:
 * ```typescript
 * import { pushManager, VAPID_PUBLIC_KEY } from '$lib/pwa/push-manager';
 *
 * // Request permission and subscribe
 * const subscription = await pushManager.requestAndSubscribe(VAPID_PUBLIC_KEY);
 *
 * // Check subscription status
 * const isSubscribed = await pushManager.isSubscribed();
 *
 * // Unsubscribe
 * await pushManager.unsubscribe();
 * ```
 */

import { browser } from '$app/environment';

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export interface PushSubscriptionResponse {
	endpoint: string;
	keys: {
		auth: string;
		p256dh: string;
	};
	userAgent: string;
	timestamp: number;
}

/**
 * Push Manager - Centralized service for push notification management
 */
export const pushManager = {
	/**
	 * Check if push notifications are supported
	 */
	isSupported(): boolean {
		if (!browser) return false;
		return (
			'serviceWorker' in navigator &&
			'PushManager' in window &&
			'Notification' in window
		);
	},

	/**
	 * Get current notification permission
	 */
	getPermission(): NotificationPermission {
		if (!browser) return 'denied';
		return Notification.permission || 'default';
	},

	/**
	 * Request notification permission from user
	 * Must be called as result of user interaction
	 */
	async requestPermission(): Promise<NotificationPermission> {
		if (!browser) return 'denied';

		try {
			const permission = await Notification.requestPermission();
			console.log('[Push] Permission request result:', permission);
			return permission;
		} catch (error) {
			console.error('[Push] Permission request failed:', error);
			throw new Error('Failed to request notification permission');
		}
	},

	/**
	 * Subscribe to push notifications
	 */
	async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
		if (!browser) return null;

		try {
			if (!this.isSupported()) {
				throw new Error('Push notifications not supported');
			}

			const registration = await navigator.serviceWorker.ready;

			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
			});

			console.log('[Push] Subscription successful');
			return subscription;
		} catch (error) {
			console.error('[Push] Subscription failed:', error);
			throw error;
		}
	},

	/**
	 * Get current subscription
	 */
	async getSubscription(): Promise<PushSubscription | null> {
		if (!browser) return null;

		try {
			const registration = await navigator.serviceWorker.ready;
			return await registration.pushManager.getSubscription();
		} catch (error) {
			console.error('[Push] Failed to get subscription:', error);
			return null;
		}
	},

	/**
	 * Check if currently subscribed
	 */
	async isSubscribed(): Promise<boolean> {
		const subscription = await this.getSubscription();
		return !!subscription;
	},

	/**
	 * Unsubscribe from push notifications
	 */
	async unsubscribe(): Promise<void> {
		if (!browser) return;

		try {
			const subscription = await this.getSubscription();
			if (subscription) {
				await subscription.unsubscribe();
				console.log('[Push] Unsubscribed successfully');
			}
		} catch (error) {
			console.error('[Push] Unsubscribe failed:', error);
			throw error;
		}
	},

	/**
	 * Request permission and subscribe in one call
	 * Recommended for user-initiated flows
	 */
	async requestAndSubscribe(
		vapidPublicKey: string,
		onDenied?: () => void
	): Promise<PushSubscription | null> {
		if (!browser) return null;

		try {
			const permission = await this.requestPermission();

			if (permission !== 'granted') {
				onDenied?.();
				return null;
			}

			const subscription = await this.subscribe(vapidPublicKey);
			if (subscription) {
				await this.saveSubscriptionToServer(subscription);
			}
			return subscription;
		} catch (error) {
			console.error('[Push] Request and subscribe failed:', error);
			return null;
		}
	},

	/**
	 * Save subscription to server for VAPID push messages
	 * Server will use this endpoint to send notifications via Web Push Protocol
	 */
	async saveSubscriptionToServer(
		subscription: PushSubscription,
		endpoint: string = '/api/push-subscribe'
	): Promise<void> {
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					endpoint: subscription.endpoint,
					keys: {
						auth: this.arrayBufferToBase64(subscription.getKey('auth')),
						p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
					},
					userAgent: navigator.userAgent,
					timestamp: Date.now(),
				} as PushSubscriptionResponse),
			});

			if (!response.ok) {
				throw new Error(
					`Server returned ${response.status}: ${response.statusText}`
				);
			}

			console.log('[Push] Subscription saved to server');
		} catch (error) {
			console.error('[Push] Failed to save subscription to server:', error);
			throw error;
		}
	},

	/**
	 * Notify server of unsubscription
	 */
	async notifyServerOfUnsubscription(
		subscription: PushSubscription | null,
		endpoint: string = '/api/push-unsubscribe'
	): Promise<void> {
		if (!subscription) return;

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					endpoint: subscription.endpoint,
				}),
			});

			if (!response.ok) {
				console.warn(
					`Server returned ${response.status} for unsubscribe notification`
				);
			} else {
				console.log('[Push] Server notified of unsubscription');
			}
		} catch (error) {
			console.error('[Push] Failed to notify server of unsubscription:', error);
			// Don't throw - server notification is non-critical
		}
	},

	/**
	 * Convert ArrayBuffer to base64 string for server transmission
	 */
	arrayBufferToBase64(buffer: ArrayBuffer | null): string {
		if (!buffer) return '';
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	},

	/**
	 * Convert base64 VAPID public key to Uint8Array for PushManager
	 */
	urlBase64ToUint8Array(base64String: string): BufferSource {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding)
			.replace(/-/g, '+')
			.replace(/_/g, '/');

		const rawData = atob(base64);
		const bytes = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; i++) {
			bytes[i] = rawData.charCodeAt(i);
		}

		return bytes;
	},
};

/**
 * Push notification state manager
 * Tracks current subscription state and triggers callbacks on changes
 */
export const createPushNotificationStore = () => {
	let subscription: PushSubscription | null = null;
	let permission: NotificationPermission = 'default';
	let listeners: Array<(state: PushNotificationState) => void> = [];

	interface PushNotificationState {
		subscription: PushSubscription | null;
		permission: NotificationPermission;
		isSubscribed: boolean;
	}

	return {
		async initialize() {
			if (!browser) return;

			subscription = await pushManager.getSubscription();
			permission = pushManager.getPermission();

			this.notifyListeners();
		},

		async subscribe(vapidKey: string) {
			try {
				subscription = await pushManager.requestAndSubscribe(vapidKey);
				permission = pushManager.getPermission();
				this.notifyListeners();
				return subscription;
			} catch (error) {
				console.error('[Push Store] Subscribe failed:', error);
				throw error;
			}
		},

		async unsubscribe() {
			try {
				const sub = subscription;
				await pushManager.unsubscribe();
				await pushManager.notifyServerOfUnsubscription(sub);
				subscription = null;
				permission = pushManager.getPermission();
				this.notifyListeners();
			} catch (error) {
				console.error('[Push Store] Unsubscribe failed:', error);
				throw error;
			}
		},

		addListener(callback: (state: PushNotificationState) => void) {
			listeners.push(callback);
			// Call immediately with current state
			callback({
				subscription,
				permission,
				isSubscribed: !!subscription,
			});
			// Return unsubscribe function
			return () => {
				listeners = listeners.filter((l) => l !== callback);
			};
		},

		notifyListeners() {
			const state: PushNotificationState = {
				subscription,
				permission,
				isSubscribed: !!subscription,
			};
			listeners.forEach((listener) => listener(state));
		},

		getState(): PushNotificationState {
			return {
				subscription,
				permission,
				isSubscribed: !!subscription,
			};
		},
	};
};
