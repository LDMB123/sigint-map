<script lang="ts">
	import {
		userFavoriteSongs,
		userFavoriteVenues,
		userAttendedShows,
		allShows,
		allSongs,
		allVenues
	} from '$stores/dexie';
	import type { DexieShow, DexieSong, DexieVenue } from '$db/dexie/schema';
	import ShowCard from '$lib/components/shows/ShowCard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatCard from '$lib/components/ui/StatCard.svelte';

	// ==================== REACTIVE STATE ====================

	// Derived values from stores - automatically update when stores change
	const favoriteSongs = $derived($userFavoriteSongs ?? []);
	const favoriteVenues = $derived($userFavoriteVenues ?? []);
	const attendedShows = $derived($userAttendedShows ?? []);

	// Derived values from all data stores for lookups
	const allShowsData = $derived($allShows ?? []);
	const allSongsData = $derived($allSongs ?? []);
	const allVenuesData = $derived($allVenues ?? []);

	// ==================== DERIVED STATE ====================

	// Join attended shows with full show data
	const attendedShowsWithData = $derived.by(() => {
		const showMap = new Map(allShowsData.map((show) => [show.id, show]));
		return attendedShows
			.map((attended) => showMap.get(attended.showId))
			.filter((show): show is DexieShow => show !== undefined)
			.sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
	});

	// Join favorite songs with full song data
	const favoriteSongsWithData = $derived.by(() => {
		const songMap = new Map(allSongsData.map((song) => [song.id, song]));
		return favoriteSongs
			.map((fav) => songMap.get(fav.songId))
			.filter((song): song is DexieSong => song !== undefined)
			.sort((a, b) => a.sortTitle.localeCompare(b.sortTitle)); // Alphabetical
	});

	// Join favorite venues with full venue data
	const favoriteVenuesWithData = $derived.by(() => {
		const venueMap = new Map(allVenuesData.map((venue) => [venue.id, venue]));
		return favoriteVenues
			.map((fav) => venueMap.get(fav.venueId))
			.filter((venue): venue is DexieVenue => venue !== undefined)
			.sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical
	});

	// Statistics
	const stats = $derived.by(() => {
		const totalAttended = attendedShowsWithData.length;
		const totalFavoriteSongs = favoriteSongsWithData.length;
		const totalFavoriteVenues = favoriteVenuesWithData.length;

		// Calculate unique years attended
		const yearsAttended = new Set(
			attendedShowsWithData.map((show) => new Date(show.date).getFullYear())
		).size;

		// Calculate unique venues attended
		const venuesAttended = new Set(attendedShowsWithData.map((show) => show.venueId)).size;

		// First and last show attended
		const sortedShows = [...attendedShowsWithData].sort((a, b) => a.date.localeCompare(b.date));
		const firstShow = sortedShows[0];
		const lastShow = sortedShows[sortedShows.length - 1];

		// Calculate total songs seen from attended shows
		const totalSongsSeen = attendedShowsWithData.reduce((sum, show) => sum + show.songCount, 0);

		return {
			totalAttended,
			totalFavoriteSongs,
			totalFavoriteVenues,
			yearsAttended,
			venuesAttended,
			firstShow,
			lastShow,
			totalSongsSeen
		};
	});

	// Loading state
	const isLoading = $derived(
		!allShowsData.length || !allSongsData.length || !allVenuesData.length
	);

	// Active tab state
	let activeTab = $state<'shows' | 'songs' | 'venues'>('shows');

	// Tab navigation options in order
	const tabOptions: Array<'shows' | 'songs' | 'venues'> = ['shows', 'songs', 'venues'];

	// Handle keyboard navigation between tabs
	function handleTabKeydown(event: KeyboardEvent, currentTab: string) {
		const currentIndex = tabOptions.indexOf(currentTab as any);
		let nextIndex: number | null = null;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			nextIndex = (currentIndex + 1) % tabOptions.length;
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			nextIndex = (currentIndex - 1 + tabOptions.length) % tabOptions.length;
		} else if (event.key === 'Home') {
			event.preventDefault();
			nextIndex = 0;
		} else if (event.key === 'End') {
			event.preventDefault();
			nextIndex = tabOptions.length - 1;
		}

		if (nextIndex !== null) {
			activeTab = tabOptions[nextIndex];
			// Focus the newly activated tab button
			const tabButtons = document.querySelectorAll('[role="tab"]');
			const targetButton = tabButtons[nextIndex];
			if (targetButton instanceof HTMLElement) {
				targetButton.focus();
			}
		}
	}

	// ==================== ACTIONS ====================

	/**
	 * Remove a favorite song with optimistic update
	 */
	async function removeFavoriteSong(songId: number) {
		try {
			await userFavoriteSongs.remove(songId);
		} catch (err) {
			console.error('Failed to remove favorite song:', err);
			// Store will revert automatically on error
		}
	}

	/**
	 * Remove a favorite venue with optimistic update
	 */
	async function removeFavoriteVenue(venueId: number) {
		try {
			await userFavoriteVenues.remove(venueId);
		} catch (err) {
			console.error('Failed to remove favorite venue:', err);
		}
	}

	/**
	 * Remove an attended show with optimistic update
	 */
	async function removeAttendedShow(showId: number) {
		try {
			await userAttendedShows.remove(showId);
		} catch (err) {
			console.error('Failed to remove attended show:', err);
		}
	}

	/**
	 * Format date for display
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>My Shows - DMB Almanac</title>
	<meta
		name="description"
		content="Your personal DMB collection: favorite songs, venues, and shows you've attended"
	/>
</svelte:head>

<div class="container">
	{#if isLoading}
		<!-- Loading State -->
		<div class="header">
			<h1 class="title">My Shows</h1>
			<p class="subtitle">Loading your collection...</p>
		</div>
		<div class="loading-spinner" aria-live="polite" aria-busy="true">
			<div class="spinner"></div>
			<p>Loading data from local database...</p>
		</div>
	{:else}
		<!-- Main Content -->
		<div class="header">
			<h1 class="title">My Shows</h1>
			<p class="subtitle">Your personal DMB collection and concert history</p>
		</div>

		<!-- Statistics Grid -->
		<div class="stats-grid" role="group" aria-label="Personal statistics">
			<StatCard
				label="Shows Attended"
				value={stats.totalAttended}
				variant="primary"
				size="md"
			/>
			<StatCard label="Unique Venues" value={stats.venuesAttended} variant="secondary" size="md" />
			<StatCard label="Years Active" value={stats.yearsAttended} variant="default" size="md" />
			<StatCard
				label="Total Songs Seen"
				value={stats.totalSongsSeen}
				variant="default"
				size="md"
			/>
		</div>

		<!-- First/Last Show Summary -->
		{#if stats.firstShow && stats.lastShow && stats.totalAttended > 0}
			<div class="show-summary">
				<div class="summary-item">
					<span class="summary-label">First Show:</span>
					<a href="/shows/{stats.firstShow.id}" class="summary-link">
						{formatDate(stats.firstShow.date)} - {stats.firstShow.venue.name}, {stats.firstShow
							.venue.city}
					</a>
				</div>
				<div class="summary-item">
					<span class="summary-label">Latest Show:</span>
					<a href="/shows/{stats.lastShow.id}" class="summary-link">
						{formatDate(stats.lastShow.date)} - {stats.lastShow.venue.name}, {stats.lastShow.venue
							.city}
					</a>
				</div>
			</div>
		{/if}

		<!-- Tab Navigation -->
		<div class="tabs" role="tablist" aria-label="My collection categories">
			<button
				type="button"
				id="shows-tab"
				role="tab"
				aria-selected={activeTab === 'shows'}
				aria-controls="shows-panel"
				class="tab"
				onclick={() => (activeTab = 'shows')}
				onkeydown={(e) => handleTabKeydown(e, activeTab)}
				tabindex={activeTab === 'shows' ? 0 : -1}
			>
				Shows Attended
				<Badge variant="primary" size="sm">{stats.totalAttended}</Badge>
			</button>
			<button
				type="button"
				id="songs-tab"
				role="tab"
				aria-selected={activeTab === 'songs'}
				aria-controls="songs-panel"
				class="tab"
				onclick={() => (activeTab = 'songs')}
				onkeydown={(e) => handleTabKeydown(e, activeTab)}
				tabindex={activeTab === 'songs' ? 0 : -1}
			>
				Favorite Songs
				<Badge variant="secondary" size="sm">{stats.totalFavoriteSongs}</Badge>
			</button>
			<button
				type="button"
				id="venues-tab"
				role="tab"
				aria-selected={activeTab === 'venues'}
				aria-controls="venues-panel"
				class="tab"
				onclick={() => (activeTab = 'venues')}
				onkeydown={(e) => handleTabKeydown(e, activeTab)}
				tabindex={activeTab === 'venues' ? 0 : -1}
			>
				Favorite Venues
				<Badge variant="outline" size="sm">{stats.totalFavoriteVenues}</Badge>
			</button>
		</div>

		<!-- Tab Panels -->
		<div class="tab-panels">
			<!-- Shows Panel -->
			{#if activeTab === 'shows'}
				<div id="shows-panel" role="tabpanel" aria-labelledby="shows-tab" class="tab-panel">
					{#if attendedShowsWithData.length === 0}
						<div class="empty-state">
							<h2>No Shows Attended Yet</h2>
							<p>Start building your concert history by marking shows you've attended.</p>
							<p>Visit any show page and click "Mark as Attended" to add it to your collection.</p>
							<a href="/shows" class="cta-link">Browse All Shows</a>
						</div>
					{:else}
						<div class="shows-grid">
							{#each attendedShowsWithData as show (show.id)}
								<div class="show-item">
									<ShowCard {show} variant="compact" />
									<button
										type="button"
										class="remove-button"
										onclick={() => removeAttendedShow(show.id)}
										aria-label="Remove {show.venue.name} from attended shows"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M3 6h18" />
											<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
											<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
										</svg>
										Remove
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Songs Panel -->
			{#if activeTab === 'songs'}
				<div id="songs-panel" role="tabpanel" aria-labelledby="songs-tab" class="tab-panel">
					{#if favoriteSongsWithData.length === 0}
						<div class="empty-state">
							<h2>No Favorite Songs Yet</h2>
							<p>Mark your favorite DMB songs to keep track of them here.</p>
							<p>Visit any song page and click the star icon to add it to your favorites.</p>
							<a href="/songs" class="cta-link">Browse All Songs</a>
						</div>
					{:else}
						<div class="songs-list">
							{#each favoriteSongsWithData as song (song.id)}
								<div class="list-item">
									<a href="/songs/{song.slug}" class="item-link">
										<div class="item-content">
											<h3 class="item-title">{song.title}</h3>
											<div class="item-meta">
												{#if song.isCover}
													<Badge variant="secondary" size="sm">Cover</Badge>
												{/if}
												{#if song.isLiberated}
													<Badge variant="warning" size="sm">Liberated</Badge>
												{/if}
												<span class="meta-text">{song.totalPerformances} performances</span>
											</div>
										</div>
									</a>
									<button
										type="button"
										class="remove-button-icon"
										onclick={() => removeFavoriteSong(song.id)}
										aria-label="Remove {song.title} from favorites"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<line x1="18" y1="6" x2="6" y2="18" />
											<line x1="6" y1="6" x2="18" y2="18" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Venues Panel -->
			{#if activeTab === 'venues'}
				<div id="venues-panel" role="tabpanel" aria-labelledby="venues-tab" class="tab-panel">
					{#if favoriteVenuesWithData.length === 0}
						<div class="empty-state">
							<h2>No Favorite Venues Yet</h2>
							<p>Mark your favorite DMB venues to keep track of them here.</p>
							<p>Visit any venue page and click the star icon to add it to your favorites.</p>
							<a href="/venues" class="cta-link">Browse All Venues</a>
						</div>
					{:else}
						<div class="venues-grid">
							{#each favoriteVenuesWithData as venue (venue.id)}
								<div class="venue-card">
									<a href="/venues/{venue.id}" class="venue-link">
										<div class="venue-content">
											<h3 class="venue-name">{venue.name}</h3>
											<p class="venue-location">
												{venue.city}{#if venue.state}, {venue.state}{/if}
												{#if venue.country && venue.country !== 'USA'}
													, {venue.country}
												{/if}
											</p>
											<div class="venue-stats">
												{#if venue.venueType}
													<Badge variant="outline" size="sm">{venue.venueType}</Badge>
												{/if}
												<span class="stat-text">{venue.totalShows} shows</span>
											</div>
										</div>
									</a>
									<button
										type="button"
										class="remove-button-icon"
										onclick={() => removeFavoriteVenue(venue.id)}
										aria-label="Remove {venue.name} from favorites"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<line x1="18" y1="6" x2="6" y2="18" />
											<line x1="6" y1="6" x2="18" y2="18" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: var(--max-width);
		margin: 0 auto;
		/* Fluid padding: 1rem-1.5rem vertical, 0.75rem-1rem horizontal */
		padding: clamp(1rem, 4vw, 1.5rem) clamp(0.75rem, 3vw, 1rem);
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

	/* Statistics Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	/* Show Summary */
	.show-summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-8);
	}

	.summary-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.summary-label {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--foreground-secondary);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

	.summary-link {
		font-size: var(--text-base);
		color: var(--color-primary-600);
		text-decoration: none;
		transition: color var(--transition-fast);
	}

	.summary-link:hover {
		color: var(--color-primary-700);
		text-decoration: underline;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: var(--space-2);
		border-bottom: 2px solid var(--border-color);
		margin-bottom: var(--space-6);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground-secondary);
		background: none;
		border: none;
		border-bottom: 3px solid transparent;
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;
		margin-bottom: -2px;
	}

	.tab:hover {
		color: var(--foreground);
		background: var(--background-secondary);
	}

	.tab[aria-selected='true'] {
		color: var(--color-primary-600);
		border-bottom-color: var(--color-primary-600);
	}

	.tab:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
		border-radius: var(--radius-md);
	}

	/* Tab Panels */
	.tab-panels {
		min-height: 400px;
	}

	.tab-panel {
		animation: fadeIn 0.2s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Shows Grid */
	.shows-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.show-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.show-item > :first-child {
		flex: 1;
	}

	/* Songs List */
	.songs-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		transition: all var(--transition-fast);
	}

	.list-item:hover {
		border-color: var(--color-primary-300);
		background: var(--background-secondary);
	}

	.item-link {
		flex: 1;
		text-decoration: none;
		color: inherit;
		min-width: 0;
	}

	.item-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.item-title {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.item-meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.meta-text {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	/* Venues Grid */
	.venues-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-3);
	}

	.venue-card {
		position: relative;
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		transition: all var(--transition-fast);
	}

	.venue-card:hover {
		border-color: var(--color-primary-300);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.venue-link {
		display: block;
		text-decoration: none;
		color: inherit;
		padding: var(--space-4);
	}

	.venue-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.venue-name {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.venue-location {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}

	.venue-stats {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-top: var(--space-1);
	}

	.stat-text {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
	}

	/* Remove Buttons */
	.remove-button {
		display: flex;
		align-items: center;
		gap: var(--space-1-5, 0.375rem);
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-primary-700);
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.remove-button:hover {
		color: var(--color-primary-800);
		background: var(--color-primary-50);
		border-color: var(--color-primary-300);
	}

	.remove-button:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.remove-button svg {
		flex-shrink: 0;
	}

	.remove-button-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-2);
		color: var(--foreground-muted);
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.remove-button-icon:hover {
		color: var(--color-primary-700);
		background: var(--color-primary-50);
	}

	.remove-button-icon:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-12) var(--space-4);
		text-align: center;
		color: var(--foreground-secondary);
	}

	.empty-state h2 {
		font-size: var(--text-2xl);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.empty-state p {
		margin: 0;
		font-size: var(--text-base);
		max-width: 500px;
	}

	.cta-link {
		display: inline-flex;
		align-items: center;
		padding: var(--space-3) var(--space-5);
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: white;
		background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--transition-fast);
		box-shadow: var(--shadow-sm);
		margin-top: var(--space-2);
	}

	.cta-link:hover {
		background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700));
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.cta-link:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
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

	/* Responsive */
	@media (max-width: 768px) {
		.title {
			font-size: var(--text-3xl);
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: var(--space-3);
		}

		.show-summary {
			padding: var(--space-3);
		}

		.summary-item {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}

		.tabs {
			gap: var(--space-1);
		}

		.tab {
			padding: var(--space-2) var(--space-3);
			font-size: var(--text-sm);
		}

		.show-item {
			flex-direction: column;
			align-items: stretch;
		}

		.remove-button {
			width: 100%;
			justify-content: center;
		}

		.venues-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Dark mode */
	@media (prefers-color-scheme: dark) {
		.show-summary {
			background: var(--color-gray-800);
			border-color: var(--color-gray-700);
		}

		.summary-link {
			color: var(--color-primary-400);
		}

		.summary-link:hover {
			color: var(--color-primary-300);
		}

		.tab[aria-selected='true'] {
			color: var(--color-primary-400);
			border-bottom-color: var(--color-primary-400);
		}

		.list-item {
			background: var(--color-gray-800);
			border-color: var(--color-gray-700);
		}

		.list-item:hover {
			border-color: var(--color-primary-500);
			background: var(--color-gray-750);
		}

		.venue-card {
			background: var(--color-gray-800);
			border-color: var(--color-gray-700);
		}

		.venue-card:hover {
			border-color: var(--color-primary-500);
		}

		.remove-button {
			background: var(--color-gray-800);
			border-color: var(--color-gray-700);
			color: var(--color-primary-400);
		}

		.remove-button:hover {
			background: var(--color-gray-700);
			border-color: var(--color-primary-500);
			color: var(--color-primary-300);
		}

		.remove-button-icon:hover {
			background: var(--color-gray-700);
			color: var(--color-primary-400);
		}

		.cta-link {
			background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700));
		}

		.cta-link:hover {
			background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.tab-panel {
			animation: none;
		}

		.venue-card:hover,
		.cta-link:hover {
			transform: none;
		}

		.spinner {
			animation: none;
			border-top-color: var(--border-color);
		}
	}

	/* High contrast mode */
	@media (forced-colors: active) {
		.tab[aria-selected='true'] {
			outline: 2px solid CanvasText;
		}

		.remove-button,
		.remove-button-icon {
			border: 1px solid ButtonText;
		}
	}
</style>
