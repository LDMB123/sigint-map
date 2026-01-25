<script lang="ts">
	/**
	 * ProtocolHandlerIndicator - Shows protocol handler registration status
	 *
	 * Shows:
	 * - Whether protocol handlers are supported
	 * - Registration status for web+dmb:// protocol
	 * - Platform-specific notes and limitations
	 * - Manual registration trigger
	 *
	 * Integrates with:
	 * - protocolHandler from $lib/pwa/protocol
	 * - Chrome 96+ Protocol Handlers API
	 */

	import { browser } from '$app/environment';
	import { protocolHandler, getProtocolHandlerCapabilities } from '$lib/pwa/protocol';

	// Props
	interface ProtocolHandlerIndicatorProps {
		/** Additional CSS classes */
		class?: string;
		/** Show as compact badge or expanded card */
		variant?: 'badge' | 'card';
		/** Show detailed platform information */
		showDetails?: boolean;
	}

	let {
		class: className = '',
		variant = 'badge',
		showDetails = false
	}: ProtocolHandlerIndicatorProps = $props();

	// State
	let isRegistered = $state(false);
	let isSupported = $state(false);
	let isRegistering = $state(false);
	let error = $state<string | null>(null);
	let showTooltip = $state(false);

	// Platform capabilities
	const capabilities = $derived.by(() => {
		if (!browser) return null;
		return getProtocolHandlerCapabilities();
	});

	// Subscribe to protocol handler state
	$effect(() => {
		if (!browser) return;

		const unsubscribe = protocolHandler.subscribe((state) => {
			isRegistered = state.isRegistered;
			isSupported = state.isSupported;
			error = state.error;
		});

		return unsubscribe;
	});

	// Handle manual registration
	async function handleRegister() {
		if (!isSupported || isRegistered || isRegistering) return;

		isRegistering = true;
		error = null;

		try {
			const success = await protocolHandler.register();
			if (success) {
				console.log('[ProtocolHandlerIndicator] Registration successful');
			}
		} catch (err) {
			console.error('[ProtocolHandlerIndicator] Registration failed:', err);
		} finally {
			isRegistering = false;
		}
	}

	// Status text
	const statusText = $derived.by(() => {
		if (!isSupported) return 'Not supported';
		if (isRegistered) return 'Registered';
		return 'Not registered';
	});

	// Status icon
	const statusIcon = $derived.by(() => {
		if (!isSupported) return '✗';
		if (isRegistered) return '✓';
		return '○';
	});

	// Status color
	const statusColor = $derived.by(() => {
		if (!isSupported) return 'gray';
		if (isRegistered) return 'green';
		return 'yellow';
	});
</script>

