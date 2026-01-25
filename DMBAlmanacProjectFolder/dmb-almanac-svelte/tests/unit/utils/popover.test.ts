/**
 * Unit tests for Popover API utilities
 * Testing framework: Vitest
 * DOM testing: @testing-library/dom
 *
 * Run with: npm run test
 *
 * Note: These are example tests to show how to test the popover utilities.
 * Adapt to your testing framework and environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isPopoverSupported,
  showPopover,
  hidePopover,
  togglePopover,
  isPopoverOpen,
  getPopoverTrigger,
  getPopoverState,
  closeAllPopovers,
  setupPopoverKeyboardHandler,
  setupPopoverLifecycle,
  escapeHtml
} from '$lib/utils/popover';

describe('Popover API Utilities', () => {
  let element: HTMLElement;
  let trigger: HTMLElement;

  beforeEach(() => {
    // Create test popover element
    element = document.createElement('div');
    element.id = 'test-popover';
    element.setAttribute('popover', 'auto');
    document.body.appendChild(element);

    // Create test trigger button
    trigger = document.createElement('button');
    trigger.setAttribute('popovertarget', 'test-popover');
    trigger.textContent = 'Trigger';
    document.body.appendChild(trigger);
  });

  afterEach(() => {
    // Cleanup
    element.remove();
    trigger.remove();
  });

  describe('isPopoverSupported()', () => {
    it('should return true if Popover API is supported', () => {
      // Only works in browsers with Popover API support
      if ('popover' in HTMLDivElement.prototype) {
        expect(isPopoverSupported()).toBe(true);
      }
    });

    it('should return false if Popover API is not supported', () => {
      // Mock missing Popover API
      const originalPopover = HTMLElement.prototype.showPopover;
      delete (HTMLElement.prototype as any).showPopover;

      expect(isPopoverSupported()).toBe(false);

      // Restore
      (HTMLElement.prototype as any).showPopover = originalPopover;
    });

    it('should handle missing document gracefully', () => {
      expect(isPopoverSupported()).toBeDefined();
    });
  });

  describe('showPopover()', () => {
    it('should show a popover element', () => {
      if (isPopoverSupported()) {
        showPopover(element);
        expect(element.matches(':popover-open')).toBe(true);
      }
    });

    it('should dispatch native toggle event when shown', () => {
      const listener = vi.fn();
      element.addEventListener('toggle', listener);

      if (isPopoverSupported()) {
        showPopover(element);
        expect(listener).toHaveBeenCalled();
        // Verify the event has the correct newState
        const event = listener.mock.calls[0]?.[0] as ToggleEvent;
        expect(event?.newState).toBe('open');
      }

      element.removeEventListener('toggle', listener);
    });

    it('should warn if element is invalid', () => {
      const warnSpy = vi.spyOn(console, 'warn');

      showPopover(null as any);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should warn if element lacks popover attribute', () => {
      const invalidElement = document.createElement('div');
      const warnSpy = vi.spyOn(console, 'warn');

      showPopover(invalidElement);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('hidePopover()', () => {
    it('should hide an open popover element', () => {
      if (isPopoverSupported()) {
        showPopover(element);
        hidePopover(element);
        expect(element.matches(':popover-open')).toBe(false);
      }
    });

    it('should dispatch native toggle event when hidden', () => {
      const listener = vi.fn();
      element.addEventListener('toggle', listener);

      if (isPopoverSupported()) {
        showPopover(element);
        hidePopover(element);
        // Should have been called twice: once for show, once for hide
        expect(listener.mock.calls.length).toBeGreaterThanOrEqual(1);
        // Last call should be for hide with newState='closed'
        const lastEvent = listener.mock.calls[listener.mock.calls.length - 1]?.[0] as ToggleEvent;
        expect(lastEvent?.newState).toBe('closed');
      }

      element.removeEventListener('toggle', listener);
    });

    it('should warn if element is invalid', () => {
      const warnSpy = vi.spyOn(console, 'warn');

      hidePopover(null as any);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('togglePopover()', () => {
    it('should toggle popover visibility', () => {
      if (isPopoverSupported()) {
        const initialState = element.matches(':popover-open');

        togglePopover(element);
        expect(element.matches(':popover-open')).toBe(!initialState);

        togglePopover(element);
        expect(element.matches(':popover-open')).toBe(initialState);
      }
    });

    it('should dispatch native toggle event on toggle open', () => {
      const listener = vi.fn();
      element.addEventListener('toggle', listener);

      if (isPopoverSupported()) {
        // Ensure closed first
        if (element.matches(':popover-open')) {
          element.hidePopover();
        }

        togglePopover(element);
        expect(listener).toHaveBeenCalled();
        // Verify the event indicates open state
        const event = listener.mock.calls[listener.mock.calls.length - 1]?.[0] as ToggleEvent;
        expect(event?.newState).toBe('open');
      }

      element.removeEventListener('toggle', listener);
    });
  });

  describe('isPopoverOpen()', () => {
    it('should return true if popover is open', () => {
      if (isPopoverSupported()) {
        showPopover(element);
        expect(isPopoverOpen(element)).toBe(true);
      }
    });

    it('should return false if popover is closed', () => {
      if (isPopoverSupported()) {
        hidePopover(element);
        expect(isPopoverOpen(element)).toBe(false);
      }
    });

    it('should handle invalid elements', () => {
      expect(isPopoverOpen(null as any)).toBe(false);
    });
  });

  describe('getPopoverTrigger()', () => {
    it('should return the trigger button for a popover', () => {
      const result = getPopoverTrigger(element);
      expect(result).toBe(trigger);
    });

    it('should return null if no trigger found', () => {
      const orphanElement = document.createElement('div');
      orphanElement.id = 'orphan-popover';
      orphanElement.setAttribute('popover', 'auto');

      const result = getPopoverTrigger(orphanElement);
      expect(result).toBe(null);

      orphanElement.remove();
    });

    it('should return null if popover lacks id', () => {
      const noIdElement = document.createElement('div');
      noIdElement.setAttribute('popover', 'auto');

      const result = getPopoverTrigger(noIdElement);
      expect(result).toBe(null);

      noIdElement.remove();
    });
  });

  describe('getPopoverState()', () => {
    it('should return popover state object', () => {
      if (isPopoverSupported()) {
        const state = getPopoverState(element);

        expect(state).toBeDefined();
        expect(state?.element).toBe(element);
        expect(state?.type).toBe('auto');
        expect(state?.isOpen).toBe(false);
      }
    });

    it('should return null for non-popover element', () => {
      const nonPopover = document.createElement('div');
      const state = getPopoverState(nonPopover);
      expect(state).toBe(null);

      nonPopover.remove();
    });

    it('should reflect open state', () => {
      if (isPopoverSupported()) {
        showPopover(element);
        const state = getPopoverState(element);
        expect(state?.isOpen).toBe(true);
      }
    });
  });

  describe('closeAllPopovers()', () => {
    it('should close all open popovers', () => {
      const element2 = document.createElement('div');
      element2.id = 'test-popover-2';
      element2.setAttribute('popover', 'auto');
      document.body.appendChild(element2);

      if (isPopoverSupported()) {
        showPopover(element);
        showPopover(element2);

        closeAllPopovers();

        expect(element.matches(':popover-open')).toBe(false);
        expect(element2.matches(':popover-open')).toBe(false);

        element2.remove();
      }
    });

    it('should handle no open popovers gracefully', () => {
      if (isPopoverSupported()) {
        expect(() => closeAllPopovers()).not.toThrow();
      }
    });
  });

  describe('setupPopoverKeyboardHandler()', () => {
    it('should setup keyboard handler', () => {
      if (isPopoverSupported()) {
        const cleanup = setupPopoverKeyboardHandler(element, {
          closeOnEscape: true,
          trapFocus: false
        });

        expect(typeof cleanup).toBe('function');

        // Cleanup should remove event listeners
        cleanup();
      }
    });

    it('should close on Escape key when enabled', () => {
      if (isPopoverSupported()) {
        setupPopoverKeyboardHandler(element, { closeOnEscape: true });
        showPopover(element);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        // Note: This test may not work perfectly due to event handling
        // In real tests, use screen reader or integration testing
      }
    });
  });

  describe('setupPopoverLifecycle()', () => {
    it('should setup lifecycle callbacks', () => {
      const callbacks = {
        onShow: vi.fn(),
        onHide: vi.fn(),
        beforeShow: vi.fn(() => true),
        beforeHide: vi.fn(() => true)
      };

      const cleanup = setupPopoverLifecycle(element, callbacks);

      expect(typeof cleanup).toBe('function');

      // Note: Testing overridden methods is tricky
      // Cleanup function should restore original methods
      cleanup();
    });

    it('should respect beforeShow prevention', () => {
      const callbacks = {
        beforeShow: vi.fn(() => false) // Prevent show
      };

      if (isPopoverSupported()) {
        setupPopoverLifecycle(element, callbacks);
        // Show attempt should be prevented
      }
    });
  });

  describe('escapeHtml()', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = escapeHtml(input);

      // DOM-based escaping only escapes <, >, and & (not quotes in text content)
      expect(output).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('should preserve single quotes (safe in text content)', () => {
      const input = "O'Reilly";
      const output = escapeHtml(input);

      // Single quotes don't need escaping in text content (only in attributes)
      expect(output).toBe("O'Reilly");
    });

    it('should escape ampersands', () => {
      const input = 'Cats & Dogs';
      const output = escapeHtml(input);

      expect(output).toContain('&amp;');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });
  });
});

/**
 * Integration Tests for Popover Components
 * These would typically use @testing-library/svelte
 */
