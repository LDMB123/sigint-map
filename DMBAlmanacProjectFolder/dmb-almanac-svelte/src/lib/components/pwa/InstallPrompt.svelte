<script lang="ts">
	// onMount available if needed for lifecycle management

	interface BeforeInstallPromptEvent extends Event {
		readonly platforms: string[];
		readonly userChoice: Promise<{
			outcome: 'accepted' | 'dismissed';
			platform: string;
		}>;
		prompt(): Promise<void>;
	}

	interface InstallPromptProps {
		minTimeOnSite?: number;
		requireScroll?: boolean;
		dismissalDurationDays?: number;
	}

	const DISMISS_KEY = 'pwa-install-prompt-dismissed';
	const DISMISS_DURATION_MS = (props: InstallPromptProps) =>
		(props.dismissalDurationDays ?? 7) * 24 * 60 * 60 * 1000;

	let {
		minTimeOnSite = 3000, // 3 seconds for easier testing, 30000 for production
		requireScroll = false,
		dismissalDurationDays = 7
	}: InstallPromptProps = $props();

	// State
	let deferredPrompt: BeforeInstallPromptEvent | null = $state(null);
	let canInstall: boolean = $state(false);
	let isInstalled: boolean = $state(false);
	let isDismissed: boolean = $state(false);
	let shouldShow: boolean = $state(false);
	let hasScrolled: boolean = $state(false);
	let isIOSSafari: boolean = $state(false);
	let bannerRef: HTMLElement | null = $state(null);
	let focusTrapRef: HTMLElement | null = $state(null);

	// Exportable functions for external control
	export function show() {
		isDismissed = false;
		localStorage.removeItem(DISMISS_KEY);
		shouldShow = canInstall && !isInstalled;
	}

	export function hide() {
		handleDismiss();
	}

	// Detect iOS Safari
	$effect(() => {
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isSafari =
			/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
		isIOSSafari = isIOS && isSafari;
	});

	// Check if already installed
	$effect(() => {
		if (!('serviceWorker' in navigator)) return;

		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

		if (isStandalone) {
			isInstalled = true;
		}
	});

	// Capture beforeinstallprompt event and check dismissal status
	$effect(() => {
		if (!('serviceWorker' in navigator)) return;

		// Check if already dismissed within dismissal period
		const dismissedTime = localStorage.getItem(DISMISS_KEY);
		if (dismissedTime) {
			const dismissedTimestamp = parseInt(dismissedTime, 10);
			const now = Date.now();
			if (now - dismissedTimestamp < DISMISS_DURATION_MS({ dismissalDurationDays })) {
				isDismissed = true;
			} else {
				// Dismissal period expired, clear it
				localStorage.removeItem(DISMISS_KEY);
				isDismissed = false;
			}
		}

		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;
			canInstall = true;
			console.log('[PWA] Install prompt captured', {
				platforms: (e as BeforeInstallPromptEvent).platforms
			});
		};

		const handleAppInstalled = () => {
			console.log('[PWA] App installed successfully');
			isInstalled = true;
			canInstall = false;
			deferredPrompt = null;
			shouldShow = false;
			localStorage.removeItem(DISMISS_KEY);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		window.addEventListener('appinstalled', handleAppInstalled);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	});

	// Listen for display mode changes (app uninstalled/reinstalled)
	$effect(() => {
		const mediaQuery = window.matchMedia('(display-mode: standalone)');

		const handleChange = (e: MediaQueryListEvent) => {
			if (e.matches) {
				isInstalled = true;
				canInstall = false;
				shouldShow = false;
			}
		};

		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	});

	// Track scroll with IntersectionObserver
	$effect(() => {
		if (!requireScroll) {
			hasScrolled = true;
			return;
		}

		const sentinel = document.createElement('div');
		sentinel.style.cssText =
			'position:absolute;top:200px;height:1px;width:1px;pointer-events:none;visibility:hidden';
		document.body.appendChild(sentinel);

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0].isIntersecting) {
					hasScrolled = true;
					observer.disconnect();
				}
			},
			{ threshold: 0 }
		);

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
			sentinel.remove();
		};
	});

	// Show prompt after conditions met
	$effect(() => {
		if (!canInstall || isInstalled || isDismissed || isIOSSafari) {
			shouldShow = false;
			return;
		}

		let focusTimer: ReturnType<typeof setTimeout> | undefined;

		const timer = setTimeout(() => {
			if (hasScrolled || !requireScroll) {
				shouldShow = true;
				// Move focus to the banner for accessibility
				focusTimer = setTimeout(() => {
					focusTrapRef?.focus();
				}, 100);
			}
		}, minTimeOnSite);

		// MEMORY: Clean up both timers on effect cleanup
		return () => {
			clearTimeout(timer);
			if (focusTimer !== undefined) {
				clearTimeout(focusTimer);
			}
		};
	});

	// Handle install action
	async function handleInstall() {
		if (!deferredPrompt) {
			console.log('[PWA] No deferred prompt available');
			return;
		}

		try {
			await deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			console.log('[PWA] User response:', outcome);

			if (outcome === 'accepted') {
				canInstall = false;
				deferredPrompt = null;
				shouldShow = false;
				localStorage.removeItem(DISMISS_KEY);

				// Track successful install
				if ('gtag' in window) {
					(window as any).gtag('event', 'pwa_install', {
						event_category: 'engagement',
						event_label: 'PWA Installed'
					});
				}
			}
		} catch (error) {
			console.error('[PWA] Install failed:', error);
		}
	}

	// Handle dismiss with 7-day persistence
	function handleDismiss() {
		isDismissed = true;
		shouldShow = false;
		localStorage.setItem(DISMISS_KEY, Date.now().toString());

		// Track dismissal
		if ('gtag' in window) {
			(window as any).gtag('event', 'pwa_install_dismissed', {
				event_category: 'engagement',
				event_label: 'PWA Install Prompt Dismissed'
			});
		}

		// Return focus to trigger element if available
		const previousFocusElement = document.activeElement as HTMLElement;
		if (previousFocusElement) {
			previousFocusElement.blur();
		}
	}

	// Show iOS Safari manual installation instructions
	function handleIOSInstall() {
		if ('gtag' in window) {
			(window as any).gtag('event', 'pwa_ios_manual_install', {
				event_category: 'engagement',
				event_label: 'iOS Manual Install Instructions'
			});
		}
		// Could expand to show modal with instructions
		alert(
			'On iOS:\n1. Tap the Share button\n2. Tap "Add to Home Screen"\n3. Name the app and tap "Add"'
		);
	}
