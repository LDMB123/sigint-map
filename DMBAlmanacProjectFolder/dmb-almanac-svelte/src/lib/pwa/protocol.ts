/**
 * Protocol Handler Registration for DMB Almanac PWA
 * Registers web+dmb:// protocol handler for deep linking
 *
 * Supported protocol patterns:
 * - web+dmb://show/{date}       - Navigate to show details (YYYY-MM-DD)
 * - web+dmb://song/{slug}       - Navigate to song details
 * - web+dmb://venue/{id}        - Navigate to venue details
 * - web+dmb://guest/{id}        - Navigate to guest musician details
 * - web+dmb://tour/{id}         - Navigate to tour details
 * - web+dmb://search/{query}    - Navigate to search results
 *
 * Usage:
 * ```typescript
 * import { protocolHandler } from '$lib/pwa/protocol';
 *
 * // Initialize registration
 * protocolHandler.initialize();
 *
 * // Subscribe to registration state
 * protocolHandler.subscribe((state) => {
 *   console.log('Registered:', state.isRegistered);
 * });
 *
 * // Manually trigger registration prompt
 * await protocolHandler.register();
 * ```
 *
 * External usage:
 * ```html
 * <a href="web+dmb://show/1991-03-23">View show from March 23, 1991</a>
 * <a href="web+dmb://song/ants-marching">View Ants Marching</a>
 * ```
 */

import { browser } from '$app/environment';

export interface ProtocolHandlerState {
	isSupported: boolean;
	isRegistered: boolean;
	protocol: string;
	url: string;
	error: string | null;
}

const PROTOCOL = 'web+dmb';
// Must match the URL pattern in manifest.json
const HANDLER_URL = '/protocol?uri=%s';
const STORAGE_KEY = 'pwa-protocol-registered';

/**
 * Protocol Handler Manager - Centralized service for protocol registration
 */
