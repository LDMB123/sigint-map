/**
 * View Transitions API Utilities for Chromium 143+
 * Smooth animated transitions between pages
 *
 * Part of Apple Silicon optimization for macOS 26.2
 * Runs on Chrome Metal backend via ANGLE
 *
 * https://developer.chrome.com/docs/web-platform/view-transitions
 */

/**
 * Check if View Transitions API is supported (Chrome 111+)
 * Returns true if document.startViewTransition is available
 */
export function isViewTransitionsSupported(): boolean {
	if (typeof document === 'undefined') return false;
	return typeof (document as any).startViewTransition === 'function';
}

/**
 * Get the active view transition (Chrome 143+)
 * Returns the current ViewTransition or null if none active
 */
export function getActiveViewTransition(): ViewTransition | null {
	if (typeof document === 'undefined') return null;
	return (document as any).activeViewTransition ?? null;
}

/**
 * Start a view transition with a callback
 * The callback should handle the DOM update
 *
 * @param callback - Async or sync function that updates the DOM
 * @param transitionType - Optional transition type: 'fade', 'slide-left', 'slide-right', 'zoom-in'
 * @returns ViewTransition object or null if not supported
 *
 * @example
 * startViewTransition(async () => {
 *   await navigate('/new-page');
 * }, 'slide-left');
 */
export function startViewTransition(
	callback: () => void | Promise<void>,
	transitionType: 'fade' | 'slide-left' | 'slide-right' | 'zoom-in' = 'fade'
): ViewTransition | null {
	if (!isViewTransitionsSupported()) {
		// Fallback: just run the callback without transition
		callback();
		return null;
	}

	const doc = document as any;

	// Set transition type via data attribute for CSS @supports rules
	if (transitionType !== 'fade') {
		doc.documentElement.setAttribute('data-view-transition', transitionType);
	}

	const transition = doc.startViewTransition(async () => {
		await callback();
		// Clear transition type after update
		if (transitionType !== 'fade') {
			doc.documentElement.removeAttribute('data-view-transition');
		}
	});

	return transition;
}

/**
 * Start a view transition with custom animation options
 *
 * @param callback - DOM update function
 * @param options - Animation options (duration, easing, transitionType)
 *
 * @example
 * await transitionWithAnimation(async () => {
 *   await navigate('/songs');
 * }, {
 *   duration: 300,
 *   easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
 *   transitionType: 'slide-left'
 * });
 */
export async function transitionWithAnimation(
	callback: () => void | Promise<void>,
	options: {
		duration?: number;
		easing?: string;
		transitionType?: 'fade' | 'slide-left' | 'slide-right' | 'zoom-in';
	} = {}
): Promise<void> {
	const { duration = 300, easing = 'cubic-bezier(0.4, 0, 0.2, 1)', transitionType = 'fade' } = options;

	const transition = startViewTransition(callback, transitionType);

	if (!transition) return;

	// Set CSS custom properties for animation timing
	const doc = document.documentElement as any;
	doc.style.setProperty('--vt-duration', `${duration}ms`);
	doc.style.setProperty('--vt-easing', easing);

	// Wait for transition to complete
	try {
		await transition.finished;
	} finally {
		// Cleanup
		doc.style.removeProperty('--vt-duration');
		doc.style.removeProperty('--vt-easing');
	}
}

/**
 * Add view-transition-name to an element
 * Used for element-specific transitions
 *
 * @param element - DOM element to add transition to
 * @param name - Transition name (e.g., 'card', 'hero', 'image')
 *
 * @example
 * setTransitionName(heroElement, 'hero');
 * // Now ::view-transition-old(hero) and ::view-transition-new(hero) will animate
 */
export function setTransitionName(element: Element, name: string): void {
	if (!isViewTransitionsSupported()) return;
	(element as any).style.viewTransitionName = name;
}

/**
 * Remove view-transition-name from an element
 *
 * @param element - DOM element to remove transition from
 */
export function removeTransitionName(element: Element): void {
	(element as any).style.viewTransitionName = 'none';
}

/**
 * Listen for view transition lifecycle events
 * Available in Chrome 143+ via ViewTransition object
 *
 * @example
 * onViewTransition((phase) => {
 *   console.log('Transition phase:', phase);
 *   if (phase === 'ready') {
 *     // Pseudo-elements created, animation starting
 *   }
 * });
 */
