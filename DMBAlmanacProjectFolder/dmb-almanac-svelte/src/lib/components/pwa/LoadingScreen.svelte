<script lang="ts">
	import type { LoadProgress } from '$stores/data';

	interface LoadingScreenProps {
		progress: LoadProgress;
	}

	let { progress }: LoadingScreenProps = $props();

	let announcerRef: HTMLDivElement | null = $state(null);
	let previousPhase: string = $state('');

	// Announce progress to screen readers
	$effect(() => {
		if (!announcerRef) return;

		// Only announce significant changes (every 10%)
		const shouldAnnounce =
			progress.phase !== previousPhase || Math.floor(progress.percentage) % 10 === 0;

		if (shouldAnnounce) {
			const message = getProgressMessage();
			announcerRef.textContent = message;
			previousPhase = progress.phase;
		}
	});

	function getProgressMessage(): string {
		switch (progress.phase) {
			case 'checking':
				return 'Checking database status';
			case 'fetching':
				return progress.entity
					? `Fetching ${progress.entity}`
					: `Fetching data files: ${progress.percentage.toFixed(0)}% complete`;
			case 'loading':
				return progress.entity
					? `Loading ${progress.entity}: ${progress.percentage.toFixed(0)}% complete`
					: `Loading data: ${progress.percentage.toFixed(0)}% complete`;
			case 'complete':
				return 'Data load complete';
			case 'error':
				return `Error: ${progress.error || 'Failed to load data'}`;
			default:
				return 'Initializing database';
		}
	}

	function getPhaseHeading(): string {
		switch (progress.phase) {
			case 'checking':
				return 'Checking Database';
			case 'fetching':
				return 'Fetching Data';
			case 'loading':
				return 'Loading Data';
			case 'complete':
				return 'Ready';
			case 'error':
				return 'Error';
			default:
				return 'Initializing';
		}
	}
</script>

<div class="container">
	<div
		bind:this={announcerRef}
		role="status"
		aria-live="polite"
		aria-atomic="true"
		class="sr-only"
	></div>

	<div class="content">
		<div class="logo">
			<div class="logo-icon" aria-hidden="true">
				<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						opacity="0.2"
					/>
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="progress-circle"
						style="--progress: {progress.percentage}"
					/>
					<!-- Simple DMB-inspired flame/dancer silhouette -->
					<path
						d="M50 20 L45 35 L40 50 L45 65 L50 80 L55 65 L60 50 L55 35 Z"
						fill="currentColor"
						opacity="0.8"
					/>
				</svg>
			</div>
			<h1 class="title">DMB Almanac</h1>
		</div>

		<div class="progress-section">
			<h2 class="phase-heading">{getPhaseHeading()}</h2>

			{#if progress.entity}
				<p class="entity-name" aria-live="polite">{progress.entity}</p>
			{/if}

			<div
				class="progress-bar-container"
				role="progressbar"
				aria-valuenow={Math.round(progress.percentage)}
				aria-valuemin={0}
				aria-valuemax={100}
			>
				<div
					class="progress-bar-fill"
					style={`--progress: ${progress.percentage}`}
				></div>
			</div>

			<p class="percentage" aria-live="polite">{progress.percentage.toFixed(1)}%</p>

			{#if progress.phase === 'loading' && progress.total > 0}
				<p class="record-count">
					{progress.loaded.toLocaleString()} / {progress.total.toLocaleString()} records
				</p>
			{/if}
		</div>

		<p class="loading-message">
			{#if progress.phase === 'checking'}
				Checking for existing data...
			{:else if progress.phase === 'fetching'}
				Downloading concert data...
			{:else if progress.phase === 'loading'}
				Building local database...
			{:else if progress.phase === 'complete'}
				All set! Loading app...
			{/if}
		</p>

		{#if progress.phase !== 'complete' && progress.phase !== 'error'}
			<div class="dots-container" aria-hidden="true">
				<span class="dot"></span>
				<span class="dot"></span>
				<span class="dot"></span>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.container {
		width: 100%;
		height: 100%;
		min-height: 100vh;
		display: flex;
		place-items: center;
		background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
		color: #030712;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 40px;
		padding: 24px;
		max-width: 400px;
		text-align: center;
	}

	.logo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.logo-icon {
		width: 120px;
		height: 120px;
		display: flex;
		place-items: center;
	}

	.logo-svg {
		width: 100%;
		height: 100%;
		color: #030712;
	}

	.progress-circle {
		/* SVG circle circumference: 2 * π * r = 2 * 3.14159 * 45 ≈ 283 */
		stroke-dasharray: 283;
		stroke-dashoffset: calc(283 - (283 * var(--progress, 0) / 100));
		transition: stroke-dashoffset 0.5s ease;
		transform-origin: 50px 50px;
	}

	.title {
		font-size: 32px;
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.5px;
	}

	.progress-section {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.phase-heading {
		font-size: 20px;
		font-weight: 600;
		margin: 0;
	}

	.entity-name {
		font-size: 14px;
		color: #666;
		margin: 0;
		font-weight: 500;
		min-height: 20px;
	}

	.progress-bar-container {
		width: 100%;
		height: 8px;
		background-color: #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
		position: relative;
	}

	.progress-bar-fill {
		height: 100%;
		width: 100%;
		background-color: #030712;
		border-radius: 4px;
		/* GPU-accelerated: Use scaleX instead of width for compositor-friendly animation */
		transform: scaleX(calc(var(--progress, 0) / 100));
		transform-origin: left center;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.percentage {
		font-size: 28px;
		font-weight: 700;
		margin: 0;
		color: #030712;
		min-height: 36px;
	}

	.record-count {
		font-size: 13px;
		color: #999;
		margin: 0;
	}

	.loading-message {
		font-size: 16px;
		color: #666;
		margin: 0;
		min-height: 24px;
		line-height: 1.4;
	}

	.dots-container {
		display: flex;
		place-items: center;
		gap: 8px;
		margin-top: 8px;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #030712;
		animation: pulse 1.4s ease-in-out infinite;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes pulse {
		0%,
		60%,
		100% {
			opacity: 0.3;
			transform: scale(1);
		}
		30% {
			opacity: 1;
			transform: scale(1.2);
		}
	}

	@media (max-width: 600px) {
		.content {
			gap: 32px;
			padding: 16px;
		}

		.logo-icon {
			width: 100px;
			height: 100px;
		}

		.title {
			font-size: 24px;
		}

		.phase-heading {
			font-size: 18px;
		}

		.percentage {
			font-size: 24px;
		}

		.loading-message {
			font-size: 14px;
		}
	}

	/* Accessibility: Reduce motion preference */
	@media (prefers-reduced-motion: reduce) {
		.progress-bar-fill {
			transition: none;
			transform: scaleX(calc(var(--progress, 0) / 100));
		}

		.progress-circle {
			transition: none;
		}

		.dot {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
