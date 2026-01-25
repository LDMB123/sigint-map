<script lang="ts">
	import { page } from '$app/stores';
	import { getVenueById, getVenueShows, getVenueSongStats } from '$stores/dexie';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	// ==================== REACTIVE STATE (Svelte 5 Runes) ====================

	// Get venueId from page params - handle undefined
	let venueId = $derived.by(() => {
		const id = $page.params.venueId;
		return id ? parseInt(id) : 0;
	});

	// Get stores for this venue
	let venueStore = $derived(getVenueById(venueId));
	let showsStore = $derived(getVenueShows(venueId));
	let songStatsStore = $derived(getVenueSongStats(venueId));

	// Subscribe to stores using $ syntax
	let venue = $derived($venueStore);
	let shows = $derived($showsStore);
	let songStats = $derived($songStatsStore);

	// ==================== HELPER FUNCTIONS ====================

	/**
	 * Format date string to readable format
	 */
	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'N/A';
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	// ==================== DERIVED STATE ====================

	let location = $derived.by(() => {
		if (!venue) return '';
		return [venue.city, venue.state, venue.country].filter(Boolean).join(', ');
	});

	let isLoading = $derived(!venue);
	let hasError = $derived(venueId && !venue && !isLoading);
	let uniqueSongsCount = $derived(songStats?.uniqueSongsCount ?? 0);
	let topSongs = $derived(songStats?.topSongs ?? []);
</script>

<svelte:head>
	<title>{venue?.name ?? 'Venue'} - DMB Almanac</title>
	<meta
		name="description"
		content={venue
			? `Complete show history for ${venue.name} in ${location}`
			: 'Venue details and show history'}
	/>
</svelte:head>

