<script lang="ts">
	import { onMount } from 'svelte';
	// goto available for programmatic navigation
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let status = $state<'waiting' | 'processing' | 'error' | 'success' | 'invalid_format' | 'invalid_identifier'>('waiting');

	/**
	 * Parse resource type from protocol URL for display
	 */
	function parseResourceType(url: string): string {
		const match = url.match(/web\+dmb:\/\/(\w+)/);
		if (match) {
			const resource = match[1];
			const resourceNames: Record<string, string> = {
				show: 'show details',
				song: 'song information',
				venue: 'venue information',
				search: 'search results',
				guest: 'guest musician',
				tour: 'tour information'
			};
			return resourceNames[resource] || resource;
		}
		return 'content';
	}
	let errorMessage = $state<string | null>(null);
	let protocolUrl = $state<string>('');

	/**
	 * Parse and handle protocol URL
	 * This is called when the PWA is opened with a web+dmb:// URL
	 */
	async function handleProtocolUrl() {
		try {
			// Get the URL from the location or search params
			let urlToParse = '';

			// Check if we're here via direct protocol handler
			if (window.location.hash) {
				// Some browsers pass protocol data in hash
				urlToParse = window.location.hash.substring(1);
			}

			// Also check search params (for reload scenarios)
			const urlParams = new URLSearchParams(window.location.search);
			const paramUrl = urlParams.get('url');
			if (paramUrl) {
				urlToParse = paramUrl;
			}

			if (urlToParse) {
				status = 'processing';
				protocolUrl = urlToParse;

				// Let the load function handle the parsing and redirect
				// Just wait for the next navigation
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			errorMessage = `Failed to process protocol URL: ${errorMsg}`;
			status = 'error';
			console.error('Protocol handler error:', error);
		}
	}

	onMount(() => {
		// Process the protocol URL
		handleProtocolUrl();

		// Update status based on load result
		if (data?.status) {
			const loadedStatus = data.status;
			if (loadedStatus === 'waiting' || loadedStatus === 'processing' || loadedStatus === 'error' || loadedStatus === 'success' || loadedStatus === 'invalid_format' || loadedStatus === 'invalid_identifier') {
				status = loadedStatus;
			}
			if (data.error) {
				errorMessage = data.error;
			}
			if (data.url) {
				protocolUrl = data.url;
			}
		}
	});
</script>

<svelte:head>
	<title>Opening Link - DMB Almanac</title>
</svelte:head>

<div class="container">
	{#if status === 'waiting'}
		<div class="loading-state">
			<div class="spinner"></div>
			<h1>Opening Link</h1>
			<p class="subtitle">Processing your request...</p>
		</div>
	{:else if status === 'processing'}
		<div class="loading-state">
			<div class="spinner"></div>
			<h1>Processing Link</h1>
			{#if protocolUrl}
				<p class="subtitle">Navigating to {parseResourceType(protocolUrl)}...</p>
			{:else}
				<p class="subtitle">Parsing protocol URL...</p>
			{/if}
		</div>
	{:else if status === 'error' || status === 'invalid_format' || status === 'invalid_identifier'}
		<div class="error-state">
			<div class="error-icon">!</div>
			<h1>Error Opening Link</h1>
			{#if errorMessage}
				<p class="error-message">{errorMessage}</p>
			{/if}
			{#if protocolUrl}
				<p class="url-display">URL: {protocolUrl}</p>
			{/if}
			<div class="help-text">
				<p>Supported formats:</p>
				<ul>
					<li><code>web+dmb://show/1991-03-23</code> - View a show by date</li>
					<li><code>web+dmb://song/ants-marching</code> - View a song by slug</li>
					<li><code>web+dmb://venue/123</code> - View a venue by ID</li>
					<li><code>web+dmb://search/query-term</code> - Search for content</li>
				</ul>
			</div>
			<div class="action-buttons">
				<a href="/" class="btn btn-primary">Back to Home</a>
				<a href="/shows" class="btn btn-secondary">Browse Shows</a>
			</div>
		</div>
	{:else if status === 'success'}
		<div class="success-state">
			<div class="success-icon">✓</div>
			<h1>Link Processed</h1>
			<p class="subtitle">Redirecting to content...</p>
		</div>
	{/if}
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: var(--space-4);
		background: var(--background);
	}

	.loading-state,
	.error-state,
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		text-align: center;
		max-width: 500px;
		padding: var(--space-8);
		background: var(--background-secondary);
		border-radius: var(--radius-2xl);
		border: 1px solid var(--border-color);
	}

	h1 {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		margin: 0;
		color: var(--foreground);
	}

	.subtitle {
		font-size: var(--text-lg);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Spinner animation */
	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid var(--background-tertiary);
		border-top-color: var(--color-primary-500);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error state */
	.error-state {
		background: linear-gradient(
			135deg,
			var(--color-red-950, #450a0a) 0%,
			var(--color-red-900, #7f1d1d) 100%
		);
		border-color: var(--color-red-800, #b91c1c);
	}

	.error-state h1 {
		color: var(--color-red-200, #fecaca);
	}

	.error-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: var(--color-red-600, #dc2626);
		color: white;
		border-radius: 50%;
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
	}

	.error-message {
		font-size: var(--text-sm);
		color: var(--color-red-200, #fecaca);
		margin: 0;
		padding: var(--space-4);
		background: rgba(0, 0, 0, 0.2);
		border-radius: var(--radius-lg);
		font-family: monospace;
		word-break: break-word;
		max-height: 80px;
		overflow-y: auto;
	}

	.url-display {
		font-size: var(--text-xs);
		color: var(--color-red-300, #fca5a5);
		margin: 0;
		font-style: italic;
		word-break: break-all;
	}

	/* Help text */
	.help-text {
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
		text-align: left;
		background: var(--background-tertiary);
		padding: var(--space-4);
		border-radius: var(--radius-lg);
		margin: var(--space-4) 0 0 0;
	}

	.help-text p {
		margin: 0 0 var(--space-2) 0;
		font-weight: var(--font-semibold);
	}

	.help-text ul {
		margin: 0;
		padding-left: var(--space-4);
		list-style: none;
	}

	.help-text li {
		margin-bottom: var(--space-1);
	}

	.help-text code {
		background: rgba(0, 0, 0, 0.2);
		padding: 0 var(--space-2);
		border-radius: var(--radius-md);
		font-family: monospace;
		font-size: var(--text-xs);
		color: var(--color-blue-300, #93c5fd);
	}

	/* Success state */
	.success-state {
		background: linear-gradient(
			135deg,
			var(--color-green-950, #052e16) 0%,
			var(--color-green-900, #14532d) 100%
		);
		border-color: var(--color-green-800, #16a34a);
	}

	.success-state h1 {
		color: var(--color-green-200, #bbf7d0);
	}

	.success-state .subtitle {
		color: var(--color-green-300, #86efac);
	}

	.success-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: var(--color-green-600, #16a34a);
		color: white;
		border-radius: 50%;
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
	}

	/* Action buttons */
	.action-buttons {
		display: flex;
		gap: var(--space-4);
		margin-top: var(--space-2);
		width: 100%;
	}

	.btn {
		flex: 1;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-lg);
		text-decoration: none;
		font-weight: var(--font-medium);
		transition: all var(--transition-fast);
		border: none;
		cursor: pointer;
		font-size: var(--text-sm);
	}

	.btn-primary {
		background: var(--color-primary-600, #2563eb);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-700, #1d4ed8);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.btn-secondary {
		background: var(--background-tertiary);
		color: var(--foreground);
		border: 1px solid var(--border-color);
	}

	.btn-secondary:hover {
		background: var(--background);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.loading-state,
		.error-state,
		.success-state {
			padding: var(--space-6);
		}

		h1 {
			font-size: var(--text-xl);
		}

		.subtitle {
			font-size: var(--text-base);
		}

		.action-buttons {
			flex-direction: column;
		}

		.help-text {
			font-size: var(--text-xs);
		}

		.help-text code {
			font-size: var(--text-2xs);
		}
	}
</style>
