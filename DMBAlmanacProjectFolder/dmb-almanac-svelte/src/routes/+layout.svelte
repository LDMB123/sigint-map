<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { beforeNavigate } from '$app/navigation';
	import { pwaStore, pwaState } from '$stores/pwa';
	import { dataStore, dataState } from '$stores/data';
	import { initializeNavigation, isNavigating } from '$stores/navigation';
	// navigationStore available for direct store access
	import { lazySetupCacheInvalidationListeners } from '$lib/db/lazy-dexie';
	import { initializeQueue, cleanupQueue, registerBackgroundSync } from '$lib/services/offlineMutationQueue';
	import { isViewTransitionsSupported } from '$lib/utils/viewTransitions';
	import { setupViewTransitionNavigation } from '$lib/hooks/viewTransitionNavigation';
	import {
		initializeSpeculationRules,
		onPrerenderingComplete,
		getRulesByRoute,
		addSpeculationRules
	} from '$lib/utils/speculationRules';
	import { page } from '$app/stores';
	import { initializeWasm } from '$lib/wasm/bridge';
	import { initRUM } from '$lib/utils/rum';
	import Header from '$lib/components/navigation/Header.svelte';
	import Footer from '$lib/components/navigation/Footer.svelte';
	import { StorageQuotaMonitor, DataFreshnessIndicator } from '$lib/components/pwa';
	import ScrollProgressBar from '$lib/components/scroll/ScrollProgressBar.svelte';
	import '../app.css';

	// Child routes
	let { children } = $props();

	// Local state
	let _mounted = $state(false);
	let _rumInitialized = $state(false);

	onMount(() => {
		_mounted = true;

		// Wrap all initialization in try-catch to prevent any single failure from crashing the app
		try {
			// Run critical and non-critical initializations in parallel with error isolation
			// Uses Promise.allSettled to ensure all tasks attempt even if some fail
			Promise.allSettled([
				// Critical: PWA initialization
				Promise.resolve().then(() => {
					pwaStore.initialize();
					console.debug('[Layout] PWA store initialized');
				}),

				// Critical: Data loading initialization
				Promise.resolve().then(() => {
					dataStore.initialize();
					console.debug('[Layout] Data store initialized');
				}),

				// Critical: Cache invalidation listeners (lazy-loaded Dexie)
				lazySetupCacheInvalidationListeners().then(() => {
					console.debug('[Layout] Cache invalidation listeners initialized');
				}).catch((err) => {
					console.warn('[Layout] Cache invalidation setup failed:', err);
				}),

				// Critical: Offline mutation queue
				Promise.resolve().then(() => {
					initializeQueue();
					console.debug('[Layout] Offline mutation queue initialized');
				}),

				// Non-critical: Background Sync (Chrome 49+)
				registerBackgroundSync().catch((err) => {
					console.debug('[Layout] Background Sync registration failed (non-critical):', err);
				}),

				// Non-critical: Navigation API (Chrome 102+)
				Promise.resolve().then(() => {
					initializeNavigation();
					console.debug('[Layout] Navigation API initialized');
				}),

				// Non-critical: Speculation Rules API (Chrome 109+ / Chromium 2025)
				Promise.resolve().then(() => {
					initializeSpeculationRules();
					console.debug('[Layout] Speculation Rules initialized');
				}),

				// Non-critical: WASM preload
				initializeWasm().catch(err => {
					console.warn('[Layout] WASM preload failed, will use JS fallback:', err);
				})
			]).then((results) => {
				// Log summary of initialization results
				const failed = results.filter(r => r.status === 'rejected').length;
				if (failed > 0) {
					console.warn(`[Layout] ${failed} initialization task(s) failed, but app is still functional`);
				} else {
					console.info('[Layout] All initialization tasks completed successfully');
				}
			}).catch((err) => {
				// This should rarely happen with allSettled, but guard against it
				console.error('[Layout] Critical error during initialization:', err);
			});
		} catch (err) {
			console.error('[Layout] Unexpected error during initialization setup:', err);
		}

		// Monitor prerendering state if page was prerendered
		// Useful for deferring animations/interactions until page is visible
		if ((globalThis.document as any)?.prerendering) {
			try {
				onPrerenderingComplete(() => {
					console.info('[Layout] Prerendered page is now visible');
				});
			} catch (err) {
				console.debug('[Layout] Prerendering monitoring unavailable:', err);
			}
		}

		// Handle database upgrade blocked event
		// This occurs when another tab is holding the database connection open during a version upgrade
		const handleUpgradeBlocked = (event: Event) => {
			const customEvent = event as CustomEvent;
			const detail = customEvent.detail;
			console.error('[Layout] Database upgrade blocked:', detail);

			// Show user-friendly notification
			// OPTIMIZATION: Uses browser notification API if available, falls back to console
			if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
				new Notification('DMB Almanac - Database Update Required', {
					body: 'Please close all other tabs to complete the database upgrade',
					icon: '/favicon.png',
					tag: 'dexie-upgrade-blocked',
					requireInteraction: true
				});
			} else {
				// Fallback: Alert for immediate attention
				// User must close other tabs to proceed
				alert('Database Upgrade Required\n\nPlease close all other DMB Almanac tabs to complete the database upgrade.\n\nAfter closing other tabs, refresh this page.');
			}
		};

		const handleVersionChange = (event: Event) => {
			const customEvent = event as CustomEvent;
			console.warn('[Layout] Database version changed in another tab:', customEvent.detail);

			// Show user-friendly notification to refresh
			if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
				new Notification('DMB Almanac - Database Updated', {
					body: 'The database was updated in another tab. Please refresh this page.',
					icon: '/favicon.png',
					tag: 'dexie-version-change',
					requireInteraction: true
				});
			} else {
				// Fallback: Alert for immediate attention
				alert('Database Updated\n\nThe database was updated in another tab.\n\nPlease refresh this page to continue.');
			}
		};

		window.addEventListener('dexie-upgrade-blocked', handleUpgradeBlocked);
		window.addEventListener('dexie-version-change', handleVersionChange);

		// Cleanup function
		return () => {
			try {
				window.removeEventListener('dexie-upgrade-blocked', handleUpgradeBlocked);
				window.removeEventListener('dexie-version-change', handleVersionChange);
				cleanupQueue();
				console.debug('[Layout] Cleanup completed');
			} catch (err) {
				console.warn('[Layout] Error during cleanup:', err);
			}
		};
	});

	// Reactive offline attribute for CSS
	$effect(() => {
		if (browser && $pwaState.isOffline) {
			document.documentElement.setAttribute('data-offline', '');
		} else if (browser) {
			document.documentElement.removeAttribute('data-offline');
		}
	});

	// Reactive attribute for navigation loading state
	$effect(() => {
		if (browser && $isNavigating) {
			document.documentElement.setAttribute('data-navigating', '');
		} else if (browser) {
			document.documentElement.removeAttribute('data-navigating');
		}
	});

	// Setup view transitions for navigation (Chrome 111+, enhanced in 143+)
	beforeNavigate((event) => {
		if (browser && isViewTransitionsSupported()) {
			setupViewTransitionNavigation(event);
		}
	});

	// Initialize scheduler monitoring on mount (Chrome 129+)
	// With cancellation protection for edge-case cleanup
	$effect(() => {
		if (!browser || !_mounted) return;

		let cancelled = false;

		import('$lib/utils/scheduler').then(({ initSchedulerMonitoring }) => {
			if (!cancelled) {
				initSchedulerMonitoring();
				console.debug('[Layout] Scheduler monitoring initialized');
			}
		}).catch(err => {
			if (!cancelled) {
				console.debug('[Layout] Scheduler monitoring unavailable:', err);
			}
		});

		return () => {
			cancelled = true;
		};
	});

	// Apply route-specific speculation rules
	// This ensures detail pages prerender related content intelligently
	// Only applies if API is supported, otherwise gracefully degraded
	$effect(() => {
		if (browser && $page.url.pathname) {
			const routeRules = getRulesByRoute($page.url.pathname);
			if (routeRules) {
				addSpeculationRules(routeRules);
				console.debug('[Layout] Applied route-specific speculation rules for:', $page.url.pathname);
			}
		}
	});

	// Initialize RUM after data is loaded and visible (not during loading screen)
	// This ensures metrics are accurate and we don't track prerendered pages user never sees
	$effect(() => {
		if (browser && !_rumInitialized && $dataState.status === 'ready') {
			// Wait a tick to ensure UI is fully rendered
			setTimeout(() => {
				initRUM({
					batchInterval: 10000, // 10 seconds
					maxBatchSize: 10,
					endpoint: '/api/telemetry/performance',
					enableLogging: import.meta.env.DEV,
					sendImmediately: false // Batch metrics for efficiency

					// Example: Send to Google Analytics too
					// onMetric: (metric) => {
					//   if ('gtag' in window) {
					//     gtag('event', metric.name, {
					//       value: Math.round(metric.value),
					//       metric_rating: metric.rating
					//     });
					//   }
					// }
				});

				_rumInitialized = true;
				console.info('[Layout] RUM tracking initialized');
			}, 100);
		}
	});
