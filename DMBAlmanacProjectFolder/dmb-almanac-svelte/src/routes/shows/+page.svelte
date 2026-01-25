<script lang="ts">
	import { allShows, globalStats } from '$stores/dexie';
	import type { DexieShow } from '$db/dexie/schema';
	import VirtualList from '$lib/components/ui/VirtualList.svelte';
	import { startElementTransition } from '$lib/hooks/viewTransitionNavigation';
	import { goto } from '$app/navigation';

	// ==================== HELPER FUNCTIONS ====================

	/**
	 * Format date for display
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	/**
	 * Navigate to show detail with view transition
	 * Uses zoom-in transition for detail view drilling
	 */
	async function navigateToShow(showId: number | string): Promise<void> {
		await startElementTransition(
			'card',
			() => goto(`/shows/${showId}`),
			'zoom-in'
		);
	}

	// ==================== TYPES ====================

	interface VirtualListItem {
		type: 'year-header' | 'show';
		year?: number;
		show?: DexieShow;
		id: string;
		count?: number;
	}

	// ==================== DERIVED STATE ====================

	/**
	 * Group shows by year - memoized with $derived
	 */
	const groupedShows = $derived.by(() => {
		const shows = $allShows;
		if (!shows) return {};

		const grouped: Record<number, DexieShow[]> = {};

		shows.forEach((show) => {
			const year = new Date(show.date).getFullYear();
			if (!grouped[year]) {
				grouped[year] = [];
			}
			grouped[year].push(show);
		});

		return grouped;
	});

	const years = $derived(
		Object.keys(groupedShows)
			.map(Number)
			.sort((a, b) => b - a)
	);

	/**
	 * Flatten shows into virtual list format with year headers
	 */
	const flattenedItems = $derived.by(() => {
		const items: VirtualListItem[] = [];

		for (const year of years) {
			const shows = groupedShows[year];

			// Add year header
			items.push({
				type: 'year-header',
				year,
				count: shows.length,
				id: `year-${year}`
			});

			// Add all shows for this year
			for (const show of shows) {
				items.push({
					type: 'show',
					show,
					id: `show-${show.id}`
				});
			}
		}

		return items;
	});

	const isLoading = $derived(!$allShows || !$globalStats);

	/**
	 * Calculate item height based on type
	 * Year headers are taller than show items
	 */
	function getItemHeight(item: VirtualListItem): number {
		return item.type === 'year-header' ? 80 : 130;
	}
</script>

<svelte:head>
	<title>Show Archive - DMB Almanac</title>
	<meta
		name="description"
		content="Complete archive of Dave Matthews Band concerts with setlists and venue information"
	/>
	<!-- Preload critical data for instant navigation (Chromium 2025 optimization) -->
	<link rel="preload" href="/shows" as="fetch" crossorigin="anonymous" fetchpriority="high" />
</svelte:head>

