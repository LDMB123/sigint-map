/**
 * Install Prompt Manager for DMB Almanac PWA
 * Handles beforeinstallprompt event capture, timing logic, and dismissal tracking
 *
 * Usage:
 * ```typescript
 * import { installManager } from '$lib/pwa/install-manager';
 *
 * // Subscribe to install availability
 * const unsubscribe = installManager.subscribe((state) => {
 *   console.log('Can install:', state.canInstall);
 *   console.log('Is installed:', state.isInstalled);
 * });
 *
 * // Trigger install prompt
 * if (state.canInstall) {
 *   installManager.promptInstall();
 * }
 * ```
 */

import { browser } from '$app/environment';

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
		platform: string;
	}>;
	prompt(): Promise<void>;
}

export interface InstallPromptState {
	canInstall: boolean;
	isInstalled: boolean;
	isDismissed: boolean;
	dismissalRemainsMs: number;
	hasScrolled: boolean;
	isIOSSafari: boolean;
	userChoice: 'accepted' | 'dismissed' | 'unknown';
}

const DISMISS_KEY = 'pwa-install-dismiss-time';
const SCROLL_KEY = 'pwa-install-scroll';
const DEFAULT_DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_TIME_ON_SITE_MS = 5000; // 5 seconds
const SCROLL_THRESHOLD = 200; // pixels

/**
 * Install Manager - Centralized service for app installation prompts
 */
