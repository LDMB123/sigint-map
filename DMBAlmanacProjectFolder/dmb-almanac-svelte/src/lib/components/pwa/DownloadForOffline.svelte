<script lang="ts">
	import { onMount } from 'svelte';

	interface DownloadForOfflineProps {
		type: 'tour' | 'venue' | 'dateRange';
		identifier: string;
		label: string;
		compact?: boolean;
		class?: string;
	}

	let {
		type,
		identifier,
		label,
		compact = false,
		class: className = ''
	}: DownloadForOfflineProps = $props();

	let isSupported = $state(false);
	let isDownloading = $state(false);
	let progress = $state(0);
	let progressState = $state<'idle' | 'indeterminate' | 'determinate'>('idle');
	let error: string | null = $state(null);
	let isCompleted = $state(false);
	let isFailed = $state(false);
	let cachedUrls = $state(0);
	let totalUrls = $state(0);
	let actualSize = $state(0);
	let quota: { usage: number; total: number; isLow: boolean; usagePercent: number } | null = $state(null);

	const downloadState = $derived(
		isCompleted
			? 'completed'
			: isDownloading
				? 'downloading'
				: isFailed
					? 'failed'
					: 'idle'
	);

	onMount(() => {
		isSupported = 'caches' in window && 'serviceWorker' in navigator;
		if (isSupported) {
			loadInitialState();
		}
	});

	async function loadInitialState() {
		try {
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				const usage = estimate.usage || 0;
				const qta = estimate.quota || 1000000;
				quota = {
					usage,
					total: qta,
					isLow: usage / qta > 0.9,
					usagePercent: Math.round((usage / qta) * 100)
				};
			}
		} catch (err) {
			console.error('[DownloadForOffline] Failed to load state:', err);
		}
	}

	/**
	 * Get URLs to cache based on type and identifier
	 */
	async function getUrlsToCache(): Promise<string[]> {
		const urls: string[] = [];

		switch (type) {
			case 'tour': {
				// Cache tour page and all shows in that tour
				urls.push(`/tours/${identifier}`);
				// Note: In a real implementation, we'd fetch the tour's shows from IndexedDB
				// and add their URLs. For now, we cache the main tour page.
				break;
			}
			case 'venue': {
				// Cache venue page and venue-related data
				urls.push(`/venues/${identifier}`);
				break;
			}
			case 'dateRange': {
				// Cache shows within date range
				// Format: "2024-01-01_2024-12-31"
				const [startDate, endDate] = identifier.split('_');
				urls.push(`/shows?start=${startDate}&end=${endDate}`);
				break;
			}
		}

		return urls;
	}

	async function handleDownload() {
		if (isDownloading || !isSupported) return;

		error = null;
		isDownloading = true;
		progress = 0;
		progressState = 'indeterminate';
		cachedUrls = 0;
		totalUrls = 0;
		actualSize = 0;

		try {
			const cacheName = `offline-${type}-${identifier}`;
			const cache = await caches.open(cacheName);

			// Get URLs to cache
			const urlsToCache = await getUrlsToCache();
			totalUrls = urlsToCache.length;

			if (totalUrls === 0) {
				throw new Error('No content available to download');
			}

			progressState = 'determinate';

			// Cache each URL with progress tracking
			for (let i = 0; i < urlsToCache.length; i++) {
				const url = urlsToCache[i];
				try {
					const response = await fetch(url);
					if (response.ok) {
						// Clone response to read size and cache
						const clone = response.clone();
						await cache.put(url, response);

						// Try to estimate size from response
						const blob = await clone.blob();
						actualSize += blob.size;

						cachedUrls = i + 1;
						progress = ((i + 1) / totalUrls) * 100;
					} else {
						console.warn(`[DownloadForOffline] Failed to fetch ${url}: ${response.status}`);
					}
				} catch (fetchErr) {
					console.warn(`[DownloadForOffline] Error caching ${url}:`, fetchErr);
					// Continue with other URLs even if one fails
				}

				// Yield to main thread periodically for better UX
				if (i % 5 === 0 && 'scheduler' in globalThis && 'yield' in (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler!) {
					await (globalThis as { scheduler: { yield: () => Promise<void> } }).scheduler.yield();
				}
			}

			progress = 100;
			isDownloading = false;
			isCompleted = cachedUrls > 0;
			isFailed = cachedUrls === 0;

			if (cachedUrls === 0) {
				throw new Error('Failed to cache any content');
			}

			// Update storage quota info
			if ('storage' in navigator && 'estimate' in navigator.storage) {
				const estimate = await navigator.storage.estimate();
				const usage = estimate.usage || 0;
				const qta = estimate.quota || 1000000;
				quota = {
					usage,
					total: qta,
					isLow: usage / qta > 0.9,
					usagePercent: Math.round((usage / qta) * 100)
				};
			}

			// Debug info: Use console.info for successful completion logging
			if (import.meta.env.DEV) {
				// eslint-disable-next-line no-console
				console.log(`[DownloadForOffline] Cached ${cachedUrls}/${totalUrls} URLs (${formatBytes(actualSize)})`);
			}
		} catch (err) {
			console.error('[DownloadForOffline] Download failed:', err);
			error = err instanceof Error ? err.message : 'Download failed';
			isDownloading = false;
			isFailed = true;
			isCompleted = false;
		}
	}

	async function handleDelete() {
		try {
			const cacheName = `offline-${type}-${identifier}`;
			await caches.delete(cacheName);
			isCompleted = false;
			cachedUrls = 0;
			actualSize = 0;
		} catch (err) {
			console.error('[DownloadForOffline] Delete failed:', err);
			error = err instanceof Error ? err.message : 'Failed to remove download';
		}
	}

	function handleCancel() {
		isDownloading = false;
		progress = 0;
		progressState = 'idle';
	}

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
	}
