<script lang="ts">
	import { browser } from '$app/environment';

	interface StorageQuotaMonitorProps {
		/** Threshold percentage to show warning (0-100) */
		warningThreshold?: number;
		/** Check interval in milliseconds */
		checkInterval?: number;
		/** Whether the component should be visible */
		visible?: boolean;
		/** Additional CSS class */
		class?: string;
	}

	let {
		warningThreshold = 80,
		checkInterval = 5 * 60 * 1000, // 5 minutes
		visible = true,
		class: className = ''
	}: StorageQuotaMonitorProps = $props();

	// State
	let usageBytes = $state(0);
	let quotaBytes = $state(0);
	let isSupported = $state(false);
	let showNotification = $state(false);
	let notificationType = $state<'warning' | 'exceeded' | 'cleared'>('warning');
	let isDismissed = $state(false);
	let isClearingCache = $state(false);
	let clearError = $state<string | null>(null);

	// Derived values
	let usagePercent = $derived(quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : 0);
	let isOverThreshold = $derived(usagePercent >= warningThreshold);
	let isQuotaExceeded = $derived(usagePercent >= 95);

	let formattedUsage = $derived(formatBytes(usageBytes));
	let formattedQuota = $derived(formatBytes(quotaBytes));

	let notificationMessage = $derived.by(() => {
		if (notificationType === 'exceeded') {
			return `Storage quota nearly exceeded (${usagePercent}% used). Clear old caches to free up space.`;
		} else if (notificationType === 'cleared') {
			return `Cache cleared successfully. Storage now at ${usagePercent}% used.`;
		} else {
			return `Storage usage is high (${usagePercent}% used). Consider clearing old caches.`;
		}
	});

	/**
	 * Format bytes to human-readable string
	 */
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
	}

	/**
	 * Check storage quota using Storage API
	 */
	async function checkStorageQuota(): Promise<void> {
		if (!browser || !('storage' in navigator) || !('estimate' in navigator.storage)) {
			return;
		}

		try {
			const estimate = await navigator.storage.estimate();
			usageBytes = estimate.usage || 0;
			quotaBytes = estimate.quota || 0;

			// Show notification if over threshold and not dismissed
			if (!isDismissed) {
				if (isQuotaExceeded) {
					notificationType = 'exceeded';
					showNotification = true;
				} else if (isOverThreshold) {
					notificationType = 'warning';
					showNotification = true;
				}
			}
		} catch (err) {
			console.error('[StorageQuotaMonitor] Failed to check storage quota:', err);
		}
	}

	/**
	 * Handle dexie-quota-exceeded custom event
	 */
	function handleQuotaExceeded(event: CustomEvent): void {
		console.warn('[StorageQuotaMonitor] Quota exceeded event received:', event.detail);
		notificationType = 'exceeded';
		showNotification = true;
		isDismissed = false;

		// Refresh quota info
		checkStorageQuota();
	}

	/**
	 * Clear old caches to free up space
	 */
	async function clearOldCaches(): Promise<void> {
		if (!browser || !('caches' in window)) {
			clearError = 'Cache API not supported';
			return;
		}

		isClearingCache = true;
		clearError = null;

		try {
			const cacheNames = await caches.keys();

			// Filter to only clear offline-* caches (user-initiated downloads)
			// Preserve service worker runtime caches
			const offlineCaches = cacheNames.filter(
				(name) => name.startsWith('offline-') || name.includes('-precache-')
			);

			if (offlineCaches.length === 0) {
				clearError = 'No cached data to clear';
				isClearingCache = false;
				return;
			}

			// Delete each cache
			const deletePromises = offlineCaches.map((cacheName) => caches.delete(cacheName));
			await Promise.all(deletePromises);

			console.log(`[StorageQuotaMonitor] Cleared ${offlineCaches.length} caches`);

			// Refresh quota info
			await checkStorageQuota();

			// Show success notification
			notificationType = 'cleared';
			showNotification = true;

			// Auto-dismiss success after 3 seconds
			setTimeout(() => {
				if (notificationType === 'cleared') {
					showNotification = false;
				}
			}, 3000);
		} catch (err) {
			console.error('[StorageQuotaMonitor] Failed to clear caches:', err);
			clearError = err instanceof Error ? err.message : 'Failed to clear caches';
		} finally {
			isClearingCache = false;
		}
	}

	/**
	 * Dismiss the notification
	 */
	function handleDismiss(): void {
		showNotification = false;
		isDismissed = true;
	}

	// Effect: Initialize and set up periodic checks
	$effect(() => {
		if (!browser) return;

		// Check if Storage API is supported
		isSupported = 'storage' in navigator && 'estimate' in navigator.storage;

		if (!isSupported) return;

		// Initial check
		checkStorageQuota();

		// Set up periodic checking
		const intervalId = setInterval(checkStorageQuota, checkInterval);

		// Listen for quota exceeded events
		const quotaHandler = (e: Event) => handleQuotaExceeded(e as CustomEvent);
		window.addEventListener('dexie-quota-exceeded', quotaHandler);

		// Cleanup
		return () => {
			clearInterval(intervalId);
			window.removeEventListener('dexie-quota-exceeded', quotaHandler);
		};
	});

	// Effect: Reset dismissed state when crossing threshold
	$effect(() => {
		// If usage drops below threshold, reset dismissed state
		if (!isOverThreshold && isDismissed) {
			isDismissed = false;
		}
	});
