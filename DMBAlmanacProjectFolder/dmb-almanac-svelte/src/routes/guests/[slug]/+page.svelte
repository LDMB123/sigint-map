<script lang="ts">
	import { page } from '$app/stores';
	import { getGuestBySlug, getGuestAppearances } from '$stores/dexie';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/CardContent.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';

	// Get slug from URL params
	const slug = $derived($page.params.slug);

	// Reactive data from Dexie stores
	const guestStore = $derived(slug ? getGuestBySlug(slug) : null);
	const guest = $derived(guestStore ? $guestStore : null);

	const appearancesStore = $derived(guest?.id ? getGuestAppearances(guest.id) : null);
	const shows = $derived(appearancesStore ? $appearancesStore : null);

	// Computed properties
	const totalShows = $derived(shows?.length ?? 0);
	const yearBreakdown = $derived.by(() => {
		if (!shows) return [];
		const yearMap = new Map<number, number>();
		for (const show of shows) {
			const year = new Date(`${show.date}T00:00:00`).getFullYear();
			yearMap.set(year, (yearMap.get(year) ?? 0) + 1);
		}
		return Array.from(yearMap.entries())
			.map(([year, count]) => ({ year, count }))
			.sort((a, b) => b.year - a.year);
	});

	const mostRecentShow = $derived(shows?.[0]);
	const firstShow = $derived(shows?.[shows.length - 1]);

	// Format date helper - available for date display
	function _formatDate(dateStr: string): string {
		const date = new Date(`${dateStr}T00:00:00`);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	{#if guest}
		<title>{guest.name} - Guest Musicians - DMB Almanac</title>
		<meta
			name="description"
			content="{guest.name} has appeared with Dave Matthews Band {guest.totalAppearances} times"
		/>
	{:else}
		<title>Guest - DMB Almanac</title>
	{/if}
</svelte:head>

<div class="container">
	{#if !guest}
		<div class="loading">
			<EmptyState
				title="Loading guest..."
				description="Please wait while we fetch the guest information."
			/>
		</div>
	{:else}
		<!-- Header -->
		<header class="header">
			<div class="headerContent">
				<h1 class="title">{guest.name}</h1>
				{#if guest.instruments && guest.instruments.length > 0}
					<div class="instruments">
						{#each guest.instruments as instrument}
							<Badge variant="secondary" size="lg">
								{instrument}
							</Badge>
						{/each}
					</div>
				{/if}
			</div>
		</header>

		<!-- Stats Grid -->
		<div class="statsGrid">
			<StatCard label="Total Appearances" value={guest.totalAppearances?.toLocaleString() ?? '0'} />
			<StatCard label="Total Shows" value={totalShows.toLocaleString()} />
			{#if firstShow}
				<StatCard
					label="First Appearance"
					value={new Date(`${firstShow.date}T00:00:00`).getFullYear().toString()}
				/>
			{/if}
			{#if mostRecentShow}
				<StatCard
					label="Latest Appearance"
					value={new Date(`${mostRecentShow.date}T00:00:00`).getFullYear().toString()}
				/>
			{/if}
		</div>

		<!-- Year Breakdown -->
		{#if yearBreakdown.length > 0}
			<section class="section">
				<h2 class="sectionTitle">Appearances by Year</h2>
				<div class="yearGrid">
					{#each yearBreakdown as { year, count }}
						<Card class="yearCard">
							<CardContent class="yearContent">
								<span class="year">{year}</span>
								<span class="count">{count} {count === 1 ? 'show' : 'shows'}</span>
							</CardContent>
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Show History -->
		<section class="section">
			<h2 class="sectionTitle">Show History</h2>
			{#if !shows || shows.length === 0}
				<EmptyState
					title="No shows found"
					description="No appearance history available for this guest."
				/>
			{:else}
				<div class="showsList">
					{#each shows as show (show.id)}
						<a href="/shows/{show.id}" class="showLink">
							<Card interactive class="showCard">
								<CardContent class="showContent">
									<div class="showDate">
										<span class="dateDay">
											{new Date(`${show.date}T00:00:00`).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric'
											})}
										</span>
										<span class="dateYear">
											{new Date(`${show.date}T00:00:00`).getFullYear()}
										</span>
									</div>
									<div class="showInfo">
										<h3 class="venueName">{show.venue.name}</h3>
										<p class="venueLocation">
											{[show.venue.city, show.venue.state, show.venue.country]
												.filter(Boolean)
												.join(', ')}
										</p>
										<p class="tourName">{show.tour.name}</p>
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
			{/if}
		</section>

		{#if guest.notes}
			<section class="section">
				<h2 class="sectionTitle">Notes</h2>
				<Card>
					<CardContent>
						<p class="notes">{guest.notes}</p>
					</CardContent>
				</Card>
			</section>
		{/if}
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
	}

	.headerContent {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.title {
		font-size: var(--text-4xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0;
	}

	.instruments {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	/* Stats Grid */
	.statsGrid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	/* Section */
	.section {
		margin-bottom: var(--space-10);
	}

	.sectionTitle {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-4);
		padding-bottom: var(--space-2);
		border-bottom: 2px solid var(--color-primary-500);
	}

	/* Year Grid */
	.yearGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-3);
	}

	.yearGrid :global(.yearCard) {
		text-align: center;
	}

	.yearGrid :global(.yearContent) {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3) !important;
	}

	.year {
		font-size: var(--text-xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
	}

	.count {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
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
		font-size: var(--text-lg);
		font-weight: var(--font-bold);
		color: var(--foreground);
	}

	.dateYear {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
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

	.tourName {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		margin: 0;
	}

	.showArrow {
		color: var(--foreground-muted);
		transition:
			transform var(--transition-fast),
			color var(--transition-fast);
	}

	.showLink:hover .showArrow {
		transform: translateX(4px);
		color: var(--color-primary-500);
	}

	.notes {
		color: var(--foreground-secondary);
		line-height: 1.6;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-4) var(--space-3);
		}

		.title {
			font-size: var(--text-3xl);
		}

		.statsGrid {
			grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
			gap: var(--space-3);
		}

		.yearGrid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: var(--space-2);
		}

		.showLink :global(.showContent) {
			gap: var(--space-3);
		}

		.showDate {
			min-width: 60px;
		}

		.dateDay {
			font-size: var(--text-base);
		}
	}

	/* Animations */
	@supports (animation-timeline: view()) {
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
		.showLink :global(.showCard) {
			opacity: 1;
			transform: none;
		}
	}
</style>
