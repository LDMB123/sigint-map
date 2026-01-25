<script module lang="ts">
	type VenueSortOption = 'state' | 'shows' | 'name';

	interface VenueSortConfig {
		label: string;
		value: VenueSortOption;
		description: string;
	}
</script>

<script lang="ts">
	import { allVenues as clientAllVenues, venueStats as clientVenueStats } from '$stores/dexie';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/CardContent.svelte';
	import type { DexieVenue } from '$db/dexie/schema';
	import { processInChunks, yieldToMain } from '$lib/utils/scheduler';

	// Receive SSR data from +page.server.ts
	let { data } = $props();

	// Sort configuration
	const sortOptions: VenueSortConfig[] = [
		{ value: 'state', label: 'By State', description: 'Group venues by state' },
		{ value: 'shows', label: 'Most Shows', description: 'Sort by total show count' },
		{ value: 'name', label: 'A-Z', description: 'Sort alphabetically by name' }
	];

	let currentSort = $state<VenueSortOption>('state');

	// Group venues by state with scheduler.yield() for responsiveness
	async function groupVenuesByState(venues: DexieVenue[]): Promise<Record<string, DexieVenue[]>> {
		const grouped: Record<string, DexieVenue[]> = {};

		// Process venues in chunks to avoid blocking
		await processInChunks(
			venues,
			(venue) => {
				const state = venue.state || 'International';
				if (!grouped[state]) {
					grouped[state] = [];
				}
				grouped[state].push(venue);
			},
			{
				chunkSize: 50,
				priority: 'user-visible'
			}
		);

		// Sort venues within each state by show count
		const states = Object.keys(grouped);
		for (let i = 0; i < states.length; i++) {
			const state = states[i];
			grouped[state].sort((a, b) => (b.totalShows || 0) - (a.totalShows || 0));

			// Yield every 10 states during sorting
			if (i % 10 === 0 && i > 0) {
				await yieldToMain();
			}
		}

		return grouped;
	}

	// Use SSR data for initial render, fall back to client stores for hydration
	const venues = $derived(data?.venues ?? $clientAllVenues ?? []);
	const stats = $derived(data?.venueStats ?? $clientVenueStats);

	// Async state for grouped venues
	let groupedVenues: Record<string, DexieVenue[]> = $state({});
	let isGrouping = $state(false);

	// Process venues when data changes
	// Race condition protected: cleanup cancels stale updates if effect re-runs
	$effect(() => {
		if (!venues || venues.length === 0) return;

		let cancelled = false;
		isGrouping = true;

		groupVenuesByState(venues)
			.then((result) => {
				if (cancelled) return; // Prevent stale update
				groupedVenues = result;
			})
			.finally(() => {
				if (!cancelled) isGrouping = false;
			});

		// Cleanup: cancel if effect re-runs before async completes
		return () => {
			cancelled = true;
		};
	});

	const states = $derived(
		Object.keys(groupedVenues).sort((a, b) => {
			// Put "International" at the end
			if (a === 'International') return 1;
			if (b === 'International') return -1;
			return a.localeCompare(b);
		})
	);

	// Top venues by show count - use SSR data if available
	const topVenues = $derived(
		data?.topVenues ?? [...venues].sort((a, b) => (b.totalShows || 0) - (a.totalShows || 0)).slice(0, 5)
	);

	// Count states (excluding International from US state count)
	const stateCount = $derived(
		Object.keys(groupedVenues).filter((s) => s !== 'International').length
	);

	// Calculate total shows across all venues
	// Use $derived.by for complex calculations - early return for SSR data
	const totalShows = $derived.by(() => {
		if (!venues || venues.length === 0) return 0;
		// Use pre-computed total from SSR data if available
		if (data?.venueStats?.totalShows !== undefined) return data.venueStats.totalShows;
		return venues.reduce((sum, v) => sum + (v.totalShows || 0), 0);
	});

	// Flat sorted venues for non-state views
	const sortedVenues = $derived.by(() => {
		if (!venues || venues.length === 0) return [];
		const sorted = [...venues];

		switch (currentSort) {
			case 'shows':
				return sorted.sort((a, b) => (b.totalShows || 0) - (a.totalShows || 0));
			case 'name':
				return sorted.sort((a, b) => a.name.localeCompare(b.name));
			default:
				return sorted;
		}
	});

	// Show grouped view only for state sorting
	const showGroupedView = $derived(currentSort === 'state');
