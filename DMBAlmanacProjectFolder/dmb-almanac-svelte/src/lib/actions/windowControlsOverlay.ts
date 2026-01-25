/**
 * Svelte action for Window Controls Overlay support
 * Use this on elements that should respect the title bar area
 *
 * @example
 * ```svelte
 * <header use:windowControlsOverlay>
 *   <h1>My App</h1>
 * </header>
 * ```
 */

import {
  onGeometryChange,
  getTitleBarAreaRect,
  type TitleBarAreaRect
} from '$lib/utils/windowControlsOverlay';

/**
 * Extended CSSStyleDeclaration interface for non-standard PWA window control properties
 */
interface PWAStyleDeclaration extends CSSStyleDeclaration {
  /** Webkit app region (non-standard CSS property) */
  webkitAppRegion?: string;
  /** App region fallback (non-standard CSS property) */
  appRegion?: string;
}

export interface WindowControlsOverlayActionOptions {
  /** Apply position: fixed styling (default: true) */
  fixed?: boolean;
  /** Custom class to add when overlay is visible */
  visibleClass?: string;
  /** Callback when geometry changes */
  onGeometryChange?: (rect: TitleBarAreaRect) => void;
  /** Debug mode logs geometry changes */
  debug?: boolean;
}

/**
 * Svelte action to position element in window controls overlay area
 *
 * Automatically:
 * - Positions element at the title bar area
 * - Listens for geometry changes (window resize, maximize, restore)
 * - Applies CSS env() variables via style attributes
 * - Handles SSR safety
 *
 * @param node - DOM element to apply WCO positioning
 * @param options - Configuration options
 * @returns Object with update and destroy methods
 */
export function windowControlsOverlay(
  node: HTMLElement,
  options: WindowControlsOverlayActionOptions = {}
) {
  const {
    fixed = true,
    visibleClass = 'wco-visible',
    onGeometryChange: userCallback,
    debug = false
  } = options;

  // Get initial rect
  const initialRect = getTitleBarAreaRect();

  if (initialRect) {
    applyGeometry(node, initialRect, fixed, visibleClass);
    if (debug) {
      console.warn('[WCO] Initial geometry:', initialRect);
    }
  }

  // Listen for geometry changes
  const unsubscribe = onGeometryChange((rect) => {
    applyGeometry(node, rect, fixed, visibleClass);
    userCallback?.(rect);

    if (debug) {
      console.warn('[WCO] Geometry changed:', rect);
    }
  });

  return {
    update(newOptions: WindowControlsOverlayActionOptions = {}) {
      const rect = getTitleBarAreaRect();
      if (rect) {
        applyGeometry(
          node,
          rect,
          newOptions.fixed ?? fixed,
          newOptions.visibleClass ?? visibleClass
        );
      }
    },

    destroy() {
      unsubscribe();
    }
  };
}

function applyGeometry(
  node: HTMLElement,
  rect: TitleBarAreaRect,
  fixed: boolean,
  visibleClass: string
) {
  // Position at title bar area
  if (fixed) {
    node.style.position = 'fixed';
    node.style.top = `${rect.y}px`;
    node.style.left = `${rect.x}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
  }

  // Add visible class
  node.classList.add(visibleClass);

  // Set CSS variables for use in nested elements
  node.style.setProperty('--titlebar-area-x', `${rect.x}px`);
  node.style.setProperty('--titlebar-area-y', `${rect.y}px`);
  node.style.setProperty('--titlebar-area-width', `${rect.width}px`);
  node.style.setProperty('--titlebar-area-height', `${rect.height}px`);
}

/**
 * Svelte action to make an element draggable in the title bar area
 * Sets -webkit-app-region: drag
 *
 * @param node - Element to make draggable
 * @param enabled - Enable or disable dragging (default: true)
 *
 * @example
 * ```svelte
 * <div use:windowControlsDraggable>
 *   Drag me to move the window
 * </div>
 * ```
 */
export function windowControlsDraggable(
  node: HTMLElement,
  enabled = true
) {
  const pwaStyle = node.style as PWAStyleDeclaration;

  if (enabled) {
    pwaStyle.webkitAppRegion = 'drag';
    pwaStyle.appRegion = 'drag';
  }

  return {
    update(newEnabled: boolean) {
      if (newEnabled) {
        pwaStyle.webkitAppRegion = 'drag';
        pwaStyle.appRegion = 'drag';
      } else {
        pwaStyle.webkitAppRegion = 'no-drag';
        pwaStyle.appRegion = 'no-drag';
      }
    }
  };
}

/**
 * Svelte action to prevent window dragging for interactive elements
 * Sets -webkit-app-region: no-drag
 *
 * @param node - Element that should not drag the window
 *
 * @example
 * ```svelte
 * <button use:windowControlsNoDrag>
 *   Click me (don't drag the window)
 * </button>
 * ```
 */
export function windowControlsNoDrag(node: HTMLElement) {
  const pwaStyle = node.style as PWAStyleDeclaration;

  pwaStyle.webkitAppRegion = 'no-drag';
  pwaStyle.appRegion = 'no-drag';

  return {
    destroy() {
      // Cleanup if needed
    }
  };
}
