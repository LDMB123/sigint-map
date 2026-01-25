<script lang="ts">
	/**
	 * DataFreshnessIndicator - A small, unobtrusive indicator for data freshness
	 *
	 * Shows:
	 * - When data is stale (last sync > 24 hours ago)
	 * - When user is offline and viewing cached data
	 * - Relative time since last sync
	 * - Option to trigger manual sync
	 *
	 * Integrates with:
	 * - pwaState store for offline detection
	 * - Dexie syncMeta table for last sync time
	 */

	import { browser } from '$app/environment';
	import { getDb } from '$lib/db/dexie/db';
	import type { SyncMeta } from '$lib/db/dexie/schema';
	import { pwaState } from '$lib/stores/pwa';

	// Props
	interface DataFreshnessIndicatorProps {
		/** Callback to trigger manual sync */
		onSync?: () => void | Promise<void>;
		/** Additional CSS classes */
		class?: string;
		/** Show expanded details on hover */
		showDetails?: boolean;
		/** Stale threshold in hours (default: 24) */
		staleThresholdHours?: number;
	}

	let {
		onSync,
		class: className = '',
		showDetails = true,
		staleThresholdHours = 24
	}: DataFreshnessIndicatorProps = $props();

	// State
	let syncMeta = $state<SyncMeta | null>(null);
	let isSyncing = $state(false);
	let now = $state(Date.now());
	let isHovered = $state(false);

	// Computed: stale threshold in milliseconds
	const staleThresholdMs = $derived(staleThresholdHours * 60 * 60 * 1000);

	// Computed: last sync timestamp
	const lastSyncTime = $derived(syncMeta?.lastFullSync ?? syncMeta?.lastIncrementalSync ?? null);

	// Computed: time since last sync in milliseconds
	const timeSinceSync = $derived(lastSyncTime ? now - lastSyncTime : null);

	// Computed: is data stale?
	const isStale = $derived(timeSinceSync !== null && timeSinceSync > staleThresholdMs);

	// Computed: current sync status from meta
	const syncStatus = $derived(syncMeta?.syncStatus ?? 'idle');
	const isCurrentlySyncing = $derived(syncStatus === 'syncing' || isSyncing);

	// Subscribe to pwaState for offline status
	let isOffline = $state(false);
	$effect(() => {
		if (!browser) return;
		const unsubscribe = pwaState.subscribe((state) => {
			isOffline = state.isOffline;
		});
		return unsubscribe;
	});

	// Computed: relative time string
	const relativeTime = $derived.by(() => {
		if (timeSinceSync === null) return 'Never synced';

		const seconds = Math.floor(timeSinceSync / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days}d ago`;
		}
		if (hours > 0) {
			return `${hours}h ago`;
		}
		if (minutes > 0) {
			return `${minutes}m ago`;
		}
		return 'Just now';
	});

	// Computed: detailed time string for tooltip
	const detailedTime = $derived.by(() => {
		if (!lastSyncTime) return 'Data has never been synced';
		const date = new Date(lastSyncTime);
		return `Last synced: ${date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		})}`;
	});

	// Computed: status indicator type
	const statusType = $derived.by((): 'offline' | 'stale' | 'syncing' | 'fresh' => {
		if (isCurrentlySyncing) return 'syncing';
		if (isOffline) return 'offline';
		if (isStale) return 'stale';
		return 'fresh';
	});

	// Computed: status label
	const statusLabel = $derived.by(() => {
		switch (statusType) {
			case 'offline':
				return 'Offline';
			case 'stale':
				return 'Stale';
			case 'syncing':
				return 'Syncing';
			case 'fresh':
				return 'Fresh';
		}
	});

	// Load sync meta on mount
	$effect(() => {
		if (!browser) return;
		loadSyncMeta();
	});

	// Update time every minute
	$effect(() => {
		if (!browser) return;
		const interval = setInterval(() => {
			now = Date.now();
		}, 60000);
		return () => clearInterval(interval);
	});

	// Functions
	async function loadSyncMeta() {
		try {
			const db = getDb();
			await db.ensureOpen();
			syncMeta = (await db.getSyncMeta()) ?? null;
		} catch (error) {
			console.error('[DataFreshnessIndicator] Failed to load sync meta:', error);
		}
	}

	async function handleSync() {
		if (isCurrentlySyncing || isOffline || !onSync) return;

		isSyncing = true;
		try {
			await onSync();
			await loadSyncMeta();
			now = Date.now();
		} catch (error) {
			console.error('[DataFreshnessIndicator] Sync failed:', error);
		} finally {
			isSyncing = false;
		}
	}
</script>

<div
	class="freshness-indicator {className}"
	class:offline={statusType === 'offline'}
	class:stale={statusType === 'stale'}
	class:syncing={statusType === 'syncing'}
	class:fresh={statusType === 'fresh'}
	role="status"
	aria-label="Data freshness: {statusLabel}"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<!-- Status dot -->
	<span class="status-dot" aria-hidden="true"></span>

	<!-- Main content -->
	<span class="status-content">
		{#if statusType === 'offline'}
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<line x1="1" y1="1" x2="23" y2="23" />
				<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
				<path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
				<path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
				<path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
				<path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
				<line x1="12" y1="20" x2="12.01" y2="20" />
			</svg>
			<span class="label">Offline</span>
		{:else if statusType === 'syncing'}
			<svg class="icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</svg>
			<span class="label">Syncing</span>
		{:else}
			<span class="time">{relativeTime}</span>
		{/if}
	</span>

	<!-- Sync button (only if onSync provided and not offline) -->
	{#if onSync && !isOffline && !isCurrentlySyncing}
		<button
			type="button"
			class="sync-button"
			onclick={handleSync}
			aria-label="Sync data now"
			title="Sync data"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<polyline points="23 4 23 10 17 10" />
				<polyline points="1 20 1 14 7 14" />
				<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
			</svg>
		</button>
	{/if}

	<!-- Tooltip on hover -->
	{#if showDetails && isHovered}
		<div class="tooltip" role="tooltip">
			<p class="tooltip-time">{detailedTime}</p>
			{#if isOffline}
				<p class="tooltip-status">Viewing cached data</p>
			{:else if isStale}
				<p class="tooltip-status">Data may be outdated</p>
			{/if}
			{#if syncMeta?.recordCounts}
				<p class="tooltip-counts">
					{syncMeta.recordCounts.shows.toLocaleString()} shows cached
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.freshness-indicator {
		--indicator-bg: var(--color-surface-secondary, oklch(0.25 0 0));
		--indicator-border: var(--color-border, oklch(0.35 0 0));
		--indicator-text: var(--color-text-secondary, oklch(0.7 0 0));
		--dot-color: var(--color-success, oklch(0.7 0.2 145));

		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		background: var(--indicator-bg);
		border: 1px solid var(--indicator-border);
		border-radius: 9999px;
		font-size: 0.75rem;
		line-height: 1;
		color: var(--indicator-text);
		user-select: none;
	}

	/* Status-specific styles */
	.freshness-indicator.offline {
		--dot-color: var(--color-warning, oklch(0.75 0.15 75));
		--indicator-border: oklch(0.5 0.1 75 / 0.3);
	}

	.freshness-indicator.stale {
		--dot-color: var(--color-warning, oklch(0.75 0.15 75));
		--indicator-border: oklch(0.5 0.1 75 / 0.3);
	}

	.freshness-indicator.syncing {
		--dot-color: var(--color-info, oklch(0.7 0.15 230));
		--indicator-border: oklch(0.5 0.1 230 / 0.3);
	}

	.freshness-indicator.fresh {
		--dot-color: var(--color-success, oklch(0.7 0.2 145));
	}

	/* Status dot */
	.status-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--dot-color);
		flex-shrink: 0;
	}

	.freshness-indicator.syncing .status-dot {
		animation: pulse 1.5s ease-in-out infinite;
	}

	/* Content */
	.status-content {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.icon {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
	}

	.spinning {
		animation: spin 1s linear infinite;
	}

	.label {
		font-weight: 500;
	}

	.time {
		font-variant-numeric: tabular-nums;
	}

	/* Sync button */
	.sync-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		margin-left: 0.125rem;
		background: transparent;
		border: none;
		border-radius: 50%;
		color: var(--indicator-text);
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.15s ease, background 0.15s ease;
	}

	.sync-button:hover {
		opacity: 1;
		background: oklch(0.5 0 0 / 0.15);
	}

	.sync-button:active {
		background: oklch(0.5 0 0 / 0.25);
	}

	.sync-button svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		min-width: 10rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-elevated, oklch(0.2 0 0));
		border: 1px solid var(--color-border, oklch(0.35 0 0));
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px oklch(0 0 0 / 0.3);
		z-index: 100;
		pointer-events: none;
	}

	.tooltip::before {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 0.375rem solid transparent;
		border-bottom-color: var(--color-border, oklch(0.35 0 0));
	}

	.tooltip::after {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 0.3125rem solid transparent;
		border-bottom-color: var(--color-surface-elevated, oklch(0.2 0 0));
	}

	.tooltip p {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.4;
		white-space: nowrap;
	}

	.tooltip-time {
		color: var(--color-text-primary, oklch(0.9 0 0));
		font-weight: 500;
	}

	.tooltip-status {
		color: var(--dot-color);
		margin-top: 0.25rem;
	}

	.tooltip-counts {
		color: var(--color-text-tertiary, oklch(0.6 0 0));
		margin-top: 0.25rem;
	}

	/* Animations */
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.spinning,
		.status-dot {
			animation: none;
		}
	}
</style>