{#if variant === 'badge'}
	<div
		class="protocol-badge {className}"
		class:supported={isSupported}
		class:registered={isRegistered}
		class:not-supported={!isSupported}
		role="status"
		aria-label="Protocol handler status: {statusText}"
		onmouseenter={() => showTooltip = true}
		onmouseleave={() => showTooltip = false}
	>
		<span class="status-icon" data-color={statusColor}>{statusIcon}</span>
		<span class="status-text">web+dmb://</span>

		{#if showTooltip}
			<div class="tooltip" role="tooltip">
				<div class="tooltip-header">
					<strong>Protocol Handler</strong>
					<span class="tooltip-status" data-color={statusColor}>{statusText}</span>
				</div>

				{#if isSupported && !isRegistered}
					<p class="tooltip-description">
						Register to open DMB Almanac links directly from other apps and websites.
					</p>
					<button
						class="tooltip-button"
						onclick={handleRegister}
						disabled={isRegistering}
						aria-busy={isRegistering}
					>
						{isRegistering ? 'Registering...' : 'Register Now'}
					</button>
				{:else if isRegistered}
					<p class="tooltip-description">
						You can now open web+dmb:// links directly in this app.
					</p>
					<div class="tooltip-examples">
						<p class="examples-title">Example links:</p>
						<code>web+dmb://show/1991-03-23</code>
						<code>web+dmb://song/ants-marching</code>
					</div>
				{:else if !isSupported}
					<p class="tooltip-description">
						Protocol handlers are not supported in this browser.
					</p>
					{#if capabilities?.notes}
						<div class="tooltip-notes">
							{#each capabilities.notes as note}
								<p class="note">{note}</p>
							{/each}
						</div>
					{/if}
				{/if}

				{#if error}
					<p class="tooltip-error">{error}</p>
				{/if}
			</div>
		{/if}
	</div>
{:else if variant === 'card'}
	<div class="protocol-card {className}" role="region" aria-label="Protocol handler settings">
		<div class="card-header">
			<div class="card-title">
				<span class="card-icon" data-color={statusColor}>{statusIcon}</span>
				<h3>Protocol Handler</h3>
			</div>
			<span class="card-status" data-color={statusColor}>{statusText}</span>
		</div>

		<div class="card-body">
			<p class="card-description">
				{#if isSupported && !isRegistered}
					Register <code>web+dmb://</code> protocol to open DMB Almanac links directly from other apps and websites.
				{:else if isRegistered}
					The <code>web+dmb://</code> protocol is registered. You can now open DMB Almanac links directly.
				{:else}
					Protocol handlers are not supported in this browser.
				{/if}
			</p>

			{#if showDetails && capabilities}
				<div class="card-details">
					<dl>
						<dt>Platform:</dt>
						<dd>{capabilities.platform}</dd>
						<dt>Protocol:</dt>
						<dd><code>web+dmb://</code></dd>
					</dl>

					{#if capabilities.notes.length > 0}
						<div class="card-notes">
							<h4>Platform Notes:</h4>
							<ul>
								{#each capabilities.notes as note}
									<li>{note}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}

			{#if isRegistered && showDetails}
				<div class="card-examples">
					<h4>Example Protocol URLs:</h4>
					<ul>
						<li><code>web+dmb://show/1991-03-23</code> - Open show from March 23, 1991</li>
						<li><code>web+dmb://song/ants-marching</code> - View Ants Marching song details</li>
						<li><code>web+dmb://venue/123</code> - View venue with ID 123</li>
						<li><code>web+dmb://search/satellite</code> - Search for "satellite"</li>
					</ul>
				</div>
			{/if}

			{#if error}
				<div class="card-error" role="alert">
					<strong>Error:</strong> {error}
				</div>
			{/if}
		</div>

		{#if isSupported && !isRegistered}
			<div class="card-footer">
				<button
					class="register-button"
					onclick={handleRegister}
					disabled={isRegistering}
					aria-busy={isRegistering}
				>
					{isRegistering ? 'Registering...' : 'Register Protocol Handler'}
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Badge variant */
	.protocol-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full);
		font-size: var(--text-xs);
		cursor: help;
		position: relative;
		transition: all var(--transition-fast);
	}

	.protocol-badge:hover {
		background: var(--background-tertiary);
		border-color: var(--color-primary-500);
		box-shadow: var(--shadow-sm);
	}

	.status-icon {
		font-size: var(--text-sm);
	}

	.status-icon[data-color="green"] {
		color: var(--color-green-500);
	}

	.status-icon[data-color="yellow"] {
		color: var(--color-yellow-500);
	}

	.status-icon[data-color="gray"] {
		color: var(--color-gray-500);
	}

	.status-text {
		font-family: monospace;
		font-weight: var(--font-medium);
		color: var(--foreground-secondary);
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		bottom: calc(100% + var(--space-2));
		left: 50%;
		transform: translateX(-50%);
		width: max-content;
		max-width: 320px;
		padding: var(--space-3);
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.tooltip-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-color);
	}

	.tooltip-status {
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-md);
	}

	.tooltip-status[data-color="green"] {
		background: var(--color-green-950);
		color: var(--color-green-400);
	}

	.tooltip-status[data-color="yellow"] {
		background: var(--color-yellow-950);
		color: var(--color-yellow-400);
	}

	.tooltip-status[data-color="gray"] {
		background: var(--color-gray-900);
		color: var(--color-gray-400);
	}

	.tooltip-description {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: var(--space-2) 0;
	}

	.tooltip-button {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: var(--color-primary-600);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.tooltip-button:hover:not(:disabled) {
		background: var(--color-primary-700);
	}

	.tooltip-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.tooltip-examples {
		margin-top: var(--space-3);
		padding: var(--space-2);
		background: var(--background-secondary);
		border-radius: var(--radius-md);
	}

	.examples-title {
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-2) 0;
	}

	.tooltip-examples code {
		display: block;
		font-size: var(--text-xs);
		color: var(--color-blue-400);
		padding: var(--space-1) 0;
		font-family: monospace;
	}

	.tooltip-notes {
		margin-top: var(--space-2);
		font-size: var(--text-xs);
		color: var(--foreground-muted);
	}

	.tooltip-notes .note {
		margin: var(--space-1) 0;
	}

	.tooltip-error {
		margin-top: var(--space-2);
		padding: var(--space-2);
		background: var(--color-red-950);
		color: var(--color-red-300);
		border-radius: var(--radius-md);
		font-size: var(--text-xs);
	}

	/* Card variant */
	.protocol-card {
		background: var(--background-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		border-bottom: 1px solid var(--border-color);
	}

	.card-title {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.card-icon {
		font-size: var(--text-xl);
	}

	.card-title h3 {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--foreground);
	}

	.card-status {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
	}

	.card-status[data-color="green"] {
		background: var(--color-green-950);
		color: var(--color-green-400);
	}

	.card-status[data-color="yellow"] {
		background: var(--color-yellow-950);
		color: var(--color-yellow-400);
	}

	.card-status[data-color="gray"] {
		background: var(--color-gray-900);
		color: var(--color-gray-400);
	}

	.card-body {
		padding: var(--space-4);
	}

	.card-description {
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-4) 0;
	}

	.card-description code {
		font-family: monospace;
		background: var(--background-tertiary);
		padding: 0 var(--space-2);
		border-radius: var(--radius-sm);
		color: var(--color-blue-400);
	}

	.card-details {
		margin-top: var(--space-4);
		padding: var(--space-3);
		background: var(--background);
		border-radius: var(--radius-lg);
	}

	.card-details dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-2) var(--space-4);
		margin: 0;
	}

	.card-details dt {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--foreground-secondary);
	}

	.card-details dd {
		font-size: var(--text-sm);
		color: var(--foreground);
		margin: 0;
	}

	.card-notes {
		margin-top: var(--space-3);
	}

	.card-notes h4 {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-2) 0;
	}

	.card-notes ul {
		margin: 0;
		padding-left: var(--space-4);
		font-size: var(--text-sm);
		color: var(--foreground-muted);
	}

	.card-notes li {
		margin-bottom: var(--space-1);
	}

	.card-examples {
		margin-top: var(--space-4);
		padding: var(--space-3);
		background: var(--background);
		border-radius: var(--radius-lg);
	}

	.card-examples h4 {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--foreground-secondary);
		margin: 0 0 var(--space-2) 0;
	}

	.card-examples ul {
		margin: 0;
		padding-left: var(--space-4);
		list-style: none;
	}

	.card-examples li {
		margin-bottom: var(--space-2);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	.card-examples code {
		font-family: monospace;
		color: var(--color-blue-400);
		font-weight: var(--font-medium);
	}

	.card-error {
		margin-top: var(--space-3);
		padding: var(--space-3);
		background: var(--color-red-950);
		border-radius: var(--radius-lg);
	}

	.card-error strong {
		color: var(--color-red-400);
		font-weight: var(--font-semibold);
	}

	.card-error {
		color: var(--color-red-300);
		font-size: var(--text-sm);
	}

	.card-footer {
		padding: var(--space-4);
		border-top: 1px solid var(--border-color);
		background: var(--background);
	}

	.register-button {
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: var(--color-primary-600);
		color: white;
		border: none;
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.register-button:hover:not(:disabled) {
		background: var(--color-primary-700);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.register-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.tooltip {
			max-width: 280px;
		}

		.card-details dl {
			grid-template-columns: 1fr;
		}

		.card-details dt {
			font-weight: var(--font-semibold);
		}
	}
</style>
