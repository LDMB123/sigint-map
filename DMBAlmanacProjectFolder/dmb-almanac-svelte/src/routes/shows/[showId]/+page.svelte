<script lang="ts">
	import { page } from '$app/stores';
	import { getShowWithSetlist, getAdjacentShows } from '$stores/dexie';
	import Badge from '$components/ui/Badge.svelte';
	import Card from '$components/ui/Card.svelte';
	import CardContent from '$components/ui/CardContent.svelte';
	import ErrorFallback from '$components/ui/ErrorFallback.svelte';
	import { errorLogger } from '$lib/errors/logger';
	import { StoreError } from '$lib/errors/types';
	import type { DexieSetlistEntry, DexieShow } from '$db/dexie/schema';

	// Get showId from route params
	const showId = $derived(parseInt($page.params.showId ?? '0', 10));

	// Track store errors
	let showError: Error | null = $state(null);
	let adjacentError: Error | null = $state(null);

	// Load show with setlist with error handling
	const showStore = $derived.by(() => {
		try {
			return getShowWithSetlist(showId);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			showError = new StoreError('showStore', 'Failed to initialize show store', error, {
				showId
			});
			errorLogger.error('Store initialization error in show page', showError);
			return null;
		}
	});

	const show = $derived.by(() => {
		try {
			return $showStore;
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			showError = new StoreError('showStore', 'Failed to load show', error, {
				showId
			});
			errorLogger.error('Store subscription error in show page', showError);
			return null;
		}
	});

	// Load adjacent shows with error handling
	const adjacentStore = $derived.by(() => {
		try {
			return getAdjacentShows(showId);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			adjacentError = new StoreError('adjacentStore', 'Failed to initialize adjacent shows store', error, {
				showId
			});
			errorLogger.warn('Adjacent shows store initialization error', adjacentError);
			return null;
		}
	});

	const adjacent = $derived.by(() => {
		try {
			return $adjacentStore;
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			adjacentError = new StoreError('adjacentStore', 'Failed to load adjacent shows', error, {
				showId
			});
			errorLogger.warn('Adjacent shows store error', adjacentError);
			return null;
		}
	});

	const previousShow = $derived(adjacent?.previousShow);
	const nextShow = $derived(adjacent?.nextShow);

	// Helper function to calculate total duration
	function getTotalDuration(setlist: DexieSetlistEntry[]): number {
		return setlist.reduce((acc, entry) => acc + (entry.durationSeconds || 0), 0);
	}

	// Computed properties
	const date = $derived(show ? new Date(`${show.date}T00:00:00`) : null);
	const formattedDate = $derived(
		date
			? date.toLocaleDateString('en-US', {
					weekday: 'long',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			: ''
	);

	const totalDuration = $derived(show?.setlist ? getTotalDuration(show.setlist) : 0);
	const songCount = $derived(show?.setlist?.length || 0);

	// Set labels
	const setLabels: Record<string, string> = {
		set1: 'Set 1',
		set2: 'Set 2',
		set3: 'Set 3',
		encore: 'Encore',
		encore2: 'Encore 2'
	};

	// Group setlist entries by set - single pass O(n) instead of 5 separate O(n) filters
	const groupedSetsMap = $derived.by(() => {
		if (!show?.setlist) return new Map<string, DexieSetlistEntry[]>();
		const grouped = new Map<string, DexieSetlistEntry[]>();
		for (const entry of show.setlist) {
			const setName = entry.setName;
			const setEntries = grouped.get(setName) || [];
			setEntries.push(entry);
			grouped.set(setName, setEntries);
		}
		return grouped;
	});

	// Convert to array for iteration in template
	const groupedSets = $derived(Array.from(groupedSetsMap.entries()));

	// Derive individual set counts from the grouped map (O(1) lookups instead of O(n) filters)
	const set1 = $derived(groupedSetsMap.get('set1') || []);
	const set2 = $derived(groupedSetsMap.get('set2') || []);
	const set3 = $derived(groupedSetsMap.get('set3') || []);
	const encore = $derived(groupedSetsMap.get('encore') || []);
	const encore2 = $derived(groupedSetsMap.get('encore2') || []);

	// Format duration helper
	function formatDuration(seconds?: number | null): string | null {
		if (!seconds) return null;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${String(secs).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	{#if show}
		<title>{show.venue?.name} - {show.date} | DMB Almanac</title>
	{:else}
		<title>Loading Show | DMB Almanac</title>
	{/if}
</svelte:head>

<div class="container">
	{#if showError}
		<!-- Error state for show data -->
		<div class="error-section" role="alert">
			<ErrorFallback
				error={showError}
				onRetry={() => {
					showError = null;
					// Trigger re-fetch by resetting showId
				}}
			/>
		</div>
	{:else if !show}
		<!-- Loading state -->
		<div class="header">
			<p>Loading show...</p>
		</div>
	{:else}
		<!-- Header -->
		<header class="header">
			<nav aria-label="Breadcrumb" class="breadcrumb">
				<ol>
					<li>
						<a href="/tours" class="breadcrumb-link">Tours</a>
						<span class="breadcrumb-separator" aria-hidden="true">/</span>
					</li>
					<li>
						<a href="/tours/{show.tour?.year}" class="breadcrumb-link">{show.tour?.year}</a>
						<span class="breadcrumb-separator" aria-hidden="true">/</span>
					</li>
					<li aria-current="page">
						<span>{show.date}</span>
					</li>
				</ol>
			</nav>

			<!-- Date block -->
			{#if date}
				<div class="date-block">
					<span class="month">
						{date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
					</span>
					<span class="day">{date.getDate()}</span>
					<span class="year">{date.getFullYear()}</span>
				</div>
			{/if}

			<div class="header-info">
				<!-- Venue name -->
				<h1 class="venue">{show.venue?.name}</h1>
				<p class="location">
					{show.venue?.city}{#if show.venue?.state}, {show.venue.state}{/if}{#if show.venue?.country && show.venue.country !== 'USA'}, {show.venue.country}{/if}
				</p>
				<p class="full-date">{formattedDate}</p>

				<div class="tags">
					{#if show.tour}
						<Badge variant="secondary" size="sm">{show.tour.name}</Badge>
					{/if}
					{#if show.venue?.venueType}
						<Badge variant="outline" size="sm">{show.venue.venueType}</Badge>
					{/if}
					{#if show.rarityIndex && show.rarityIndex > 3}
						<Badge variant="primary" size="sm">Rare Show</Badge>
					{/if}
				</div>

				<!-- Action Buttons (Placeholder - will implement in separate components) -->
				<div class="actions">
					<!-- TODO: ShowFavoriteButton and ShowShareButton components -->
					<p class="text-muted">Favorite & Share buttons coming soon</p>
				</div>
			</div>
		</header>

		<!-- Quick Stats -->
		<div class="quick-stats" role="group" aria-label="Show statistics">
			<div class="quick-stat">
				<span class="quick-stat-value" id="stat-song-count">{songCount}</span>
				<span class="quick-stat-label" aria-describedby="stat-song-count">Songs</span>
			</div>
			{#if totalDuration > 0}
				<div class="quick-stat">
					<span class="quick-stat-value" id="stat-duration">
						{Math.floor(totalDuration / 3600)}h {Math.floor((totalDuration % 3600) / 60)}m
					</span>
					<span class="quick-stat-label" aria-describedby="stat-duration">Duration</span>
				</div>
			{/if}
			{#if show.rarityIndex}
				<div class="quick-stat">
					<span class="quick-stat-value" id="stat-rarity">{show.rarityIndex.toFixed(1)}</span>
					<span class="quick-stat-label" aria-describedby="stat-rarity">Rarity Index</span>
				</div>
			{/if}
		</div>

		<div class="main-content">
			<!-- Setlist Section -->
			<section class="setlist-section">
				{#if show.setlist && show.setlist.length > 0}
					<div class="setlist">
						{#each groupedSets as [setName, setEntries]}
							<section class="set" aria-labelledby="setlist-{setName}">
								<h3 id="setlist-{setName}" class="set-header">
									{setLabels[setName] || setName}
								</h3>

								<ol class="song-list" aria-label="{setLabels[setName] || setName} songs">
									{#each setEntries as entry, index (entry.id || index)}
										<li class="song-item slot-{entry.slot}">
											<div class="position">
												<span class="position-number">{entry.position}</span>
												{#if entry.slot === 'opener'}
													<Badge variant="opener" size="sm">Opener</Badge>
												{:else if entry.slot === 'closer'}
													<Badge variant="closer" size="sm">Closer</Badge>
												{/if}
											</div>

											<div class="song-info">
												<div class="song-main">
													{#if entry.song}
														<a href="/songs/{entry.song.slug}" class="song-title">
															{entry.song.title}
														</a>
													{:else}
														<span class="song-title">Unknown Song</span>
													{/if}

													{#if entry.isSegue}
														<span
															class="segue"
															title="Segue into next song"
															aria-label="segues into next song"
															role="img"
														>
															&rarr;
														</span>
													{/if}

													{#if entry.isTease}
														<Badge variant="tease">tease</Badge>
													{/if}
												</div>

												{#if entry.notes}
													<p class="notes">{entry.notes}</p>
												{/if}
											</div>

											<div class="meta">
												{#if entry.durationSeconds}
													<span class="duration" aria-hidden="true">
														{formatDuration(entry.durationSeconds)}
													</span>
												{/if}
											</div>
										</li>
									{/each}
								</ol>
							</section>
						{/each}
					</div>
				{:else}
					<Card>
						<CardContent class="no-setlist">
							<p>Setlist not yet available for this show.</p>
						</CardContent>
					</Card>
				{/if}
			</section>

			<!-- Sidebar -->
			<aside class="sidebar" aria-label="Show details sidebar">
				<!-- Venue Info -->
				<Card>
					<CardContent class="sidebar-section">
						<h3 class="sidebar-title" id="venue-info-heading">Venue</h3>
						<a
							href="/venues/{show.venue?.id}"
							class="venue-link"
							aria-describedby="venue-info-heading"
						>
							{show.venue?.name}
						</a>
						<p class="venue-details">
							{show.venue?.city}, {show.venue?.state}
						</p>
						{#if show.venue?.capacity}
							<p class="venue-capacity">Capacity: {show.venue.capacity.toLocaleString()}</p>
						{/if}
						{#if show.venue?.totalShows}
							<p class="venue-shows">{show.venue.totalShows} DMB shows at this venue</p>
						{/if}
					</CardContent>
				</Card>

				<!-- Show Notes -->
				{#if show.notes}
					<Card>
						<CardContent class="sidebar-section">
							<h3 class="sidebar-title">Notes</h3>
							<p class="notes">{show.notes}</p>
						</CardContent>
					</Card>
				{/if}

				<!-- Set Breakdown -->
				<Card>
					<CardContent class="sidebar-section">
						<h3 class="sidebar-title">Set Breakdown</h3>
						<ul class="set-breakdown">
							{#if set1.length > 0}
								<li>
									<span>Set 1</span>
									<span>{set1.length} songs</span>
								</li>
							{/if}
							{#if set2.length > 0}
								<li>
									<span>Set 2</span>
									<span>{set2.length} songs</span>
								</li>
							{/if}
							{#if set3.length > 0}
								<li>
									<span>Set 3</span>
									<span>{set3.length} songs</span>
								</li>
							{/if}
							{#if encore.length > 0}
								<li>
									<span>Encore</span>
									<span>{encore.length} songs</span>
								</li>
							{/if}
							{#if encore2.length > 0}
								<li>
									<span>Encore 2</span>
									<span>{encore2.length} songs</span>
								</li>
							{/if}
						</ul>
					</CardContent>
				</Card>

				<!-- Navigation -->
				<Card>
					<CardContent class="sidebar-section">
						<h3 class="sidebar-title">Browse Shows</h3>
						<div class="show-nav">
							{#if previousShow}
								<a
									href="/shows/{previousShow.id}"
									class="nav-link"
									aria-label="Go to previous show"
								>
									<span aria-hidden="true">&larr;</span> Previous Show
								</a>
							{:else}
								<span class="nav-link-disabled" aria-disabled="true">
									<span aria-hidden="true">&larr;</span> Previous Show
								</span>
							{/if}
							{#if nextShow}
								<a href="/shows/{nextShow.id}" class="nav-link" aria-label="Go to next show">
									Next Show <span aria-hidden="true">&rarr;</span>
								</a>
							{:else}
								<span class="nav-link-disabled" aria-disabled="true">
									Next Show <span aria-hidden="true">&rarr;</span>
								</span>
							{/if}
						</div>
					</CardContent>
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

	.error-section {
		margin-bottom: var(--space-8);
	}

	/* Header */
	.header {
		display: flex;
		gap: var(--space-6);
		margin-bottom: var(--space-6);
		flex-wrap: wrap;
	}

	.breadcrumb {
		width: 100%;
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

	/* Date Block */
	.date-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
		color: white;
		border-radius: var(--radius-2xl);
		padding: var(--space-5) var(--space-6);
		min-width: 110px;
		text-align: center;
		box-shadow: var(--shadow-primary-lg);
		position: relative;
		overflow: hidden;
	}

	/* Subtle shine effect */
	.date-block::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 50%;
		background: linear-gradient(to bottom, rgb(255 255 255 / 0.15), transparent);
		pointer-events: none;
	}

	.month {
		font-size: 11px;
		font-weight: var(--font-bold);
		letter-spacing: var(--tracking-widest);
		text-transform: uppercase;
		opacity: 0.95;
	}

	.day {
		font-size: var(--text-4xl);
		font-weight: var(--font-extrabold);
		line-height: 1;
		letter-spacing: var(--tracking-tight);
		text-shadow: 0 2px 4px rgb(0 0 0 / 0.15);
	}

	.year {
		font-size: var(--text-sm);
		opacity: 0.9;
		font-weight: var(--font-medium);
	}

	/* Header Info */
	.header-info {
		flex: 1;
		min-width: 0;
	}

	.venue {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-1);
	}

	.location {
		font-size: var(--text-lg);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-1);
	}

	.full-date {
		font-size: var(--text-base);
		color: var(--foreground-muted);
		margin: 0 0 var(--space-3);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	/* Actions (Share, Favorite, etc.) */
	.actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.text-muted {
		color: var(--foreground-muted);
		font-size: var(--text-sm);
	}

	/* Quick Stats */
	.quick-stats {
		display: flex;
		gap: var(--space-8);
		padding: var(--space-5) var(--space-6);
		background: linear-gradient(
			to bottom,
			var(--background-secondary),
			color-mix(in oklch, var(--background-secondary) 95%, var(--color-gray-200))
		);
		border-radius: var(--radius-xl);
		margin-bottom: var(--space-8);
		flex-wrap: wrap;
		border: 1px solid var(--border-color);
	}

	.quick-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
	}

	.quick-stat-value {
		font-size: var(--text-2xl);
		font-weight: var(--font-extrabold);
		color: var(--color-primary-600);
		letter-spacing: var(--tracking-tight);
	}

	.quick-stat-label {
		font-size: 10px;
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		font-weight: var(--font-medium);
	}

	/* Main Content */
	.main-content {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: var(--space-8);
	}

	/* Setlist Section */
	.setlist-section {
		min-width: 0;
	}

	.setlist {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.set {
		background: var(--background-secondary);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		border: 1px solid var(--border-color);
	}

	.set-header {
		font-size: var(--text-xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-600);
		margin: 0 0 var(--space-4);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.song-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.song-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: var(--space-4);
		align-items: start;
		padding: var(--space-3);
		background: var(--background);
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
	}

	.position {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		min-width: 40px;
	}

	.position-number {
		font-size: var(--text-lg);
		font-weight: var(--font-bold);
		color: var(--foreground-secondary);
	}

	.song-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.song-main {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.song-title {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		text-decoration: none;
	}

	a.song-title {
		color: var(--color-primary-500);
	}

	a.song-title:hover {
		text-decoration: underline;
	}

	.segue {
		color: var(--color-primary-500);
		font-size: var(--text-lg);
	}

	.notes {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.duration {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		font-variant-numeric: tabular-nums;
	}

	.no-setlist {
		text-align: center;
		color: var(--foreground-secondary);
		padding: var(--space-8) !important;
	}

	/* Sidebar */
	.sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.sidebar-section {
		padding: var(--space-4) !important;
	}

	.sidebar-title {
		font-size: var(--text-sm);
		font-weight: var(--font-bold);
		color: var(--foreground-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0 0 var(--space-3);
	}

	/* Venue Info */
	.venue-link {
		display: block;
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-primary-500);
		text-decoration: none;
		margin-bottom: var(--space-1);
	}

	.venue-link:hover {
		text-decoration: underline;
	}

	.venue-details {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-2);
	}

	.venue-capacity,
	.venue-shows {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		margin: 0;
	}

	/* Set Breakdown */
	.set-breakdown {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.set-breakdown li {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-sm);
	}

	.set-breakdown li span:first-child {
		color: var(--foreground);
		font-weight: var(--font-medium);
	}

	.set-breakdown li span:last-child {
		color: var(--foreground-secondary);
	}

	/* Show Navigation */
	.show-nav {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.nav-link {
		color: var(--color-primary-500);
		text-decoration: none;
		font-size: var(--text-sm);
		padding: var(--space-2);
		border-radius: var(--radius-md);
		transition: background-color var(--transition-fast);
	}

	.nav-link:hover {
		background-color: var(--color-primary-50);
	}

	.nav-link:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.nav-link-disabled {
		color: var(--foreground-muted);
		font-size: var(--text-sm);
		padding: var(--space-2);
		cursor: not-allowed;
		opacity: 0.5;
	}

	/* High contrast mode */
	@media (forced-colors: active) {
		.nav-link:focus-visible,
		.breadcrumb-link:focus-visible {
			outline: 2px solid Highlight;
		}
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
	}

	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			align-items: flex-start;
		}

		.date-block {
			flex-direction: row;
			gap: var(--space-3);
			padding: var(--space-3) var(--space-4);
			min-width: auto;
		}

		.day {
			font-size: var(--text-2xl);
		}

		.venue {
			font-size: var(--text-2xl);
		}

		.quick-stats {
			justify-content: space-around;
			padding: var(--space-3);
		}

		.sidebar {
			grid-template-columns: 1fr;
		}
	}

	/* Dark mode */
	@media (prefers-color-scheme: dark) {
		.date-block {
			background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800));
			box-shadow: var(--shadow-primary-lg);
		}

		.quick-stats {
			background: linear-gradient(
				to bottom,
				var(--color-gray-800),
				color-mix(in oklch, var(--color-gray-800) 90%, var(--color-gray-900))
			);
			border-color: var(--color-gray-700);
		}

		.quick-stat-value {
			color: var(--color-primary-400);
		}

		.set {
			background: var(--color-gray-800);
			border-color: var(--color-gray-700);
		}

		.set-header {
			color: var(--color-primary-400);
		}

		.song-item {
			background: var(--color-gray-900);
			border-color: var(--color-gray-700);
		}

		.nav-link:hover {
			background-color: oklch(0.7 0.19 82 / 0.1);
		}
	}
</style>
