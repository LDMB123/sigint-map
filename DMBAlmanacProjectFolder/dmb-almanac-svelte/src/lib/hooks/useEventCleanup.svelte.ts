/**
 * useEventCleanup - Svelte 5 runes-based event listener management
 *
 * Provides automatic cleanup of event listeners using Svelte 5's $effect.
 * Automatically removes listeners when the component unmounts or when
 * dependencies change.
 *
 * @module hooks/useEventCleanup
 */

import { createEventController, createEventTracker } from '$lib/utils/eventListeners';
import type { EventController, EventTracker } from '$lib/utils/eventListeners';

/**
 * Creates a reactive event cleanup manager using Svelte 5 $effect.
 *
 * This composable handles event listener cleanup automatically when the
 * component unmounts. It uses AbortController for efficient batch cleanup.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useEventCleanup } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   const events = useEventCleanup();
 *
 *   $effect(() => {
 *     // All listeners automatically cleaned up on unmount
 *     window.addEventListener('resize', handleResize, { signal: events.signal, passive: true });
 *     window.addEventListener('scroll', handleScroll, { signal: events.signal, passive: true });
 *   });
 * </script>
 * ```
 *
 * @returns Event controller with signal for addEventListener
 */
export function useEventCleanup(): EventController {
	const controller = createEventController();

	// Cleanup when component unmounts
	$effect(() => () => {
			controller.cleanup();
		});

	return controller;
}

/**
 * Creates a tracked event manager for debugging listener leaks.
 * Provides visibility into active listener counts during development.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useTrackedEvents } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   const tracker = useTrackedEvents();
 *
 *   $effect(() => {
 *     const cleanup1 = () => window.removeEventListener('resize', handler);
 *     tracker.add(cleanup1);
 *
 *     const cleanup2 = () => window.removeEventListener('scroll', handler);
 *     tracker.add(cleanup2);
 *   });
 *
 *   // Access tracker.count in development to monitor listeners
 *   $inspect('Active listeners:', tracker.count);
 * </script>
 * ```
 *
 * @returns Event tracker with cleanup tracking
 */
export function useTrackedEvents(): EventTracker {
	const tracker = createEventTracker();

	// Cleanup all tracked listeners when component unmounts
	$effect(() => () => {
			tracker.cleanupAll();
		});

	return tracker;
}

/**
 * Reactive event listener that automatically attaches/detaches based on a condition.
 * Useful for conditional event listening (e.g., only listen when visible).
 *
 * @example
 * ```svelte
 * <script>
 *   import { useConditionalEvent } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   let isActive = $state(false);
 *
 *   useConditionalEvent(
 *     () => isActive,
 *     window,
 *     'scroll',
 *     handleScroll,
 *     { passive: true }
 *   );
 *
 *   // Listener only active when isActive is true
 * </script>
 * ```
 *
 * @param condition - Reactive function that returns boolean
 * @param target - Event target
 * @param event - Event name
 * @param handler - Event handler
 * @param options - Event listener options
 */
export function useConditionalEvent<K extends keyof WindowEventMap>(
	condition: () => boolean,
	target: Window,
	event: K,
	handler: (e: WindowEventMap[K]) => void,
	options?: AddEventListenerOptions
): void;

export function useConditionalEvent<K extends keyof DocumentEventMap>(
	condition: () => boolean,
	target: Document,
	event: K,
	handler: (e: DocumentEventMap[K]) => void,
	options?: AddEventListenerOptions
): void;

export function useConditionalEvent<K extends keyof HTMLElementEventMap>(
	condition: () => boolean,
	target: HTMLElement,
	event: K,
	handler: (e: HTMLElementEventMap[K]) => void,
	options?: AddEventListenerOptions
): void;

export function useConditionalEvent(
	condition: () => boolean,
	target: EventTarget,
	event: string,
	handler: (e: Event) => void,
	options?: AddEventListenerOptions
): void {
	$effect(() => {
		if (condition()) {
			target.addEventListener(event, handler, options);

			return () => {
				target.removeEventListener(event, handler, options);
			};
		}
	});
}

/**
 * Multiple event listeners with shared lifecycle.
 * Efficiently manages multiple listeners that should be added/removed together.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useMultipleEvents } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   useMultipleEvents([
 *     [window, 'resize', handleResize, { passive: true }],
 *     [window, 'scroll', handleScroll, { passive: true }],
 *     [document, 'visibilitychange', handleVisibility],
 *   ]);
 * </script>
 * ```
 *
 * @param listeners - Array of [target, event, handler, options] tuples
 */
