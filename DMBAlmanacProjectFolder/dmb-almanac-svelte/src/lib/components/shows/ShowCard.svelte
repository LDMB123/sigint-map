<script module lang="ts">
	// Hoisted to module scope - created once, reused across all ShowCard instances
	const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
	const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	function formatShowDate(dateStr: string) {
		const date = new Date(`${dateStr}T00:00:00`);
		return {
			month: monthFormatter.format(date).toUpperCase(),
			day: date.getDate(),
			year: date.getFullYear(),
			full: fullDateFormatter.format(date)
		};
	}
</script>

<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import type { DexieShow } from '$db/dexie/schema';

	type Props = {
		show: DexieShow;
		variant?: 'default' | 'compact';
	};

	let { show, variant = 'compact' }: Props = $props();

	const date = $derived(formatShowDate(show.date));
</script>

{#if variant === 'compact'}
	<article class="compact-article scroll-fade-in">
		<a
			href="/shows/{show.id}"
			class="compact-link"
			aria-label="View show at {show.venue?.name || 'Unknown Venue'} on {date.full}"
		>
			<div class="compact-card">
				<time class="compact-date" datetime={show.date}>
					<span class="compact-month">{date.month}</span>
					<span class="compact-day">{date.day}</span>
				</time>
				<div class="compact-info">
					<span class="compact-venue">{show.venue?.name || 'Unknown Venue'}</span>
					<span class="compact-location">
						{show.venue?.city}{#if show.venue?.state}, {show.venue.state}{/if}
					</span>
				</div>
				{#if show.songCount}
					<span class="compact-songs" aria-hidden="true">{show.songCount} songs</span>
				{/if}
			</div>
		</a>
	</article>
{:else}
	<article class="scroll-slide-up">
		<Card interactive>
			<a
				href="/shows/{show.id}"
				class="link"
				aria-label="View show at {show.venue?.name || 'Unknown Venue'} on {date.full}"
			>
				<div class="content">
					<time class="date-block" datetime={show.date}>
						<span class="month">{date.month}</span>
						<span class="day">{date.day}</span>
						<span class="year">{date.year}</span>
					</time>

					<div class="info">
						<h3 class="venue">{show.venue?.name || 'Unknown Venue'}</h3>
						<p class="location">
							{show.venue?.city}{#if show.venue?.state}, {show.venue.state}{/if}{#if show.venue?.country && show.venue.country !== 'USA'}
								, {show.venue.country}{/if}
						</p>

						{#if show.tour}
							<Badge variant="secondary" size="sm">{show.tour.name}</Badge>
						{/if}
					</div>

					<div class="stats">
						{#if show.songCount}
							<span class="stat" aria-hidden="true">{show.songCount} songs</span>
						{/if}
						{#if show.rarityIndex}
							<span class="stat" aria-hidden="true">Rarity: {show.rarityIndex.toFixed(2)}</span>
						{/if}
					</div>
				</div>
			</a>
		</Card>
	</article>
{/if}

<style>
	/* Compact Variant */
	.compact-article {
		display: block;
	}

	.compact-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.compact-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		background: linear-gradient(
			to bottom,
			var(--background),
			color-mix(in oklch, var(--background) 98%, var(--color-gray-100))
		);
		transition: all var(--transition-base);
	}

	.compact-card:hover {
		border-color: var(--color-primary-300);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.compact-date {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		flex-shrink: 0;
		background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
		border-radius: var(--radius-lg);
		color: white;
		text-align: center;
	}

	.compact-month {
		font-size: 10px;
		font-weight: var(--font-bold);
		letter-spacing: 0.5px;
		opacity: 0.9;
	}

	.compact-day {
		font-size: var(--text-xl);
		font-weight: var(--font-bold);
		line-height: 1;
	}

	.compact-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.compact-venue {
		font-weight: var(--font-semibold);
		color: var(--foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.compact-location {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	.compact-songs {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		flex-shrink: 0;
	}

	/* Default Variant */
	.link {
		text-decoration: none;
		color: inherit;
		display: block;
		height: 100%;
	}

	.content {
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
		padding: var(--space-4);
		height: 100%;

		/* Container query context - establishes show-card as a container */
		container: show-card / inline-size;
	}

	.date-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		flex-shrink: 0;
		background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
		border-radius: var(--radius-xl);
		color: white;
		text-align: center;
	}

	.month {
		font-size: var(--text-xs);
		font-weight: var(--font-bold);
		letter-spacing: 0.5px;
		opacity: 0.9;
	}

	.day {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		line-height: 1;
		margin: 2px 0;
	}

	.year {
		font-size: var(--text-xs);
		opacity: 0.8;
	}

	.info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.venue {
		font-size: var(--text-lg);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0;
	}

	.location {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}

	.stats {
		display: flex;
		gap: var(--space-3);
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		flex-shrink: 0;
	}

	.stat {
		white-space: nowrap;
	}

	/* Container Queries: Responsive behavior based on card width */

	/* Extra Small: < 280px - Vertical stack layout */
	@container show-card (max-width: 279px) {
		.content {
			flex-direction: column;
			gap: var(--space-2);
			padding: var(--space-2);
			align-items: center;
			text-align: center;
		}

		.date-block {
			width: 48px;
			height: 48px;
		}

		.month {
			font-size: var(--text-xs);
		}

		.day {
			font-size: var(--text-lg);
		}

		.year {
			font-size: 8px;
			opacity: 0.7;
		}

		.info {
			width: 100%;
		}

		.venue {
			font-size: var(--text-sm);
		}

		.location {
			font-size: var(--text-xs);
		}

		.stats {
			width: 100%;
			flex-direction: column;
			align-items: center;
			font-size: var(--text-xs);
		}
	}

	/* Small: 280px - 399px - Compact horizontal layout */
	@container show-card (min-width: 280px) and (max-width: 399px) {
		.content {
			flex-wrap: wrap;
			gap: var(--space-3);
			padding: var(--space-3);
		}

		.date-block {
			width: 60px;
			height: 60px;
			flex-shrink: 0;
		}

		.month {
			font-size: var(--text-xs);
		}

		.day {
			font-size: var(--text-2xl);
		}

		.year {
			font-size: var(--text-xs);
		}

		.info {
			flex: 1;
			min-width: 150px;
		}

		.venue {
			font-size: var(--text-base);
		}

		.location {
			font-size: var(--text-xs);
		}

		.stats {
			flex-basis: 100%;
			font-size: var(--text-xs);
			gap: var(--space-2);
		}
	}

	/* Medium: 400px - 549px - Standard layout */
	@container show-card (min-width: 400px) and (max-width: 549px) {
		.content {
			gap: var(--space-3);
			padding: var(--space-3);
		}

		.date-block {
			width: 70px;
			height: 70px;
		}

		.info {
			flex: 1;
		}

		.stats {
			flex-direction: column;
			gap: var(--space-1);
			font-size: var(--text-xs);
		}
	}

	/* Large: 550px+ - Full featured layout */
	@container show-card (min-width: 550px) {
		.content {
			gap: var(--space-4);
			padding: var(--space-4);
			align-items: center;
		}

		.date-block {
			width: 80px;
			height: 80px;
		}

		.info {
			flex: 1;
		}

		.stats {
			flex-direction: row;
			gap: var(--space-3);
			white-space: nowrap;
		}
	}

	/* Ultra Large: 700px+ - Premium display */
	@container show-card (min-width: 700px) {
		.venue {
			font-size: var(--text-xl);
		}

		.location {
			font-size: var(--text-base);
		}

		.stats {
			font-size: var(--text-sm);
		}
	}

	/* Fallback for browsers without container queries */
	@supports not (container-type: inline-size) {
		@media (max-width: 399px) {
			.content {
				flex-wrap: wrap;
				gap: var(--space-2);
				padding: var(--space-2);
			}

			.date-block {
				width: 60px;
				height: 60px;
			}

			.day {
				font-size: var(--text-2xl);
			}

			.venue {
				font-size: var(--text-sm);
			}

			.stats {
				flex-basis: 100%;
				font-size: var(--text-xs);
			}
		}

		@media (min-width: 400px) {
			.content {
				gap: var(--space-3);
				padding: var(--space-3);
			}

			.date-block {
				width: 70px;
				height: 70px;
			}

			.stats {
				flex-direction: column;
				font-size: var(--text-xs);
			}
		}

		@media (min-width: 550px) {
			.content {
				gap: var(--space-4);
				padding: var(--space-4);
				align-items: center;
			}

			.date-block {
				width: 80px;
				height: 80px;
			}

			.stats {
				flex-direction: row;
				gap: var(--space-3);
			}
		}
	}

	@media (prefers-color-scheme: dark) {
		.compact-card {
			background: linear-gradient(
				to bottom,
				var(--background),
				color-mix(in oklch, var(--background) 95%, var(--color-gray-800))
			);
		}

		.compact-card:hover {
			border-color: var(--color-primary-500);
		}
	}

	/* Scroll-driven animations - only apply with Chrome 115+ support */
	@supports (animation-timeline: view()) {
		.scroll-fade-in {
			animation: scrollFadeIn linear both;
			animation-timeline: view();
			animation-range: entry 0% cover 40%;
			will-change: opacity;
		}

		.scroll-slide-up {
			animation: scrollSlideUp linear both;
			animation-timeline: view();
			animation-range: entry 0% cover 50%;
			will-change: opacity, transform;
		}

		@keyframes scrollFadeIn {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		@keyframes scrollSlideUp {
			from {
				opacity: 0;
				transform: translateY(30px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	}

	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.scroll-fade-in,
		.scroll-slide-up {
			animation: none !important;
			opacity: 1 !important;
			transform: none !important;
		}
	}
</style>
