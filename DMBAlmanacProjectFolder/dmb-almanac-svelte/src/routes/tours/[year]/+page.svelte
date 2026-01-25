<script lang="ts">
	import { page } from '$app/stores';
	import { getTourByYear, getTourShows } from '$stores/dexie';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/CardContent.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	// Get year from URL params
	const yearParam = $derived($page.params.year);
	const year = $derived(yearParam ? parseInt(yearParam, 10) : null);

	// Reactive data from Dexie stores
	const tourStore = $derived(year ? getTourByYear(year) : null);
	const tour = $derived(tourStore ? $tourStore : null);

	const showsStore = $derived(tour?.id ? getTourShows(tour.id) : null);
	const shows = $derived(showsStore ? $showsStore : null);

	// Computed properties
	const totalShows = $derived(shows?.length ?? 0);

	const uniqueVenues = $derived.by(() => {
		if (!shows) return 0;
		const venueIds = new Set(shows.map((s) => s.venueId));
		return venueIds.size;
	});

	const uniqueStates = $derived.by(() => {
		if (!shows) return 0;
		const states = new Set(shows.map((s) => s.venue.state).filter(Boolean));
		return states.size;
	});

	const uniqueSongs = $derived.by(() => {
		if (!shows) return tour?.uniqueSongsPlayed ?? 0;
		return tour?.uniqueSongsPlayed ?? 0;
	});

	// Group shows by month
	const showsByMonth = $derived.by(() => {
		if (!shows) return [];
		const monthMap = new Map<string, typeof shows>();

		for (const show of shows) {
			const date = new Date(`${show.date}T00:00:00`);
			const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

			if (!monthMap.has(monthKey)) {
				monthMap.set(monthKey, []);
			}
			monthMap.get(monthKey)!.push(show);
		}

		return Array.from(monthMap.entries()).map(([month, shows]) => ({
			month,
			shows
		}));
	});

	// Format date helper
	function formatDate(dateStr: string): string {
		const date = new Date(`${dateStr}T00:00:00`);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatShortDate(dateStr: string): string {
		const date = new Date(`${dateStr}T00:00:00`);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	{#if tour}
		<title>{tour.year} {tour.name} - Tours - DMB Almanac</title>
		<meta
			name="description"
			content="Dave Matthews Band {tour.name} ({tour.year}) - {tour.totalShows} shows"
		/>
	{:else}
		<title>Tour {year} - DMB Almanac</title>
	{/if}
</svelte:head>

<div class="container">
	{#if !tour}
		<div class="loading">
			<EmptyState title="Loading tour..." description="Please wait while we fetch tour data." />
		</div>
	{:else}
		<!-- Header -->
		<header class="header">
			<div class="headerContent">
				<div class="yearBadge">{tour.year}</div>
				<h1 class="title">{tour.name}</h1>
				{#if tour.startDate && tour.endDate}
					<p class="subtitle">
						{formatDate(tour.startDate)} - {formatDate(tour.endDate)}
					</p>
				{/if}
			</div>
		</header>

		<!-- Stats Grid -->
		<div class="statsGrid">
			<StatCard label="Total Shows" value={totalShows.toLocaleString()} />
			<StatCard label="Unique Venues" value={uniqueVenues.toLocaleString()} />
			<StatCard label="Unique Songs" value={uniqueSongs.toLocaleString()} />
			<StatCard label="States Visited" value={uniqueStates.toLocaleString()} />
			{#if tour.averageSongsPerShow}
				<StatCard label="Avg Songs/Show" value={Math.round(tour.averageSongsPerShow).toString()} />
			{/if}
			{#if tour.rarityIndex}
				<StatCard
					label="Rarity Index"
					value={tour.rarityIndex.toFixed(2)}
					subtitle="Higher = more rare songs"
				/>
			{/if}
		</div>

		<!-- Show History -->
		<section class="section">
			<h2 class="sectionTitle">Show History ({totalShows} shows)</h2>
			{#if !shows || shows.length === 0}
				<EmptyState title="No shows found" description="No shows available for this tour." />
			{:else}
				<div class="showsContainer">
					{#each showsByMonth as { month, shows: monthShows }}
						<div class="monthGroup">
							<h3 class="monthTitle">{month}</h3>
							<div class="showsList">
								{#each monthShows as show (show.id)}
									<a href="/shows/{show.id}" class="showLink">
										<Card interactive class="showCard">
											<CardContent class="showContent">
												<div class="showDate">
													<span class="dateDay">{formatShortDate(show.date)}</span>
													<span class="dateWeekday">
														{new Date(`${show.date}T00:00:00`).toLocaleDateString('en-US', {
															weekday: 'short'
														})}
													</span>
												</div>
												<div class="showInfo">
													<h4 class="venueName">{show.venue.name}</h4>
													<p class="venueLocation">
														{[show.venue.city, show.venue.state, show.venue.country]
															.filter(Boolean)
															.join(', ')}
													</p>
													<div class="showMeta">
														{#if show.songCount}
															<span class="metaItem">{show.songCount} songs</span>
														{/if}
														{#if show.venue.capacity}
															<span class="separator">•</span>
															<span class="metaItem">
																Capacity: {show.venue.capacity.toLocaleString()}
															</span>
														{/if}
													</div>
												</div>
												<div class="showArrow" aria-hidden="true">
													<svg
														width="20"
														height="20"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														<path d="M9 18l6-6-6-6" />
													</svg>
												</div>
											</CardContent>
										</Card>
									</a>
								{/each}
							</div>
						</div>
					{/each}
				</div>
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

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	/* Header */
	.header {
		margin-bottom: var(--space-8);
		text-align: center;
	}

	.headerContent {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.yearBadge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2) var(--space-6);
		background: var(--color-primary-500);
		color: white;
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		border-radius: var(--radius-full);
		min-width: 120px;
	}

	.title {
		font-size: var(--text-4xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0;
	}

	.subtitle {
		font-size: var(--text-base);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Stats Grid */
	.statsGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-10);
	}

	/* Section */
	.section {
		margin-bottom: var(--space-10);
	}

	.sectionTitle {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-6);
		padding-bottom: var(--space-2);
		border-bottom: 2px solid var(--color-primary-500);
	}

	/* Shows Container */
	.showsContainer {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.monthGroup {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.monthTitle {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-primary-500);
		margin: 0;
		padding-left: var(--space-2);
	}

	/* Shows List */
	.showsList {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.showLink {
		text-decoration: none;
		color: inherit;
	}

	.showLink :global(.showContent) {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) !important;
	}

	.showDate {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 80px;
		padding: var(--space-2);
		background: var(--background-secondary);
		border-radius: var(--radius-md);
	}

	.dateDay {
		font-size: var(--text-base);
		font-weight: var(--font-bold);
		color: var(--foreground);
	}

	.dateWeekday {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.showInfo {
		flex: 1;
		min-width: 0;
	}

	.venueName {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0 0 var(--space-1);
	}

	.venueLocation {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-1);
	}

	.showMeta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--foreground-muted);
	}

	.metaItem {
		white-space: nowrap;
	}

	.separator {
		color: var(--foreground-muted);
	}

	.showArrow {
		color: var(--foreground-muted);
		transition:
			transform var(--transition-fast),
			color var(--transition-fast);
		flex-shrink: 0;
	}

	.showLink:hover .showArrow {
		transform: translateX(4px);
		color: var(--color-primary-500);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-4) var(--space-3);
		}

		.title {
			font-size: var(--text-3xl);
		}

		.yearBadge {
			font-size: var(--text-2xl);
			min-width: 100px;
			padding: var(--space-1) var(--space-4);
		}

		.statsGrid {
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
			gap: var(--space-3);
		}

		.showLink :global(.showContent) {
			gap: var(--space-3);
		}

		.showDate {
			min-width: 60px;
		}

		.dateDay {
			font-size: var(--text-sm);
		}

		.showMeta {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}

		.separator {
			display: none;
		}
	}

	/* Animations */
	@supports (animation-timeline: view()) {
		.monthGroup {
			animation: reveal-month linear both;
			animation-timeline: view();
			animation-range: entry 0% entry 60%;
		}

		@keyframes reveal-month {
			from {
				opacity: 0;
				transform: translateY(30px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		.showLink :global(.showCard) {
			animation: reveal-card linear both;
			animation-timeline: view();
			animation-range: entry 0% entry 80%;
		}

		@keyframes reveal-card {
			from {
				opacity: 0;
				transform: translateY(20px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}

	@supports not (animation-timeline: view()) {
		.monthGroup,
		.showLink :global(.showCard) {
			opacity: 1;
			transform: none;
		}
	}
</style>