</script>

<svelte:head>
	<title>DMB Almanac - Dave Matthews Band Concert Database</title>
	<meta name="description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />

	<!-- Speculation Rules API (Chrome 143+, Chromium 2025)
	     Rules loaded from external JSON file for easier maintenance
	     and programmatically via initializeSpeculationRules() in script -->
	<link rel="speculationrules" href="/speculation-rules.json" />

	<!-- Resource Priority Hints (Chrome 80+, optimized for Apple Silicon)
	     Prioritize loading critical components for LCP optimization -->
	<!-- Preconnect to font services for faster web font loading -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />

	<!-- DNS prefetch for external resources (fallback for older browsers) -->
	<link rel="dns-prefetch" href="https://fonts.googleapis.com" />

	<!-- Icons and critical images use fetchpriority="high" in components -->
	<!-- GPU-accelerated animations enabled via will-change in component CSS -->
</svelte:head>

<!-- Skip link for keyboard navigation -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Update notification -->
{#if $pwaState.hasUpdate}
	<div class="update-banner" role="alert">
		<p>A new version is available!</p>
		<button onclick={() => pwaStore.updateServiceWorker()}>Update Now</button>
	</div>
{/if}

<!-- Offline indicator -->
{#if $pwaState.isOffline}
	<div class="offline-indicator" role="status" aria-live="polite">
		You're offline - viewing cached content
	</div>
{/if}

<!-- Loading screen during data initialization -->
{#if $dataState.status === 'loading'}
	<div class="loading-screen" role="status" aria-busy="true" aria-live="polite">
		<div class="loading-content">
			<h1 class="loading-title">DMB Almanac</h1>
			<p class="loading-phase" id="loading-phase-label">{$dataState.progress.phase}</p>
			{#if $dataState.progress.entity}
				<p class="loading-entity">{$dataState.progress.entity}</p>
			{/if}
			<div
				class="progress-bar"
				role="progressbar"
				aria-valuenow={Math.round($dataState.progress.percentage)}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-labelledby="loading-phase-label"
				aria-valuetext="{$dataState.progress.percentage.toFixed(1)}% complete"
			>
				<div class="progress-fill" style="--fill: {$dataState.progress.percentage / 100}"></div>
			</div>
			<p class="loading-percentage" aria-hidden="true">{$dataState.progress.percentage.toFixed(1)}%</p>
		</div>
	</div>
{:else if $dataState.status === 'error'}
	<div class="error-screen">
		<h1>Unable to Load Data</h1>
		<p>{$dataState.progress.error || 'An unknown error occurred'}</p>
		<button onclick={() => dataStore.retry()}>Try Again</button>
	</div>
{:else}
	<!-- Main app content -->
	<div class="app-wrapper">
		<!-- Scroll progress bar (Chrome 115+ scroll-driven animation) -->
		<ScrollProgressBar variant="gradient" color="primary" height={3} />

		<Header />

		<main id="main-content" tabindex="-1">
			{@render children()}
		</main>

		<Footer />

		<!-- PWA Status Components -->
		<div class="pwa-status-container">
			<DataFreshnessIndicator />
		</div>
		<StorageQuotaMonitor />
	</div>
{/if}

<style>
	/* Skip link - visually hidden until focused */
	.skip-link {
		position: absolute;
		top: -100%;
		left: 50%;
		transform: translateX(-50%);
		padding: var(--space-3) var(--space-6);
		background: var(--color-primary-600);
		color: white;
		border-radius: var(--radius-lg);
		font-weight: var(--font-medium);
		text-decoration: none;
		z-index: 10001;
		transition: top 0.2s ease;
	}

	.skip-link:focus {
		top: var(--space-4);
		outline: 2px solid white;
		outline-offset: 2px;
	}

	/* Update banner */
	.update-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		background: var(--color-primary-600);
		color: white;
		z-index: 9999;
	}

	.update-banner button {
		padding: var(--space-2) var(--space-4);
		background: white;
		color: var(--color-primary-600);
		border: none;
		border-radius: var(--radius-md);
		font-weight: var(--font-medium);
		cursor: pointer;
	}

	/* Offline indicator */
	.offline-indicator {
		position: fixed;
		bottom: var(--space-4);
		left: 50%;
		transform: translateX(-50%);
		padding: var(--space-2) var(--space-4);
		background: var(--color-gray-800);
		color: var(--foreground);
		border-radius: var(--radius-full);
		font-size: var(--text-sm);
		z-index: 9998;
	}

	/* Loading screen */
	.loading-screen {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--background);
		z-index: 10000;
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-8);
		max-width: 400px;
		text-align: center;
	}

	.loading-title {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		background: var(--gradient-text-gold);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.loading-phase {
		font-size: var(--text-lg);
		color: var(--foreground-secondary);
		text-transform: capitalize;
	}

	.loading-entity {
		font-size: var(--text-sm);
		color: var(--foreground-muted);
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: var(--background-secondary);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		width: 100%;
		background: var(--color-primary-500);
		/* GPU-accelerated: Use scaleX instead of width */
		transform-origin: left center;
		transform: scaleX(var(--fill, 0));
		transition: transform 0.3s ease-out;
	}

	.loading-percentage {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: var(--color-primary-500);
	}

	/* Error screen */
	.error-screen {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-8);
		background: var(--background);
		text-align: center;
	}

	.error-screen h1 {
		font-size: var(--text-2xl);
		color: var(--color-error);
	}

	.error-screen button {
		padding: var(--space-3) var(--space-6);
		background: var(--color-primary-600);
		color: white;
		border: none;
		border-radius: var(--radius-lg);
		font-weight: var(--font-medium);
		cursor: pointer;
	}

	/* App wrapper */
	.app-wrapper {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	/* Main content */
	main {
		flex: 1;
	}

	main:focus {
		outline: none;
	}

	main:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: -2px;
	}

	/* PWA Status Components */
	.pwa-status-container {
		position: fixed;
		bottom: var(--space-4);
		right: var(--space-4);
		z-index: 100;
	}
</style>
