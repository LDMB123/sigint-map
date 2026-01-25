<script lang="ts">
	import { globalStats as clientGlobalStats, allShows } from '$stores/dexie';

	// Receive SSR data from +page.server.ts
	let { data } = $props();

	// Use SSR data for initial render, fall back to client stores for hydration
	// This provides instant LCP while maintaining reactive updates from IndexedDB
	const stats = $derived(data?.globalStats ?? $clientGlobalStats);
	const recentShows = $derived(data?.recentShows ?? $allShows?.slice(0, 5) ?? []);
</script>

<svelte:head>
	<title>DMB Almanac - Dave Matthews Band Concert Database</title>
</svelte:head>

<div class="container">
	<section class="hero" aria-labelledby="hero-title">
		<h1 id="hero-title" class="hero-title">DMB Almanac</h1>
		<p class="hero-subtitle">The complete Dave Matthews Band concert database</p>
	</section>

	<!-- Quick Stats with scroll-driven animations -->
	{#if stats}
		<section class="stats-grid scroll-section-reveal" aria-label="Database statistics">
			<a href="/songs" class="stat-card scroll-stagger-item">
				<span class="stat-value">{stats.totalSongs.toLocaleString()}</span>
				<span class="stat-label">Songs</span>
			</a>
			<a href="/shows" class="stat-card scroll-stagger-item">
				<span class="stat-value">{stats.totalShows.toLocaleString()}</span>
				<span class="stat-label">Shows</span>
			</a>
			<a href="/venues" class="stat-card scroll-stagger-item">
				<span class="stat-value">{stats.totalVenues.toLocaleString()}</span>
				<span class="stat-label">Venues</span>
			</a>
			<a href="/guests" class="stat-card scroll-stagger-item">
				<span class="stat-value">{stats.totalGuests.toLocaleString()}</span>
				<span class="stat-label">Guest Musicians</span>
			</a>
		</section>
	{:else}
		<section class="stats-grid" aria-label="Database statistics loading" aria-busy="true">
			{#each Array(4) as _}
				<div class="stat-card loading">
					<span class="stat-value skeleton"></span>
					<span class="stat-label skeleton"></span>
				</div>
			{/each}
		</section>
	{/if}

	<!-- Recent Shows with scroll animation -->
	<section class="recent-section scroll-slide-up" aria-labelledby="recent-shows-title">
		<h2 id="recent-shows-title" class="section-title">Recent Shows</h2>
		{#if recentShows.length > 0}
			<ul class="show-list" role="list">
				{#each recentShows as show (show.id)}
					<li>
						<a href="/shows/{show.id}" class="show-card">
							<time class="show-date" datetime={show.date}>
								{new Date(show.date + 'T00:00:00').toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</time>
							<div class="show-details">
								<span class="show-venue">{show.venue?.name || 'Unknown Venue'}</span>
								<span class="show-location">{show.venue?.city}{show.venue?.state ? `, ${show.venue.state}` : ''}</span>
							</div>
							<span class="show-songs">{show.songCount} songs</span>
						</a>
					</li>
				{/each}
			</ul>
			<a href="/shows" class="view-all">View All Shows →</a>
		{:else}
			<p class="loading-text" role="status" aria-busy="true">Loading recent shows...</p>
		{/if}
	</section>

	<!-- Quick Links with scroll-driven card reveal animations -->
	<nav class="quick-links scroll-section-reveal" aria-labelledby="explore-title">
		<h2 id="explore-title" class="section-title">Explore</h2>
		<ul class="link-grid" role="list">
			<li>
				<a href="/liberation" class="link-card scroll-card-reveal">
					<span class="link-icon" aria-hidden="true">🎸</span>
					<span class="link-title">Liberation List</span>
					<span class="link-desc">Songs that haven't been played recently</span>
				</a>
			</li>
			<li>
				<a href="/stats" class="link-card scroll-card-reveal">
					<span class="link-icon" aria-hidden="true">📊</span>
					<span class="link-title">Statistics</span>
					<span class="link-desc">Performance analytics and trends</span>
				</a>
			</li>
			<li>
				<a href="/visualizations" class="link-card scroll-card-reveal">
					<span class="link-icon" aria-hidden="true">🗺️</span>
					<span class="link-title">Visualizations</span>
					<span class="link-desc">Interactive charts and maps</span>
				</a>
			</li>
			<li>
				<a href="/search" class="link-card scroll-card-reveal">
					<span class="link-icon" aria-hidden="true">🔍</span>
					<span class="link-title">Search</span>
					<span class="link-desc">Find songs, shows, and venues</span>
				</a>
			</li>
		</ul>
	</nav>
</div>

<style>
	.container {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: var(--space-12) 0;
	}

	.hero-title {
		font-size: var(--text-5xl);
		font-weight: var(--font-extrabold);
		letter-spacing: var(--tracking-tight);
		background: var(--gradient-text-gold);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin: 0 0 var(--space-4);
	}

	.hero-subtitle {
		font-size: var(--text-xl);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-12);
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-6);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
		text-decoration: none;
		transition: transform var(--transition-fast), box-shadow var(--transition-fast);
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.stat-value {
		font-size: var(--text-3xl);
		font-weight: var(--font-extrabold);
		color: var(--color-primary-500);
	}

	.stat-label {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

	/* Skeleton loading */
	.skeleton {
		background: linear-gradient(90deg, var(--background-tertiary) 25%, var(--background-secondary) 50%, var(--background-tertiary) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
		border-radius: var(--radius-md);
	}

	.stat-card.loading .stat-value.skeleton {
		width: 80px;
		height: 36px;
	}

	.stat-card.loading .stat-label.skeleton {
		width: 60px;
		height: 16px;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	/* Recent Shows */
	.recent-section {
		margin-bottom: var(--space-12);
	}

	.section-title {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		margin: 0 0 var(--space-6);
	}

	.show-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.show-list li {
		display: contents;
	}

	.show-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: background var(--transition-fast);
	}

	.show-card:hover {
		background: var(--background-tertiary);
	}

	.show-date {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-primary-500);
		white-space: nowrap;
	}

	.show-details {
		flex: 1;
		min-width: 0;
	}

	.show-venue {
		display: block;
		font-weight: var(--font-medium);
		color: var(--foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.show-location {
		display: block;
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	.show-songs {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		white-space: nowrap;
	}

	.view-all {
		display: inline-block;
		margin-top: var(--space-4);
		font-weight: var(--font-medium);
		color: var(--color-primary-500);
		text-decoration: none;
	}

	.view-all:hover {
		text-decoration: underline;
	}

	.loading-text {
		color: var(--foreground-muted);
		font-style: italic;
	}

	/* Quick Links */
	.quick-links {
		margin-bottom: var(--space-12);
	}

	.link-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.link-grid li {
		display: contents;
	}

	.link-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-6);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
		text-decoration: none;
		transition: transform var(--transition-fast), box-shadow var(--transition-fast);
	}

	.link-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.link-icon {
		font-size: var(--text-2xl);
	}

	.link-title {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--foreground);
	}

	.link-desc {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero-title {
			font-size: var(--text-4xl);
		}

		.hero-subtitle {
			font-size: var(--text-lg);
		}

		.show-card {
			flex-wrap: wrap;
		}

		.show-details {
			order: 2;
			width: 100%;
		}

		.show-songs {
			order: 1;
		}
	}
</style>
