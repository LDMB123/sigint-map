<script module lang="ts">
	// ==================== TYPES ====================

	interface GroupedSongs {
		[letter: string]: DexieSong[];
	}

	type SortOption = 'alphabetical' | 'performances' | 'recent' | 'openers' | 'closers';

	interface SortConfig {
		label: string;
		value: SortOption;
		description: string;
	}
</script>

<script lang="ts">
	import { allSongs as clientAllSongs, songStats as clientSongStats } from '$stores/dexie';
	import type { DexieSong } from '$db/dexie/schema';
	import { processInChunks, yieldToMain } from '$lib/utils/scheduler';
	import { startElementTransition } from '$lib/hooks/viewTransitionNavigation';
	import { goto } from '$app/navigation';

	// Sort configuration
	const sortOptions: SortConfig[] = [
		{ value: 'alphabetical', label: 'A-Z', description: 'Sort alphabetically by title' },
		{ value: 'performances', label: 'Most Played', description: 'Sort by total performances' },
		{ value: 'recent', label: 'Recently Played', description: 'Sort by last played date' },
		{ value: 'openers', label: 'Top Openers', description: 'Sort by opener frequency' },
		{ value: 'closers', label: 'Top Closers', description: 'Sort by closer frequency' }
	];

	let currentSort = $state<SortOption>('alphabetical');
	let showSortDropdown = $state(false);

	// Receive SSR data from +page.server.ts
	let { data } = $props();

	/**
	 * Navigate to song detail with view transition
	 * Uses zoom-in transition for detail view drilling
	 */
	async function navigateToSong(slug: string): Promise<void> {
		await startElementTransition(
			'card',
			() => goto(`/songs/${slug}`),
			'zoom-in'
		);
	}

	// ==================== REACTIVE STATE ====================

	// Use SSR data for initial render, fall back to client stores for hydration
	let rawSongs = $derived(data?.songs ?? $clientAllSongs);
	let stats = $derived(data?.songStats ?? $clientSongStats);

	// Apply sorting to songs
	let songs = $derived.by(() => {
		if (!rawSongs || rawSongs.length === 0) return rawSongs;

		const sorted = [...rawSongs];

		switch (currentSort) {
			case 'performances':
				return sorted.sort((a, b) => (b.totalPerformances ?? 0) - (a.totalPerformances ?? 0));
			case 'recent':
				return sorted.sort((a, b) => {
					const dateA = a.lastPlayedDate ?? '1900-01-01';
					const dateB = b.lastPlayedDate ?? '1900-01-01';
					return dateB.localeCompare(dateA);
				});
			case 'openers':
				return sorted.sort((a, b) => (b.openerCount ?? 0) - (a.openerCount ?? 0));
			case 'closers':
				return sorted.sort((a, b) => (b.closerCount ?? 0) - (a.closerCount ?? 0));
			case 'alphabetical':
			default:
				return sorted.sort((a, b) => {
					const aSort = a.sortTitle || a.title;
					const bSort = b.sortTitle || b.title;
					return aSort.localeCompare(bSort);
				});
		}
	});

	// Only show letter navigation for alphabetical sort
	let showLetterNav = $derived(currentSort === 'alphabetical');

	// ==================== HELPER FUNCTIONS ====================

	/**
	 * Group songs by first letter for alphabetical navigation
	 * Uses scheduler.yield() to avoid blocking the main thread during large list processing
	 */
	async function groupSongsByLetter(songList: DexieSong[]): Promise<GroupedSongs> {
		const grouped: GroupedSongs = {};

		// Process songs in chunks with automatic yielding
		await processInChunks(
			songList,
			(song) => {
				// Use sortTitle if available, otherwise use title
				const sortKey = song.sortTitle || song.title;
				const firstChar = sortKey.charAt(0).toUpperCase();
				const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
				if (!grouped[letter]) {
					grouped[letter] = [];
				}
				grouped[letter].push(song);
			},
			{
				chunkSize: 50,
				priority: 'user-visible'
			}
		);

		// Sort songs within each letter group by sortTitle
		const letterKeys = Object.keys(grouped);
		for (let i = 0; i < letterKeys.length; i++) {
			const letter = letterKeys[i];
			grouped[letter].sort((a, b) => {
				const aSort = a.sortTitle || a.title;
				const bSort = b.sortTitle || b.title;
				return aSort.localeCompare(bSort);
			});

			// Yield every 10 groups during sorting phase
			if (i % 10 === 0 && i > 0) {
				await yieldToMain();
			}
		}

		return grouped;
	}

	// ==================== DERIVED STATE ====================

	let groupedSongs: GroupedSongs = $state({});
	let letters: string[] = $state([]);
	let isGrouping = $state(false);

	// Use $effect for side effects instead of $:
	// Race condition protected: cleanup cancels stale updates if effect re-runs
	$effect(() => {
		if (!songs || songs.length === 0) return;

		let cancelled = false;
		isGrouping = true;

		groupSongsByLetter(songs)
			.then((result) => {
				if (cancelled) return; // Prevent stale update
				groupedSongs = result;
				letters = Object.keys(result).sort((a, b) => {
					if (a === '#') return -1;
					if (b === '#') return 1;
					return a.localeCompare(b);
				});
			})
			.finally(() => {
				if (!cancelled) isGrouping = false;
			});

		// Cleanup: cancel if effect re-runs before async completes
		return () => {
			cancelled = true;
		};
	});

	let isLoading = $derived(!songs || !stats || isGrouping);
	let isEmpty = $derived(songs && songs.length === 0);
