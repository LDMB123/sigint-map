<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { globalSearch, type GlobalSearchResults } from '$stores/dexie';
	import { pwaState } from '$stores/pwa';
	import { dataState } from '$stores/data';
	import { debouncedYieldingHandler, measureInteractionTime } from '$lib/utils/inpOptimization';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/CardContent.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { parseShareContent, getTargetUrl, getShareDescription } from '$lib/utils/shareParser';

	// ==================== SHARE TARGET HANDLING ====================

	// Track if this is from a share action
	const isSharedContent = $derived($page.url.searchParams.get('source') === 'share');

	// Share processing state
	let shareProcessing = $state(false);
	let shareMessage = $state<string | null>(null);

	// Process shared content on mount if source=share
	$effect(() => {
		if (isSharedContent && query && !shareProcessing) {
			shareProcessing = true;

			// Parse the shared content
			const parsed = parseShareContent(query);

			// If we have high confidence and specific target, redirect
			if (parsed.confidence === 'high' && parsed.type !== 'search') {
				const targetUrl = getTargetUrl(parsed);
				shareMessage = getShareDescription(parsed);

				// Small delay to show processing state, then redirect
				setTimeout(() => {
					goto(targetUrl, { replaceState: true });
				}, 800);
			} else {
				// Lower confidence or search type - just search normally
				shareMessage = null;
				shareProcessing = false;
			}
		}
	});

	// ==================== REACTIVE STATE (Svelte 5 Runes) ====================

	// URL query parameter
	const query = $derived($page.url.searchParams.get('q') || '');

	// Update search store when URL changes
	$effect(() => {
		globalSearch.setQuery(query);
	});

	// Access search results - globalSearch.results and globalSearch.isSearching are stores
	// Need to destructure first since globalSearch is not itself a store
	const { results: resultsStore, isSearching: isSearchingStore } = globalSearch;
	const results = $derived($resultsStore);
	const isSearching = $derived($isSearchingStore);

	// PWA and data state - use combined state stores
	const isOffline = $derived($pwaState.isOffline);
	const dataStatus = $derived($dataState.status);
	const hasLocalData = $derived(dataStatus === 'ready');

	// Input binding for controlled input
	let searchInput = $state('');

	// Sync searchInput with query when URL changes externally
	$effect(() => {
		searchInput = query;
	});

	// PERFORMANCE: Debounce URL updates to prevent unnecessary navigation on every keystroke
	let urlDebounceTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);
	const URL_DEBOUNCE_MS = 300;

	// MEMORY: Clean up debounce timer on component unmount
	$effect(() => () => {
			if (urlDebounceTimer !== undefined) {
				clearTimeout(urlDebounceTimer);
			}
		});

	// ==================== HELPER FUNCTIONS ====================

	/**
	 * Format date for display (YYYY-MM-DD -> Month DD, YYYY)
	 */
	function formatDate(dateStr: string): string {
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	/**
	 * Debounced handler for search query updates
	 * PERFORMANCE: Debounces URL navigation to reduce history pollution and unnecessary route updates
	 * INP OPTIMIZATION: Uses scheduler.yield() to prevent input latency (Chromium 2025)
	 */
	const debouncedUpdateQuery = debouncedYieldingHandler(
		async (value: string) => {
			// Update URL without reload
			if (value.trim()) {
				await goto(`/search?q=${encodeURIComponent(value)}`, {
					replaceState: true,
					noScroll: true,
					keepFocus: true
				});
			} else {
				await goto('/search', { replaceState: true, noScroll: true, keepFocus: true });
			}
		},
		URL_DEBOUNCE_MS,
		{ priority: 'user-visible' }
	);

	/**
	 * Wrapper to extract value from event and pass to debounced handler with INP measurement
	 */
	const handleSearchInput = measureInteractionTime(
		(event: Event) => {
			const target = event.target as HTMLInputElement;
			const value = target.value;
			searchInput = value;
			debouncedUpdateQuery(value);
		},
		{ threshold: 100, label: 'Search Input' }
	);

	/**
	 * Calculate total results count
	 */
	function getTotalResults(results: GlobalSearchResults): number {
		return (
			(results.songs?.length || 0) +
			(results.venues?.length || 0) +
			(results.tours?.length || 0) +
			(results.guests?.length || 0) +
			(results.albums?.length || 0) +
			(results.shows?.length || 0)
		);
	}

	// ==================== DERIVED STATE ====================

	const totalResults = $derived(getTotalResults(results));
	const hasResults = $derived(totalResults > 0);
	const showEmptyState = $derived(query.length >= 1 && !isSearching && !hasResults);
</script>

<svelte:head>
	<title>Search - DMB Almanac</title>
	<meta
		name="description"
		content="Search the complete Dave Matthews Band database for shows, songs, venues, tours, guests, and releases"
	/>
</svelte:head>

<div class="container">
	<!-- Page Header -->
	<header class="header">
		<h1 class="title">Search</h1>
		<p class="subtitle">Find shows, songs, venues, and more</p>
	</header>

	<!-- Offline/Sync Status -->
	{#if isOffline && !hasLocalData}
		<div class="alert alert-warning">
			You're offline and no local data is available. Connect to the internet to sync data.
		</div>
	{/if}

	{#if dataStatus === 'loading'}
		<div class="alert alert-info">Syncing data...</div>
	{/if}

	<!-- Share Target Processing -->
	{#if shareProcessing && shareMessage}
		<div class="alert alert-share">
			<div class="share-processing">
				<div class="share-spinner"></div>
				<div>
					<p class="share-title">Processing shared content</p>
					<p class="share-message">{shareMessage}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Search Form -->
	<search class="search-form" role="search" aria-label="Search DMB database">
		<label for="search-input" class="visually-hidden">Search shows, songs, venues, and more</label>
		<div class="search-input-wrapper">
			<svg
				class="search-icon"
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.3-4.3"></path>
			</svg>
			<!-- svelte-ignore a11y_autofocus -->
			<!-- Autofocus on search input is intentional UX: users visiting /search expect to type immediately.
			     This is a documented exception to WCAG a11y guidance for search-dedicated pages where it improves
			     user efficiency without adversely affecting screen reader users navigating to this specific route. -->
			<input
				type="search"
				id="search-input"
				list="search-suggestions"
				placeholder="Search for anything..."
				class="search-input"
				value={searchInput}
				oninput={handleSearchInput}
				autofocus
				minlength="1"
				maxlength="100"
				spellcheck="false"
				enterkeyhint="search"
			/>
			<!-- Native HTML5 datalist for lightweight autocomplete suggestions -->
			<datalist id="search-suggestions">
				<!-- Popular songs -->
				<option value="Crash Into Me"></option>
				<option value="Ants Marching"></option>
				<option value="Two Step"></option>
				<option value="Warehouse"></option>
				<option value="Satellite"></option>
				<option value="Grey Street"></option>
				<option value="The Stone"></option>
				<option value="Lie In Our Graves"></option>
				<option value="Tripping Billies"></option>
				<option value="Jimi Thing"></option>
				<!-- Popular venues -->
				<option value="The Gorge"></option>
				<option value="SPAC"></option>
				<option value="Alpine Valley"></option>
				<option value="Red Rocks"></option>
				<option value="MSG"></option>
				<option value="Fiddler's Green"></option>
				<option value="Deer Creek"></option>
				<!-- Years -->
				<option value="2024"></option>
				<option value="2023"></option>
				<option value="2022"></option>
				<option value="1995"></option>
				<option value="1996"></option>
			</datalist>
		</div>
	</search>

	<!-- Results -->
	{#if query.length >= 1}
		{#if isSearching}
			<!-- Loading State -->
			<div class="loading-container" role="status" aria-busy="true" aria-live="polite">
				<div class="spinner" aria-hidden="true"></div>
				<p>Searching...</p>
			</div>
		{:else if showEmptyState}
			<!-- Empty State -->
			<div class="empty-state" role="status" aria-live="polite">
				<p class="empty-message">No results found for "{query}"</p>
				<p class="empty-hint">Try a different search term</p>
			</div>
		{:else if hasResults}
			<!-- Results -->
			<div class="results-container" role="region" aria-label="Search results" aria-live="polite">
				<!-- Songs -->
				{#if results.songs && results.songs.length > 0}
					<section class="results-section" aria-labelledby="results-songs-title">
						<div class="section-header">
							<svg
								class="section-icon"
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M9 18V5l12-2v13"></path>
								<circle cx="6" cy="18" r="3"></circle>
								<circle cx="18" cy="16" r="3"></circle>
							</svg>
							<h2 id="results-songs-title" class="section-title">Songs</h2>
							<Badge variant="outline" size="sm">{results.songs.length}</Badge>
						</div>
						<div class="results-grid">
							{#each results.songs as song (song.id)}
								<a href="/songs/{song.slug}" class="result-link">
									<Card interactive padding="sm">
										<CardContent>
											<div class="result-content">
												<p class="result-title">{song.title}</p>
												<p class="result-meta">{song.timesPlayed} performances</p>
											</div>
										</CardContent>
									</Card>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Venues -->
				{#if results.venues && results.venues.length > 0}
					<section class="results-section" aria-labelledby="results-venues-title">
						<div class="section-header">
							<svg
								class="section-icon"
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
								<circle cx="12" cy="10" r="3"></circle>
							</svg>
							<h2 id="results-venues-title" class="section-title">Venues</h2>
							<Badge variant="outline" size="sm">{results.venues.length}</Badge>
						</div>
						<div class="results-grid">
							{#each results.venues as venue (venue.id)}
								<a href="/venues/{venue.id}" class="result-link">
									<Card interactive padding="sm">
										<CardContent>
											<div class="result-content">
												<p class="result-title">{venue.name}</p>
												<p class="result-meta">
													{[venue.city, venue.state].filter(Boolean).join(', ')}
												</p>
											</div>
										</CardContent>
									</Card>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Tours -->
				{#if results.tours && results.tours.length > 0}
					<section class="results-section" aria-labelledby="results-tours-title">
						<div class="section-header">
							<svg
								class="section-icon"
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10"></circle>
								<polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
							</svg>
							<h2 id="results-tours-title" class="section-title">Tours</h2>
							<Badge variant="outline" size="sm">{results.tours.length}</Badge>
						</div>
						<div class="results-grid">
							{#each results.tours as tour (tour.id)}
								<a href="/tours/{tour.slug}" class="result-link">
									<Card interactive padding="sm">
										<CardContent>
											<div class="result-content">
												<p class="result-title">{tour.name}</p>
												<p class="result-meta">{tour.year}</p>
											</div>
										</CardContent>
									</Card>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Guests -->
				{#if results.guests && results.guests.length > 0}
					<section class="results-section" aria-labelledby="results-guests-title">
						<div class="section-header">
							<svg
								class="section-icon"
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
								<circle cx="9" cy="7" r="4"></circle>
								<path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
							</svg>
							<h2 id="results-guests-title" class="section-title">Guests</h2>
							<Badge variant="outline" size="sm">{results.guests.length}</Badge>
						</div>
						<div class="results-grid">
							{#each results.guests as guest (guest.id)}
								<a href="/guests/{guest.slug}" class="result-link">
									<Card interactive padding="sm">
										<CardContent>
											<div class="result-content">
												<p class="result-title">{guest.name}</p>
												{#if guest.instruments && guest.instruments.length > 0}
													<p class="result-meta">{guest.instruments.join(', ')}</p>
												{/if}
											</div>
										</CardContent>
									</Card>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Albums/Releases -->
				{#if results.albums && results.albums.length > 0}
					<section class="results-section" aria-labelledby="results-releases-title">
						<div class="section-header">
							<svg
								class="section-icon"
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="10"></circle>
								<circle cx="12" cy="12" r="3"></circle>
							</svg>
							<h2 id="results-releases-title" class="section-title">Releases</h2>
							<Badge variant="outline" size="sm">{results.albums.length}</Badge>
						</div>
						<div class="results-grid">
							{#each results.albums as album (album.id)}
								<a href="/releases/{album.slug}" class="result-link">
									<Card interactive padding="sm">
										<CardContent>
											<div class="result-content">
												<p class="result-title">{album.title}</p>
												{#if album.releaseType}
													<p class="result-meta">{album.releaseType.replace(/_/g, ' ')}</p>
												{/if}
											</div>
										</CardContent>
									</Card>
								</a>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Shows -->
				{#if results.shows && results.shows.length > 0}
					<section class="results-section" aria-labelledby="results-shows-title">
						<div class="section-header">
							<svg
								class="section-icon"
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
								<line x1="16" x2="16" y1="2" y2="6"></line>
								<line x1="8" x2="8" y1="2" y2="6"></line>
								<line x1="3" x2="21" y1="10" y2="10"></line>
							</svg>
							<h2 id="results-shows-title" class="section-title">Shows</h2>
							<Badge variant="outline" size="sm">{results.shows.length}</Badge>
						</div>
						<div class="results-grid">
							{#each results.shows as show (show.id)}
								<a href="/shows/{show.almanacId || show.id}" class="result-link">
									<Card interactive padding="sm">
										<CardContent>
											<div class="result-content">
												<p class="result-title">{formatDate(show.showDate)}</p>
												{#if show.venue}
													<p class="result-meta">
														{show.venue.name} - {[show.venue.city, show.venue.state]
															.filter(Boolean)
															.join(', ')}
													</p>
												{/if}
											</div>
										</CardContent>
									</Card>
								</a>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		{/if}
	{:else}
		<!-- Browse Links (when no query) -->
		<nav class="browse-links" aria-label="Browse database">
			<a href="/shows" class="browse-card">
				<Card interactive>
					<CardContent>
						<div class="browse-content">
							<div class="browse-icon-wrapper browse-icon-amber">
								<svg
									class="browse-icon"
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
									<line x1="16" x2="16" y1="2" y2="6"></line>
									<line x1="8" x2="8" y1="2" y2="6"></line>
									<line x1="3" x2="21" y1="10" y2="10"></line>
								</svg>
							</div>
							<div>
								<p class="browse-title">Browse Shows</p>
								<p class="browse-subtitle">All DMB performances</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</a>

			<a href="/songs" class="browse-card">
				<Card interactive>
					<CardContent>
						<div class="browse-content">
							<div class="browse-icon-wrapper browse-icon-blue">
								<svg
									class="browse-icon"
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M9 18V5l12-2v13"></path>
									<circle cx="6" cy="18" r="3"></circle>
									<circle cx="18" cy="16" r="3"></circle>
								</svg>
							</div>
							<div>
								<p class="browse-title">Browse Songs</p>
								<p class="browse-subtitle">Complete song catalog</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</a>

			<a href="/venues" class="browse-card">
				<Card interactive>
					<CardContent>
						<div class="browse-content">
							<div class="browse-icon-wrapper browse-icon-green">
								<svg
									class="browse-icon"
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
									<circle cx="12" cy="10" r="3"></circle>
								</svg>
							</div>
							<div>
								<p class="browse-title">Browse Venues</p>
								<p class="browse-subtitle">All performance venues</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</a>
		</nav>
	{/if}
</div>

<style>
	/* Visually hidden but accessible to screen readers */
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.container {
		max-width: var(--max-width);
		margin: 0 auto;
		/* Fluid padding: 1rem-1.5rem vertical, 0.75rem-1rem horizontal */
		padding: clamp(1rem, 4vw, 1.5rem) clamp(0.75rem, 3vw, 1rem);
	}

	/* Header */
	.header {
		text-align: center;
		margin-bottom: var(--space-6);
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

	/* Alerts */
	.alert {
		padding: var(--space-4);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-4);
		font-size: var(--text-sm);
	}

	.alert-warning {
		background-color: color-mix(in oklch, var(--color-primary-500) 10%, transparent);
		color: var(--color-primary-800);
		border: 1px solid color-mix(in oklch, var(--color-primary-500) 30%, transparent);
	}

	.alert-info {
		background-color: color-mix(in oklch, var(--color-secondary-500) 10%, transparent);
		color: var(--color-secondary-800);
		border: 1px solid color-mix(in oklch, var(--color-secondary-500) 30%, transparent);
	}

	.alert-share {
		background: linear-gradient(
			135deg,
			color-mix(in oklch, var(--color-primary-500) 15%, transparent),
			color-mix(in oklch, var(--color-secondary-500) 15%, transparent)
		);
		color: var(--foreground);
		border: 1px solid color-mix(in oklch, var(--color-primary-500) 30%, transparent);
	}

	/* Share Processing */
	.share-processing {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.share-spinner {
		width: 24px;
		height: 24px;
		border: 2px solid color-mix(in oklch, var(--color-primary-500) 30%, transparent);
		border-top-color: var(--color-primary-500);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	.share-title {
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0 0 var(--space-1);
		font-size: var(--text-sm);
	}

	.share-message {
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Search Form */
	.search-form {
		max-width: 600px;
		margin: 0 auto var(--space-6);
	}

	.search-input-wrapper {
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--foreground-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: var(--space-3) var(--space-3) var(--space-3) 44px;
		font-size: var(--text-base);
		color: var(--foreground);
		background-color: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		outline: none;
		transition: all var(--transition-fast);
	}

	.search-input:focus {
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-primary-500) 20%, transparent);
	}

	/* Invalid state styling using :user-invalid (Chrome 119+) */
	.search-input:user-invalid {
		border-color: var(--color-error);
		box-shadow: 0 0 0 3px color-mix(in oklch, var(--color-error) 20%, transparent);
	}

	/* Fallback for browsers without :user-invalid */
	@supports not selector(:user-invalid) {
		.search-input:invalid:not(:placeholder-shown) {
			border-color: var(--color-error);
		}
	}

	/* Loading */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-12) var(--space-4);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border-color);
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
		text-align: center;
		padding: var(--space-12) var(--space-4);
		color: var(--foreground-secondary);
	}

	.empty-message {
		font-size: var(--text-lg);
		font-weight: var(--font-medium);
		color: var(--foreground);
		margin: 0 0 var(--space-2);
	}

	.empty-hint {
		font-size: var(--text-sm);
		margin: 0;
	}

	/* Results */
	.results-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.results-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.section-icon {
		color: var(--foreground-muted);
	}

	.section-title {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-2);
	}

	.result-link {
		text-decoration: none;
		color: inherit;
	}

	.result-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.result-title {
		font-weight: var(--font-medium);
		color: var(--foreground);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-meta {
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Browse Links */
	.browse-links {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
	}

	.browse-card {
		text-decoration: none;
		color: inherit;
	}

	.browse-content {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.browse-icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.browse-icon {
		width: 24px;
		height: 24px;
	}

	.browse-icon-amber {
		background-color: color-mix(in oklch, var(--color-primary-500) 15%, transparent);
		color: var(--color-primary-600);
	}

	.browse-icon-blue {
		background-color: color-mix(in oklch, var(--color-secondary-500) 15%, transparent);
		color: var(--color-secondary-600);
	}

	.browse-icon-green {
		background-color: color-mix(in oklch, var(--color-secondary-400) 15%, transparent);
		color: var(--color-secondary-600);
	}

	.browse-title {
		font-weight: var(--font-medium);
		color: var(--foreground);
		margin: 0 0 var(--space-1);
	}

	.browse-subtitle {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Dark Mode */
	@media (prefers-color-scheme: dark) {
		.alert-warning {
			background-color: color-mix(in oklch, var(--color-primary-500) 20%, transparent);
			color: var(--color-primary-300);
		}

		.alert-info {
			background-color: color-mix(in oklch, var(--color-secondary-500) 20%, transparent);
			color: var(--color-secondary-300);
		}

		.alert-share {
			background: linear-gradient(
				135deg,
				color-mix(in oklch, var(--color-primary-500) 25%, transparent),
				color-mix(in oklch, var(--color-secondary-500) 25%, transparent)
			);
		}

		.browse-icon-amber {
			background-color: color-mix(in oklch, var(--color-primary-500) 25%, transparent);
			color: var(--color-primary-400);
		}

		.browse-icon-blue {
			background-color: color-mix(in oklch, var(--color-secondary-500) 25%, transparent);
			color: var(--color-secondary-400);
		}

		.browse-icon-green {
			background-color: color-mix(in oklch, var(--color-secondary-400) 25%, transparent);
			color: var(--color-secondary-400);
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.title {
			font-size: var(--text-3xl);
		}

		.results-grid {
			grid-template-columns: 1fr;
		}

		.browse-links {
			grid-template-columns: 1fr;
		}
	}
</style>
