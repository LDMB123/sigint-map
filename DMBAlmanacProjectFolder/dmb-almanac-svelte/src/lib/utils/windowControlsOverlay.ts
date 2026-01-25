/**
 * Window Controls Overlay API utilities
 * Chrome 105+, Edge 105+, allows custom title bar area in standalone PWAs
 *
 * The Window Controls Overlay API provides a way to have a full-screen app
 * with custom title bar. The browser's window controls (minimize, maximize, close)
 * are displayed in the top-right corner, leaving the rest of the title bar area
 * available for app content.
 *
 * Use these CSS env vars for title bar area:
 *   env(titlebar-area-x)
 *   env(titlebar-area-y)
 *   env(titlebar-area-width)
 *   env(titlebar-area-height)
 *
 * @see https://web.dev/window-controls-overlay/
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/env#titlebar-area-x
 */

export interface TitleBarAreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowControlsOverlayAPI {
  windowControlsOverlay?: {
    visible: boolean;
    getTitlebarAreaRect(): TitleBarAreaRect;
    ongeometrychange?: ((this: WindowControlsOverlayAPI, event: GeometryChangeEvent) => void) | null;
  };
  onwindowcontrolsoverlaygeometrychange?: (event: GeometryChangeEvent) => void;
}

export interface GeometryChangeEvent extends Event {
  titlebarAreaRect: TitleBarAreaRect;
}

/**
 * Check if Window Controls Overlay API is supported and available
 * Supported in Chrome 105+, Edge 105+
 *
 * @returns true if WCO API is available in the browser
 */
export function isWindowControlsOverlaySupported(): boolean {
  // SSR guard
  if (typeof window === 'undefined') {
    return false;
  }

  const api = window as unknown as WindowControlsOverlayAPI;
  return (
    typeof api.windowControlsOverlay !== 'undefined' &&
    typeof api.windowControlsOverlay.getTitlebarAreaRect === 'function'
  );
}

/**
 * Check if Window Controls Overlay is currently visible/active
 * Only true when app is installed as a PWA and display mode is window-controls-overlay
 *
 * @returns true if overlay is currently visible
 */
export function isOverlayVisible(): boolean {
  // SSR guard
  if (typeof window === 'undefined') {
    return false;
  }

  if (!isWindowControlsOverlaySupported()) {
    return false;
  }

  const api = window as unknown as WindowControlsOverlayAPI;
  return api.windowControlsOverlay?.visible ?? false;
}

/**
 * Get the title bar area rectangle
 * Returns the area where you can place custom title bar content
 * The browser controls occupy the right side of this rect
 *
 * @returns TitleBarAreaRect with x, y, width, height in CSS pixels, or null if not supported
 */
export function getTitleBarAreaRect(): TitleBarAreaRect | null {
  // SSR guard
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isWindowControlsOverlaySupported()) {
    return null;
  }

  try {
    const api = window as unknown as WindowControlsOverlayAPI;
    return api.windowControlsOverlay?.getTitlebarAreaRect() ?? null;
  } catch (error) {
    console.warn('Failed to get title bar area rect:', error);
    return null;
  }
}

/**
 * Listen for geometry changes when the title bar area changes
 * This happens when the window is resized, maximized, or restored
 *
 * @param callback - Function called with new TitleBarAreaRect when geometry changes
 * @returns Unsubscribe function to remove the listener
 *
 * @example
 * ```ts
 * const unsubscribe = onGeometryChange((rect) => {
 *   console.log('Title bar area changed:', rect);
 *   updateTitleBarLayout(rect);
 * });
 *
 * // Later, clean up
 * unsubscribe();
 * ```
 */
export function onGeometryChange(callback: (rect: TitleBarAreaRect) => void): () => void {
  // SSR guard
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (!isWindowControlsOverlaySupported()) {
    return () => {};
  }

  const handler = (event: GeometryChangeEvent) => {
    callback(event.titlebarAreaRect);
  };

  try {
    window.addEventListener('windowcontrolsoverlaygeometrychange', handler as EventListener);

    // Return unsubscribe function
    return () => {
      window.removeEventListener('windowcontrolsoverlaygeometrychange', handler as EventListener);
    };
  } catch (error) {
    console.warn('Failed to set up geometry change listener:', error);
    return () => {};
  }
}

/**
 * Get computed CSS values for the title bar area
 * These can also be used directly in CSS via env() variables
 *
 * @returns Object with CSS env() variable values, or null if not supported
 */
export function getTitleBarAreaCSS(): Record<string, string> | null {
  // SSR guard
  if (typeof window === 'undefined') {
    return null;
  }

  const rect = getTitleBarAreaRect();
  if (!rect) {
    return null;
  }

  return {
    x: `${rect.x}px`,
    y: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    // Common usage: position the title bar
    left: `${rect.x}px`,
    top: `${rect.y}px`,
  };
}

/**
 * Get media query to detect if running in window-controls-overlay mode
 * Use this to apply styles only when overlay is active
 *
 * Example CSS:
 * ```css
 * @supports (padding: max(0px)) {
 *   header {
 *     padding-left: env(titlebar-area-x);
 *     width: env(titlebar-area-width);
 *     height: env(titlebar-area-height);
 *   }
 * }
 * ```
 *
 * @returns boolean indicating if window controls overlay is supported
 */
export function supportsWindowControlsOverlay(): boolean {
  // Check if the CSS env() variables are supported
  if (typeof window === 'undefined') {
    return false;
  }

  return isWindowControlsOverlaySupported();
}

/**
 * Detect display mode from navigator
 * @returns 'window-controls-overlay', 'standalone', 'minimal-ui', 'browser', or null
 */
export function getDisplayMode(): string | null {
  // SSR guard
  if (typeof window === 'undefined') {
    return null;
  }

  if (!('navigator' in window)) {
    return null;
  }

  // Check manifest display mode if available
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
    return 'window-controls-overlay';
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }

  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }

  if (window.matchMedia('(display-mode: browser)').matches) {
    return 'browser';
  }

  return null;
}

/**
 * Check if currently running as installed PWA with window controls overlay
 * @returns true if app is installed and display mode is window-controls-overlay
 */
export function isInstalledWithWindowControlsOverlay(): boolean {
  // SSR guard
  if (typeof window === 'undefined') {
    return false;
  }

  return getDisplayMode() === 'window-controls-overlay' && isOverlayVisible();
}
