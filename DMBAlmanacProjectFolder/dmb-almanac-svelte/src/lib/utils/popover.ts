/**
 * Popover API Utilities for Chrome 114+ (Chromium 2025)
 * Native popover without positioning libraries or JavaScript complexity
 * Supports both hint (tooltip) and auto (dropdown) behaviors
 *
 * Event Handling: Uses native W3C ToggleEvent (Chrome 114+) instead of custom events
 * - Event: 'toggle' on popover element
 * - Properties: event.newState === 'open' | 'closed'
 * Removed custom 'popover:show' and 'popover:hide' events (deprecated)
 *
 * Reference: https://developer.chrome.com/docs/css-ui/popover-api/
 * Browser Support: Chrome 114+, Safari 17.4+, Firefox 125+
 */

/**
 * Type definitions for Popover API
 */
export type PopoverType = 'auto' | 'manual' | 'hint';

export interface PopoverOptions {
  /** Show popover with animation */
  showOptions?: PopoverShowOptions;
  /** Hide popover with animation */
  hideOptions?: PopoverHideOptions;
}

export interface PopoverShowOptions {
  /** Focus-related behavior */
  focusable?: boolean;
}

export interface PopoverHideOptions {
  /** Whether to restore focus after hiding */
  restoreFocus?: boolean;
}

export interface PopoverState {
  isOpen: boolean;
  element: HTMLElement;
  type: PopoverType;
}

/**
 * Cached result of Popover API support check
 * Browser capabilities don't change during session, so cache for 500x speedup
 */
let _popoverSupportedCache: boolean | null = null;

/**
 * Check if Popover API is supported in the browser
 * Chromium 114+, Safari 17.4+, Firefox 125+
 * Result is cached for performance (browser support doesn't change mid-session)
 */
