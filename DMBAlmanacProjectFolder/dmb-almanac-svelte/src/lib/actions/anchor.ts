/**
 * Svelte actions for CSS Anchor Positioning (Chrome 125+)
 * Use with use: directive for easy integration into components
 *
 * @example
 * ```svelte
 * <script>
 *   import { anchor, anchoredTo } from '$lib/actions/anchor';
 * </script>
 *
 * <!-- Define an anchor -->
 * <button use:anchor={{ name: 'trigger-btn' }}>
 *   Hover me
 * </button>
 *
 * <!-- Position element relative to anchor -->
 * <div use:anchoredTo={{ anchor: 'trigger-btn', position: 'bottom' }}>
 *   Tooltip content
 * </div>
 * ```
 */

import type { ActionReturn } from 'svelte/action';

/**
 * Options for the anchor action
 * Defines an element as an anchor point for positioning
 */
export interface AnchorActionOptions {
  /** Name of the anchor (without -- prefix, added automatically) */
  name: string;

  /** CSS custom property for dynamic anchor reference */
  cssProperty?: string;
}

/**
 * Options for the anchoredTo action
 * SIMPLIFIED: Positioning is now entirely CSS-based using CSS classes
 * This action only applies data attributes and CSS classes
 */
export interface AnchoredToOptions {
  /** Name of the anchor to position relative to (without -- prefix) */
  anchor: string;

  /** Position class: 'anchored-top', 'anchored-bottom', 'anchored-left', 'anchored-right' */
  position?: 'top' | 'bottom' | 'left' | 'right';

  /** Show/hide based on a boolean value */
  show?: boolean;

  /** CSS classes to apply to the positioned element */
  class?: string;
}

/**
 * Svelte action to define an element as an anchor
 * Sets the anchor-name CSS property on the element
 *
 * @param node - The DOM element to use as anchor
 * @param options - Configuration options
 *
 * @example
 * ```svelte
 * <button use:anchor={{ name: 'my-button' }}>
 *   Click me
 * </button>
 * ```
 */
export function anchor(
  node: Element,
  options: AnchorActionOptions
): ActionReturn<AnchorActionOptions> {
  const { name, cssProperty } = options;

  // Set the anchor-name CSS property
  const anchorName = `--${name}`;

  if (node instanceof HTMLElement) {
    node.style.setProperty('anchor-name', anchorName);

    // Optional: expose anchor via CSS custom property
    if (cssProperty) {
      node.style.setProperty(cssProperty, anchorName);
    }
  }

  return {
    update(newOptions: AnchorActionOptions) {
      if (node instanceof HTMLElement) {
        const newAnchorName = `--${newOptions.name}`;
        node.style.setProperty('anchor-name', newAnchorName);

        if (newOptions.cssProperty) {
          node.style.setProperty(newOptions.cssProperty, newAnchorName);
        }
      }
    },

    destroy() {
      if (node instanceof HTMLElement) {
        node.style.removeProperty('anchor-name');
        if (cssProperty) {
          node.style.removeProperty(cssProperty);
        }
      }
    },
  };
}

/**
 * Svelte action to position an element relative to an anchor
 * SIMPLIFIED: Now uses CSS classes for all positioning
 * JavaScript only applies data attributes and handles visibility
 *
 * @param node - The DOM element to position
 * @param options - Configuration options
 *
 * @example
 * ```svelte
 * <div use:anchoredTo={{ anchor: 'trigger', position: 'bottom' }}>
 *   Positioned content
 * </div>
 * ```
 */
export function anchoredTo(
  node: Element,
  options: AnchoredToOptions
): ActionReturn<AnchoredToOptions> {
  const { anchor, position = 'bottom', show = true, class: className } = options;

  function applyPositioning() {
    if (!(node instanceof HTMLElement)) return;

    // Handle visibility
    node.style.display = show ? '' : 'none';

    if (!show) return;

    // Set position-anchor CSS custom property
    node.style.setProperty('position-anchor', `--${anchor}`);

    // Apply position class (e.g., 'anchored-bottom')
    const positionClass = `anchored-${position}`;
    node.classList.add('anchored', positionClass);

    // Apply custom classes if provided
    if (className) {
      node.classList.add(...className.split(' '));
    }
  }

  applyPositioning();

  return {
    update(newOptions: AnchoredToOptions) {
      if (!(node instanceof HTMLElement)) return;

      // Remove old position class
      const oldPositionClass = `anchored-${options.position || 'bottom'}`;
      node.classList.remove(oldPositionClass);

      // Update options reference
      Object.assign(options, newOptions);
      applyPositioning();
    },

    destroy() {
      // Clean up classes
      if (node instanceof HTMLElement) {
        node.classList.remove(
          'anchored',
          `anchored-${position}`,
          'anchored-top',
          'anchored-bottom',
          'anchored-left',
          'anchored-right'
        );
        node.style.removeProperty('position-anchor');
      }
    },
  };
}

