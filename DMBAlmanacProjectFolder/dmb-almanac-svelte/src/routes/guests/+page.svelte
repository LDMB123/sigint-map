<script module lang="ts">
	type GuestSortOption = 'appearances' | 'name' | 'recent';

	interface GuestSortConfig {
		label: string;
		value: GuestSortOption;
		description: string;
	}
</script>

<script lang="ts">
	import { allGuests } from '$stores/dexie';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import CardContent from '$lib/components/ui/CardContent.svelte';

	// Sort configuration
	const sortOptions: GuestSortConfig[] = [
		{ value: 'appearances', label: 'Most Appearances', description: 'Sort by total appearances' },
		{ value: 'name', label: 'A-Z', description: 'Sort alphabetically by name' },
		{ value: 'recent', label: 'Recent Guests', description: 'Sort by most recent appearance' }
	];

	let currentSort = $state<GuestSortOption>('appearances');

	// Reactive derivations using $derived
	const guests = $derived($allGuests || []);

	const totalGuests = $derived(guests.length);
	const totalAppearances = $derived(
		guests.reduce((acc, g) => acc + (g.totalAppearances || 0), 0)
	);

	// Dynamic sorting
	const sortedGuests = $derived.by(() => {
		const sorted = [...guests];

		switch (currentSort) {
			case 'name':
				return sorted.sort((a, b) => a.name.localeCompare(b.name));
			case 'recent':
				return sorted.sort((a, b) => {
					const dateA = a.lastAppearanceDate ?? '1900-01-01';
					const dateB = b.lastAppearanceDate ?? '1900-01-01';
					return dateB.localeCompare(dateA);
				});
			case 'appearances':
			default:
				return sorted.sort((a, b) => (b.totalAppearances || 0) - (a.totalAppearances || 0));
		}
	});

	// Show rank only for appearances sort
	const showRank = $derived(currentSort === 'appearances');

	// Get unique instruments
	const allInstruments = $derived.by(() => {
		const instrumentSet = new Set<string>();
		for (const guest of guests) {
			for (const instrument of guest.instruments ?? []) {
				instrumentSet.add(instrument);
			}
		}
		return instrumentSet;
	});

	const instrumentCount = $derived(allInstruments.size);
</script>

<svelte:head>
	<title>Guest Musicians - DMB Almanac</title>
	<meta
		name="description"
		content="Browse all guest musicians who have performed with Dave Matthews Band"
	/>
</svelte:head>

<div class="container">
	<!-- Header -->
	<div class="header">
		<h1 class="title">Guest Musicians</h1>
		<p class="subtitle">{totalGuests} guest musicians have joined DMB on stage</p>
	</div>

	<!-- Quick Stats -->
	<div class="quickStats">
		<div class="stat">
			<span class="statValue">{totalGuests}</span>
			<span class="statLabel">Total Guests</span>
		</div>
		<div class="stat">
			<span class="statValue">{totalAppearances.toLocaleString()}</span>
			<span class="statLabel">Total Appearances</span>
		</div>
		<div class="stat">
			<span class="statValue">{instrumentCount}</span>
			<span class="statLabel">Instruments</span>
		</div>
	</div>

	<!-- Sort Controls -->
	<div class="sortControls">
		<label for="guest-sort-select" class="sortLabel">Sort by:</label>
		<select
			id="guest-sort-select"
			bind:value={currentSort}
			class="sortSelect"
			aria-label="Sort guests by"
		>
			{#each sortOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	<!-- Guest Grid -->
	<ul class="guestGrid" aria-label="Guest musicians list">
		{#each sortedGuests as guest, index (guest.id)}
			<li class="guestItem">
				<a
					href="/guests/{guest.slug}"
					class="guestLink"
					aria-label="{guest.name}{showRank ? `, ranked #${index + 1}` : ''} with {guest.totalAppearances || 0} appearances"
				>
				<Card interactive class="guestCard">
					<CardContent class="guestContent">
						<div class="guestMain">
							{#if showRank}
								<span class="rank" aria-hidden="true">#{index + 1}</span>
							{/if}
							<div class="guestInfo">
								<h3 class="guestName">{guest.name}</h3>
								<div class="instruments">
									{#each guest.instruments ?? [] as instrument}
										<Badge variant="outline" size="sm">
											{instrument}
										</Badge>
									{/each}
								</div>
							</div>
						</div>
						<div class="guestStats">
							<span class="appearances">
								{(guest.totalAppearances || 0).toLocaleString()} appearances
							</span>
							{#if guest.firstAppearanceDate}
								<span class="since">
									Since {new Date(`${guest.firstAppearanceDate}T00:00:00`).getFullYear()}
								</span>
							{/if}
						</div>
					</CardContent>
				</Card>
			</a>
			</li>
		{/each}
	</ul>
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

	/* Quick Stats */
	.quickStats {
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

	/* Sort Controls */
	.sortControls {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
		padding: var(--space-3) var(--space-4);
		background: var(--background-secondary);
		border-radius: var(--radius-lg);
	}

	.sortLabel {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground-secondary);
	}

	.sortSelect {
		appearance: none;
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground);
		cursor: pointer;
		min-width: 160px;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-3) center;
	}

	.sortSelect:hover {
		border-color: var(--color-primary-300);
	}

	.sortSelect:focus {
		outline: none;
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 3px var(--color-primary-100);
	}

	/* Guest Grid */
	.guestGrid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--space-4);
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.guestItem {
		list-style: none;
	}

	.guestLink {
		text-decoration: none;
		color: inherit;
	}

	.guestLink :global(.guestCard) {
		height: 100%;
	}

	.guestLink :global(.guestContent) {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4) !important;
	}

	.guestMain {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.rank {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
		min-width: 50px;
	}

	.guestInfo {
		flex: 1;
		min-width: 0;
	}

	.guestName {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin: 0 0 var(--space-2);
	}

	.instruments {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.guestStats {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: var(--space-2);
		border-top: 1px solid var(--border-color);
	}

	.appearances {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--color-primary-500);
	}

	.since {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
	}

	/* Responsive */
	@media (max-width: 768px) {
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

		.guestGrid {
			grid-template-columns: 1fr;
		}

		.sortControls {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-2);
		}

		.sortLabel {
			text-align: center;
		}

		.sortSelect {
			width: 100%;
		}
	}
</style>
