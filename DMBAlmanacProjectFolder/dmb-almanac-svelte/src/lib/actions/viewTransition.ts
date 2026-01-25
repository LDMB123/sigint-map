/**
 * Svelte Action: View Transition
 * Applies view-transition-name to elements for animated page transitions
 *
 * Usage:
 * <div use:viewTransition={{ name: 'hero' }}>
 *   Content
 * </div>
 *
 * Chrome 111+ (Mature in 143+)
 */

import { setTransitionName, removeTransitionName } from '$lib/utils/viewTransitions';
import type { ActionReturn } from 'svelte/action';

interface ViewTransitionOptions {
	/** Name for the view transition (e.g., 'hero', 'card', 'image') */
	name: string;
	/** Optional: enable/disable transition dynamically */
	enabled?: boolean;
	/** Optional: class to apply while transitioning */
	class?: string;
}

/**
 * Svelte action for View Transitions API
 * Automatically applies view-transition-name and manages lifecycle
 *
 * @example
 * <script>
 *   import { viewTransition } from '$lib/actions/viewTransition';
 * </script>
 *
 * <div use:viewTransition={{ name: 'card' }}>
 *   Card content that will smoothly transition
 * </div>
 *
 * <!-- With conditional enabling -->
 * <img
 *   use:viewTransition={{ name: 'hero', enabled: true }}
 *   src="image.jpg"
 *   alt="Hero"
 * />
 */
export function viewTransition(
	node: Element,
	options: ViewTransitionOptions
): ActionReturn<ViewTransitionOptions> {
	const { name, enabled = true, class: transitionClass } = options;

	// Apply transition if enabled
	if (enabled) {
		setTransitionName(node, name);
		if (transitionClass) {
			node.classList.add(transitionClass);
		}
	}

	return {
		update(newOptions: ViewTransitionOptions) {
			const { name: newName, enabled: newEnabled, class: newClass } = newOptions;

			if (newEnabled && !enabled) {
				// Enable transition
				setTransitionName(node, newName);
				if (newClass) {
					node.classList.add(newClass);
				}
			} else if (!newEnabled && enabled) {
				// Disable transition
				removeTransitionName(node);
				if (transitionClass) {
					node.classList.remove(transitionClass);
				}
			} else if (newEnabled && newName !== name) {
				// Update transition name
				setTransitionName(node, newName);
				if (transitionClass && newClass) {
					node.classList.remove(transitionClass);
					node.classList.add(newClass);
				}
			}
		},

		destroy() {
			// Cleanup on unmount
			removeTransitionName(node);
			if (transitionClass) {
				node.classList.remove(transitionClass);
			}
		}
	};
}

/**
 * Helper action for common view transition scenarios
 * Pre-configured for typical use cases
 */
export function viewTransitionCard(node: Element): ActionReturn<ViewTransitionOptions> {
	return viewTransition(node, { name: 'card' });
}

export function viewTransitionHero(node: Element): ActionReturn<ViewTransitionOptions> {
	return viewTransition(node, { name: 'hero' });
}

export function viewTransitionImage(node: Element): ActionReturn<ViewTransitionOptions> {
	return viewTransition(node, { name: 'image' });
}

export function viewTransitionVisualization(node: Element): ActionReturn<ViewTransitionOptions> {
	return viewTransition(node, { name: 'visualization' });
}

export function viewTransitionHeader(node: Element): ActionReturn<ViewTransitionOptions> {
	return viewTransition(node, { name: 'header' });
}