export const protocolHandler = {
	listeners: new Set<(state: ProtocolHandlerState) => void>(),
	state: {
		isSupported: false,
		isRegistered: false,
		protocol: PROTOCOL,
		url: HANDLER_URL,
		error: null,
	} as ProtocolHandlerState,

	/**
	 * Initialize protocol handler registration
	 * Should be called once on app startup
	 */
	initialize() {
		if (!browser) return;

		// Check if protocol handlers are supported
		this.checkSupport();

		// Auto-register if supported and not already registered
		if (this.state.isSupported && !this.state.isRegistered) {
			this.register().catch((err) => {
				console.warn('[Protocol] Auto-registration failed:', err);
			});
		}

		console.log('[Protocol] Manager initialized', this.state);
	},

	/**
	 * Check if protocol handlers are supported
	 */
	checkSupport() {
		if (!browser) {
			this.state.isSupported = false;
			this.notifyListeners();
			return;
		}

		// Check for navigator.registerProtocolHandler support
		const hasProtocolHandlerAPI = 'registerProtocolHandler' in navigator;

		// Check if already registered (from localStorage)
		const wasRegistered = localStorage.getItem(STORAGE_KEY) === 'true';

		this.state.isSupported = hasProtocolHandlerAPI;
		this.state.isRegistered = hasProtocolHandlerAPI && wasRegistered;

		if (!hasProtocolHandlerAPI) {
			this.state.error = 'Protocol handlers are not supported in this browser';
			console.warn('[Protocol] Not supported in this browser');
		}

		this.notifyListeners();
	},

	/**
	 * Register the protocol handler
	 * This will prompt the user (in some browsers) to allow the registration
	 */
	async register(): Promise<boolean> {
		if (!browser || !this.state.isSupported) {
			console.warn('[Protocol] Cannot register: not supported');
			return false;
		}

		try {
			// Construct the full handler URL
			const handlerUrl = new URL(HANDLER_URL, window.location.origin).toString();

			// Register the protocol handler
			// Note: This may throw in some browsers if the protocol is not whitelisted
			// or if the URL pattern is invalid
			navigator.registerProtocolHandler(
				PROTOCOL,
				handlerUrl
			);

			// Mark as registered
			this.state.isRegistered = true;
			this.state.error = null;
			localStorage.setItem(STORAGE_KEY, 'true');

			console.log('[Protocol] Successfully registered:', {
				protocol: PROTOCOL,
				url: handlerUrl,
			});

			this.notifyListeners();
			return true;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.state.error = errorMessage;
			this.state.isRegistered = false;

			console.error('[Protocol] Registration failed:', error);
			this.notifyListeners();
			return false;
		}
	},

	/**
	 * Unregister the protocol handler
	 * Note: Most browsers don't support unregistration programmatically
	 */
	unregister() {
		if (!browser) return;

		// Clear registration state
		this.state.isRegistered = false;
		localStorage.removeItem(STORAGE_KEY);

		console.log('[Protocol] Marked as unregistered (manual unregistration may be required in browser settings)');
		this.notifyListeners();
	},

	/**
	 * Subscribe to protocol handler state changes
	 */
	subscribe(callback: (state: ProtocolHandlerState) => void) {
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
	getState(): ProtocolHandlerState {
		return { ...this.state };
	},

	/**
	 * Create a protocol URL for a given resource
	 */
	createUrl(resource: 'show' | 'song' | 'venue' | 'guest' | 'tour' | 'search', identifier: string): string {
		return `${PROTOCOL}://${resource}/${identifier}`;
	},

	/**
	 * Parse a protocol URL and extract resource type and identifier
	 */
	parseUrl(protocolUrl: string): { resource: string; identifier: string } | null {
		if (!protocolUrl.startsWith(`${PROTOCOL}://`)) {
			return null;
		}

		const cleanUrl = protocolUrl.replace(`${PROTOCOL}://`, '');
		const [resource, ...rest] = cleanUrl.split('/');
		const identifier = rest.join('/');

		if (!resource || !identifier) {
			return null;
		}

		return { resource, identifier };
	},

	/**
	 * Test if a URL is a valid protocol URL
	 */
	isProtocolUrl(url: string): boolean {
		return url.startsWith(`${PROTOCOL}://`);
	},

	/**
	 * Handle incoming protocol URL (for use in app routing)
	 * This is called by the /protocol route to process incoming links
	 */
	handleProtocolUrl(protocolUrl: string): string | null {
		const parsed = this.parseUrl(protocolUrl);
		if (!parsed) return null;

		const { resource, identifier } = parsed;

		// Map protocol resources to app routes
		// Security: These routes are validated in +page.ts
		switch (resource.toLowerCase()) {
			case 'show':
				return `/shows/${identifier}`;
			case 'song':
				return `/songs/${identifier}`;
			case 'venue':
				return `/venues/${identifier}`;
			case 'guest':
				return `/guests/${identifier}`;
			case 'tour':
				return `/tours/${identifier}`;
			case 'search':
				return `/search?q=${encodeURIComponent(identifier)}`;
			default:
				return null;
		}
	},
};

/**
 * Feature detection helper
 */
export function isProtocolHandlerSupported(): boolean {
	return browser && 'registerProtocolHandler' in navigator;
}

/**
 * Helper to check platform-specific limitations
 */
export function getProtocolHandlerCapabilities(): {
	supported: boolean;
	platform: 'chromium' | 'firefox' | 'safari' | 'unknown';
	notes: string[];
} {
	if (!browser) {
		return {
			supported: false,
			platform: 'unknown',
			notes: ['Not running in browser environment'],
		};
	}

	const ua = navigator.userAgent;
	const notes: string[] = [];
	let platform: 'chromium' | 'firefox' | 'safari' | 'unknown' = 'unknown';

	// Detect browser
	if (/Chrome|Chromium|Edg/.test(ua)) {
		platform = 'chromium';
		notes.push('Chrome/Chromium supports protocol handlers since version 96+');
		notes.push('Registration is instant and requires no user confirmation');
	} else if (/Firefox/.test(ua)) {
		platform = 'firefox';
		notes.push('Firefox supports protocol handlers with user confirmation');
		notes.push('User will be prompted to allow the registration');
	} else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
		platform = 'safari';
		notes.push('Safari has limited support for protocol handlers');
		notes.push('May require macOS-level protocol registration');
	}

	const supported = 'registerProtocolHandler' in navigator;

	if (!supported) {
		notes.push('Protocol handlers are not supported in this browser');
	}

	return { supported, platform, notes };
}
