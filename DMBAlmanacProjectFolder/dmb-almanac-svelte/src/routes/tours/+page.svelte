<script lang="ts">
	import { toursGroupedByDecade as clientToursGroupedByDecade, globalStats as clientGlobalStats } from '$stores/dexie';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/CardContent.svelte';
	import { processInChunks, yieldToMain } from '$lib/utils/scheduler';

	// Receive SSR data from +page.server.ts
	let { data } = $props();

	// ==================== STATE ====================

	let isProcessingTours = $state(false);
	let processedToursByDecade: Record<string, any> = $state({});

	// Use SSR data for initial render, fall back to client stores for hydration
	const stats = $derived(data?.globalStats ?? $clientGlobalStats);
	const ssrTours = $derived(data?.toursGroupedByDecade);
	const clientTours = $derived($clientToursGroupedByDecade);

	// Process tours data with scheduler.yield() for large lists
	async function processToursByDecade() {
		// Prefer SSR data, fall back to client data
		const rawData = ssrTours ?? clientTours;
		if (!rawData || Object.keys(rawData).length === 0) {
			return;
		}

		isProcessingTours = true;
		const result: Record<string, any> = {};
		const decades = Object.entries(rawData);

		// Process decades with yielding for responsiveness
		await processInChunks(
			decades,
			([decade, tours]) => {
				result[decade] = tours;
			},
			{
				chunkSize: 3,
				priority: 'user-visible'
			}
		);

		processedToursByDecade = result;
		isProcessingTours = false;
	}

	// Use $effect to trigger processing when tours data changes
	$effect(() => {
		const toursData = ssrTours ?? clientTours;
		if (toursData) {
			processToursByDecade();
		}
	});
</script>

<svelte:head>
	<title>Tours & Shows - DMB Almanac</title>
	<meta name="description" content="Browse all Dave Matthews Band tours by year and decade" />
</svelte:head>

<div class="container">
	<div class="header">
		<h1 class="title">Tours & Shows</h1>
		{#if stats}
			<p class="subtitle">
				{stats.yearsActive} years of touring with {stats.totalShows.toLocaleString()}+ documented
				shows
			</p>
		{:else}
			<p class="subtitle">Loading tour data...</p>
		{/if}
	</div>

	{#if stats}
		<div class="quickStats">
			<div class="stat">
				<span class="statValue">{stats.yearsActive}</span>
				<span class="statLabel">Years</span>
			</div>
			<div class="stat">
				<span class="statValue">{stats.totalShows.toLocaleString()}+</span>
				<span class="statLabel">Shows</span>
			</div>
			<div class="stat">
				<span class="statValue">{stats.firstYear}</span>
				<span class="statLabel">First Show</span>
			</div>
			<div class="stat">
				<span class="statValue">{stats.lastYear}</span>
				<span class="statLabel">Latest Year</span>
			</div>
		</div>
	{/if}

	{#if !isProcessingTours && Object.keys(processedToursByDecade).length > 0}
		<div class="decades">
			{#each Object.entries(processedToursByDecade) as [decade, tours] (decade)}
				<section class="decadeSection">
					<h2 class="decadeTitle">{decade}</h2>
					<div class="tourGrid">
						{#each tours as tour (tour.year)}
							<a
								href="/tours/{tour.year}"
								class="tourLink"
								aria-label="{tour.year} {tour.name}: {tour.totalShows ?? 0} shows"
							>
								<Card interactive class="tourCard">
									<CardContent class="tourContent">
										<div class="tourYear">{tour.year}</div>
										<div class="tourInfo">
											<h3 class="tourName">{tour.name}</h3>
											<div class="tourStats">
												<span>{tour.totalShows ?? 0} shows</span>
												{#if tour.uniqueSongsPlayed}
													<span class="separator">|</span>
													<span>{tour.uniqueSongsPlayed} songs</span>
												{/if}
											</div>
										</div>
										<div class="tourArrow" aria-hidden="true">
											<svg
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												aria-hidden="true"
												focusable="false"
											>
												<path d="M9 18l6-6-6-6" />
											</svg>
										</div>
									</CardContent>
								</Card>
							</a>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
	}

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
		margin-bottom: var(--space-10);
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

	/* Decades */
	.decades {
		display: flex;
		flex-direction: column;
		gap: var(--space-10);
	}

	.decadeSection {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.decadeTitle {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		padding-bottom: var(--space-2);
		border-bottom: 2px solid var(--color-primary-500);
		margin: 0;
	}

	/* Tour Grid */
	.tourGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);
	}

	.tourLink {
		text-decoration: none;
		color: inherit;
	}

	.tourLink :global(.tourCard) {
		height: 100%;
		container-type: inline-size;
		container-name: tourcard;
	}

	.tourLink :global(.tourContent) {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) !important;
	}

	.tourYear {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
		min-width: 80px;
	}

	.tourInfo {
		flex: 1;
		min-width: 0;
	}

	.tourName {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0 0 var(--space-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tourStats {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		display: flex;
		gap: var(--space-2);
	}

	.separator {
		color: var(--foreground-muted);
	}

	.tourArrow {
		color: var(--foreground-muted);
		transition:
			transform var(--transition-fast),
			color var(--transition-fast);
	}

	.tourLink:hover .tourArrow {
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

		.quickStats {
			gap: var(--space-4);
			padding: var(--space-4);
		}

		.statValue {
			font-size: var(--text-2xl);
		}

		.tourGrid {
			grid-template-columns: 1fr;
		}

		.tourYear {
			font-size: var(--text-2xl);
			min-width: 60px;
		}
	}

	/* Container Queries */
	@container tourcard (max-width: 280px) {
		.tourLink :global(.tourContent) {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-2);
		}

		.tourYear {
			font-size: var(--text-xl);
			min-width: auto;
		}

		.tourName {
			font-size: var(--text-sm);
		}

		.tourStats {
			font-size: var(--text-xs);
		}

		.tourArrow {
			display: none;
		}
	}

	@container tourcard (min-width: 281px) and (max-width: 380px) {
		.tourYear {
			font-size: var(--text-2xl);
			min-width: 60px;
		}
	}

	@container tourcard (min-width: 381px) {
		.tourYear {
			font-size: var(--text-3xl);
			min-width: 80px;
		}
	}

	/* Scroll-driven Animations */
	@supports (animation-timeline: view()) {
		.decadeSection {
			animation: reveal-section linear both;
			animation-timeline: view();
			animation-range: entry 0% entry 60%;
		}

		@keyframes reveal-section {
			from {
				opacity: 0;
				transform: translateY(30px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		.tourLink :global(.tourCard) {
			animation: reveal-card linear both;
			animation-timeline: view();
			animation-range: entry 0% entry 80%;
		}

		@keyframes reveal-card {
			from {
				opacity: 0;
				transform: scale(0.95);
			}
			to {
				opacity: 1;
				transform: scale(1);
			}
		}
	}

	/* Fallback for browsers without scroll animations */
	@supports not (animation-timeline: view()) {
		.decadeSection,
		.tourLink :global(.tourCard) {
			opacity: 1;
			transform: none;
		}
	}

	/* :has() selector patterns */
	.decadeSection:has(.tourGrid > *:nth-child(6)) {
		gap: var(--space-6);
	}

	/* Fallback for browsers without :has() */
	@supports not selector(:has(*)) {
		.tourLink:hover .tourArrow {
			transform: translateX(4px);
			color: var(--color-primary-500);
		}
	}
</style>