</script>

<!-- Banner for regular browsers -->
{#if shouldShow && !isIOSSafari && canInstall && !isInstalled && !isDismissed}
	<div
		class="install-banner"
		bind:this={bannerRef}
		role="alert"
		aria-live="polite"
		aria-labelledby="banner-title"
		aria-describedby="banner-description"
	>
		<div class="banner-content">
			<div class="icon-wrapper" aria-hidden="true">
				<svg class="icon" viewBox="0 0 32 32" fill="none" stroke="currentColor">
					<circle cx="16" cy="16" r="14" stroke-width="2" />
					<circle cx="16" cy="16" r="4" fill="currentColor" />
				</svg>
			</div>

			<div class="text-wrapper">
				<h3 id="banner-title" class="banner-title">Install DMB Almanac</h3>
				<p id="banner-description" class="banner-description">
					Add to your home screen for quick access and offline browsing.
				</p>
			</div>
		</div>

		<div class="button-wrapper">
			<button
				type="button"
				class="button-dismiss"
				onclick={handleDismiss}
				aria-label="Dismiss install prompt for 7 days"
				bind:this={focusTrapRef}
			>
				Not now
			</button>
			<button type="button" class="button-install" onclick={handleInstall}>
				Install
			</button>
		</div>

		<button
			type="button"
			class="button-close"
			onclick={handleDismiss}
			aria-label="Close install banner"
		>
			<span aria-hidden="true">&times;</span>
		</button>
	</div>
{/if}

<!-- iOS Safari detection banner -->
{#if shouldShow && isIOSSafari && !isInstalled && !isDismissed}
	<div
		class="install-banner install-banner-ios"
		role="alert"
		aria-live="polite"
		aria-labelledby="ios-banner-title"
		aria-describedby="ios-banner-description"
	>
		<div class="banner-content">
			<div class="icon-wrapper" aria-hidden="true">
				<svg class="icon" viewBox="0 0 32 32" fill="none" stroke="currentColor">
					<circle cx="16" cy="16" r="14" stroke-width="2" />
					<circle cx="16" cy="16" r="4" fill="currentColor" />
				</svg>
			</div>

			<div class="text-wrapper">
				<h3 id="ios-banner-title" class="banner-title">Add to Home Screen</h3>
				<p id="ios-banner-description" class="banner-description">
					Tap the Share button below, then select "Add to Home Screen"
				</p>
			</div>
		</div>

		<div class="button-wrapper">
			<button
				type="button"
				class="button-dismiss"
				onclick={handleDismiss}
				aria-label="Dismiss install prompt for 7 days"
			>
				Not now
			</button>
			<button type="button" class="button-install" onclick={handleIOSInstall}>
				How to Install
			</button>
		</div>

		<button
			type="button"
			class="button-close"
			onclick={handleDismiss}
			aria-label="Close install banner"
		>
			<span aria-hidden="true">&times;</span>
		</button>
	</div>
{/if}

<style>
	.install-banner {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(135deg, #030712 0%, #1a1822 100%);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px;
		z-index: 1000;
		box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
		animation: slideUp 300ms ease-out;
		font-family: inherit;
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.install-banner {
			animation: none;
		}
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 16px;
		flex: 1;
		min-width: 0;
	}

	.icon-wrapper {
		flex-shrink: 0;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
	}

	.icon {
		width: 100%;
		height: 100%;
	}

	.text-wrapper {
		flex: 1;
		min-width: 0;
	}

	.banner-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		line-height: 1.2;
	}

	.banner-description {
		margin: 4px 0 0 0;
		font-size: 14px;
		opacity: 0.9;
		line-height: 1.3;
	}

	.button-wrapper {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.button-close {
		position: absolute;
		top: 50%;
		right: 12px;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: #fff;
		font-size: 24px;
		cursor: pointer;
		padding: 4px 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 150ms ease;
		opacity: 0.7;
	}

	.button-close:hover {
		opacity: 1;
		background-color: rgba(255, 255, 255, 0.1);
	}

	.button-close:active {
		transform: translateY(-50%) scale(0.95);
	}

	.button-close:focus {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}

	.button-dismiss,
	.button-install {
		padding: 8px 16px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
	}

	.button-dismiss {
		background-color: rgba(255, 255, 255, 0.2);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.button-dismiss:hover {
		background-color: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
	}

	.button-dismiss:active {
		transform: scale(0.98);
	}

	.button-dismiss:focus {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}

	.button-install {
		background-color: #fff;
		color: #030712;
		font-weight: 600;
	}

	.button-install:hover {
		background-color: #f0f0f0;
		box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
	}

	.button-install:active {
		transform: scale(0.98);
	}

	.button-install:focus {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}

	/* iOS Safari specific styling */
	.install-banner-ios {
		background: linear-gradient(135deg, #1a1822 0%, #2d2635 100%);
	}

	/* Mobile responsive layout */
	@media (max-width: 640px) {
		.install-banner {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
			padding: 12px;
			padding-right: 40px;
		}

		.button-wrapper {
			width: 100%;
			gap: 8px;
		}

		.button-dismiss,
		.button-install {
			flex: 1;
			min-width: 0;
		}

		.button-close {
			top: 12px;
			right: 8px;
			transform: none;
		}

		.button-close:active {
			transform: scale(0.95);
		}

		.banner-description {
			font-size: 13px;
		}
	}

	/* Dark theme adjustments */
	@media (prefers-color-scheme: dark) {
		.install-banner {
			background: linear-gradient(135deg, #0a0b0f 0%, #151618 100%);
			border-top: 1px solid rgba(255, 255, 255, 0.1);
		}

		.button-dismiss {
			background-color: rgba(255, 255, 255, 0.15);
			border-color: rgba(255, 255, 255, 0.2);
		}

		.button-dismiss:hover {
			background-color: rgba(255, 255, 255, 0.25);
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: more) {
		.install-banner {
			border-top: 2px solid #fff;
		}

		.button-dismiss,
		.button-install,
		.button-close {
			border-width: 2px;
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.button-dismiss,
		.button-install,
		.button-close {
			transition: none;
		}
	}
</style>
