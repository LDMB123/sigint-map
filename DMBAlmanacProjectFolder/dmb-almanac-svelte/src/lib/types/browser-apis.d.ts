/**
 * Type declarations for modern browser APIs not yet in standard lib.dom.d.ts
 *
 * These types are conditionally available in:
 * - Chrome 129+: scheduler.yield() API
 * - Chrome 109+: document.prerendering property
 * - Chrome 121+: Speculation Rules API
 * - Chrome 123+: Long Animation Frames API
 *
 * Reference:
 * - Scheduler API: https://developer.mozilla.org/en-US/docs/Web/API/Scheduler
 * - Speculation Rules: https://developer.chrome.com/docs/web-platform/speculation-rules/
 * - Long Animation Frames: https://w3c.github.io/long-animation-frames/
 */

// ==================== SCHEDULER API ====================

/**
 * Options for scheduler.yield() method
 * https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield
 */
export interface YieldOptions {
  /**
   * Priority for execution after yielding
   * - 'user-blocking': Critical work visible to user (default)
   * - 'user-visible': Visible work but less critical
   * - 'background': Background work, can defer longer
   */
  priority?: 'user-blocking' | 'user-visible' | 'background';
}

/**
 * Options for scheduler.postTask() method
 */
export interface PostTaskOptions {
  priority?: 'user-blocking' | 'user-visible' | 'background';
  delay?: number;
  signal?: AbortSignal;
}

/**
 * Scheduler interface for task scheduling and yielding
 * Available as globalThis.scheduler in Chrome 129+
 */
export interface Scheduler {
  /**
   * Yield to allow browser to process higher priority work
   * Used to keep Interaction to Next Paint (INP) below 100ms
   *
   * @param options - Yield options with optional priority
   * @returns Promise that resolves when browser resumes execution
   *
   * @example
   * async function processLargeArray(items) {
   *   for (const item of items) {
   *     processItem(item);
   *     await scheduler.yield({ priority: 'user-visible' });
   *   }
   * }
   */
  yield(options?: YieldOptions): Promise<void>;

  /**
   * Schedule a task for later execution
   * Returns a promise that resolves with the task's return value
   *
   * @param callback - Function to execute
   * @param options - Scheduling options
   * @returns Promise resolving to callback's return value
   */
  postTask<T>(
    callback: () => T | Promise<T>,
    options?: PostTaskOptions
  ): Promise<T>;
}

declare global {
  /**
   * Scheduler API for task scheduling and yielding
   * Available in Chrome 129+
   */
  var scheduler: Scheduler | undefined;
}

// ==================== NAVIGATOR EXTENSIONS ====================

/**
 * Check if user is attempting input (experimental)
 * Requires: --enable-features=ExperimentalIsInputPending
 *
 * Returns true if user is attempting input (mouse, keyboard, touch)
 * Used to interrupt long tasks when user interacts
 *
 * @returns true if user input is pending, false otherwise
 *
 * @example
 * if ('isInputPending' in navigator) {
 *   if (navigator.isInputPending?.()) {
 *     await scheduler.yield();
 *   }
 * }
 */
declare global {
  interface Navigator {
    isInputPending?(): boolean;
  }
}

// ==================== DOCUMENT EXTENSIONS ====================

declare global {
  interface Document {
    /**
     * Whether this page is currently prerendered
     * Available in Chrome 109+
     *
     * Use to defer non-critical work (analytics, tracking)
     * until page becomes visible to user
     *
     * @example
     * if (!document.prerendering) {
     *   // Page is visible - safe to initialize analytics
     *   gtag('event', 'page_view');
     * }
     */
    readonly prerendering?: boolean;
  }

  interface DocumentEventMap {
    /**
     * Event fired when prerendered page becomes visible
     */
    prerenderingchange: Event;
  }
}

// ==================== LONG ANIMATION FRAMES API ====================

/**
 * Entry for Long Animation Frames (LoAF) API
 * Chrome 123+ - helps debug Interaction to Next Paint (INP) issues
 *
 * @see https://w3c.github.io/long-animation-frames/
 */
export interface PerformanceEntryWithLongAnimationFrame extends PerformanceEntry {
  readonly entryType: 'long-animation-frame';

  /** Total duration of the animation frame */
  readonly duration: number;

  /** Time before first input response within frame */
  readonly renderStart: number;

  /** Duration of rendering within frame */
  readonly renderDuration: number;

  /** Duration blocking user input */
  readonly blockingDuration: number;

  /** Scripts that ran during this frame */
  readonly scripts: PerformanceScriptTiming[];

  /** First input timestamp within frame (if any) */
  readonly firstInputTime?: number;

  /** First input delay */
  readonly firstInputDelay?: number;
}

/**
 * Individual script timing within a Long Animation Frame
 */
export interface PerformanceScriptTiming {
  /** URL of the script */
  readonly sourceURL: string;

  /** Function name (if available) */
  readonly sourceFunctionName: string;

  /** Source location where function was invoked */
  readonly sourceCharPosition: number;

  /** Code that invoked this function */
  readonly invoker: string;

  /** How long this script ran */
  readonly duration: number;

  /** When script started */
  readonly startTime: number;

  /** Event type that triggered execution (if applicable) */
  readonly executionStart: number;

  /** Was this script execution forced by style/layout */
  readonly forcedStyleAndLayoutDuration?: number;

  /** Script classification (e.g., 'event-listener', 'user-callback') */
  readonly scriptType?: 'event-listener' | 'user-callback' | 'script-tag';
}

declare global {
  interface PerformanceEntryMap {
    'long-animation-frame': PerformanceEntryWithLongAnimationFrame;
  }
}

// ==================== SPECULATION RULES API ====================

/**
 * Eagerness levels for speculation rules
 * Determines how aggressively to prerender/prefetch
 */
export type SpeculationRulesEagerness =
  | 'immediate' // Start immediately
  | 'eager' // Start early but after page load
  | 'moderate' // Balanced approach (default)
  | 'conservative'; // Only on user interaction

/**
 * Prerender rule specification
 */
export interface SpeculationRulesPrerender {
  urls: string[];
  eagerness?: SpeculationRulesEagerness;
  where?: SpeculationRulesSelector;
}

/**
 * Prefetch rule specification (lower cost than prerender)
 */
export interface SpeculationRulesPrefetch {
  urls: string[];
  eagerness?: SpeculationRulesEagerness;
  where?: SpeculationRulesSelector;
}

/**
 * CSS selector for dynamically generated speculation rules
 */
interface SpeculationRulesSelector {
  href_matches?: string[];
  selector_matches?: string[];
  not?: SpeculationRulesSelector;
}

/**
 * Full Speculation Rules document body
 */
interface SpeculationRulesDocument {
  prerender?: SpeculationRulesPrerender[];
  prefetch?: SpeculationRulesPrefetch[];
}

declare global {
  interface Document {
    /**
     * Speculation Rules are supported when 'speculationrules' appears in document
     * Check with: if ('speculationrules' in document)
     */
    'speculationrules'?: boolean;
  }
}

// Export empty to make this file recognized as an external module for augmentation
export { };