</script>

{#if !isSupported}
	<!-- Unsupported browser, render nothing -->
{:else if compact}
	<div class="compact-wrapper {className}">
		{#if isCompleted}
			<button
				type="button"
				class="compact-button"
				onclick={handleDelete}
				aria-label="Remove {label} from offline storage"
				title="Remove from offline"
			>
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
					<line x1="4" y1="4" x2="20" y2="20" class="strikethrough" />
				</svg>
				<span class="compact-label">Downloaded</span>
			</button>
		{:else if isDownloading}
			<div class="compact-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
				<span class="compact-label">{Math.round(progress)}%</span>
				<button type="button" class="cancel-icon-button" onclick={handleCancel} aria-label="Cancel download">
					<svg class="cancel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		{:else}
			<button
				type="button"
				class="compact-button"
				onclick={handleDownload}
				aria-label="Download {label} for offline access"
				title="Download for offline"
			>
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				<span class="compact-label">Download</span>
			</button>
		{/if}
	</div>
{:else}
	<div class="container {className}" data-download-state={downloadState}>
		<div class="header">
			<h3 class="title">
				<svg class="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				Download for Offline
			</h3>
		</div>

		{#if error}
			<div class="error" role="alert">
				<svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				{error}
			</div>
		{/if}

		<div class="content">
			{#if isCompleted}
				<div class="completed-badge">
					<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span>Available Offline</span>
				</div>
				<p class="description">{label} is saved and can be accessed without internet.</p>
				<div class="meta">
					<span>{cachedUrls} pages cached</span>
					{#if actualSize > 0}
						<span>{formatBytes(actualSize)}</span>
					{/if}
				</div>
				<button type="button" class="delete-button" onclick={handleDelete} aria-label="Remove {label} from offline storage">
					<svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
					Remove Download
				</button>
			{:else if isDownloading}
				<p class="description">Downloading {label} for offline access...</p>
				<div
					class="progress-wrapper"
					role="progressbar"
					aria-valuenow={progressState === 'determinate' ? Math.round(progress) : undefined}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label={progressState === 'indeterminate' ? 'Downloading...' : `Download progress: ${Math.round(progress)}%`}
				>
					<div class="progress-bar" data-state={progressState} style="--progress: {progress / 100}"></div>
				</div>
				<div class="progress-text" aria-live="polite" aria-atomic="true">
					<span>{Math.round(progress)}%</span>
					<span>{cachedUrls} / {totalUrls} pages</span>
				</div>
				<button type="button" class="cancel-button" onclick={handleCancel} aria-label="Cancel download">
					<svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
					Cancel
				</button>
			{:else}
				<p class="description">Save {label} to access it without internet connection.</p>
				{#if quota}
					<div class="quota-info" class:low={quota.isLow}>
						<span>Storage: {quota.usagePercent}% used</span>
					</div>
				{/if}
				<button type="button" class="download-button" onclick={handleDownload} aria-label="Download {label} for offline access">
					<svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					Download
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.container {
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.header {
		margin-bottom: var(--space-3);
	}

	.title {
		display: flex;
		place-items: center;
		gap: var(--space-2);
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.title-icon {
		width: 20px;
		height: 20px;
		color: var(--color-primary-500);
	}

	.description {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-3);
	}

	.error {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		background: var(--color-red-50);
		border: 1px solid var(--color-red-200);
		border-radius: var(--radius-md);
		color: var(--color-red-700);
		font-size: var(--text-sm);
		margin-bottom: var(--space-3);
	}

	.error-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.completed-badge {
		display: inline-flex;
		place-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--color-green-100);
		color: var(--color-green-700);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		margin-bottom: var(--space-2);
	}

	.check-icon {
		width: 14px;
		height: 14px;
	}

	.meta {
		display: flex;
		gap: var(--space-3);
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		margin-bottom: var(--space-3);
	}

	.progress-wrapper {
		height: 8px;
		background: var(--background-tertiary);
		border-radius: var(--radius-full);
		overflow: hidden;
		margin-bottom: var(--space-2);
	}

	.progress-bar {
		height: 100%;
		width: 100%;
		background: var(--color-primary-500);
		border-radius: var(--radius-full);
		/* GPU-accelerated: Use scaleX instead of width for compositor-friendly animation */
		transform-origin: left center;
	}

	/* Determinate state - actual progress using scaleX (compositor-friendly) */
	.progress-bar[data-state='determinate'],
	.progress-bar[data-state='idle'] {
		transform: scaleX(var(--progress, 0));
		transition: transform 0.2s ease-out;
	}

	/* Indeterminate state - CSS animation instead of JS interval */
	.progress-bar[data-state='indeterminate'] {
		width: 40%;
		animation: indeterminate-progress 1.5s ease-in-out infinite;
	}

	@keyframes indeterminate-progress {
		0% {
			transform: translateX(-100%);
		}
		50% {
			transform: translateX(150%);
		}
		100% {
			transform: translateX(-100%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.progress-bar[data-state='indeterminate'] {
			animation: none;
			width: 100%;
			opacity: 0.6;
		}
	}

	.progress-text {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
		margin-bottom: var(--space-3);
	}

	.quota-info {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		margin-bottom: var(--space-3);
	}

	.quota-info.low {
		color: var(--color-amber-600);
	}

	.download-button,
	.delete-button,
	.cancel-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
		border: none;
	}

	.download-button {
		background: var(--color-primary-500);
		color: white;
	}

	.download-button:hover {
		background: var(--color-primary-600);
	}

	.delete-button {
		background: var(--color-red-100);
		color: var(--color-red-700);
	}

	.delete-button:hover {
		background: var(--color-red-200);
	}

	.cancel-button {
		background: var(--background-tertiary);
		color: var(--foreground-secondary);
	}

	.cancel-button:hover {
		background: var(--background);
	}

	.button-icon {
		width: 16px;
		height: 16px;
	}

	/* Compact mode */
	.compact-wrapper {
		display: inline-flex;
		align-items: center;
	}

	.compact-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.compact-button:hover {
		background: var(--background-tertiary);
		color: var(--foreground);
	}

	.compact-button .icon {
		width: 14px;
		height: 14px;
	}

	.compact-progress {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		color: var(--color-primary-500);
	}

	.cancel-icon-button {
		display: flex;
		place-items: center;
		padding: var(--space-1);
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--foreground-muted);
	}

	.cancel-icon-button:hover {
		color: var(--color-red-500);
	}

	.cancel-icon {
		width: 12px;
		height: 12px;
	}

	.strikethrough {
		stroke: var(--color-red-500);
	}

	@media (prefers-color-scheme: dark) {
		.error {
			background: var(--color-red-900);
			border-color: var(--color-red-700);
			color: var(--color-red-200);
		}

		.completed-badge {
			background: var(--color-green-900);
			color: var(--color-green-200);
		}

		.delete-button {
			background: var(--color-red-900);
			color: var(--color-red-200);
		}

		.delete-button:hover {
			background: var(--color-red-800);
		}
	}
</style>