export function useMultipleEvents(
	listeners: Array<
		[
			target: EventTarget,
			event: string,
			handler: (e: Event) => void,
			options?: AddEventListenerOptions
		]
	>
): void {
	$effect(() => {
		// Attach all listeners
		listeners.forEach(([target, event, handler, options]) => {
			target.addEventListener(event, handler, options);
		});

		// Cleanup all listeners
		return () => {
			listeners.forEach(([target, event, handler, options]) => {
				target.removeEventListener(event, handler, options);
			});
		};
	});
}

/**
 * Window event listener with automatic cleanup.
 * Convenience wrapper for common window event patterns.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useWindowEvent } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   let windowWidth = $state(0);
 *
 *   useWindowEvent('resize', () => {
 *     windowWidth = window.innerWidth;
 *   }, { passive: true });
 * </script>
 * ```
 *
 * @param event - Window event name
 * @param handler - Event handler
 * @param options - Event listener options
 */
export function useWindowEvent<K extends keyof WindowEventMap>(
	event: K,
	handler: (e: WindowEventMap[K]) => void,
	options?: AddEventListenerOptions
): void {
	$effect(() => {
		window.addEventListener(event, handler, options);

		return () => {
			window.removeEventListener(event, handler, options);
		};
	});
}

/**
 * Document event listener with automatic cleanup.
 * Convenience wrapper for common document event patterns.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useDocumentEvent } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   useDocumentEvent('keydown', (e) => {
 *     if (e.key === 'Escape') closeModal();
 *   });
 * </script>
 * ```
 *
 * @param event - Document event name
 * @param handler - Event handler
 * @param options - Event listener options
 */
export function useDocumentEvent<K extends keyof DocumentEventMap>(
	event: K,
	handler: (e: DocumentEventMap[K]) => void,
	options?: AddEventListenerOptions
): void {
	$effect(() => {
		document.addEventListener(event, handler, options);

		return () => {
			document.removeEventListener(event, handler, options);
		};
	});
}

/**
 * MediaQueryList listener with automatic cleanup.
 * Reactive to media query changes using Svelte 5 $effect.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useMediaQuery } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   let isDark = $state(false);
 *
 *   useMediaQuery(
 *     '(prefers-color-scheme: dark)',
 *     (e) => { isDark = e.matches; }
 *   );
 * </script>
 * ```
 *
 * @param query - Media query string
 * @param handler - Change handler
 */
export function useMediaQuery(
	query: string,
	handler: (event: MediaQueryListEvent) => void
): void {
	$effect(() => {
		const mediaQuery = window.matchMedia(query);

		// Call handler immediately with current state
		handler({ matches: mediaQuery.matches } as MediaQueryListEvent);

		// Modern addEventListener (Chrome 45+, Safari 14+)
		if (mediaQuery.addEventListener) {
			mediaQuery.addEventListener('change', handler);

			return () => {
				mediaQuery.removeEventListener('change', handler);
			};
		}

		// Legacy fallback
		mediaQuery.addListener(handler);
		return () => {
			mediaQuery.removeListener(handler);
		};
	});
}

/**
 * Debounced window event with automatic cleanup.
 * Prevents excessive handler calls for high-frequency events.
 *
 * @example
 * ```svelte
 * <script>
 *   import { useDebouncedWindowEvent } from '$lib/hooks/useEventCleanup.svelte';
 *
 *   useDebouncedWindowEvent('resize', () => {
 *     console.log('Window resized!');
 *   }, 300, { passive: true });
 * </script>
 * ```
 *
 * @param event - Window event name
 * @param handler - Event handler
 * @param delay - Debounce delay in milliseconds
 * @param options - Event listener options
 */
export function useDebouncedWindowEvent<K extends keyof WindowEventMap>(
	event: K,
	handler: (e: WindowEventMap[K]) => void,
	delay: number = 250,
	options?: AddEventListenerOptions
): void {
	$effect(() => {
		let timeoutId: number | undefined;

		const debouncedHandler = (e: WindowEventMap[K]) => {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
			timeoutId = window.setTimeout(() => handler(e), delay);
		};

		window.addEventListener(event, debouncedHandler, options);

		return () => {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
			window.removeEventListener(event, debouncedHandler, options);
		};
	});
}
