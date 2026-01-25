<script lang="ts">
	type ErrorType =
		| "network"
		| "not-found"
		| "server"
		| "database"
		| "permission"
		| "generic";

	interface Props {
		title?: string;
		message?: string;
		error?: Error;
		type?: ErrorType;
		onRetry?: () => void;
		showDetails?: boolean;
	}

	let {
		title,
		message,
		error,
		type = "generic",
		onRetry,
		showDetails = false,
	}: Props = $props();

	// Detect error type from error object if not specified
	const detectedType = $derived.by((): ErrorType => {
		if (type !== "generic") return type;

		const errorMessage = error?.message?.toLowerCase() ?? "";
		const errorName = error?.name?.toLowerCase() ?? "";

		if (
			errorMessage.includes("network") ||
			errorMessage.includes("fetch") ||
			errorMessage.includes("offline")
		) {
			return "network";
		}
		if (
			errorMessage.includes("404") ||
			errorMessage.includes("not found")
		) {
			return "not-found";
		}
		if (errorMessage.includes("500") || errorMessage.includes("server")) {
			return "server";
		}
		if (
			errorName.includes("quota") ||
			errorMessage.includes("indexeddb") ||
			errorMessage.includes("database")
		) {
			return "database";
		}
		if (
			errorMessage.includes("permission") ||
			errorMessage.includes("denied") ||
			errorMessage.includes("403")
		) {
			return "permission";
		}
		return "generic";
	});

	// Get error config based on type
	const errorConfig = $derived.by(() => {
		const configs: Record<
			ErrorType,
			{ icon: string; defaultTitle: string; suggestions: string[] }
		> = {
			network: {
				icon: "📡",
				defaultTitle: "Connection Error",
				suggestions: [
					"Check your internet connection",
					"Try refreshing the page",
					"The server might be temporarily unavailable",
				],
			},
			"not-found": {
				icon: "🔍",
				defaultTitle: "Not Found",
				suggestions: [
					"The page or resource may have been moved",
					"Check the URL for typos",
					"Try searching for what you need",
				],
			},
			server: {
				icon: "🔧",
				defaultTitle: "Server Error",
				suggestions: [
					"Our servers are experiencing issues",
					"Please try again in a few minutes",
					"If the problem persists, contact support",
				],
			},
			database: {
				icon: "💾",
				defaultTitle: "Database Error",
				suggestions: [
					"Try clearing your browser cache",
					"Check if you have enough storage space",
					"Try using a different browser",
				],
			},
			permission: {
				icon: "🔒",
				defaultTitle: "Access Denied",
				suggestions: [
					"You may not have permission to view this",
					"Try signing in if you have an account",
					"Contact support if you believe this is an error",
				],
			},
			generic: {
				icon: "⚠️",
				defaultTitle: "Something Went Wrong",
				suggestions: [
					"Try refreshing the page",
					"Clear your browser cache and try again",
					"If the problem persists, please contact support",
				],
			},
		};
		return configs[detectedType];
	});

	const displayTitle = $derived(title || errorConfig.defaultTitle);
	const displayMessage = $derived(
		message || error?.message || "An unexpected error occurred",
	);
</script>

<div class="error-state" role="alert" aria-live="assertive">
	<div class="error-icon" aria-hidden="true">{errorConfig.icon}</div>

	<h3 class="error-title">{displayTitle}</h3>

	<p class="error-message">{displayMessage}</p>

	<div class="suggestions">
		<span class="suggestions-label">Try these steps:</span>
		<ul class="suggestions-list">
			{#each errorConfig.suggestions as suggestion}
				<li>{suggestion}</li>
			{/each}
		</ul>
	</div>

	<div class="actions">
		{#if onRetry}
			<button class="btn btn-primary" onclick={onRetry}>
				<span class="btn-icon">↻</span>
				Try Again
			</button>
		{/if}
		<a href="/" class="btn btn-secondary">
			<span class="btn-icon">🏠</span>
			Go Home
		</a>
	</div>

	{#if showDetails && error}
		<div class="details-section">
			<details class="error-details-native">
				<summary class="details-toggle">
					<span>Show technical details</span>
					<span class="chevron">▼</span>
				</summary>
				<pre class="error-details"><code
						>{error.stack || error.message}</code
					></pre>
			</details>
		</div>
	{/if}
</div>

<style>
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 480px;
		margin: 0 auto;
		padding: var(--space-8);
		text-align: center;
	}

	.error-icon {
		font-size: 4rem;
		margin-bottom: var(--space-4);
		line-height: 1;
	}

	.error-title {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--foreground);
		margin: 0 0 var(--space-2);
	}

	.error-message {
		font-size: var(--text-base);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-6);
		line-height: 1.5;
	}

	.suggestions {
		width: 100%;
		padding: var(--space-4);
		background: var(--background-secondary);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-6);
		text-align: left;
	}

	.suggestions-label {
		display: block;
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--foreground);
		margin-bottom: var(--space-2);
	}

	.suggestions-list {
		margin: 0;
		padding-left: var(--space-5);
		color: var(--foreground-secondary);
		font-size: var(--text-sm);
	}

	.suggestions-list li {
		margin-bottom: var(--space-1);
	}

	.suggestions-list li:last-child {
		margin-bottom: 0;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
		justify-content: center;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2-5, 0.625rem) var(--space-4);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-decoration: none;
		transition: all var(--transition-fast);
		border: none;
	}

	.btn-icon {
		font-size: 1rem;
	}

	.btn-primary {
		background: var(--color-primary-600);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-700);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: var(--background);
		color: var(--foreground);
		border: 1px solid var(--border-color);
	}

	.btn-secondary:hover {
		background: var(--background-secondary);
		border-color: var(--color-primary-300);
	}

	.details-section {
		width: 100%;
		margin-top: var(--space-6);
	}

	.details-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		width: 100%;
		padding: var(--space-2);
		background: none;
		border: none;
		font-size: var(--text-sm);
		color: var(--foreground-muted);
		cursor: pointer;
		transition: color var(--transition-fast);
		list-style: none; /* Remove default summary marker */
	}

	.details-toggle::-webkit-details-marker {
		display: none; /* Remove default marker in WebKit */
	}

	.details-toggle:hover {
		color: var(--foreground-secondary);
	}

	.chevron {
		font-size: var(--text-xs);
		transition: transform var(--transition-fast);
	}

	/* Rotate chevron when details is open */
	.error-details-native[open] .chevron {
		transform: rotate(180deg);
	}

	.error-details {
		margin-top: var(--space-3);
		padding: var(--space-3);
		background: var(--color-gray-900);
		color: var(--color-gray-300);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		text-align: left;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
	}

	@media (max-width: 480px) {
		.error-state {
			padding: var(--space-6) var(--space-4);
		}

		.error-icon {
			font-size: 3rem;
		}

		.error-title {
			font-size: var(--text-xl);
		}

		.actions {
			flex-direction: column;
			width: 100%;
		}

		.btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>