export function onViewTransition(
	callback: (phase: 'ready' | 'finished' | 'done') => void
): () => void {
	if (!isViewTransitionsSupported()) return () => {};

	let unsubscribe = () => {};

	// Watch for active view transition
	const checkTransition = () => {
		const transition = getActiveViewTransition();
		if (transition) {
			// Transition started
			// Intentional fire-and-forget: transition lifecycle callbacks don't require awaiting
			void transition.ready.then(() => callback('ready')).catch((err) => {
				console.warn('[ViewTransitions] ready promise rejected:', err);
			});
			void transition.finished.then(() => callback('finished')).catch((err) => {
				console.warn('[ViewTransitions] finished promise rejected:', err);
			});
			void transition.updateCallbackDone.then(() => callback('done')).catch((err) => {
				console.warn('[ViewTransitions] updateCallbackDone promise rejected:', err);
			});

			unsubscribe = () => {
				// Cleanup if needed
			};
		}
	};

	// Use MutationObserver to detect new transitions
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
 * Check if page was accessed via view transition (back navigation)
 * Chrome 143+ adds transition info to navigation events
 *
 * @returns true if current view is result of back/forward navigation with transition
 */
export function isBackNavigationWithTransition(): boolean {
	if (typeof document === 'undefined') return false;
	const doc = document as any;
	return doc.activeViewTransition?.type === 'back' || false;
}

/**
 * Scroll to element after view transition completes
 * Useful for focusing on new content after navigation
 *
 * @param element - Element to scroll to
 * @param options - Scroll behavior options
 *
 * @example
 * const transition = startViewTransition(async () => {
 *   await navigate('/songs');
 * });
 *
 * transition?.finished.then(() => {
 *   const title = document.querySelector('h1');
 *   scrollAfterTransition(title);
 * });
 */
export function scrollAfterTransition(
	element: Element | null,
	options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'start' }
): void {
	if (!element) return;

	const transition = getActiveViewTransition();

	if (transition) {
		// Wait for transition to be ready before scrolling
		transition.ready
			.then(() => {
				// Small delay to let animation start
				requestAnimationFrame(() => {
					element.scrollIntoView(options);
				});
			})
			.catch(() => {
				// Fallback if transition fails
				element.scrollIntoView(options);
			});
	} else {
		// No transition, scroll immediately
		element.scrollIntoView(options);
	}
}

/**
 * Disable view transitions for specific element
 * Useful for elements that shouldn't animate
 *
 * @param element - Element to exclude from transitions
 *
 * @example
 * // Prevent modal from participating in page transition
 * disableTransitionForElement(modalElement);
 */
export function disableTransitionForElement(element: Element): void {
	(element as any).style.viewTransitionName = 'none';
	element.classList.add('view-transition-disabled');
}

/**
 * Enable view transitions for specific element
 *
 * @param element - Element to include in transitions
 * @param name - Optional transition name
 */
export function enableTransitionForElement(element: Element, name?: string): void {
	if (name) {
		setTransitionName(element, name);
	}
	element.classList.remove('view-transition-disabled');
}

/**
 * Measure view transition performance
 * Returns timing info for the transition
 *
 * @returns Object with performance timings or null if not supported
 */
export function measureViewTransitionPerformance(): {
	startTime: number;
	readyTime: number | null;
	finishedTime: number | null;
	duration: number | null;
} | null {
	if (!isViewTransitionsSupported()) return null;

	const transition = getActiveViewTransition();
	if (!transition) return null;

	const startTime = performance.now();
	let readyTime: number | null = null;
	let finishedTime: number | null = null;

	// Intentional fire-and-forget: performance metrics are collected asynchronously
	void transition.ready.then(() => {
		readyTime = performance.now();
	}).catch((err) => {
		console.warn('[ViewTransitions] measureViewTransitionPerformance ready promise rejected:', err);
	});

	void transition.finished.then(() => {
		finishedTime = performance.now();
	}).catch((err) => {
		console.warn('[ViewTransitions] measureViewTransitionPerformance finished promise rejected:', err);
	});

	return {
		startTime,
		readyTime,
		finishedTime,
		duration: finishedTime && readyTime ? finishedTime - readyTime : null
	};
}