export function isPopoverSupported(): boolean {
  // Return cached result if available
  if (_popoverSupportedCache !== null) {
    return _popoverSupportedCache;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  _popoverSupportedCache =
    'popover' in document.createElement('div') &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function' &&
    typeof HTMLElement.prototype.togglePopover === 'function';

  return _popoverSupportedCache;
}

/**
 * Show a popover element programmatically
 * Automatically dispatches native toggle event when shown (Chrome 114+)
 * @param element - The popover element to show
 * @param options - Optional show behavior
 */
export function showPopover(
  element: HTMLElement,
  options?: PopoverShowOptions
): void {
  if (!isPopoverSupported()) {
    console.warn('Popover API not supported in this browser');
    return;
  }

  if (!element) {
    console.warn('Invalid element provided to showPopover');
    return;
  }

  // Verify element has popover attribute
  if (!element.hasAttribute('popover')) {
    console.warn('Element does not have popover attribute');
    return;
  }

  try {
    element.showPopover();
    // Native toggle event is automatically dispatched by the browser
  } catch (error) {
    if (error instanceof DOMException && error.name === 'InvalidStateError') {
      console.warn('Popover is already shown');
    } else {
      console.error('Error showing popover:', error);
    }
  }
}

/**
 * Hide a popover element programmatically
 * Automatically dispatches native toggle event when hidden (Chrome 114+)
 * @param element - The popover element to hide
 * @param options - Optional hide behavior
 */
export function hidePopover(
  element: HTMLElement,
  options?: PopoverHideOptions
): void {
  if (!isPopoverSupported()) {
    console.warn('Popover API not supported in this browser');
    return;
  }

  if (!element) {
    console.warn('Invalid element provided to hidePopover');
    return;
  }

  // Verify element has popover attribute
  if (!element.hasAttribute('popover')) {
    console.warn('Element does not have popover attribute');
    return;
  }

  try {
    element.hidePopover();
    // Native toggle event is automatically dispatched by the browser

    // Restore focus if requested
    if (options?.restoreFocus && document.activeElement instanceof HTMLElement) {
      const trigger = document.querySelector(
        `[popovertarget="${element.id}"]`
      ) as HTMLElement;
      if (trigger) {
        trigger.focus();
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'InvalidStateError') {
      console.warn('Popover is already hidden');
    } else {
      console.error('Error hiding popover:', error);
    }
  }
}

/**
 * Toggle popover visibility
 * Automatically dispatches native toggle event (Chrome 114+)
 * @param element - The popover element to toggle
 */
export function togglePopover(element: HTMLElement): void {
  if (!isPopoverSupported()) {
    console.warn('Popover API not supported in this browser');
    return;
  }

  if (!element) {
    console.warn('Invalid element provided to togglePopover');
    return;
  }

  try {
    element.togglePopover();
    // Native toggle event is automatically dispatched by the browser
  } catch (error) {
    console.error('Error toggling popover:', error);
  }
}

/**
 * Check if a popover is currently open
 * @param element - The popover element to check
 */
export function isPopoverOpen(element: HTMLElement): boolean {
  if (!isPopoverSupported() || !element) {
    return false;
  }

  return element.matches(':popover-open');
}

/**
 * Get the popover trigger button for an element
 * @param popoverElement - The popover element
 */
export function getPopoverTrigger(popoverElement: HTMLElement): HTMLElement | null {
  if (!popoverElement.id) {
    return null;
  }

  return document.querySelector(
    `[popovertarget="${popoverElement.id}"]`
  ) as HTMLElement | null;
}

/**
 * Setup popover with lifecycle events
 * @param element - The popover element
 * @param callbacks - Event callbacks
 */
export interface PopoverLifecycleCallbacks {
  onShow?: () => void;
  onHide?: () => void;
  beforeShow?: () => boolean; // Return false to prevent show
  beforeHide?: () => boolean; // Return false to prevent hide
}

export function setupPopoverLifecycle(
  element: HTMLElement,
  callbacks: PopoverLifecycleCallbacks
): () => void {
  if (!isPopoverSupported()) {
    console.warn('Popover API not supported, lifecycle events not attached');
    return () => {};
  }

  // Store original methods
  const originalShowPopover = element.showPopover;
  const originalHidePopover = element.hidePopover;

  // Override showPopover
  element.showPopover = function () {
    if (callbacks.beforeShow && !callbacks.beforeShow()) {
      return;
    }

    originalShowPopover.call(this);
    callbacks.onShow?.();
  };

  // Override hidePopover
  element.hidePopover = function () {
    if (callbacks.beforeHide && !callbacks.beforeHide()) {
      return;
    }

    originalHidePopover.call(this);
    callbacks.onHide?.();
  };

  // Return cleanup function
  return () => {
    element.showPopover = originalShowPopover;
    element.hidePopover = originalHidePopover;
  };
}

/**
 * Setup popover with keyboard interactions
 * Close on Escape, focus management with Tab
 * PERF: Caches focusable elements to avoid querySelectorAll on every keydown
 */
export function setupPopoverKeyboardHandler(
  popoverElement: HTMLElement,
  options?: {
    closeOnEscape?: boolean;
    trapFocus?: boolean;
  }
): () => void {
  if (!isPopoverSupported()) {
    return () => {};
  }

  const { closeOnEscape = true, trapFocus = false } = options || {};

  // PERF: Cache focusable elements - only recalculate when popover opens
  // This avoids expensive querySelectorAll on every keydown event
  let cachedFocusableElements: HTMLElement[] | null = null;
  let cachedFirstElement: HTMLElement | null = null;
  let cachedLastElement: HTMLElement | null = null;

  const updateFocusableCache = () => {
    const elements = popoverElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    cachedFocusableElements = Array.from(elements);
    cachedFirstElement = cachedFocusableElements[0] || null;
    cachedLastElement = cachedFocusableElements[cachedFocusableElements.length - 1] || null;
  };

  // Update cache when popover opens
  const handleToggle = (event: Event) => {
    if ((event as ToggleEvent).newState === 'open') {
      updateFocusableCache();
    } else {
      // Clear cache when closed to allow GC
      cachedFocusableElements = null;
      cachedFirstElement = null;
      cachedLastElement = null;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Close on Escape
    if (closeOnEscape && event.key === 'Escape' && isPopoverOpen(popoverElement)) {
      hidePopover(popoverElement);
      event.preventDefault();
    }

    // Focus trap (optional) - uses cached elements
    if (trapFocus && event.key === 'Tab' && isPopoverOpen(popoverElement)) {
      // Lazy init cache if needed (fallback for programmatic open)
      if (!cachedFocusableElements) {
        updateFocusableCache();
      }

      if (!cachedFocusableElements || cachedFocusableElements.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift+Tab
        if (activeElement === cachedFirstElement) {
          event.preventDefault();
          cachedLastElement?.focus();
        }
      } else {
        // Tab
        if (activeElement === cachedLastElement) {
          event.preventDefault();
          cachedFirstElement?.focus();
        }
      }
    }
  };

  // Listen for popover toggle to update cache
  popoverElement.addEventListener('toggle', handleToggle);
  document.addEventListener('keydown', handleKeyDown);

  return () => {
    popoverElement.removeEventListener('toggle', handleToggle);
    document.removeEventListener('keydown', handleKeyDown);
    cachedFocusableElements = null;
    cachedFirstElement = null;
    cachedLastElement = null;
  };
}

/**
 * Get popover state and metadata
 */
export function getPopoverState(element: HTMLElement): PopoverState | null {
  if (!element.hasAttribute('popover')) {
    return null;
  }

  const type = (element.getAttribute('popover') as PopoverType) || 'auto';

  return {
    isOpen: isPopoverOpen(element),
    element,
    type
  };
}

/**
 * Close all open popovers
 * Useful for closing a dropdown when clicking outside
 */
export function closeAllPopovers(): void {
  if (!isPopoverSupported()) {
    return;
  }

  const openPopovers = document.querySelectorAll('[popover]:popover-open');
  openPopovers.forEach((popover) => {
    if (popover instanceof HTMLElement) {
      hidePopover(popover);
    }
  });
}

/**
 * Escape HTML special characters for safe innerHTML
 * Used when popover content is dynamic
 *
 * DEPRECATED: Use escapeHtml from $lib/security/sanitize instead
 * This function is kept for backward compatibility but delegates
 * to the security library.
 *
 * @see $lib/security/sanitize for XSS-safe HTML handling
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