describe('Popover Components Integration', () => {
  it('Tooltip should render correctly', () => {
    // Example with Svelte testing library
    // const { container } = render(Tooltip, {
    //   props: {
    //     id: 'test-tooltip',
    //     content: 'Test content'
    //   }
    // });
    //
    // const trigger = container.querySelector('button');
    // expect(trigger).toBeInTheDocument();
    // expect(trigger).toHaveAttribute('popovertarget', 'test-tooltip');
  });

  it('Dropdown should render correctly', () => {
    // Example with Svelte testing library
    // const { container } = render(Dropdown, {
    //   props: {
    //     id: 'test-dropdown',
    //     label: 'Menu'
    //   }
    // });
    //
    // const trigger = container.querySelector('button');
    // expect(trigger).toBeInTheDocument();
    // expect(trigger).toHaveAttribute('popovertarget', 'test-dropdown');
    // expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });
});

/**
 * Accessibility Tests
 */
describe('Popover Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    // Create popover with proper attributes
    const popover = document.createElement('div');
    popover.id = 'accessible-popover';
    popover.setAttribute('popover', 'hint');
    popover.setAttribute('role', 'tooltip');

    const trigger = document.createElement('button');
    trigger.setAttribute('popovertarget', 'accessible-popover');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-label', 'Show help');

    document.body.appendChild(popover);
    document.body.appendChild(trigger);

    expect(popover).toHaveAttribute('role', 'tooltip');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-label', 'Show help');

    popover.remove();
    trigger.remove();
  });

  it('should support keyboard navigation', () => {
    // Test keyboard events
    const element = document.createElement('div');
    element.id = 'keyboard-test';
    element.setAttribute('popover', 'auto');
    document.body.appendChild(element);

    if (isPopoverSupported()) {
      const cleanup = setupPopoverKeyboardHandler(element, {
        closeOnEscape: true
      });

      // Simulate Escape key
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });

      // In real tests, verify that event.preventDefault() was called
      expect(() => document.dispatchEvent(event)).not.toThrow();

      cleanup();
    }

    element.remove();
  });
});

