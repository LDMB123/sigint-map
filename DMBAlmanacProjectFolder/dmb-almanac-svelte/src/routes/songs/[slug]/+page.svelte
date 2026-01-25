<script lang="ts">
	import { page } from '$app/stores';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import ShowCard from '$lib/components/shows/ShowCard.svelte';
	import { getSongBySlug, getSongPerformances, getSongYearBreakdown } from '$stores/dexie';

	// Get slug from URL params
	const slug = $derived($page.params.slug || '');

	// Fetch song data from Dexie using reactive stores
	const songStore = $derived(getSongBySlug(slug));
	const song = $derived($songStore);

	// Fetch related data (only when song is loaded)
	const recentPerformancesStore = $derived(
		song?.id ? getSongPerformances(`${song.id}:10`) : undefined
	);
	const recentPerformances = $derived(recentPerformancesStore ? $recentPerformancesStore : undefined);

	const yearBreakdownStore = $derived(song?.id ? getSongYearBreakdown(song.id) : undefined);
	const yearBreakdown = $derived(yearBreakdownStore ? $yearBreakdownStore : undefined);

	// Calculate max year count for visualization
	// PERF: Use loop instead of Math.max(...spread) to avoid stack overflow
	const maxYearCount = $derived.by(() => {
		if (!yearBreakdown || yearBreakdown.length === 0) return 0;
		let max = yearBreakdown[0].count;
		for (let i = 1; i < yearBreakdown.length; i++) {
			if (yearBreakdown[i].count > max) max = yearBreakdown[i].count;
		}
		return max;
	});

	// Calculate total slot performances
	const totalSlotPerformances = $derived(
		song ? (song.openerCount || 0) + (song.closerCount || 0) + (song.encoreCount || 0) : 0
	);

	// Check if song is loaded
	const isLoading = $derived(!song);
	const isNotFound = $derived(song && !song.id);
</script>

<svelte:head>
	<title>{song?.title || 'Loading...'} - DMB Almanac</title>
</svelte:head>