<div class="container">
	{#if isLoading}
		<!-- Loading State -->
		<div class="loading-spinner" aria-live="polite" aria-busy="true">
			<div class="spinner"></div>
			<p>Loading venue data...</p>
		</div>
	{:else if hasError}
		<!-- Error State -->
		<div class="error-state">
			<a href="/venues" class="back-link"> ← All Venues </a>
			<div class="error-card">
				<h2>Venue not found</h2>
				<p>The venue you're looking for could not be found.</p>
				<p class="hint">You may be offline and this venue has not been cached locally.</p>
			</div>
		</div>
	{:else if venue}
		<!-- Navigation -->
		<a href="/venues" class="back-link"> ← All Venues </a>

		<!-- Venue Header (TapeLabel-style) -->
		<div class="venue-header">
			<h1 class="venue-name">{venue.name}</h1>
			<p class="venue-location">{location}</p>
		</div>

		<!-- Stats Card -->
		<Card variant="default" padding="lg">
			<div class="card-header">
				<svg
					class="icon"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
					<circle cx="12" cy="10" r="3"></circle>
				</svg>
				<h2 class="card-title">Venue Statistics</h2>
			</div>
			<div class="stats-grid">
				<div class="stat">
					<p class="stat-label">Total Shows</p>
					<p class="stat-value">{venue.totalShows}</p>
				</div>
				<div class="stat">
					<p class="stat-label">Unique Songs</p>
					<p class="stat-value">{uniqueSongsCount}</p>
				</div>
				{#if venue.firstShowDate}
					<div class="stat">
						<p class="stat-label">First Show</p>
						<p class="stat-date">{formatDate(venue.firstShowDate)}</p>
					</div>
				{/if}
				{#if venue.lastShowDate}
					<div class="stat">
						<p class="stat-label">Last Show</p>
						<p class="stat-date">{formatDate(venue.lastShowDate)}</p>
					</div>
				{/if}
			</div>

			<!-- Venue Info Badges -->
			<div class="venue-badges">
				{#if venue.venueType}
					<Badge variant="outline">{venue.venueType.replace(/_/g, ' ')}</Badge>
				{/if}
				{#if venue.capacity}
					<Badge variant="outline">Capacity: {venue.capacity.toLocaleString()}</Badge>
				{/if}
			</div>
		</Card>

		<!-- Top Songs at this Venue -->
		{#if topSongs.length > 0}
			<Card variant="default" padding="lg">
				<div class="card-header">
					<svg
						class="icon"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 18V5l12-2v13"></path>
						<circle cx="6" cy="18" r="3"></circle>
						<circle cx="18" cy="16" r="3"></circle>
					</svg>
					<h2 class="card-title">Most Played Songs</h2>
				</div>
				<div class="songs-grid">
					{#each topSongs as item}
						{#if item.song}
							<a href="/songs/{item.song.slug}" class="song-link">
								<span class="song-title">{item.song.title}</span>
								<Badge variant="secondary" size="sm">{item.playCount}x</Badge>
							</a>
						{/if}
					{/each}
				</div>
			</Card>
		{/if}

		<!-- Show History -->
		<Card variant="default" padding="lg">
			<div class="card-header">
				<svg
					class="icon"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
					<line x1="16" x2="16" y1="2" y2="6"></line>
					<line x1="8" x2="8" y1="2" y2="6"></line>
					<line x1="3" x2="21" y1="10" y2="10"></line>
				</svg>
				<h2 class="card-title">Show History ({shows?.length ?? 0})</h2>
			</div>
			{#if shows && shows.length > 0}
				<div class="shows-list">
					{#each shows as show (show.id)}
						<a href="/shows/{show.id}" class="show-link">
							<div class="show-info">
								<p class="show-date">{formatDate(show.date)}</p>
								{#if show.tour}
									<p class="show-tour">{show.tour.name}</p>
								{/if}
							</div>
							<Badge variant="outline" size="sm">{show.songCount} songs</Badge>
						</a>
					{/each}
				</div>
			{:else}
				<p class="empty-message">No shows recorded at this venue.</p>
			{/if}
		</Card>
	{/if}
</div>

<style>
	.container {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	/* Back Link */
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground-secondary);
		text-decoration: none;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
		width: fit-content;
	}

	.back-link:hover {
		background: var(--color-primary-50);
		color: var(--color-primary-600);
	}

	/* Venue Header */
	.venue-header {
		text-align: center;
		padding: var(--space-8) var(--space-4);
		background: linear-gradient(
			135deg,
			var(--background) 0%,
			color-mix(in oklch, var(--color-primary-50) 60%, var(--background)) 50%,
			color-mix(in oklch, var(--color-secondary-50) 40%, var(--background)) 100%
		);
		border: 1px solid var(--color-primary-200);
		border-radius: var(--radius-2xl);
		box-shadow:
			var(--shadow-sm),
			inset 0 1px 0 0 oklch(1 0 0 / 0.1);
	}

	.venue-name {
		font-size: var(--text-4xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-2);
		line-height: 1.2;
	}

	.venue-location {
		font-size: var(--text-xl);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Card Header */
	.card-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border-color);
	}

	.card-title {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.icon {
		width: 20px;
		height: 20px;
		color: var(--color-primary-600);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.stat-label {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		margin: 0;
	}

	.stat-value {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
		margin: 0;
	}

	.stat-date {
		font-size: var(--text-lg);
		font-weight: var(--font-medium);
		color: var(--foreground);
		margin: 0;
	}

	/* Venue Badges */
	.venue-badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	/* Songs Grid */
	.songs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-2);
	}

	.song-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-fast);
	}

	.song-link:hover {
		background: var(--background-secondary);
		border-color: var(--color-primary-300);
	}

	.song-title {
		font-weight: var(--font-medium);
		color: var(--foreground);
	}

	/* Shows List */
	.shows-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.show-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-fast);
	}

	.show-link:hover {
		background: var(--background-secondary);
		border-color: var(--color-primary-300);
	}

	.show-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.show-date {
		font-weight: var(--font-medium);
		color: var(--foreground);
		margin: 0;
	}

	.show-tour {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}

	.empty-message {
		color: var(--foreground-secondary);
		text-align: center;
		padding: var(--space-4);
		margin: 0;
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

	/* Error State */
	.error-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.error-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-12) var(--space-4);
		text-align: center;
		border: 2px dashed var(--color-primary-300);
		border-radius: var(--radius-2xl);
		background: var(--background-secondary);
	}

	.error-card h2 {
		font-size: var(--text-2xl);
		font-weight: var(--font-semibold);
		color: var(--color-primary-700);
		margin: 0;
	}

	.error-card p {
		color: var(--foreground-secondary);
		margin: 0;
	}

	.error-card .hint {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-4) var(--space-3);
			gap: var(--space-4);
		}

		.venue-name {
			font-size: var(--text-3xl);
		}

		.venue-location {
			font-size: var(--text-lg);
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-value {
			font-size: var(--text-2xl);
		}

		.songs-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Dark mode */
	@media (prefers-color-scheme: dark) {
		.venue-header {
			background: linear-gradient(
				135deg,
				var(--background) 0%,
				color-mix(in oklch, var(--color-primary-900) 20%, var(--background)) 100%
			);
			border-color: var(--color-gray-700);
		}

		.back-link:hover {
			background: color-mix(in oklch, var(--color-primary-900) 30%, var(--background));
			color: var(--color-primary-400);
		}

		.icon {
			color: var(--color-primary-400);
		}

		.error-card {
			border-color: var(--color-primary-500);
			background: var(--color-gray-800);
		}

		.error-card h2 {
			color: var(--color-primary-400);
		}
	}
</style>
