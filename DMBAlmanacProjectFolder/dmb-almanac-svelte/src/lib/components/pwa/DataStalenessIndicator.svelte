<script lang="ts">
	import { onMount } from 'svelte';
	import { getDb } from '$lib/db/dexie/db';
	import type { SyncMeta } from '$lib/db/dexie/schema';

	interface DataStalenessIndicatorProps {
		variant?: 'full' | 'compact' | 'badge';
		class?: string;
		onRefresh?: () => void | Promise<void>;
	}

	let { variant = 'full', class: className = '', onRefresh }: DataStalenessIndicatorProps =
		$props();

	let syncMeta = $state<SyncMeta | null>(null);
	let isRefreshing = $state(false);
	let now = $state(Date.now());

	// Update time every minute for accurate staleness display
	let intervalId = $state<ReturnType<typeof setInterval> | undefined>(undefined);

	// Derived values
	const lastSyncTime = $derived(syncMeta?.lastFullSync ?? syncMeta?.lastIncrementalSync ?? null);
	const timeSinceSync = $derived(lastSyncTime ? now - lastSyncTime : null);
	const isSyncStale = $derived(
		timeSinceSync !== null && timeSinceSync > 24 * 60 * 60 * 1000
	); // >24 hours
	const syncStatus = $derived(syncMeta?.syncStatus ?? 'idle');
	const isSyncing = $derived(syncStatus === 'syncing');

	// Format time since sync
	const timeSinceSyncFormatted = $derived.by(() => {
		if (timeSinceSync === null) return 'Never synced';

		const seconds = Math.floor(timeSinceSync / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days} day${days === 1 ? '' : 's'} ago`;
		}
		if (hours > 0) {
			return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		}
		if (minutes > 0) {
			return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
		}
		return 'Just now';
	});

	// Format last sync date
	const lastSyncDate = $derived.by(() => {
		if (!lastSyncTime) return null;
		const date = new Date(lastSyncTime);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	});

	onMount(() => {
		loadSyncMeta();

		// Update current time every minute
		intervalId = setInterval(() => {
			now = Date.now();
		}, 60000);

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	async function loadSyncMeta() {
		try {
			const db = getDb();
			await db.ensureOpen();
			syncMeta = (await db.getSyncMeta()) ?? null;
		} catch (error) {
			console.error('[DataStalenessIndicator] Failed to load sync meta:', error);
		}
	}

	async function handleRefresh() {
		if (isRefreshing || isSyncing) return;

		isRefreshing = true;

		try {
			if (onRefresh) {
				await onRefresh();
			}
			// Reload sync meta after refresh
			await loadSyncMeta();
		} catch (error) {
			console.error('[DataStalenessIndicator] Refresh failed:', error);
		} finally {
			isRefreshing = false;
		}
	}
</script>

{#if variant === 'badge'}
	<div class="badge {className}" class:stale={isSyncStale} class:syncing={isSyncing}>
		{#if isSyncing}
			<svg
				class="spinner"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</svg>
			<span>Syncing...</span>
		{:else if isSyncStale}
			<svg
				class="icon-warning"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path
					d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
				/>
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>
			<span>Data may be outdated</span>
		{:else}
			<svg
				class="icon-check"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<polyline points="20 6 9 17 4 12" />
			</svg>
			<span>Up to date</span>
		{/if}
	</div>
{:else if variant === 'compact'}
	<div class="compact {className}">
		<div class="compact-status" class:stale={isSyncStale} class:syncing={isSyncing}>
			{#if isSyncing}
				<svg
					class="compact-icon spinner"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M21 12a9 9 0 1 1-6.219-8.56" />
				</svg>
			{:else if isSyncStale}
				<svg
					class="compact-icon icon-warning"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			{:else}
				<svg
					class="compact-icon icon-check"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<polyline points="20 6 9 17 4 12" />
				</svg>
			{/if}
			<span class="compact-time">{timeSinceSyncFormatted}</span>
		</div>
		{#if !isSyncing}
			<button
				type="button"
				class="compact-refresh"
				onclick={handleRefresh}
				disabled={isRefreshing}
				aria-label="Refresh data"
			>
				<svg
					class="refresh-icon"
					class:spinning={isRefreshing}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<polyline points="23 4 23 10 17 10" />
					<polyline points="1 20 1 14 7 14" />
					<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
				</svg>
			</button>
		{/if}
	</div>
{:else}
	<div class="container {className}">
		<div class="header">
			<div class="status" class:stale={isSyncStale} class:syncing={isSyncing}>
				{#if isSyncing}
					<svg
						class="status-icon spinner"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
					<span class="status-text">Syncing data...</span>
				{:else if isSyncStale}
					<svg
						class="status-icon icon-warning"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path
							d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
						/>
						<line x1="12" y1="9" x2="12" y2="13" />
						<line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
					<span class="status-text">Data may be outdated</span>
				{:else}
					<svg
						class="status-icon icon-check"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span class="status-text">Data is up to date</span>
				{/if}
			</div>

			{#if !isSyncing}
				<button
					type="button"
					class="refresh-button"
					onclick={handleRefresh}
					disabled={isRefreshing}
					aria-label="Refresh data now"
				>
					<svg
						class="refresh-icon"
						class:spinning={isRefreshing}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<polyline points="23 4 23 10 17 10" />
						<polyline points="1 20 1 14 7 14" />
						<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
					</svg>
					{isRefreshing ? 'Refreshing...' : 'Refresh Now'}
				</button>
			{/if}
		</div>

		<div class="details">
			<div class="detail-item">
				<span class="detail-label">Last synced:</span>
				<span class="detail-value">{lastSyncDate ?? 'Never'}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">Time elapsed:</span>
				<span class="detail-value">{timeSinceSyncFormatted}</span>
			</div>
			{#if syncMeta?.recordCounts}
				<div class="detail-item">
					<span class="detail-label">Shows cached:</span>
					<span class="detail-value">{syncMeta.recordCounts.shows.toLocaleString()}</span>
				</div>
			{/if}
		</div>

		{#if isSyncStale}
			<div class="warning-box" role="alert">
				<svg
					class="warning-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<p class="warning-text">
					Your data hasn't been synced in over 24 hours. Some information may be outdated. Consider
					refreshing to get the latest data.
				</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Badge variant */
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		background: var(--color-green-100);
		color: var(--color-green-700);
		border: 1px solid var(--color-green-200);
	}

	.badge.stale {
		background: var(--color-amber-100);
		color: var(--color-amber-700);
		border-color: var(--color-amber-200);
	}

	.badge.syncing {
		background: var(--color-blue-100);
		color: var(--color-blue-700);
		border-color: var(--color-blue-200);
	}

	.badge svg {
		width: 12px;
		height: 12px;
	}

	/* Compact variant */
	.compact {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.compact-status {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-green-600);
	}

	.compact-status.stale {
		color: var(--color-amber-600);
	}

	.compact-status.syncing {
		color: var(--color-blue-600);
	}

	.compact-icon {
		width: 14px;
		height: 14px;
	}

	.compact-time {
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
	}

	.compact-refresh {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-1);
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		color: var(--foreground-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.compact-refresh:hover:not(:disabled) {
		background: var(--background-secondary);
		color: var(--foreground);
	}

	.compact-refresh:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.compact-refresh .refresh-icon {
		width: 14px;
		height: 14px;
	}

	/* Full variant */
	.container {
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-3);
	}

	.status {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.status-icon {
		width: 20px;
		height: 20px;
	}

	.icon-check {
		color: var(--color-green-500);
	}

	.icon-warning {
		color: var(--color-amber-500);
	}

	.status-text {
		font-size: var(--text-base);
		font-weight: var(--font-medium);
		color: var(--foreground);
	}

	.status.stale .status-text {
		color: var(--color-amber-700);
	}

	.status.syncing .status-text {
		color: var(--color-blue-700);
	}

	.refresh-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-primary-500);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.refresh-button:hover:not(:disabled) {
		background: var(--color-primary-600);
	}

	.refresh-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.refresh-icon {
		width: 16px;
		height: 16px;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--background);
		border-radius: var(--radius-md);
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-sm);
	}

	.detail-label {
		color: var(--foreground-secondary);
	}

	.detail-value {
		font-weight: var(--font-medium);
		color: var(--foreground);
	}

	.warning-box {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--color-amber-50);
		border: 1px solid var(--color-amber-200);
		border-radius: var(--radius-md);
		margin-top: var(--space-3);
	}

	.warning-icon {
		width: 20px;
		height: 20px;
		color: var(--color-amber-500);
		flex-shrink: 0;
	}

	.warning-text {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-amber-900);
		line-height: 1.5;
	}

	/* Spinner animation */
	.spinner {
		animation: spin 1s linear infinite;
	}

	.spinning {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner,
		.spinning {
			animation: none;
		}
	}

	/* Dark mode adjustments */
	@media (prefers-color-scheme: dark) {
		.badge {
			background: var(--color-green-900);
			color: var(--color-green-200);
			border-color: var(--color-green-700);
		}

		.badge.stale {
			background: var(--color-amber-900);
			color: var(--color-amber-200);
			border-color: var(--color-amber-700);
		}

		.badge.syncing {
			background: var(--color-blue-900);
			color: var(--color-blue-200);
			border-color: var(--color-blue-700);
		}

		.warning-box {
			background: var(--color-amber-950);
			border-color: var(--color-amber-800);
		}

		.warning-text {
			color: var(--color-amber-200);
		}

		.status.stale .status-text {
			color: var(--color-amber-300);
		}

		.status.syncing .status-text {
			color: var(--color-blue-300);
		}
	}
</style>