<div class="container">
	{#if isLoading}
		<!-- Loading State -->
		<div class="header">
			<nav aria-label="Breadcrumb" class="breadcrumb">
				<ol>
					<li>
						<a href="/songs" class="breadcrumb-link">Songs</a>
						<span class="breadcrumb-separator" aria-hidden="true">/</span>
					</li>
					<li aria-current="page">
						<span>Loading...</span>
					</li>
				</ol>
			</nav>
			<h1 class="title">Loading song...</h1>
		</div>
	{:else if isNotFound}
		<!-- Not Found State -->
		<div class="header">
			<nav aria-label="Breadcrumb" class="breadcrumb">
				<ol>
					<li>
						<a href="/songs" class="breadcrumb-link">Songs</a>
						<span class="breadcrumb-separator" aria-hidden="true">/</span>
					</li>
					<li aria-current="page">
						<span>Not Found</span>
					</li>
				</ol>
			</nav>
			<h1 class="title">Song Not Found</h1>
		</div>
		<div class="error-state" role="alert">
			<p>The song "{slug}" could not be found in the database.</p>
			<a href="/songs" class="back-link">&larr; Back to Song Catalog</a>
		</div>
	{:else if song}
		<!-- Header -->
		<header class="header">
			<nav aria-label="Breadcrumb" class="breadcrumb">
				<ol>
					<li>
						<a href="/songs" class="breadcrumb-link">Songs</a>
						<span class="breadcrumb-separator" aria-hidden="true">/</span>
					</li>
					<li aria-current="page">
						<span>{song.title}</span>
					</li>
				</ol>
			</nav>

			<h1 class="title">{song.title}</h1>

			<div class="tags">
				{#if song.isCover}
					<Badge variant="secondary" size="md">Cover</Badge>
				{/if}
				{#if song.originalArtist}
					<span class="original-artist">Originally by {song.originalArtist}</span>
				{/if}
			</div>
		</header>

		<!-- Quick Stats -->
		<div class="stats-grid">
			<Card class="stat-card">
				<div class="stat-content">
					<span class="stat-value">{song.totalPerformances}</span>
					<span class="stat-label">Total Plays</span>
				</div>
			</Card>
			{#if song.firstPlayedDate}
				<Card class="stat-card">
					<div class="stat-content">
						<span class="stat-value"
							>{new Date(`${song.firstPlayedDate}T00:00:00`).getFullYear()}</span
						>
						<span class="stat-label">Debut</span>
					</div>
				</Card>
			{/if}
			<Card class="stat-card">
				<div class="stat-content">
					<span class="stat-value">{song.openerCount || 0}</span>
					<span class="stat-label">As Opener</span>
				</div>
			</Card>
			<Card class="stat-card">
				<div class="stat-content">
					<span class="stat-value">{song.closerCount || 0}</span>
					<span class="stat-label">As Closer</span>
				</div>
			</Card>
			<Card class="stat-card">
				<div class="stat-content">
					<span class="stat-value">{song.encoreCount || 0}</span>
					<span class="stat-label">As Encore</span>
				</div>
			</Card>
		</div>

		<div class="main-content">
			<!-- Main Column -->
			<div class="main-column">
				<!-- Recent Performances -->
				<section class="section">
					<h2 class="section-title">Recent Performances</h2>
					{#if recentPerformances && recentPerformances.length > 0}
						<div class="shows-grid">
							{#each recentPerformances as show (show.id)}
								<ShowCard {show} variant="compact" />
							{/each}
						</div>
						<a href="/songs/{song.slug}/shows" class="view-all-link">
							View all {song.totalPerformances} performances &rarr;
						</a>
					{:else}
						<p>No recent performances found.</p>
					{/if}
				</section>

				<!-- Lyrics -->
				{#if song.lyrics}
					<section class="section">
						<h2 class="section-title">Lyrics</h2>
						<Card>
							<div class="lyrics-content">
								<pre class="lyrics">{song.lyrics}</pre>
							</div>
						</Card>
					</section>
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="sidebar">
				<!-- Slot Breakdown -->
				<Card>
					<div class="sidebar-section">
						<h3 class="sidebar-title">Slot Breakdown</h3>
						<div class="slot-breakdown">
							<div class="slot-item">
								<div class="slot-header">
									<Badge variant="opener" size="sm">Opener</Badge>
									<span>{song.openerCount || 0}</span>
								</div>
								<div class="slot-bar">
									<div
										class="slot-fill"
										style:--fill={totalSlotPerformances > 0
											? (song.openerCount || 0) / totalSlotPerformances
											: 0}
										style:background-color="var(--color-opener)"
									></div>
								</div>
							</div>
							<div class="slot-item">
								<div class="slot-header">
									<Badge variant="closer" size="sm">Closer</Badge>
									<span>{song.closerCount || 0}</span>
								</div>
								<div class="slot-bar">
									<div
										class="slot-fill"
										style:--fill={totalSlotPerformances > 0
											? (song.closerCount || 0) / totalSlotPerformances
											: 0}
										style:background-color="var(--color-closer)"
									></div>
								</div>
							</div>
							<div class="slot-item">
								<div class="slot-header">
									<Badge variant="encore" size="sm">Encore</Badge>
									<span>{song.encoreCount || 0}</span>
								</div>
								<div class="slot-bar">
									<div
										class="slot-fill"
										style:--fill={totalSlotPerformances > 0
											? (song.encoreCount || 0) / totalSlotPerformances
											: 0}
										style:background-color="var(--color-encore)"
									></div>
								</div>
							</div>
						</div>
					</div>
				</Card>

				<!-- Year Breakdown -->
				{#if yearBreakdown && yearBreakdown.length > 0}
					<Card>
						<div class="sidebar-section">
							<h3 class="sidebar-title" id="year-breakdown-heading">By Year</h3>
							<ul class="year-breakdown" aria-labelledby="year-breakdown-heading">
								{#each yearBreakdown as item (item.year)}
									<li class="year-item">
										<span class="year-label">{item.year}</span>
										<div class="year-bar" role="presentation" aria-hidden="true">
											<div
												class="year-fill"
												style:--fill={item.count / maxYearCount}
											></div>
										</div>
										<span class="year-count" aria-hidden="true">{item.count}</span>
									</li>
								{/each}
							</ul>
						</div>
					</Card>
				{/if}

				<!-- Key Dates -->
				<Card>
					<div class="sidebar-section">
						<h3 class="sidebar-title">Key Dates</h3>
						<ul class="key-dates">
							{#if song.firstPlayedDate}
								<li>
									<span class="date-label">First Played</span>
									<span class="date-value">
										{new Date(`${song.firstPlayedDate}T00:00:00`).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'short',
											day: 'numeric'
										})}
									</span>
								</li>
							{/if}
							{#if song.lastPlayedDate}
								<li>
									<span class="date-label">Last Played</span>
									<span class="date-value">
										{new Date(`${song.lastPlayedDate}T00:00:00`).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'short',
											day: 'numeric'
										})}
									</span>
								</li>
							{/if}
						</ul>
					</div>
				</Card>
			</aside>
		</div>
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
		margin-bottom: var(--space-6);
	}

	.breadcrumb {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin-bottom: var(--space-2);
	}

	.breadcrumb ol {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.breadcrumb li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.breadcrumb-link {
		color: var(--color-primary-500);
		text-decoration: none;
	}

	.breadcrumb-link:hover {
		text-decoration: underline;
	}

	.breadcrumb-link:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.breadcrumb-separator {
		color: var(--foreground-muted);
	}

	@media (forced-colors: active) {
		.breadcrumb-link:focus-visible {
			outline: 2px solid Highlight;
		}
	}

	.title {
		font-size: var(--text-4xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-3);
	}

	.tags {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.original-artist {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		font-style: italic;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	:global(.stat-card) {
		text-align: center;
	}

	.stat-content {
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.stat-value {
		display: block;
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
	}

	.stat-label {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Main Content */
	.main-content {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: var(--space-8);
	}

	/* Main Column */
	.main-column {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
		min-width: 0;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.section-title {
		font-size: var(--text-xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0;
	}

	.shows-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.view-all-link {
		color: var(--color-primary-500);
		text-decoration: none;
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
	}

	.view-all-link:hover {
		text-decoration: underline;
	}

	/* Lyrics */
	.lyrics-content {
		padding: var(--space-6);
	}

	.lyrics {
		font-family: inherit;
		font-size: var(--text-base);
		line-height: 1.8;
		color: var(--foreground);
		white-space: pre-wrap;
		margin: 0;
	}

	/* Sidebar */
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.sidebar-section {
		padding: var(--space-4);
	}

	.sidebar-title {
		font-size: var(--text-sm);
		font-weight: var(--font-bold);
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0 0 var(--space-3);
	}

	/* Slot Breakdown */
	.slot-breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.slot-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.slot-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--text-sm);
	}

	.slot-bar {
		height: 6px;
		background: var(--background-secondary);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.slot-fill {
		height: 100%;
		width: 100%;
		border-radius: var(--radius-full);
		/* GPU-accelerated: Use scaleX instead of width */
		transform-origin: left center;
		transform: scaleX(var(--fill, 0));
		transition: transform var(--transition-base);
	}

	/* Year Breakdown */
	.year-breakdown {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.year-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.year-label {
		font-size: var(--text-sm);
		color: var(--foreground);
		width: 40px;
		flex-shrink: 0;
	}

	.year-bar {
		flex: 1;
		height: 8px;
		background: var(--background-secondary);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.year-fill {
		height: 100%;
		width: 100%;
		background: var(--color-primary-500);
		border-radius: var(--radius-full);
		/* GPU-accelerated: Use scaleX instead of width */
		transform-origin: left center;
		transform: scaleX(var(--fill, 0));
		transition: transform var(--transition-base);
	}

	.year-count {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		width: 30px;
		text-align: right;
		flex-shrink: 0;
	}

	/* Key Dates */
	.key-dates {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.key-dates li {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-sm);
	}

	.date-label {
		color: var(--foreground-secondary);
	}

	.date-value {
		color: var(--foreground);
		font-weight: var(--font-medium);
	}

	/* Error State */
	.error-state {
		padding: var(--space-6);
		text-align: center;
	}

	.back-link {
		display: inline-block;
		margin-top: var(--space-4);
		color: var(--color-primary-500);
		text-decoration: none;
		font-weight: var(--font-medium);
	}

	.back-link:hover {
		text-decoration: underline;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr;
		}

		.sidebar {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}

		.stats-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (max-width: 768px) {
		.title {
			font-size: var(--text-3xl);
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.sidebar {
			grid-template-columns: 1fr;
		}
	}
</style>