<div class="page-container">
	{#if isLoading}
		<!-- Loading State -->
		<div class="header">
			<h1 class="title">Show Archive</h1>
			<p class="subtitle">Loading shows...</p>
		</div>
		<div class="loading-spinner">
			<div class="spinner"></div>
			<p>Loading show data...</p>
		</div>
	{:else}
		<!-- Header Section (Fixed) -->
		<div class="header-section">
			<div class="header">
				<h1 class="title">Show Archive</h1>
				<p class="subtitle">
					Complete archive of {$globalStats?.totalShows ?? 0} Dave Matthews Band concerts
					<span class="perf-badge">Virtual Scrolling</span>
				</p>
			</div>

			<!-- Quick Stats -->
			<div class="quick-stats" role="group" aria-label="Show archive statistics">
				<div class="stat">
					<span class="stat-value" aria-describedby="stat-total-shows">
						{$globalStats?.totalShows ?? 0}
					</span>
					<span class="stat-label" id="stat-total-shows">Total Shows</span>
				</div>
				<div class="stat">
					<span class="stat-value" aria-describedby="stat-years-active">
						{years.length}
					</span>
					<span class="stat-label" id="stat-years-active">Years Active</span>
				</div>
				<div class="stat">
					<span class="stat-value" aria-describedby="stat-unique-venues">
						{$globalStats?.totalVenues ?? 0}
					</span>
					<span class="stat-label" id="stat-unique-venues">Unique Venues</span>
				</div>
			</div>

			<!-- Year Navigation -->
			<nav class="year-nav" aria-label="Show year navigation" data-sveltekit-preload-data="tap">
				{#each years as year}
					<a
						href={`#year-${year}`}
						class="year-link"
						aria-label={`${year} - ${groupedShows[year].length} shows`}
					>
						{year}
						<span class="year-count">({groupedShows[year].length})</span>
					</a>
				{/each}
			</nav>
		</div>

		<!-- Virtual List Section (Scrollable) -->
		<div class="virtual-container">
			<VirtualList
				items={flattenedItems}
				itemHeight={getItemHeight}
				overscan={5}
				estimateSize={130}
				class="shows-virtual-list"
				aria-label="Shows list"
			>
				{#snippet children({ item })}
					{#if item.type === 'year-header' && item.year}
						<div id={`year-${item.year}`} class="year-header">
							<h2 class="year-title">
								{item.year}
								<span class="year-show-count">{item.count} shows</span>
							</h2>
						</div>
					{:else if item.type === 'show' && item.show}
						<div class="show-item-wrapper">
							<button
								class="show-link"
								onclick={async () => navigateToShow(item.show!.id)}
								type="button"
								aria-label={`View ${item.show.venue?.name || 'Unknown Venue'} on ${formatDate(item.show.date)}`}
							>
								<div class="show-card" style="view-transition-name: card-{item.show.id}">
									<div class="show-content">
										<div class="show-date">{formatDate(item.show.date)}</div>
										<div class="show-venue">
											<span class="venue-name">{item.show.venue?.name || 'Unknown Venue'}</span>
											<span class="venue-location">
												{item.show.venue?.city || ''}
												{#if item.show.venue?.state}, {item.show.venue.state}{/if}
											</span>
										</div>
										{#if (item.show.songCount ?? 0) > 0}
											<div class="song-count">{item.show.songCount} songs</div>
										{/if}
									</div>
								</div>
							</button>
						</div>
					{/if}
				{/snippet}
			</VirtualList>
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: clamp(1rem, 4vw, 1.5rem) clamp(0.75rem, 3vw, 1rem);
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	/* Header Section - Fixed */
	.header-section {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.header {
		text-align: center;
	}

	.title {
		font-size: var(--text-4xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-2);
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--foreground-secondary);
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.perf-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		background: linear-gradient(135deg, #10b981, #06b6d4);
		color: white;
		border-radius: var(--radius-full);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Loading State */
	.loading-spinner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-12) var(--space-4);
		text-align: center;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--border-color);
		border-top-color: var(--color-primary-500);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Quick Stats */
	.quick-stats {
		display: flex;
		justify-content: center;
		gap: var(--space-8);
		padding: var(--space-6);
		background: linear-gradient(
			to bottom,
			var(--background-secondary),
			color-mix(in oklch, var(--background-secondary) 95%, var(--color-gray-200))
		);
		border-radius: var(--radius-xl);
		flex-wrap: wrap;
		border: 1px solid var(--border-color);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.stat-value {
		font-size: var(--text-3xl);
		font-weight: var(--font-extrabold);
		color: var(--color-primary-600);
		letter-spacing: var(--tracking-tight, -0.025em);
	}

	.stat-label {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider, 0.05em);
		font-weight: var(--font-medium);
	}

	/* Year Navigation */
	.year-nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-4);
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		transform: translateZ(0);
		backface-visibility: hidden;
		contain: layout style;
	}

	.year-link {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--foreground-secondary);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.year-link:hover {
		background: var(--color-primary-50);
		color: var(--color-primary-600);
	}

	.year-count {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		font-weight: var(--font-normal);
	}

	/* Virtual Container - Scrollable */
	.virtual-container {
		flex: 1;
		min-height: 0;
		margin-top: var(--space-6);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--background);
		box-shadow: var(--shadow-sm);
	}

	/* Year Header */
	.year-header {
		padding: var(--space-4) var(--space-4);
		background: linear-gradient(
			to bottom,
			var(--background-secondary),
			color-mix(in oklch, var(--background-secondary) 97%, var(--background))
		);
		border-bottom: 3px solid var(--color-primary-500);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.year-title {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0;
		letter-spacing: var(--tracking-tight, -0.025em);
	}

	.year-show-count {
		font-size: var(--text-sm);
		font-weight: var(--font-normal);
		color: var(--foreground-muted);
	}

	/* Show Item */
	.show-item-wrapper {
		padding: var(--space-2) var(--space-3);
		height: 100%;
	}

	.show-link {
		background: none;
		border: none;
		text-decoration: none;
		color: inherit;
		display: block;
		height: 100%;
		padding: 0;
		cursor: pointer;
		font: inherit;
		/* Ensure button doesn't have default styling */
		appearance: none;
		-webkit-appearance: none;
	}

	.show-card {
		height: 100%;
		background-color: var(--background);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--border-color);
		background: linear-gradient(
			to bottom,
			var(--background),
			color-mix(in oklch, var(--background) 97%, var(--color-gray-100))
		);
		box-shadow:
			var(--shadow-sm),
			inset 0 1px 0 0 oklch(1 0 0 / 0.06);
		transform: translateZ(0);
		backface-visibility: hidden;
		contain: content;
		transition:
			transform var(--transition-fast) var(--ease-apple, ease-out),
			box-shadow var(--transition-normal, 0.3s) var(--ease-smooth, ease);
	}

	.show-card:hover {
		transform: translateY(-3px);
		box-shadow: var(--shadow-lg);
		border-color: var(--color-primary-300);
	}

	.show-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		height: 100%;
	}

	.show-date {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--color-primary-600);
	}

	.show-venue {
		display: flex;
		flex-direction: column;
		gap: var(--space-0-5, 0.125rem);
	}

	.venue-name {
		font-size: var(--text-base);
		font-weight: var(--font-medium);
		color: var(--foreground);
	}

	.venue-location {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	.song-count {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		background: var(--background-secondary);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		align-self: flex-start;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page-container {
			height: calc(100vh - var(--header-height, 64px));
		}

		.title {
			font-size: var(--text-3xl);
		}

		.quick-stats {
			gap: var(--space-4);
			padding: var(--space-4);
		}

		.stat-value {
			font-size: var(--text-2xl);
		}

		.year-link {
			padding: var(--space-1) var(--space-2);
		}
	}

	/* Dark mode */
	@media (prefers-color-scheme: dark) {
		.quick-stats {
			background: linear-gradient(
				to bottom,
				var(--color-gray-800),
				color-mix(in oklch, var(--color-gray-800) 90%, var(--color-gray-900))
			);
			border-color: var(--color-gray-700);
		}

		.stat-value {
			color: var(--color-primary-400);
		}

		.year-nav {
			background-color: color-mix(in oklch, var(--background) 90%, transparent);
			border-color: var(--color-gray-700);
		}

		.year-link:hover {
			background: oklch(0.7 0.19 82 / 0.1);
			color: var(--color-primary-400);
		}

		.year-header {
			background: linear-gradient(
				to bottom,
				var(--color-gray-800),
				color-mix(in oklch, var(--color-gray-800) 95%, var(--background))
			);
		}

		.song-count {
			background: var(--color-gray-700);
		}
	}
</style>
