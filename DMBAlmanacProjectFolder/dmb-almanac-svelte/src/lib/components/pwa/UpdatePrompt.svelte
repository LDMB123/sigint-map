<script lang="ts">
	import { onMount } from 'svelte';

	let updateAvailable: boolean = $state(false);
	let dialogRef: HTMLDialogElement | null = $state(null);

	onMount(() => {
		if (!('serviceWorker' in navigator)) return;

		// Track cleanup functions for proper memory management
		const cleanupFunctions: (() => void)[] = [];

		const checkForUpdates = async () => {
			try {
				const registration = await navigator.serviceWorker.ready;

				// Named function for updatefound listener
				const handleUpdateFound = () => {
					const newWorker = registration.installing;
					if (!newWorker) return;

					// Named function for statechange listener
					const handleStateChange = () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							updateAvailable = true;
						}
					};

					newWorker.addEventListener('statechange', handleStateChange);
					// Track nested listener cleanup
					cleanupFunctions.push(() => {
						newWorker.removeEventListener('statechange', handleStateChange);
					});
				};

				registration.addEventListener('updatefound', handleUpdateFound);
				// Track main listener cleanup
				cleanupFunctions.push(() => {
					registration.removeEventListener('updatefound', handleUpdateFound);
				});
			} catch (error) {
				console.error('[UpdatePrompt] Failed to check for updates:', error);
			}
		};

		checkForUpdates();

		// Return cleanup function for onMount
		return () => {
			cleanupFunctions.forEach((fn) => fn());
		};
	});

	// Control dialog open/close state
	$effect(() => {
		if (updateAvailable && dialogRef) {
			dialogRef.showModal();
		} else if (!updateAvailable && dialogRef) {
			dialogRef.close();
		}
	});

	function handleUpdate() {
		navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
		window.location.reload();
	}

	function handleDismiss() {
		updateAvailable = false;
	}

	function handleDialogClose() {
		handleDismiss();
	}
</script>

<dialog
	bind:this={dialogRef}
	class="update-dialog"
	aria-labelledby="update-prompt-title"
	aria-describedby="update-prompt-description"
	role="alertdialog"
	onclose={handleDialogClose}
>
	<div class="update-content">
		<div class="update-header">
			<svg class="update-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="1" />
				<path d="M12 9v6M9 12h6" />
				<circle cx="12" cy="12" r="10" />
			</svg>
			<p id="update-prompt-title" class="update-title">
				A new version of DMB Almanac is available!
			</p>
		</div>
		<p id="update-prompt-description" class="update-description">
			Your PWA has been updated in the background. Refresh to use the new features and improvements.
		</p>
		<div class="actions">
			<button type="button" onclick={handleUpdate} class="update-btn" aria-label="Update now to the latest version">
				Update Now
			</button>
			<button type="button" onclick={handleDismiss} class="dismiss-btn" aria-label="Dismiss update prompt and update later">
				Later
			</button>
		</div>
	</div>
</dialog>

<style>
	:global(dialog.update-dialog) {
		border: none;
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		padding: 24px;
		max-width: 400px;
		width: 90vw;
		/* CSS @starting-style for entry/exit animations (Chromium 117+) */
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity 300ms ease-out,
			transform 300ms ease-out,
			overlay 300ms ease-out allow-discrete,
			display 300ms ease-out allow-discrete;
	}

	/* Starting state for entry animation */
	@starting-style {
		:global(dialog.update-dialog[open]) {
			opacity: 0;
			transform: translateY(20px);
		}
	}

	/* Exit state - also used for exit animation */
	:global(dialog.update-dialog:not([open])) {
		opacity: 0;
		transform: translateY(20px);
	}

	:global(dialog.update-dialog::backdrop) {
		background-color: rgba(0, 0, 0, 0.5);
		transition: background-color 300ms ease-out, overlay 300ms allow-discrete;
	}

	@starting-style {
		:global(dialog.update-dialog[open]::backdrop) {
			background-color: rgba(0, 0, 0, 0);
		}
	}

	:global(dialog.update-dialog:not([open])::backdrop) {
		background-color: rgba(0, 0, 0, 0);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(dialog.update-dialog) {
			transition: none;
		}
		:global(dialog.update-dialog::backdrop) {
			transition: none;
		}
	}

	.update-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
		container-type: inline-size;
		container-name: update-prompt;
	}

	.update-title {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
		color: #030712;
		line-height: 1.4;
	}

	.actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}

	.update-btn,
	.dismiss-btn {
		padding: 10px 16px;
		border-radius: 8px;
		border: 2px solid transparent;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.update-btn {
		background-color: #030712;
		color: #fff;
	}

	.update-btn:hover {
		background-color: #1a1822;
	}

	.update-btn:focus-visible {
		outline: 2px solid #030712;
		outline-offset: 2px;
		box-shadow: 0 0 0 4px rgba(3, 7, 18, 0.2);
	}

	.update-btn:active {
		transform: scale(0.98);
	}

	.dismiss-btn {
		background-color: #f0f0f0;
		color: #030712;
	}

	.dismiss-btn:hover {
		background-color: #e0e0e0;
	}

	.dismiss-btn:focus-visible {
		outline: 2px solid #030712;
		outline-offset: 2px;
		box-shadow: 0 0 0 4px rgba(3, 7, 18, 0.2);
	}

	.dismiss-btn:active {
		transform: scale(0.98);
	}

	.update-header {
		display: flex;
		gap: 12px;
		align-items: flex-start;
	}

	.update-icon {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		color: #030712;
		margin-top: 2px;
	}

	.update-description {
		font-size: 14px;
		color: #666;
		margin: 12px 0;
		line-height: 1.5;
	}

	/* High contrast mode support */
	@media (forced-colors: active) {
		.update-btn,
		.dismiss-btn {
			border: 2px solid CanvasText;
		}

		.update-btn:focus-visible,
		.dismiss-btn:focus-visible {
			outline: 3px solid Highlight;
			outline-offset: 2px;
		}
	}

	/* Container query for update prompt layout */
	@supports (container-type: inline-size) {
		@container update-prompt (max-width: 480px) {
			:global(dialog.update-dialog) {
				width: 95vw;
				padding: 20px;
			}

			.actions {
				flex-direction: column;
				gap: 8px;
			}

			.update-btn,
			.dismiss-btn {
				width: 100%;
			}
		}
	}


</style>
