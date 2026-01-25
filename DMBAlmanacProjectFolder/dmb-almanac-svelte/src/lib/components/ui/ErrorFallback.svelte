<script lang="ts">
	import type { AppError } from '$lib/errors/types';
	import { isAppError } from '$lib/errors/types';

	interface Props {
		error: Error | AppError;
		onRetry?: () => void;
		title?: string;
		showDetails?: boolean;
	}

	let { error, onRetry, title = 'Something went wrong', showDetails = false }: Props = $props();

	// Extract error information using $derived for reactivity
	const isApp = $derived(isAppError(error));
	const errorCode = $derived(isApp ? (error as AppError).code : 'UNKNOWN_ERROR');
	const statusCode = $derived(isApp ? (error as AppError).statusCode : 500);
	const context = $derived(isApp ? (error as AppError).context : undefined);

	// Determine user-friendly message reactively
	const userMessage = $derived.by(() => {
		if (statusCode === 404) {
			return 'The requested resource could not be found.';
		} else if (statusCode === 403) {
			return 'You do not have permission to access this resource.';
		} else if (statusCode === 401) {
			return 'You must be logged in to access this resource.';
		} else if (statusCode >= 500) {
			return 'A server error occurred. Our team has been notified. Please try again later.';
		} else if (statusCode >= 400) {
			return 'There was a problem with your request. Please check your input and try again.';
		}
		return error.message || 'An unexpected error occurred. Please try again.';
	});
</script>

<div class="error-fallback" role="alert">
	<div class="error-header">
		<svg
			class="error-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10"></circle>
			<line x1="12" y1="8" x2="12" y2="12"></line>
			<line x1="12" y1="16" x2="12.01" y2="16"></line>
		</svg>
		<h2>{title}</h2>
	</div>

	<div class="error-body">
		<p class="error-message">{userMessage}</p>

		{#if showDetails && errorCode !== 'UNKNOWN_ERROR'}
			<details class="error-details">
				<summary>Technical Details</summary>
				<div class="details-content">
					<p>
						<strong>Error Code:</strong>
						<code>{errorCode}</code>
					</p>
					{#if statusCode}
						<p>
							<strong>Status:</strong>
							<code>{statusCode}</code>
						</p>
					{/if}
					{#if context}
						<div>
							<strong>Context:</strong>
							<pre>{JSON.stringify(context, null, 2)}</pre>
						</div>
					{/if}
				</div>
			</details>
		{/if}
	</div>

	<div class="error-actions">
		{#if onRetry}
			<button class="retry-button" onclick={onRetry} type="button">
				<svg
					class="button-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<polyline points="23 4 23 10 17 10"></polyline>
					<polyline points="1 20 1 14 7 14"></polyline>
					<path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
				</svg>
				Try Again
			</button>
		{/if}
		<a href="/" class="home-button" type="button">
			<svg
				class="button-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
				<polyline points="9 22 9 12 15 12 15 22"></polyline>
			</svg>
			Go Home
		</a>
	</div>
</div>

<style>
	.error-fallback {
		background: var(--background-secondary, #f9fafb);
		border: 1px solid var(--color-error-200, #fecaca);
		border-radius: var(--radius-lg, 0.5rem);
		padding: var(--space-6, 1.5rem);
		max-width: 600px;
		margin: 0 auto;
	}

	.error-header {
		display: flex;
		align-items: center;
		gap: var(--space-3, 0.75rem);
		margin-bottom: var(--space-4, 1rem);
	}

	.error-header h2 {
		margin: 0;
		font-size: var(--text-lg, 1.125rem);
		font-weight: var(--font-semibold, 600);
		color: var(--color-error-600, #dc2626);
	}

	.error-icon {
		width: 24px;
		height: 24px;
		color: var(--color-error-500, #ef4444);
		flex-shrink: 0;
	}

	.error-body {
		margin-bottom: var(--space-5, 1.25rem);
	}

	.error-message {
		margin: 0 0 var(--space-2, 0.5rem);
		color: var(--foreground, #1f2937);
		font-size: var(--text-base, 1rem);
		line-height: 1.5;
	}

	.error-details {
		margin-top: var(--space-3, 0.75rem);
	}

	.error-details summary {
		cursor: pointer;
		font-size: var(--text-sm, 0.875rem);
		color: var(--foreground-secondary, #6b7280);
		font-weight: var(--font-medium, 500);
		user-select: none;
		padding: var(--space-2, 0.5rem);
		border-radius: var(--radius-sm, 0.25rem);
		transition: background-color 0.2s;
	}

	.error-details summary:hover {
		background-color: var(--color-gray-100, #f3f4f6);
	}

	.details-content {
		margin-top: var(--space-2, 0.5rem);
		padding: var(--space-3, 0.75rem);
		background: var(--background, white);
		border-radius: var(--radius-md, 0.375rem);
		border: 1px solid var(--border-color, #e5e7eb);
	}

	.details-content p {
		margin: var(--space-1, 0.25rem) 0;
		font-size: var(--text-xs, 0.75rem);
		color: var(--foreground-secondary, #6b7280);
	}

	.details-content div {
		margin: var(--space-1, 0.25rem) 0;
		font-size: var(--text-xs, 0.75rem);
		color: var(--foreground-secondary, #6b7280);
	}

	.details-content strong {
		color: var(--foreground, #1f2937);
	}

	.details-content code {
		background: var(--color-gray-100, #f3f4f6);
		padding: 0.25em 0.5em;
		border-radius: 0.25em;
		font-family: monospace;
		font-size: 0.875em;
		color: var(--color-error-600, #dc2626);
	}

	.details-content pre {
		background: var(--color-gray-800, #1f2937);
		color: var(--color-gray-100, #f3f4f6);
		padding: var(--space-2, 0.5rem);
		border-radius: var(--radius-sm, 0.25rem);
		overflow-x: auto;
		font-size: var(--text-xs, 0.75rem);
		margin: var(--space-2, 0.5rem) 0 0;
	}

	.error-actions {
		display: flex;
		gap: var(--space-3, 0.75rem);
		flex-wrap: wrap;
	}

	.retry-button,
	.home-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2, 0.5rem);
		padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
		border-radius: var(--radius-md, 0.375rem);
		font-size: var(--text-sm, 0.875rem);
		font-weight: var(--font-medium, 500);
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.retry-button {
		background: var(--color-primary-500, #3b82f6);
		color: white;
	}

	.retry-button:hover {
		background: var(--color-primary-600, #2563eb);
		transform: translateY(-1px);
	}

	.retry-button:active {
		transform: translateY(0);
	}

	.home-button {
		background: var(--color-gray-200, #e5e7eb);
		color: var(--foreground, #1f2937);
	}

	.home-button:hover {
		background: var(--color-gray-300, #d1d5db);
	}

	.button-icon {
		width: 18px;
		height: 18px;
		flex-shrink: 0;
	}

	@media (prefers-color-scheme: dark) {
		.error-fallback {
			background: var(--color-gray-800, #1f2937);
			border-color: var(--color-error-900, #7f1d1d);
		}

		.error-header h2 {
			color: var(--color-error-400, #f87171);
		}

		.error-icon {
			color: var(--color-error-400, #f87171);
		}

		.details-content {
			background: var(--color-gray-900, #111827);
			border-color: var(--color-gray-700, #374151);
		}

		.error-details summary:hover {
			background-color: var(--color-gray-700, #374151);
		}

		.home-button {
			background: var(--color-gray-700, #374151);
			color: var(--color-gray-100, #f3f4f6);
		}

		.home-button:hover {
			background: var(--color-gray-600, #4b5563);
		}
	}
</style>
