<script lang="ts">
	/**
	 * Push Notifications Component
	 * Manages user subscription to Web Push notifications with permission handling
	 *
	 * Features:
	 * - Permission request with user-friendly messaging
	 * - Real-time subscription status
	 * - Graceful error handling
	 * - Server integration ready (VAPID)
	 *
	 * Usage: Import from $lib/components/pwa and pass vapidPublicKey prop
	 */

	import { onMount } from 'svelte';
	import {
		getPushState,
		requestAndSubscribeToPush,
		unsubscribeFromPush,
		isPushSupported,
		type PushSubscriptionState,
	} from '$lib/utils/push-notifications';

	interface PushNotificationsProps {
		/** Base64-encoded VAPID public key from your server */
		vapidPublicKey: string;
		/** Optional CSS class for styling */
		class?: string;
		/** Show component (default: true) */
		show?: boolean;
		/** Callback when subscription state changes */
		onSubscriptionChange?: (subscribed: boolean) => void;
	}

	let {
		vapidPublicKey,
		class: className = '',
		show = true,
		onSubscriptionChange
	}: PushNotificationsProps = $props();

	let pushState: PushSubscriptionState = $state({
		supported: false,
		permission: 'default' as NotificationPermission,
		subscribed: false,
	});

	let isLoading = $state(false);
	let error: string | null = $state(null);
	let mounted = $state(false);

	// Initialize push state on mount
	onMount(async () => {
		mounted = true;
		await refreshState();
	});

	/**
	 * Refresh push subscription state
	 */
	async function refreshState() {
		try {
			pushState = await getPushState();
		} catch (err) {
			console.error('[Push] Failed to refresh state:', err);
		}
	}

	/**
	 * Handle subscribe button click
	 */
	async function handleSubscribe() {
		error = null;
		isLoading = true;

		try {
			const subscription = await requestAndSubscribeToPush(
				vapidPublicKey,
				() => {
					error = 'You denied notification permission. Enable it in your browser settings.';
				}
			);

			if (subscription) {
				// Save subscription to server
				try {
					await fetch('/api/push-subscribe', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							endpoint: subscription.endpoint,
							keys: {
								auth: subscription.getKey('auth'),
								p256dh: subscription.getKey('p256dh'),
							},
						}),
					});

					await refreshState();
					onSubscriptionChange?.(true);
				} catch (serverErr) {
					console.error('[Push] Failed to save subscription to server:', serverErr);
					error = 'Subscription successful, but failed to save to server. Please refresh.';
				}
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			error = `Failed to subscribe: ${errorMsg}`;
			console.error('[Push] Subscribe error:', err);
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Handle unsubscribe button click
	 */
	async function handleUnsubscribe() {
		error = null;
		isLoading = true;

		try {
			await unsubscribeFromPush();

			// Notify server to remove subscription
			try {
				await fetch('/api/push-unsubscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						endpoint: pushState.subscription?.endpoint,
					}),
				});
			} catch (serverErr) {
				console.error('[Push] Failed to notify server of unsubscription:', serverErr);
			}

			await refreshState();
			onSubscriptionChange?.(false);
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Unknown error';
			error = `Failed to unsubscribe: ${errorMsg}`;
			console.error('[Push] Unsubscribe error:', err);
		} finally {
			isLoading = false;
		}
	}

	// Derived state
	const canEnable = $derived(
		pushState.supported && pushState.permission === 'granted' && !pushState.subscribed
	);
	const isSubscribed = $derived(pushState.subscribed);
	const isDenied = $derived(pushState.permission === 'denied');
	const isDefault = $derived(pushState.permission === 'default');
</script>

{#if show && pushState.supported && mounted}
	<div class={`push-notifications ${className}`}>
		{#if isSubscribed}
			<!-- Currently subscribed -->
			<div class="subscription-active">
				<div class="status-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
						/>
						<circle cx="12" cy="12" r="1" />
					</svg>
				</div>
				<div class="status-text">
					<h4>Notifications Enabled</h4>
					<p>You'll receive updates about new DMB shows and events</p>
				</div>
				<button
					class="unsubscribe-btn"
					onclick={handleUnsubscribe}
					disabled={isLoading}
					type="button"
					aria-label="Unsubscribe from notifications"
				>
					{isLoading ? 'Updating...' : 'Unsubscribe'}
				</button>
			</div>
		{:else if isDenied}
			<!-- Permission denied -->
			<div class="permission-denied">
				<div class="status-icon warning">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<div class="status-text">
					<h4>Notifications Blocked</h4>
					<p>Enable notifications in your browser settings to receive updates</p>
				</div>
			</div>
		{:else if canEnable || isDefault}
			<!-- Can subscribe or permission default -->
			<div class="subscription-prompt">
				<div class="status-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
						<path d="M14 14v4m2-2h-4" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
				<div class="status-text">
					<h4>Stay Updated</h4>
					<p>Get notified about new DMB shows, setlist updates, and almanac news</p>
				</div>
				<button
					class="subscribe-btn"
					onclick={handleSubscribe}
					disabled={isLoading}
					type="button"
					aria-label="Enable notifications"
				>
					{isLoading ? 'Enabling...' : 'Enable Notifications'}
				</button>
			</div>
		{/if}

		{#if error}
			<div class="error-message" role="alert">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				{error}
			</div>
		{/if}
	</div>
{/if}

<style>
	.push-notifications {
		margin: 1rem 0;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.subscription-active,
	.subscription-prompt,
	.permission-denied {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--color-surface-secondary, #f5f5f5);
		border: 1px solid var(--color-border, #e0e0e0);
		border-radius: 0.5rem;
	}

	.subscription-active {
		background: linear-gradient(135deg, #d4f8d4 0%, #e8f5e9 100%);
		border-color: #81c784;
	}

	.subscription-prompt {
		background: linear-gradient(135deg, #fff3cd 0%, #fffbea 100%);
		border-color: #ffc107;
	}

	.permission-denied {
		background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
		border-color: #f5c6cb;
	}

	.status-icon {
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 50%;
		color: #4caf50;
	}

	.status-icon.warning {
		color: #ff9800;
	}

	.status-text {
		flex: 1;
	}

	.status-text h4 {
		margin: 0 0 0.25rem 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary, #1a1a1a);
	}

	.status-text p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-secondary, #666);
	}

	.subscribe-btn,
	.unsubscribe-btn {
		flex-shrink: 0;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 200ms ease;
		background: white;
		color: #333;
		border: 1px solid #ddd;
	}

	.subscribe-btn {
		background: #4caf50;
		color: white;
		border-color: #4caf50;
	}

	.subscribe-btn:hover:not(:disabled) {
		background: #45a049;
		border-color: #45a049;
		box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
	}

	.unsubscribe-btn:hover:not(:disabled) {
		background: #f5f5f5;
		border-color: #999;
	}

	.subscribe-btn:disabled,
	.unsubscribe-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #ffebee;
		border: 1px solid #ffcdd2;
		border-radius: 0.375rem;
		color: #c62828;
		font-size: 0.85rem;
	}

	.error-message svg {
		flex-shrink: 0;
		color: #c62828;
	}

	@media (max-width: 640px) {
		.subscription-active,
		.subscription-prompt,
		.permission-denied {
			flex-wrap: wrap;
		}

		.status-text {
			flex-basis: 100%;
		}

		.subscribe-btn,
		.unsubscribe-btn {
			flex-basis: 100%;
			width: 100%;
		}
	}
</style>
