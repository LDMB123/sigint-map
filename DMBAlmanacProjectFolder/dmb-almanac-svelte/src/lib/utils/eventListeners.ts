/**
 * Event Listener Cleanup Utilities
 *
 * Prevents memory leaks from unremoved event listeners by providing
 * utilities that leverage AbortController (Chrome 90+) and proper cleanup patterns.
 *
 * @module utils/eventListeners
 * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortController
 */

/**
 * Event controller return type
 */
export interface EventController {
	/** AbortSignal to pass to addEventListener options */
	signal: AbortSignal;
	/** Cleanup function that aborts all listeners using this signal */
	cleanup: () => void;
}

/**
 * Event tracker for debugging listener leaks
 */
export interface EventTracker {
	/** Add a cleanup function to track */
	add: (cleanup: () => void) => void;
	/** Cleanup all tracked listeners */
	cleanupAll: () => void;
	/** Current count of tracked listeners */
	readonly count: number;
}

/**
 * Creates an AbortController-based event controller for cleanup.
 *
 * Modern approach using AbortController (Chrome 90+, Safari 15+, Firefox 90+).
 * Automatically removes all event listeners when cleanup() is called.
 *
 * @example
 * ```typescript
 * const { signal, cleanup } = createEventController();
 *
 * window.addEventListener('resize', handler, { signal, passive: true });
 * window.addEventListener('scroll', handler, { signal, passive: true });
 *
 * // Remove all listeners at once
 * cleanup();
 * ```
 *
 * @returns EventController with signal and cleanup function
 */
export function createEventController(): EventController {
	const controller = new AbortController();

	return {
		signal: controller.signal,
		cleanup: () => {
			controller.abort();
		}
	};
}

/**
 * Adds an event listener with automatic cleanup support.
 * Returns a cleanup function for use in Svelte's onMount or $effect.
 *
 * This is the recommended approach for Svelte components using onMount.
 * For Svelte 5 $effect, consider using the useEventCleanup hook instead.
 *
 * @example
 * ```svelte
 * <script>
 *   import { onMount } from 'svelte';
 *   import { useEventListener } from '$lib/utils/eventListeners';
 *
 *   onMount(() => {
 *     const cleanup = useEventListener(
 *       window,
 *       'resize',
 *       () => console.log('resized'),
 *       { passive: true }
 *     );
 *
 *     return cleanup; // Svelte calls this on unmount
 *   });
 * </script>
 * ```
 *
 * @param target - Event target (Window, Document, or HTMLElement)
 * @param event - Event name
 * @param handler - Event handler function
 * @param options - AddEventListener options (passive, capture, etc.)
 * @returns Cleanup function that removes the listener
 */
export function useEventListener<K extends keyof WindowEventMap>(
	target: Window,
	event: K,
	handler: (e: WindowEventMap[K]) => void,
	options?: AddEventListenerOptions
): () => void;

export function useEventListener<K extends keyof DocumentEventMap>(
	target: Document,
	event: K,
	handler: (e: DocumentEventMap[K]) => void,
	options?: AddEventListenerOptions
): () => void;

export function useEventListener<K extends keyof HTMLElementEventMap>(
	target: HTMLElement,
	event: K,
	handler: (e: HTMLElementEventMap[K]) => void,
	options?: AddEventListenerOptions
): () => void;

export function useEventListener(
	target: Window | Document | HTMLElement,
	event: string,
	handler: (e: Event) => void,
	options?: AddEventListenerOptions
): () => void {
	// Add the listener
	target.addEventListener(event, handler, options);

	// Return cleanup function
	return () => {
		target.removeEventListener(event, handler, options);
	};
}

/**
 * Creates an event tracker for debugging listener leaks.
 *
 * Useful for identifying components that aren't properly cleaning up listeners.
 * Can be used in development to track listener counts and detect leaks.
 *
 * @example
 * ```typescript
 * const tracker = createEventTracker();
 *
 * // In component lifecycle
 * const cleanup1 = useEventListener(window, 'resize', handler);
 * tracker.add(cleanup1);
 *
 * const cleanup2 = useEventListener(window, 'scroll', handler);
 * tracker.add(cleanup2);
 *
 * console.log('Active listeners:', tracker.count); // 2
 *
 * // Cleanup all at once
 * tracker.cleanupAll();
 * console.log('Active listeners:', tracker.count); // 0
 * ```
 *
 * @returns EventTracker instance
 */
export function createEventTracker(): EventTracker {
	const cleanupFunctions: (() => void)[] = [];

	return {
		add(cleanup: () => void) {
			cleanupFunctions.push(cleanup);
		},

		cleanupAll() {
			cleanupFunctions.forEach((fn) => fn());
			cleanupFunctions.length = 0; // Clear array
		},

		get count() {
			return cleanupFunctions.length;
		}
	};
}

