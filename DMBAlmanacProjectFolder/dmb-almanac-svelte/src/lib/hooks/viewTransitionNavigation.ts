/**
 * View Transition Navigation Hook
 * Integrates View Transitions API with SvelteKit navigation
 *
 * Chromium 143+ - Cross-document view transitions
 * Enhanced with document.activeViewTransition support
 * https://developer.chrome.com/blog/cross-document-view-transitions
 *
 * Apple Silicon Optimization:
 * - All transitions run on Metal GPU via ANGLE
 * - GPU-composited properties only (transform, opacity)
 * - No layout thrashing during animations
 * - Optimized for 120Hz ProMotion displays
 */

import { startViewTransition } from '$lib/utils/viewTransitions';
import type { BeforeNavigate } from '@sveltejs/kit';

/**
 * Navigation transition configuration
 */
export interface NavigationTransitionConfig {
	/** Enable view transitions for this navigation */
	enabled: boolean;
	/** Transition type: 'fade', 'slide-left', 'slide-right', 'zoom-in' */
	type: 'fade' | 'slide-left' | 'slide-right' | 'zoom-in';
	/** Animation duration in milliseconds */
	duration: number;
	/** CSS easing function */
	easing: string;
	/** Timestamp when the transition was initiated (optional) */
	initiatedAt?: number;
}

/**
 * Default navigation transition config
 * Optimized for Apple Silicon + Metal backend
 */
export const defaultTransitionConfig: NavigationTransitionConfig = {
	enabled: true,
	type: 'fade',
	duration: 200,
	easing: 'cubic-bezier(0.4, 0, 0.2, 1)' // --ease-apple
};

/**
 * Route-specific transition configurations
 * Maps path patterns to transition configs
 * Optimized for DMB Almanac routes
 */
export const routeTransitionMap = new Map<string | RegExp, NavigationTransitionConfig>();

// Initialize route transitions
// Home and main pages: quick fade
routeTransitionMap.set('/', { enabled: true, type: 'fade', duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });

