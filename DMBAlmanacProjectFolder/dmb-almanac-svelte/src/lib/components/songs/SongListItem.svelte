<script lang="ts">
	import type { DexieSong } from '$db/dexie/schema';

	interface SongListItemProps {
		song: DexieSong;
	}

	let { song }: SongListItemProps = $props();
</script>

<a href={`/songs/${song.slug}`} class="song-link scroll-slide-up">
	<div class="song-card-container">
		<div class="song-card" data-interactive="true">
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
						<span class="badge badge-opener badge-sm">{song.openerCount}x opener</span>
					{/if}
					{#if (song.closerCount ?? 0) > 0}
						<span class="badge badge-closer badge-sm">{song.closerCount}x closer</span>
					{/if}
					{#if (song.encoreCount ?? 0) > 0}
						<span class="badge badge-encore badge-sm">{song.encoreCount}x encore</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
</a>

<style>
	.song-link {
		text-decoration: none;
		color: inherit;
		display: block;
		height: 100%;
	}

	/* Container establishes query context for responsive behavior */
	.song-card-container {
		container: song-card / inline-size;
		height: 100%;
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
		height: 100%;
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
		line-height: 1.4;
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

	/* Container Queries: Responsive behavior based on component width */

	/* Extra Small: < 200px - Minimal layout */
	@container song-card (max-width: 199px) {
		.song-content {
			gap: var(--space-1);
			padding: var(--space-2);
		}

		.song-main {
			flex-direction: column;
			align-items: flex-start;
		}

		.song-title {
			font-size: var(--text-sm);
		}

		.song-meta {
			width: 100%;
			flex-wrap: wrap;
		}

		.badge-sm {
			padding: 1px 6px;
			font-size: 9px;
		}

		.song-stats {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
		}

		.performance-count {
			font-size: var(--text-xs);
		}
	}

	/* Small: 200px - 299px - Single column with vertical badge layout */
	@container song-card (min-width: 200px) and (max-width: 299px) {
		.song-content {
			gap: var(--space-2);
			padding: var(--space-2);
		}

		.song-main {
			flex-direction: column;
			align-items: flex-start;
		}

		.song-title {
			font-size: var(--text-sm);
		}

		.song-meta {
			width: 100%;
			flex-wrap: wrap;
		}

		.song-stats {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-1);
			width: 100%;
		}

		.performance-count {
			font-size: var(--text-xs);
		}
	}

	/* Medium: 300px - 399px - Horizontal layout starting to emerge */
	@container song-card (min-width: 300px) and (max-width: 399px) {
		.song-content {
			gap: var(--space-2);
			padding: var(--space-3);
		}

		.song-main {
			flex-direction: column;
		}

		.song-title {
			font-size: var(--text-base);
		}

		.song-stats {
			gap: var(--space-1);
			flex-wrap: wrap;
		}

		.performance-count {
			font-size: var(--text-xs);
		}

		.badge-sm {
			padding: 2px 6px;
			font-size: 9px;
		}
	}

	/* Large: 400px+ - Full horizontal layout with all details */
	@container song-card (min-width: 400px) {
		.song-content {
			gap: var(--space-2);
			padding: var(--space-4);
		}

		.song-main {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}

		.song-title {
			font-size: var(--text-base);
		}

		.song-stats {
			gap: var(--space-2);
		}

		.performance-count {
			font-size: var(--text-sm);
		}
	}

	/* Extra Large: 500px+ - Premium card layout with larger fonts */
	@container song-card (min-width: 500px) {
		.song-title {
			font-size: var(--text-lg);
		}

		.performance-count {
			font-size: var(--text-base);
			font-weight: var(--font-semibold);
		}

		.song-stats {
			margin-top: var(--space-1);
		}
	}

	/* Fallback for browsers without container queries */
	@supports not (container-type: inline-size) {
		@media (max-width: 639px) {
			.song-content {
				gap: var(--space-2);
				padding: var(--space-2);
			}

			.song-main {
				flex-direction: column;
				align-items: flex-start;
			}

			.song-title {
				font-size: var(--text-sm);
			}

			.song-stats {
				flex-direction: column;
				align-items: flex-start;
				gap: var(--space-1);
			}

			.performance-count {
				font-size: var(--text-xs);
			}
		}

		@media (min-width: 640px) {
			.song-content {
				gap: var(--space-2);
				padding: var(--space-4);
			}

			.song-main {
				flex-direction: row;
				justify-content: space-between;
				align-items: center;
			}

			.song-title {
				font-size: var(--text-base);
			}

			.song-stats {
				gap: var(--space-2);
			}

			.performance-count {
				font-size: var(--text-sm);
			}
		}
	}

	/* Dark mode */
	@media (prefers-color-scheme: dark) {
		.song-card {
			background: linear-gradient(
				to bottom,
				var(--background),
				color-mix(in oklch, var(--background) 95%, var(--color-gray-800))
			);
		}

		.song-card[data-interactive='true']:hover {
			background: linear-gradient(
				to bottom,
				var(--background),
				color-mix(in oklch, var(--color-primary-900) 25%, var(--background))
			);
		}

		.badge-secondary {
			background: linear-gradient(
				to bottom,
				color-mix(in oklch, var(--color-secondary-900) 30%, var(--background)),
				color-mix(in oklch, var(--color-secondary-900) 20%, var(--background))
			);
			color: var(--color-secondary-300);
			border-color: var(--color-gray-700);
		}
	}

	/* Scroll-driven animations - only apply with Chrome 115+ support */
	@supports (animation-timeline: view()) {
		.scroll-slide-up {
			animation: scrollSlideUp linear both;
			animation-timeline: view();
			animation-range: entry 0% cover 50%;
			will-change: opacity, transform;
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

	/* Reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.song-card[data-interactive='true'] {
			transition: none;
		}

		.song-card[data-interactive='true']:hover {
			transform: none;
		}

		/* Disable scroll animations */
		.scroll-slide-up {
			animation: none !important;
			opacity: 1 !important;
			transform: none !important;
		}
	}
</style>