/**
 * Creates a MediaQueryList listener with automatic cleanup.
 *
 * Handles both modern addEventListener and legacy addListener APIs.
 *
 * @example
 * ```typescript
 * const cleanup = useMediaQueryListener(
 *   window.matchMedia('(prefers-color-scheme: dark)'),
 *   (e) => console.log('Dark mode:', e.matches)
 * );
 *
 * // Later...
 * cleanup();
 * ```
 *
 * @param mediaQuery - MediaQueryList to listen to
 * @param handler - Handler function for change events
 * @returns Cleanup function
 */
export function useMediaQueryListener(
	mediaQuery: MediaQueryList,
	handler: (event: MediaQueryListEvent) => void
): () => void {
	// Modern browsers support addEventListener
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener('change', handler);
		return () => {
			mediaQuery.removeEventListener('change', handler);
		};
	}

	// Legacy fallback for older browsers
	mediaQuery.addListener(handler);
	return () => {
		mediaQuery.removeListener(handler);
	};
}

/**
 * Advanced: Creates a listener pool for managing multiple event targets.
 * Useful for dynamic lists where elements are added/removed frequently.
 *
 * @example
 * ```typescript
 * const pool = createListenerPool();
 *
 * // Add listeners for multiple elements
 * items.forEach(item => {
 *   pool.add(item.element, 'click', handleClick);
 * });
 *
 * // Remove specific element's listeners
 * pool.remove(removedElement);
 *
 * // Cleanup all listeners
 * pool.cleanupAll();
 * ```
 *
 * @returns Listener pool with add, remove, and cleanup methods
 */
export function createListenerPool() {
	const listeners = new Map<
		EventTarget,
		Array<{
			event: string;
			handler: EventListener;
			options?: AddEventListenerOptions;
		}>
	>();

	return {
		/**
		 * Add a listener to the pool
		 */
		add(
			target: EventTarget,
			event: string,
			handler: EventListener,
			options?: AddEventListenerOptions
		): void {
			target.addEventListener(event, handler, options);

			const targetListeners = listeners.get(target) || [];
			targetListeners.push({ event, handler, options });
			listeners.set(target, targetListeners);
		},

		/**
		 * Remove all listeners for a specific target
		 */
		remove(target: EventTarget): void {
			const targetListeners = listeners.get(target);
			if (!targetListeners) return;

			targetListeners.forEach(({ event, handler, options }) => {
				target.removeEventListener(event, handler, options);
			});

			listeners.delete(target);
		},

		/**
		 * Cleanup all listeners in the pool
		 */
		cleanupAll(): void {
			listeners.forEach((targetListeners, target) => {
				targetListeners.forEach(({ event, handler, options }) => {
					target.removeEventListener(event, handler, options);
				});
			});
			listeners.clear();
		},

		/**
		 * Get count of tracked targets
		 */
		get targetCount(): number {
			return listeners.size;
		},

		/**
		 * Get total listener count across all targets
		 */
		get listenerCount(): number {
			let count = 0;
			listeners.forEach((targetListeners) => {
				count += targetListeners.length;
			});
			return count;
		}
	};
}

/**
 * Debounced event listener with automatic cleanup.
 * Prevents excessive handler calls for high-frequency events like scroll/resize.
 *
 * @example
 * ```typescript
 * const cleanup = useDebouncedEventListener(
 *   window,
 *   'resize',
 *   () => console.log('Window resized!'),
 *   { delay: 300, passive: true }
 * );
 * ```
 *
 * @param target - Event target
 * @param event - Event name
 * @param handler - Event handler
 * @param options - Options including debounce delay and addEventListener options
 * @returns Cleanup function
 */
export function useDebouncedEventListener<K extends keyof WindowEventMap>(
	target: Window,
	event: K,
	handler: (e: WindowEventMap[K]) => void,
	options?: AddEventListenerOptions & { delay?: number }
): () => void;

export function useDebouncedEventListener<K extends keyof DocumentEventMap>(
	target: Document,
	event: K,
	handler: (e: DocumentEventMap[K]) => void,
	options?: AddEventListenerOptions & { delay?: number }
): () => void;

export function useDebouncedEventListener<K extends keyof HTMLElementEventMap>(
	target: HTMLElement,
	event: K,
	handler: (e: HTMLElementEventMap[K]) => void,
	options?: AddEventListenerOptions & { delay?: number }
): () => void;

export function useDebouncedEventListener(
	target: EventTarget,
	event: string,
	handler: (e: Event) => void,
	options?: AddEventListenerOptions & { delay?: number }
): () => void {
	const delay = options?.delay ?? 250;
	let timeoutId: number | undefined;

	const debouncedHandler = (e: Event) => {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		timeoutId = window.setTimeout(() => handler(e), delay);
	};

	// Extract addEventListener options (exclude delay)
	const { delay: _delay, ...listenerOptions } = options || {};

	target.addEventListener(event, debouncedHandler, listenerOptions);

	return () => {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		target.removeEventListener(event, debouncedHandler, listenerOptions);
	};
}