export const installManager = {
	deferredPrompt: null as BeforeInstallPromptEvent | null,
	listeners: new Set<(state: InstallPromptState) => void>(),
	state: {
		canInstall: false,
		isInstalled: false,
		isDismissed: false,
		dismissalRemainsMs: 0,
		hasScrolled: false,
		isIOSSafari: false,
		userChoice: 'unknown',
	} as InstallPromptState,
	timeOnSiteMs: DEFAULT_TIME_ON_SITE_MS,
	siteEnteredTime: Date.now(),

	// Initialization guard and cleanup tracking
	isInitialized: false,
	cleanups: [] as Array<() => void>,

	/**
	 * Initialize install manager
	 * Should be called once on app startup
	 * Safe to call multiple times - previous listeners will be cleaned up
	 */
	initialize(options?: { timeOnSiteMs?: number; dismissDurationMs?: number }) {
		if (!browser) return;

		// Clean up previous listeners if already initialized
		if (this.isInitialized) {
			console.log('[Install] Re-initializing - cleaning up previous listeners');
			this.deinitialize();
		}

		this.timeOnSiteMs = options?.timeOnSiteMs || DEFAULT_TIME_ON_SITE_MS;

		// Check if already installed
		this.updateInstallStatus();

		// Capture beforeinstallprompt event
		const beforeInstallCleanup = this.setupBeforeInstallPromptListener();
		if (beforeInstallCleanup) this.cleanups.push(beforeInstallCleanup);

		// Listen for app installation
		const appInstalledCleanup = this.setupAppInstalledListener();
		if (appInstalledCleanup) this.cleanups.push(appInstalledCleanup);

		// Track scroll for more intelligent timing
		const scrollCleanup = this.setupScrollListener();
		if (scrollCleanup) this.cleanups.push(scrollCleanup);

		// Check dismissal status
		this.updateDismissalStatus(options?.dismissDurationMs);

		// Mark as initialized
		this.isInitialized = true;

		// Log state
		console.log('[Install] Manager initialized', this.state);
	},

	/**
	 * Deinitialize install manager and clean up all listeners
	 * Useful for hot reloading or cleanup before re-initialization
	 */
	deinitialize() {
		this.cleanups.forEach((cleanup) => {
			try {
				cleanup();
			} catch (error) {
				console.error('[Install] Error during cleanup:', error);
			}
		});
		this.cleanups = [];
		this.isInitialized = false;
		console.log('[Install] Manager deinitialized');
	},

	/**
	 * Update installation status from display mode
	 */
	updateInstallStatus() {
		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone ===
				true;

		this.state.isInstalled = isStandalone;
		this.notifyListeners();
	},

	/**
	 * Check and update dismissal status
	 */
	updateDismissalStatus(dismissDurationMs: number = DEFAULT_DISMISS_DURATION_MS) {
		const dismissedTime = localStorage.getItem(DISMISS_KEY);

		if (dismissedTime) {
			const dismissedTimestamp = parseInt(dismissedTime, 10);
			const now = Date.now();
			const elapsed = now - dismissedTimestamp;

			if (elapsed < dismissDurationMs) {
				this.state.isDismissed = true;
				this.state.dismissalRemainsMs = dismissDurationMs - elapsed;
			} else {
				// Dismissal period expired
				localStorage.removeItem(DISMISS_KEY);
				this.state.isDismissed = false;
				this.state.dismissalRemainsMs = 0;
			}
		}

		this.notifyListeners();
	},

	/**
	 * Setup listener for beforeinstallprompt event
	 */
	setupBeforeInstallPromptListener() {
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			this.deferredPrompt = e as BeforeInstallPromptEvent;
			this.state.canInstall = !this.state.isInstalled && !this.state.isDismissed;

			console.log('[Install] beforeinstallprompt captured', {
				platforms: this.deferredPrompt?.platforms,
				canInstall: this.state.canInstall,
			});

			this.notifyListeners();
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	},

	/**
	 * Setup listener for appinstalled event
	 */
	setupAppInstalledListener() {
		const handleAppInstalled = () => {
			console.log('[Install] App installed successfully');
			this.state.isInstalled = true;
			this.state.canInstall = false;
			this.deferredPrompt = null;
			this.notifyListeners();
		};

		window.addEventListener('appinstalled', handleAppInstalled);

		return () => {
			window.removeEventListener('appinstalled', handleAppInstalled);
		};
	},

	/**
	 * Setup scroll listener to track user engagement
	 */
	setupScrollListener() {
		let hasScrolled = false;

		const handleScroll = () => {
			if (!hasScrolled && window.scrollY > SCROLL_THRESHOLD) {
				hasScrolled = true;
				this.state.hasScrolled = true;
				localStorage.setItem(SCROLL_KEY, 'true');
				this.notifyListeners();
			}
		};

		window.addEventListener('scroll', handleScroll, { passive: true });

		// Check if already scrolled in this session
		if (localStorage.getItem(SCROLL_KEY) === 'true') {
			this.state.hasScrolled = true;
		}

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	},

	/**
	 * Detect iOS Safari for special handling
	 */
	detectIOSSafari() {
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isSafari =
			/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
		this.state.isIOSSafari = isIOS && isSafari;
		this.notifyListeners();
	},

	/**
	 * Trigger the install prompt
	 */
	async promptInstall(): Promise<'accepted' | 'dismissed'> {
		if (!this.deferredPrompt) {
			console.warn('[Install] No deferred prompt available');
			return 'dismissed';
		}

		try {
			await this.deferredPrompt.prompt();

			const choiceResult = await this.deferredPrompt.userChoice;
			this.state.userChoice = choiceResult.outcome;

			console.log('[Install] User choice:', choiceResult.outcome);

			if (choiceResult.outcome === 'dismissed') {
				this.markDismissed();
			} else if (choiceResult.outcome === 'accepted') {
				this.state.isInstalled = true;
				this.state.canInstall = false;
			}

			this.notifyListeners();
			return choiceResult.outcome;
		} catch (error) {
			console.error('[Install] Prompt failed:', error);
			return 'dismissed';
		}
	},

	/**
	 * Mark install prompt as dismissed
	 */
	markDismissed(dismissDurationMs: number = DEFAULT_DISMISS_DURATION_MS) {
		localStorage.setItem(DISMISS_KEY, String(Date.now()));
		this.state.isDismissed = true;
		this.state.dismissalRemainsMs = dismissDurationMs;
		this.state.canInstall = false;

		console.log('[Install] Marked dismissed for', dismissDurationMs, 'ms');
		this.notifyListeners();
	},

	/**
	 * Reset dismissal to show prompt again
	 */
	resetDismissal() {
		localStorage.removeItem(DISMISS_KEY);
		this.state.isDismissed = false;
		this.state.dismissalRemainsMs = 0;

		if (this.deferredPrompt && !this.state.isInstalled) {
			this.state.canInstall = true;
		}

		console.log('[Install] Dismissal reset, prompt available again');
		this.notifyListeners();
	},

	/**
	 * Subscribe to install state changes
	 */
	subscribe(callback: (state: InstallPromptState) => void) {
		this.listeners.add(callback);

		// Call immediately with current state
		callback(this.state);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(callback);
		};
	},

	/**
	 * Notify all listeners of state changes
	 */
	notifyListeners() {
		this.listeners.forEach((callback) => callback(this.state));
	},

	/**
	 * Get current state
	 */
	getState(): InstallPromptState {
		return { ...this.state };
	},

	/**
	 * Check if prompt should be shown based on heuristics
	 */
	shouldShowPrompt(options?: {
		requireScroll?: boolean;
		minTimeOnSiteMs?: number;
	}): boolean {
		const requireScroll = options?.requireScroll || false;
		const minTimeOnSite = options?.minTimeOnSiteMs || this.timeOnSiteMs;

		// Don't show if already installed or dismissed
		if (this.state.isInstalled || this.state.isDismissed || !this.state.canInstall) {
			return false;
		}

		// Check time on site if required
		const timeElapsed = Date.now() - this.siteEnteredTime;
		if (timeElapsed < minTimeOnSite) {
			return false;
		}

		// Check scroll if required
		if (requireScroll && !this.state.hasScrolled) {
			return false;
		}

		return true;
	},
};