</script>

<svelte:head>
	<title>Venues - DMB Almanac</title>
	<meta name="description" content="Browse all venues where Dave Matthews Band has performed" />
	<!-- Preload critical data for instant navigation (Chromium 2025 optimization) -->
	<link rel="preload" href="/venues" as="fetch" crossorigin="anonymous" fetchpriority="high" />
</svelte:head>

<div class="container">
	<!-- Header -->
	<div class="header">
		<h1 class="title">Venues</h1>
		<p class="subtitle">
			{#if stats}
				{stats.total} venues have hosted DMB across {totalShows}+ shows
			{:else}
				Loading venues...
			{/if}
		</p>
	</div>

	{#if stats}
		<!-- Quick Stats -->
		<div class="quickStats">
			<div class="stat">
				<span class="statValue">{stats.total}</span>
				<span class="statLabel">Total Venues</span>
			</div>
			<div class="stat">
				<span class="statValue">{totalShows}</span>
				<span class="statLabel">Total Shows</span>
			</div>
			<div class="stat">
				<span class="statValue">{stateCount}</span>
				<span class="statLabel">States</span>
			</div>
		</div>

		<!-- Top Venues -->
		<section class="topSection" aria-labelledby="top-venues-heading">
			<h2 class="sectionTitle" id="top-venues-heading">Most Visited Venues</h2>
			<ul class="topVenuesGrid">
				{#each topVenues as venue, index (venue.id)}
					<li>
						<a
							href="/venues/{venue.id}"
							class="topVenueLink"
							data-sveltekit-preload-data="hover"
							aria-label="{venue.name}, ranked #{index + 1} with {venue.totalShows} shows"
						>
							<Card interactive class="topVenueCard">
								<CardContent class="topVenueContent">
									<span class="rank" aria-hidden="true">#{index + 1}</span>
									<div class="topVenueInfo">
										<h3 class="topVenueName">{venue.name}</h3>
										<p class="topVenueLocation">
											{venue.city}{venue.state ? `, ${venue.state}` : ''}
										</p>
									</div>
									<span class="topVenueShows">{venue.totalShows} shows</span>
								</CardContent>
							</Card>
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<!-- All Venues Section -->
		<section class="allSection" aria-labelledby="all-venues-heading">
			<div class="sectionHeader">
				<h2 class="sectionTitle" id="all-venues-heading">All Venues</h2>
				<div class="sortControls">
					<label for="venue-sort-select" class="sortLabel">Sort:</label>
					<select
						id="venue-sort-select"
						bind:value={currentSort}
						class="sortSelect"
						aria-label="Sort venues by"
					>
						{#each sortOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if showGroupedView}
				<!-- Grouped by State View -->
				<ul class="statesGrid">
					{#each states as state (state)}
						<li class="stateGroup">
							<h3 class="stateTitle">
								{state}
								<Badge variant="default" size="sm">
									{groupedVenues[state].length}
								</Badge>
							</h3>
							<ul class="venueList">
								{#each groupedVenues[state] as venue (venue.id)}
									<li>
										<a href="/venues/{venue.id}" class="venueLink" data-sveltekit-preload-data="hover">
											<span class="venueName">{venue.name}</span>
											<span class="venueCity">{venue.city}</span>
											<span class="venueShows">{venue.totalShows}</span>
										</a>
									</li>
								{/each}
							</ul>
						</li>
					{/each}
				</ul>
			{:else}
				<!-- Flat Sorted View -->
				<ul class="flatVenueGrid">
					{#each sortedVenues as venue, index (venue.id)}
						<li>
							<a href="/venues/{venue.id}" class="flatVenueLink" data-sveltekit-preload-data="hover">
								<Card interactive class="flatVenueCard">
									<CardContent class="flatVenueContent">
										{#if currentSort === 'shows'}
											<span class="venueRank">#{index + 1}</span>
										{/if}
										<div class="flatVenueInfo">
											<h3 class="flatVenueName">{venue.name}</h3>
											<p class="flatVenueLocation">
												{venue.city}{venue.state ? `, ${venue.state}` : ''}
											</p>
										</div>
										<span class="flatVenueShows">{venue.totalShows} shows</span>
									</CardContent>
								</Card>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.container {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
	}

	/* Header */
	.header {
		text-align: center;
		margin-bottom: var(--space-8);
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
	}

	/* Quick Stats */
	.quickStats {
		display: flex;
		justify-content: center;
		gap: var(--space-8);
		padding: var(--space-6);
		background: var(--background-secondary);
		border-radius: var(--radius-xl);
		margin-bottom: var(--space-8);
		flex-wrap: wrap;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.statValue {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
	}

	.statLabel {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Sections */
	.topSection,
	.allSection {
		margin-bottom: var(--space-10);
	}

	.sectionHeader {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
		flex-wrap: wrap;
	}

	.sectionTitle {
		font-size: var(--text-xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0;
	}

	/* Sort Controls */
	.sortControls {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.sortLabel {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground-secondary);
	}

	.sortSelect {
		appearance: none;
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground);
		cursor: pointer;
		min-width: 120px;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-2) center;
	}

	.sortSelect:hover {
		border-color: var(--color-primary-300);
	}

	.sortSelect:focus {
		outline: none;
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 3px var(--color-primary-100);
	}

	/* Top Venues */
	.topVenuesGrid {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.topVenueLink {
		text-decoration: none;
		color: inherit;
	}

	.topVenueLink :global(.topVenueCard) {
		width: 100%;
	}

	.topVenueLink :global(.topVenueContent) {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) !important;
	}

	.rank {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
		min-width: 50px;
	}

	.topVenueInfo {
		flex: 1;
		min-width: 0;
	}

	.topVenueName {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.topVenueLocation {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}

	.topVenueShows {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--color-primary-500);
		white-space: nowrap;
	}

	/* States Grid */
	.statesGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-6);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.stateGroup {
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		content-visibility: auto;
		contain-intrinsic-size: auto 300px;
		contain: layout style;
	}

	.stateTitle {
		font-size: var(--text-lg);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-3);
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-color);
	}

	.venueList {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.venueList li {
		border-bottom: 1px solid var(--border-color);
	}

	.venueList li:last-child {
		border-bottom: none;
	}

	.venueLink {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) 0;
		text-decoration: none;
		color: inherit;
		transition: background-color var(--transition-fast);
	}

	.venueLink:hover {
		background-color: var(--background-secondary);
		margin: 0 calc(var(--space-2) * -1);
		padding-left: var(--space-2);
		padding-right: var(--space-2);
		border-radius: var(--radius-md);
	}

	.venueName {
		flex: 1;
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.venueCity {
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
		white-space: nowrap;
	}

	.venueShows {
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		color: var(--color-primary-500);
		min-width: 20px;
		text-align: right;
	}

	/* Flat Venue Grid */
	.flatVenueGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-3);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.flatVenueLink {
		text-decoration: none;
		color: inherit;
	}

	.flatVenueLink :global(.flatVenueCard) {
		width: 100%;
	}

	.flatVenueLink :global(.flatVenueContent) {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) !important;
	}

	.venueRank {
		font-size: var(--text-lg);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
		min-width: 40px;
	}

	.flatVenueInfo {
		flex: 1;
		min-width: 0;
	}

	.flatVenueName {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.flatVenueLocation {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}

	.flatVenueShows {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--color-primary-500);
		white-space: nowrap;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-4) var(--space-3);
		}

		.title {
			font-size: var(--text-3xl);
		}

		.quickStats {
			gap: var(--space-4);
			padding: var(--space-4);
		}

		.statValue {
			font-size: var(--text-2xl);
		}

		.statesGrid,
		.flatVenueGrid {
			grid-template-columns: 1fr;
		}

		.sectionHeader {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-3);
		}

		.sortControls {
			justify-content: space-between;
		}

		.sortSelect {
			flex: 1;
		}
	}
</style>