</script>

<svelte:head>
	<title>Song Catalog - DMB Almanac</title>
	<meta
		name="description"
		content="Complete catalog of Dave Matthews Band songs with performance statistics"
	/>
	<!-- Preload critical data for instant navigation (Chromium 2025 optimization) -->
	<link rel="preload" href="/songs" as="fetch" crossorigin="anonymous" fetchpriority="high" />
</svelte:head>

<div class="container">
	{#if isLoading}
		<!-- Loading State -->
		<div class="header">
			<h1 class="title">Song Catalog</h1>
			<p class="subtitle">Loading song data...</p>
		</div>
		<div class="loading-spinner" aria-live="polite" aria-busy="true">
			<div class="spinner"></div>
			<p>Loading songs from local database...</p>
		</div>
	{:else if isEmpty}
		<!-- Empty State -->
		<div class="header">
			<h1 class="title">Song Catalog</h1>
			<p class="subtitle">No songs available</p>
		</div>
		<div class="empty-state">
			<h2>Database is empty</h2>
			<p>The song database has not been synced yet.</p>
			<p>Please ensure you're online and refresh the page to sync data.</p>
		</div>
	{:else}
		<!-- Main Content -->
		<div class="header">
			<h1 class="title">Song Catalog</h1>
			<p class="subtitle">
				Complete catalog of {stats?.total ?? 0} songs performed by Dave Matthews Band
			</p>
		</div>

		<!-- Quick Stats -->
		<div class="quick-stats">
			<div class="stat">
				<span class="stat-value">{stats?.total ?? 0}</span>
				<span class="stat-label">Total Songs</span>
			</div>
			<div class="stat">
				<span class="stat-value">{stats?.originals ?? 0}</span>
				<span class="stat-label">Originals</span>
			</div>
			<div class="stat">
				<span class="stat-value">{stats?.covers ?? 0}</span>
				<span class="stat-label">Covers</span>
			</div>
		</div>

		<!-- Sort Controls -->
		<div class="sort-controls">
			<label for="sort-select" class="sort-label">Sort by:</label>
			<div class="sort-dropdown">
				<select
					id="sort-select"
					bind:value={currentSort}
					class="sort-select"
					aria-label="Sort songs by"
				>
					{#each sortOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Letter Navigation (only for alphabetical sort) -->
		{#if showLetterNav}
			<nav class="letter-nav" aria-label="Alphabetical song navigation" data-sveltekit-preload-data="tap">
				{#each letters as letter}
					<a
						href={`#letter-${letter}`}
						class="letter-link"
						aria-label={`Jump to songs starting with ${letter === '#' ? 'numbers or symbols' : letter}`}
					>
						{letter}
					</a>
				{/each}
			</nav>
		{/if}

		<!-- Songs Display -->
		{#if showLetterNav}
			<!-- Songs by Letter (Alphabetical view) -->
			<div class="song-list">
				{#each letters as letter}
					<section id={`letter-${letter}`} class="letter-section">
						<h2 class="letter-title">{letter}</h2>
						<div class="song-grid">
							{#each groupedSongs[letter] as song (song.id)}
								<button
									class="song-link"
									onclick={async () => navigateToSong(song.slug)}
									type="button"
									aria-label={`View song: ${song.title}`}
								>
									<div class="song-card" data-interactive="true" style="view-transition-name: card-{song.slug}">
										<div class="song-content">
											<div class="song-main">
												<h3 class="song-title">{song.title}</h3>
												<div class="song-meta">
													{#if song.isCover}
														<span class="badge badge-secondary badge-sm">Cover</span>
													{/if}
													{#if song.isLiberated}
														<span class="badge badge-warning badge-sm">Liberated</span>
													{/if}
												</div>
											</div>
											<div class="song-stats">
												<span class="performance-count">{song.totalPerformances} plays</span>
												{#if (song.openerCount ?? 0) > 0}
													<span class="badge badge-opener badge-sm"
														>{song.openerCount}x opener</span
													>
												{/if}
												{#if (song.closerCount ?? 0) > 0}
													<span class="badge badge-closer badge-sm"
														>{song.closerCount}x closer</span
													>
												{/if}
												{#if (song.encoreCount ?? 0) > 0}
													<span class="badge badge-encore badge-sm"
														>{song.encoreCount}x encore</span
													>
												{/if}
											</div>
										</div>
									</div>
								</button>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{:else}
			<!-- Flat song list (sorted view) -->
			<div class="song-grid song-grid--flat">
				{#each songs as song, index (song.id)}
					<button
						class="song-link"
						onclick={async () => navigateToSong(song.slug)}
						type="button"
						aria-label={`View song: ${song.title}`}
					>
						<div class="song-card" data-interactive="true" style="view-transition-name: card-{song.slug}">
							<div class="song-content">
								<span class="song-rank">#{index + 1}</span>
								<div class="song-main">
									<h3 class="song-title">{song.title}</h3>
									<div class="song-meta">
										{#if song.isCover}
											<span class="badge badge-secondary badge-sm">Cover</span>
										{/if}
										{#if song.isLiberated}
											<span class="badge badge-warning badge-sm">Liberated</span>
										{/if}
									</div>
								</div>
								<div class="song-stats">
									<span class="performance-count">{song.totalPerformances} plays</span>
									{#if currentSort === 'openers' && (song.openerCount ?? 0) > 0}
										<span class="badge badge-opener badge-sm">{song.openerCount}x opener</span>
									{:else if currentSort === 'closers' && (song.closerCount ?? 0) > 0}
										<span class="badge badge-closer badge-sm">{song.closerCount}x closer</span>
									{:else if currentSort === 'recent' && song.lastPlayedDate}
										<span class="last-played">{song.lastPlayedDate}</span>
									{/if}
								</div>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
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
	.quick-stats {
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

	.stat-value {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
	}

	.stat-label {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Letter Navigation */
	.letter-nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-1);
		padding: var(--space-4);
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-8);
		position: sticky;
		top: calc(var(--header-height, 64px) + var(--space-2) + var(--safe-area-inset-top, 0px));
		z-index: 10;
		transform: translateZ(0);
		backface-visibility: hidden;
		contain: layout style;
	}

	.letter-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--foreground-secondary);
		text-decoration: none;
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
	}

	.letter-link:hover {
		background: var(--color-primary-50);
		color: var(--color-primary-600);
	}

	/* Song List */
	.song-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.letter-section {
		scroll-margin-top: calc(var(--header-height, 64px) + 80px);
		content-visibility: auto;
		contain-intrinsic-size: auto 400px;
		contain: layout style;
	}

	.letter-title {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		padding-bottom: var(--space-2);
		border-bottom: 2px solid var(--color-primary-500);
		margin: 0 0 var(--space-4);
	}

	.song-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-3);
	}

	.song-link {
		background: none;
		border: none;
		text-decoration: none;
		color: inherit;
		padding: 0;
		cursor: pointer;
		font: inherit;
		display: block;
		/* Ensure button doesn't have default styling */
		appearance: none;
		-webkit-appearance: none;
	}

	.song-card {
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
	}

	.song-card[data-interactive='true'] {
		cursor: pointer;
		transition:
			transform 250ms var(--ease-spring, ease-out),
			box-shadow 250ms var(--ease-smooth, ease),
			border-color 200ms var(--ease-smooth, ease),
			background 200ms var(--ease-smooth, ease);
	}

	.song-card[data-interactive='true']:hover {
		border-color: var(--color-primary-300);
		background: linear-gradient(
			to bottom,
			var(--background),
			color-mix(in oklch, var(--color-primary-50) 40%, var(--background))
		);
		box-shadow:
			var(--shadow-md),
			var(--glow-primary-subtle, 0 0 20px oklch(0.7 0.2 60 / 0.1));
		transform: translate3d(0, -4px, 0);
	}

	.song-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
	}

	.song-main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.song-title {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.song-meta {
		display: flex;
		gap: var(--space-1);
		flex-shrink: 0;
	}

	.song-stats {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.performance-count {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	/* Badge Styles */
	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-medium);
		border-radius: var(--radius-full);
		white-space: nowrap;
		line-height: 1;
		letter-spacing: var(--tracking-wide, 0.025em);
	}

	.badge-sm {
		padding: 2px 8px;
		font-size: 10px;
	}

	.badge-secondary {
		background: linear-gradient(
			to bottom,
			var(--color-secondary-100),
			color-mix(in oklch, var(--color-secondary-100) 80%, var(--color-secondary-200))
		);
		color: var(--color-secondary-800);
		border: 1px solid var(--color-secondary-200);
	}

	.badge-warning {
		background-color: var(--color-warning-bg, #fffbeb);
		color: var(--color-primary-800);
	}

	.badge-opener {
		background-color: var(--color-opener-bg, #dbeafe);
		color: var(--color-opener, #1e40af);
		font-weight: var(--font-bold);
		letter-spacing: 0.5px;
	}

	.badge-closer {
		background-color: var(--color-closer-bg, #fce7f3);
		color: var(--color-closer, #9f1239);
		font-weight: var(--font-bold);
		letter-spacing: 0.5px;
	}

	.badge-encore {
		background-color: var(--color-encore-bg, #f3e8ff);
		color: var(--color-encore, #6b21a8);
		font-weight: var(--font-bold);
		letter-spacing: 0.5px;
	}

	/* Sort Controls */
	.sort-controls {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
		padding: var(--space-3) var(--space-4);
		background: var(--background-secondary);
		border-radius: var(--radius-lg);
	}

	.sort-label {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground-secondary);
	}

	.sort-dropdown {
		position: relative;
	}

	.sort-select {
		appearance: none;
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground);
		cursor: pointer;
		min-width: 140px;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-3) center;
	}

	.sort-select:hover {
		border-color: var(--color-primary-300);
	}

	.sort-select:focus {
		outline: none;
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 3px var(--color-primary-100);
	}

	/* Flat List View (non-alphabetical sorts) */
	.song-grid--flat {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: var(--space-3);
	}

	.song-rank {
		font-size: var(--text-lg);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
		min-width: 32px;
	}

	.last-played {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
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
	}

	/* Responsive */
	@media (max-width: 768px) {
		.container {
			padding: var(--space-4) var(--space-3);
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

		.letter-nav {
			position: static;
		}

		/* Maintain 44px touch target on mobile for accessibility */
		.letter-link {
			width: 44px;
			height: 44px;
		}

		.song-grid,
		.song-grid--flat {
			grid-template-columns: 1fr;
		}

		.sort-controls {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-2);
		}

		.sort-label {
			text-align: center;
		}

		.sort-select {
			width: 100%;
		}
	}
</style>