// Shows list/detail navigation: slide for forward, zoom for detail view
routeTransitionMap.set(/^\/shows$/, { enabled: true, type: 'slide-left', duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
routeTransitionMap.set(/^\/shows\//, { enabled: true, type: 'zoom-in', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });

// Songs list/detail: slide for list, zoom for detail
routeTransitionMap.set(/^\/songs$/, { enabled: true, type: 'slide-left', duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
routeTransitionMap.set(/^\/songs\//, { enabled: true, type: 'zoom-in', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });

// Venues navigation
routeTransitionMap.set(/^\/venues$/, { enabled: true, type: 'slide-left', duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
routeTransitionMap.set(/^\/venues\//, { enabled: true, type: 'zoom-in', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });

// Tours and guests
routeTransitionMap.set(/^\/tours/, { enabled: true, type: 'slide-left', duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
routeTransitionMap.set(/^\/guests$/, { enabled: true, type: 'slide-left', duration: 250, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
routeTransitionMap.set(/^\/guests\//, { enabled: true, type: 'zoom-in', duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });

// Visualizations: chart transitions are smooth
routeTransitionMap.set(/^\/visualizations/, { enabled: true, type: 'fade', duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });

// Info pages: subtle fade
routeTransitionMap.set(/^\/(about|faq|contact|protocol|liberation)/, { enabled: true, type: 'fade', duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });

// Search: quick transition
routeTransitionMap.set(/^\/search/, { enabled: true, type: 'slide-left', duration: 200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });

// Disable transitions for utility pages
routeTransitionMap.set(/^\/offline/, { enabled: false, type: 'fade', duration: 0, easing: 'ease' });

/**
 * Get transition config for a given path
 *
 * @param pathname - Current or target pathname
 * @param previousPathname - Previous pathname (for back navigation detection)
 * @returns Transition configuration
 */
export function getTransitionConfig(
	pathname: string,
	previousPathname?: string
): NavigationTransitionConfig {
	// Check for exact matches first
	if (routeTransitionMap.has(pathname)) {
		return routeTransitionMap.get(pathname)!;
	}

	// Check for regex matches
	for (const [pattern, config] of routeTransitionMap.entries()) {
		if (pattern instanceof RegExp && pattern.test(pathname)) {
			return config;
		}
	}

	// Use default if back navigation detected
	if (previousPathname) {
		// Simple heuristic: if path is shorter, likely going back
		if (pathname.length < previousPathname.length) {
			return {
				...defaultTransitionConfig,
				type: 'slide-right'
			};
		}
	}

	return defaultTransitionConfig;
}

/**
 * Get transition type based on navigation direction
 *
 * @param fromPath - Source path
 * @param toPath - Destination path
 * @returns Appropriate transition type
 */
export function detectNavigationDirection(
	fromPath: string,
	toPath: string
): 'slide-left' | 'slide-right' | 'fade' {
	// Heuristics for forward/back detection
	const fromDepth = (fromPath.match(/\//g) || []).length;
	const toDepth = (toPath.match(/\//g) || []).length;

	// Drill down = forward (slide-left)
	if (toDepth > fromDepth) {
		return 'slide-left';
	}

	// Go up = back (slide-right)
	if (toDepth < fromDepth) {
		return 'slide-right';
	}

	// Same level = fade
	return 'fade';
}

/**
 * Setup view transition for SvelteKit beforeNavigate hook
 * Should be called in +layout.svelte
 *
 * Integrates with document.activeViewTransition (Chrome 143+)
 * to track and manage transitions across pages
 *
 * @example
 * import { beforeNavigate } from '$app/navigation';
 * import { setupViewTransitionNavigation } from '$lib/hooks/viewTransitionNavigation';
 *
 * beforeNavigate(setupViewTransitionNavigation);
 */
export function setupViewTransitionNavigation(event: BeforeNavigate): void {
	// Don't transition for programmatic navigation without user interaction
	if (!event.from || event.willUnload) {
		return;
	}

	const fromPath = event.from.url.pathname;
	const toPath = event.to!.url.pathname;

	// Check if we should transition
	const config = getTransitionConfig(toPath, fromPath);

	if (!config.enabled) {
		return;
	}

	// Store transition config for page to use
	if (typeof window !== 'undefined') {
		const transitionData = {
			...config,
			fromPath,
			toPath,
			direction: detectNavigationDirection(fromPath, toPath),
			initiatedAt: performance.now()
		};

		(window as any).__viewTransitionConfig = transitionData;

		// Log transition in development
		if (import.meta.env.DEV) {
			console.debug('[ViewTransitions]', {
				type: config.type,
				duration: config.duration,
				direction: transitionData.direction,
				from: fromPath,
				to: toPath
			});
		}
	}
}

/**
 * Start named view transition for specific element
 * Useful for card clicks, image galleries, etc.
 *
 * Supports Chrome 143+ document.activeViewTransition for monitoring
 *
 * @param elementName - Name of view-transition-name element
 * @param callback - Navigation callback
 * @param transitionType - Optional override of transition type
 *
 * @example
 * // In a card component:
 * onclick={async () => {
 *   await startElementTransition('card', () => navigate(`/shows/${show.id}`), 'zoom-in');
 * }}
 */
export async function startElementTransition(
	elementName: string,
	callback: () => void | Promise<void>,
	transitionType?: 'fade' | 'slide-left' | 'slide-right' | 'zoom-in'
): Promise<void> {
	const transition = startViewTransition(callback, transitionType || 'fade');

	if (!transition) {
		// Fallback for browsers without View Transitions
		await callback();
		return;
	}

	// Wait for transition to complete
	try {
		await transition.finished;
	} catch (error) {
		console.warn('[ViewTransitions] Transition error:', error);
		// Gracefully continue even if transition fails
	}
}

/**
 * Monitor active view transition lifecycle
 * Chrome 143+ provides document.activeViewTransition
 *
 * @returns Unsubscribe function
 * @example
 * import { onMount } from 'svelte';
 * import { monitorViewTransition } from '$lib/hooks/viewTransitionNavigation';
 *
 * onMount(() => {
 *   return monitorViewTransition((state) => {
 *     console.log('Transition state:', state);
 *   });
 * });
 */
export function monitorViewTransition(
	callback: (state: {
		phase: 'ready' | 'finished' | 'done';
		duration: number;
		activeTransition: any;
	}) => void
): () => void {
	if (typeof document === 'undefined') return () => {};

	let unsubscribe = () => {};

	const checkTransition = () => {
		const activeVT = (document as any).activeViewTransition;
		if (activeVT) {
			const startTime = performance.now();

			// Transition ready - pseudo-elements created
			activeVT.ready?.then(() => {
				callback({
					phase: 'ready',
					duration: performance.now() - startTime,
					activeTransition: activeVT
				});
			}).catch((err: any) => {
				console.warn('[ViewTransitions] ready promise rejected:', err);
			});

			// Transition finished - animation complete
			activeVT.finished?.then(() => {
				callback({
					phase: 'finished',
					duration: performance.now() - startTime,
					activeTransition: activeVT
				});
			}).catch((err: any) => {
				console.warn('[ViewTransitions] finished promise rejected:', err);
			});

			// Update callback done
			activeVT.updateCallbackDone?.then(() => {
				callback({
					phase: 'done',
					duration: performance.now() - startTime,
					activeTransition: activeVT
				});
			}).catch((err: any) => {
				console.warn('[ViewTransitions] updateCallbackDone promise rejected:', err);
			});
		}
	};

	// Check immediately if transition already active
	checkTransition();

	// Use requestAnimationFrame for efficient monitoring
	const observer = new MutationObserver(checkTransition);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-view-transition']
	});

	unsubscribe = () => {
		observer.disconnect();
	};

	return unsubscribe;
}

/**
 * Check if view transitions are enabled globally
 *
 * @param pathname - Optional path to check specific route
 * @returns true if transitions are enabled
 */
export function isViewTransitionsEnabled(pathname?: string): boolean {
	if (pathname) {
		const config = getTransitionConfig(pathname);
		return config.enabled;
	}

	// Check global setting
	if (typeof document !== 'undefined') {
		return typeof (document as any).startViewTransition === 'function';
	}

	return false;
}

/**
 * Disable view transitions for specific paths
 * Useful for admin or utility pages
 *
 * @param patterns - Glob patterns or regex patterns
 *
 * @example
 * disableTransitionsFor(['/admin/*', /^\/debug/]);
 */
export function disableTransitionsFor(patterns: (string | RegExp)[]): void {
	patterns.forEach((pattern) => {
		const key = typeof pattern === 'string' ? new RegExp(`^${pattern.replace(/\*/g, '.*')}$`) : pattern;
		routeTransitionMap.set(key, { ...defaultTransitionConfig, enabled: false });
	});
}

/**
 * Re-enable view transitions for specific paths
 *
 * @param patterns - Glob patterns or regex patterns
 */
export function enableTransitionsFor(patterns: (string | RegExp)[]): void {
	patterns.forEach((pattern) => {
		const key = typeof pattern === 'string' ? new RegExp(`^${pattern.replace(/\*/g, '.*')}$`) : pattern;
		if (routeTransitionMap.has(key)) {
			const config = routeTransitionMap.get(key)!;
			config.enabled = true;
		}
	});
}

/**
 * Get current view transition configuration
 * Useful for debugging and analytics
 *
 * @returns Current transition config or null
 */
export function getCurrentTransitionConfig(): NavigationTransitionConfig | null {
	if (typeof window === 'undefined') return null;
	return (window as any).__viewTransitionConfig ?? null;
}

/**
 * Measure active view transition performance
 * Returns timing info for analytics and optimization
 *
 * @returns Performance metrics or null if no active transition
 */
export function measureActiveTransition(): {
	initiatedAt: number;
	readyTime?: number;
	finishedTime?: number;
	totalDuration?: number;
	config: NavigationTransitionConfig | null;
} | null {
	if (typeof document === 'undefined') return null;

	const config = getCurrentTransitionConfig();
	const activeVT = (document as any).activeViewTransition;

	if (!activeVT) return null;

	return {
		initiatedAt: config?.initiatedAt ?? 0,
		config,
		readyTime: undefined,
		finishedTime: undefined,
		totalDuration: undefined
	};
}