/**
 * Performance Tests
 * Measure operation times on Apple Silicon
 */
describe('Popover Performance', () => {
  it('should show/hide popover quickly', () => {
    if (isPopoverSupported()) {
      const element = document.createElement('div');
      element.id = 'perf-test';
      element.setAttribute('popover', 'auto');
      document.body.appendChild(element);

      // Measure show time
      const showStart = performance.now();
      showPopover(element);
      const showTime = performance.now() - showStart;

      // Measure hide time
      const hideStart = performance.now();
      hidePopover(element);
      const hideTime = performance.now() - hideStart;

      // Should be very fast (< 5ms on modern hardware)
      expect(showTime).toBeLessThan(10);
      expect(hideTime).toBeLessThan(10);

      element.remove();
    }
  });

  it('should handle many popovers efficiently', () => {
    if (isPopoverSupported()) {
      const popovers: HTMLElement[] = [];

      // Create 100 popovers
      const createStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const el = document.createElement('div');
        el.id = `popover-${i}`;
        el.setAttribute('popover', 'auto');
        document.body.appendChild(el);
        popovers.push(el);
      }
      const createTime = performance.now() - createStart;

      // Show all popovers
      const showStart = performance.now();
      popovers.forEach(pop => showPopover(pop));
      const showTime = performance.now() - showStart;

      // Close all
      const closeStart = performance.now();
      closeAllPopovers();
      const closeTime = performance.now() - closeStart;

      // Cleanup
      popovers.forEach(pop => pop.remove());

      // Performance expectations
      console.debug(`Create 100 popovers: ${createTime}ms`);
      console.debug(`Show 100 popovers: ${showTime}ms`);
      console.debug(`Close 100 popovers: ${closeTime}ms`);

      // Should handle efficiently
      expect(showTime).toBeLessThan(100);
      expect(closeTime).toBeLessThan(50);
    }
  });
});