</script>

{#if isSupported && visible}
	<!-- Storage Usage Display (always visible when component is visible) -->
	<div class="storage-indicator {className}" data-usage-level={isQuotaExceeded ? 'exceeded' : isOverThreshold ? 'warning' : 'normal'}>
		<div class="usage-bar-wrapper">
			<div
				class="usage-bar"
				style="--usage-percent: {usagePercent}%"
				role="progressbar"
				aria-valuenow={usagePercent}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Storage usage: {usagePercent}%"
			></div>
		</div>
		<span class="usage-text">
			{formattedUsage} / {formattedQuota} ({usagePercent}%)
		</span>
	</div>

	<!-- Toast Notification -->
	{#if showNotification}
		<div
			class="toast-notification"
			class:warning={notificationType === 'warning'}
			class:exceeded={notificationType === 'exceeded'}
			class:success={notificationType === 'cleared'}
			role="alert"
			aria-live="polite"
		>
			<div class="toast-content">
				<div class="toast-icon-wrapper">
					{#if notificationType === 'cleared'}
						<svg class="toast-icon success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					{:else if notificationType === 'exceeded'}
						<svg class="toast-icon error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
					{:else}
						<svg class="toast-icon warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
					{/if}
				</div>

				<div class="toast-body">
					<p class="toast-message">{notificationMessage}</p>

					{#if clearError}
						<p class="toast-error">{clearError}</p>
					{/if}

					<div class="toast-meta">
						<span>{formattedUsage} of {formattedQuota} used</span>
					</div>
				</div>
			</div>

			<div class="toast-actions">
				{#if notificationType !== 'cleared'}
					<button
						type="button"
						class="clear-cache-btn"
						onclick={clearOldCaches}
						disabled={isClearingCache}
						aria-label="Clear old caches to free up storage"
					>
						{#if isClearingCache}
							<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32" />
							</svg>
							Clearing...
						{:else}
							<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<polyline points="3 6 5 6 21 6" />
								<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							</svg>
							Clear Caches
						{/if}
					</button>
				{/if}

				<button
					type="button"
					class="dismiss-btn"
					onclick={handleDismiss}
					aria-label="Dismiss notification"
				>
					<svg class="dismiss-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	/* Storage Indicator Bar */
	.storage-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
	}

	.usage-bar-wrapper {
		flex: 1;
		min-width: 60px;
		max-width: 120px;
		height: 6px;
		background: var(--background-tertiary);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.usage-bar {
		height: 100%;
		width: var(--usage-percent, 0%);
		background: var(--color-success);
		border-radius: var(--radius-full);
		transition: width var(--transition-normal), background-color var(--transition-normal);
	}

	/* Warning state (80%+) */
	.storage-indicator[data-usage-level='warning'] .usage-bar {
		background: var(--color-warning);
	}

	.storage-indicator[data-usage-level='warning'] {
		border-color: color-mix(in oklch, var(--color-warning) 30%, var(--border-color));
	}

	/* Exceeded state (95%+) */
	.storage-indicator[data-usage-level='exceeded'] .usage-bar {
		background: var(--color-error);
	}

	.storage-indicator[data-usage-level='exceeded'] {
		border-color: color-mix(in oklch, var(--color-error) 30%, var(--border-color));
	}

	.usage-text {
		white-space: nowrap;
	}

	/* Toast Notification */
	.toast-notification {
		position: fixed;
		bottom: var(--space-4);
		right: var(--space-4);
		left: var(--space-4);
		max-width: 420px;
		margin-left: auto;
		padding: var(--space-4);
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xl);
		z-index: var(--z-tooltip);

		/* Entry animation */
		animation: toast-slide-in var(--motion-normal) var(--ease-out) both;
	}

	@keyframes toast-slide-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.toast-notification.warning {
		border-color: var(--color-warning);
		background: color-mix(in oklch, var(--color-warning-bg) 50%, var(--background));
	}

	.toast-notification.exceeded {
		border-color: var(--color-error);
		background: color-mix(in oklch, var(--color-error-bg) 50%, var(--background));
	}

	.toast-notification.success {
		border-color: var(--color-success);
		background: color-mix(in oklch, var(--color-success-bg) 50%, var(--background));
	}

	.toast-content {
		display: flex;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.toast-icon-wrapper {
		flex-shrink: 0;
	}

	.toast-icon {
		width: 24px;
		height: 24px;
	}

	.warning-icon {
		color: var(--color-warning);
	}

	.error-icon {
		color: var(--color-error);
	}

	.success-icon {
		color: var(--color-success);
	}

	.toast-body {
		flex: 1;
		min-width: 0;
	}

	.toast-message {
		margin: 0 0 var(--space-1);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground);
		line-height: var(--leading-snug);
	}

	.toast-error {
		margin: 0 0 var(--space-1);
		font-size: var(--text-xs);
		color: var(--color-error);
	}

	.toast-meta {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
	}

	.toast-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		justify-content: flex-end;
	}

	.clear-cache-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-primary-600);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: background-color var(--transition-fast), transform var(--transition-fast);
	}

	.clear-cache-btn:hover:not(:disabled) {
		background: var(--color-primary-700);
	}

	.clear-cache-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.clear-cache-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-icon {
		width: 16px;
		height: 16px;
	}

	.spinner {
		width: 16px;
		height: 16px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2);
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--foreground-muted);
		transition: all var(--transition-fast);
	}

	.dismiss-btn:hover {
		background: var(--background-secondary);
		color: var(--foreground);
		border-color: var(--border-color-strong);
	}

	.dismiss-icon {
		width: 16px;
		height: 16px;
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.toast-notification.warning {
			background: color-mix(in oklch, var(--color-warning) 10%, var(--background));
		}

		.toast-notification.exceeded {
			background: color-mix(in oklch, var(--color-error) 10%, var(--background));
		}

		.toast-notification.success {
			background: color-mix(in oklch, var(--color-success) 10%, var(--background));
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.toast-notification {
			animation: none;
		}

		.spinner {
			animation: none;
		}

		.usage-bar {
			transition: none;
		}
	}

	/* Mobile responsive */
	@media (max-width: 480px) {
		.toast-notification {
			right: var(--space-2);
			left: var(--space-2);
			bottom: var(--space-2);
			padding: var(--space-3);
		}

		.toast-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.clear-cache-btn,
		.dismiss-btn {
			justify-content: center;
		}
	}

	/* High contrast mode support */
	@media (forced-colors: active) {
		.toast-notification {
			border: 2px solid CanvasText;
		}

		.clear-cache-btn {
			border: 1px solid ButtonText;
		}

		.usage-bar {
			background: Highlight;
		}
	}
</style>
