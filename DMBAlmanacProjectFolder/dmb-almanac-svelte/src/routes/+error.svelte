<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// Get error details from the page store
	let status = $derived($page.status);
	let message = $derived($page.error?.message ?? 'An unexpected error occurred');

	// Error-specific content
	const errorContent = $derived.by(() => {
		switch (status) {
			case 404:
				return {
					title: 'Page Not Found',
					description: "The page you're looking for doesn't exist or has been moved.",
					icon: '🔍',
					suggestions: [
						{ text: 'View all shows', href: '/shows' },
						{ text: 'Browse songs', href: '/songs' },
						{ text: 'Explore venues', href: '/venues' }
					]
				};
			case 500:
				return {
					title: 'Server Error',
					description: 'Something went wrong on our end. Please try again later.',
					icon: '⚠️',
					suggestions: [
						{ text: 'Go to homepage', href: '/' },
						{ text: 'Refresh page', action: () => window.location.reload() }
					]
				};
			case 503:
				return {
					title: 'Service Unavailable',
					description: 'The service is temporarily unavailable. Please try again in a few moments.',
					icon: '🔧',
					suggestions: [
						{ text: 'Go to homepage', href: '/' },
						{ text: 'Try again', action: () => window.location.reload() }
					]
				};
			default:
				return {
					title: 'Something Went Wrong',
					description: message || 'An unexpected error occurred.',
					icon: '❌',
					suggestions: [
						{ text: 'Go to homepage', href: '/' },
						{ text: 'Try again', action: () => window.location.reload() }
					]
				};
		}
	});

	function handleNavigation(suggestion: { href?: string; action?: () => void }) {
		if (suggestion.action) {
			suggestion.action();
		} else if (suggestion.href) {
			goto(suggestion.href);
		}
	}
</script>

<svelte:head>
	<title>{errorContent.title} - DMB Almanac</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="error-page" role="main">
	<div class="error-container">
		<span class="error-icon" aria-hidden="true">{errorContent.icon}</span>

		<h1 class="error-title">{errorContent.title}</h1>

		<p class="error-status">Error {status}</p>

		<p class="error-description">{errorContent.description}</p>

		{#if status === 404}
			<p class="error-hint">
				If you were looking for a specific show, song, or venue, try using the search feature
				or browse our catalogs below.
			</p>
		{/if}

		<nav class="error-actions" aria-label="Error recovery options">
			{#each errorContent.suggestions as suggestion}
				{#if suggestion.href}
					<a href={suggestion.href} class="action-button">
						{suggestion.text}
					</a>
				{:else}
					<button
						type="button"
						class="action-button action-button--secondary"
						onclick={() => handleNavigation(suggestion)}
					>
						{suggestion.text}
					</button>
				{/if}
			{/each}
		</nav>

		{#if status === 404}
			<section class="quick-links" aria-labelledby="quick-links-title">
				<h2 id="quick-links-title" class="visually-hidden">Quick Links</h2>
				<div class="quick-links-grid">
					<a href="/shows" class="quick-link">
						<span class="quick-link-icon">📅</span>
						<span class="quick-link-text">Shows</span>
						<span class="quick-link-count">2,800+</span>
					</a>
					<a href="/songs" class="quick-link">
						<span class="quick-link-icon">🎵</span>
						<span class="quick-link-text">Songs</span>
						<span class="quick-link-count">200+</span>
					</a>
					<a href="/venues" class="quick-link">
						<span class="quick-link-icon">🏟️</span>
						<span class="quick-link-text">Venues</span>
						<span class="quick-link-count">1,000+</span>
					</a>
					<a href="/liberation" class="quick-link">
						<span class="quick-link-icon">🎯</span>
						<span class="quick-link-text">Liberation</span>
						<span class="quick-link-count">Tracking</span>
					</a>
				</div>
			</section>
		{/if}
	</div>
</main>

<style>
	.error-page {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
		background: var(--background);
	}

	.error-container {
		max-width: 600px;
		text-align: center;
		padding: var(--space-8);
	}

	.error-icon {
		font-size: 4rem;
		display: block;
		margin-bottom: var(--space-4);
	}

	.error-title {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-2);
	}

	.error-status {
		font-size: var(--text-lg);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-4);
	}

	.error-description {
		font-size: var(--text-base);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-4);
		line-height: var(--leading-relaxed);
	}

	.error-hint {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		margin: 0 0 var(--space-6);
		padding: var(--space-4);
		background: var(--background-secondary);
		border-radius: var(--radius-lg);
	}

	.error-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: var(--space-8);
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		padding: var(--space-3) var(--space-6);
		font-size: var(--text-base);
		font-weight: var(--font-medium);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--transition-fast);
		background: linear-gradient(to bottom, var(--color-primary-500), var(--color-primary-600));
		color: white;
		border: none;
		cursor: pointer;
	}

	.action-button:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.action-button:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.action-button--secondary {
		background: var(--background-secondary);
		color: var(--foreground);
		border: 1px solid var(--border-color);
	}

	.action-button--secondary:hover {
		background: var(--background-tertiary);
	}

	.quick-links {
		margin-top: var(--space-8);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border-color);
	}

	.quick-links-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4);
	}

	@media (min-width: 640px) {
		.quick-links-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.quick-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-4);
		background: var(--background-secondary);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--transition-fast);
		border: 1px solid transparent;
	}

	.quick-link:hover {
		background: var(--background-tertiary);
		border-color: var(--color-primary-200);
		transform: translateY(-2px);
	}

	.quick-link:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.quick-link-icon {
		font-size: 1.5rem;
		margin-bottom: var(--space-2);
	}

	.quick-link-text {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground);
	}

	.quick-link-count {
		font-size: var(--text-xs);
		color: var(--foreground-muted);
		margin-top: var(--space-1);
	}

	.visually-hidden {
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
</style>
