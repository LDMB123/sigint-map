/**
 * CSS Scroll-Driven Animations Utilities
 * Chrome 115+ (animation-timeline, animation-range)
 * Zero-JavaScript scroll effects using native CSS features
 *
 * Provides:
 * - Feature detection for scroll-driven animations
 * - Utility functions for named scroll timelines
 * - Helper functions for applying scroll animation classes
 * - Programmatic timeline management
 */

/**
 * Check if the browser supports CSS scroll-driven animations (Chrome 115+)
 * Tests for animation-timeline and related CSS properties
 */
export function isScrollAnimationsSupported(): boolean {
  // Check if CSS property animation-timeline is supported
  return CSS.supports('animation-timeline: scroll()');
}

/**
 * Check if the browser supports view() timeline
 * Allows animations based on element visibility
 */
export function isViewTimelineSupported(): boolean {
  return CSS.supports('animation-timeline: view()');
}

/**
 * Check if the browser supports animation-range
 * Allows precise control over animation timing
 */
export function isAnimationRangeSupported(): boolean {
  return CSS.supports('animation-range: entry 0% cover 50%');
}

/**
 * Get all CSS scroll animation properties supported by the browser
 */
export function getScrollAnimationFeatures() {
  return {
    scrollTimeline: isScrollAnimationsSupported(),
    viewTimeline: isViewTimelineSupported(),
    animationRange: isAnimationRangeSupported(),
    supported: isScrollAnimationsSupported() && isViewTimelineSupported(),
  };
}

/**
 * Apply a scroll animation class to an element
 * Handles fallback if scroll animations aren't supported
 */
export function applyScrollAnimation(
  element: HTMLElement,
  animationClass: ScrollAnimationClass,
  options?: { useFallback?: boolean }
): void {
  if (!element) return;

  if (isScrollAnimationsSupported()) {
    element.classList.add(animationClass);
  } else if (options?.useFallback !== false) {
    // Apply fade-in fallback animation
    element.classList.add('fade-in-fallback');
  }
}

/**
 * Remove a scroll animation class from an element
 */
export function removeScrollAnimation(
  element: HTMLElement,
  animationClass: ScrollAnimationClass
): void {
  if (element) {
    element.classList.remove(animationClass);
  }
}

/**
 * Apply scroll animations to all elements matching a selector
 */
export function applyScrollAnimationsToElements(
  selector: string,
  animationClass: ScrollAnimationClass
): void {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((el) => applyScrollAnimation(el, animationClass));
}

/**
 * Create a named scroll timeline on a container element
 * Enables child elements to animate based on container scroll
 */
export function createNamedScrollTimeline(
  containerElement: HTMLElement,
  timelineName: string,
  axis: 'block' | 'inline' = 'block'
): void {
  if (!containerElement) return;

  // Set CSS variables programmatically (if needed)
  containerElement.style.setProperty('--scroll-timeline-name', `--${timelineName}`);
  containerElement.style.setProperty('--scroll-timeline-axis', axis);
  containerElement.classList.add('scroll-timeline-container');
}

/**
 * Apply animation to an element tied to a named timeline
 */
export function applyTimelineAnimation(
  element: HTMLElement,
  timelineName: string,
  _keyframes: Keyframe[],
  _options?: { duration?: string; easing?: string }
): void {
  if (!element || !isScrollAnimationsSupported()) return;

  // Animation is applied via CSS variables
  element.style.setProperty('--animation-timeline', `--${timelineName}`);
  element.classList.add('timeline-item');
}

/**
 * Observe elements and apply scroll animations when they come into view
 * Fallback for when scroll-driven animations aren't supported
 */
export function observeScrollAnimations(
  selector: string = '[data-scroll-animate]'
): IntersectionObserver | null {
  if (isScrollAnimationsSupported()) {
    // Native scroll animations handle this - no need to observe
    return null;
  }

  // Fallback: Use Intersection Observer API
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('scroll-animated');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((el) => observer.observe(el));

  return observer;
}

/**
 * Calculate scroll progress percentage (0-100)
 * Useful for custom animations or debugging
 */
export function getScrollProgress(): number {
  if (typeof window === 'undefined') return 0;

  const docElement = document.documentElement;
  const total = docElement.scrollHeight - window.innerHeight;
  const current = window.scrollY;

  return total === 0 ? 0 : (current / total) * 100;
}

/**
 * Get current scroll position
 */
export function getScrollPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }

  return {
    x: window.scrollX || window.pageXOffset,
    y: window.scrollY || window.pageYOffset,
  };
}

/**
 * Disable all scroll animations (useful for testing or accessibility)
 */
export function disableScrollAnimations(): void {
  const style = document.createElement('style');
  style.id = 'scroll-animations-disabled';
  style.textContent = `
    @supports (animation-timeline: scroll()) {
      .scroll-fade-in,
      .scroll-slide-up,
      .scroll-slide-in-left,
      .scroll-slide-in-right,
      .scroll-scale-up,
      .parallax-slow,
      .parallax-medium,
      .parallax-fast,
      .scroll-card-reveal,
      .scroll-progress-bar {
        animation: none !important;
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Re-enable scroll animations
 */
export function enableScrollAnimations(): void {
  const style = document.getElementById('scroll-animations-disabled');
  if (style) {
    style.remove();
  }
}

/**
 * Check if reduced motion preference is enabled
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Listen for reduced motion preference changes
 */
export function onReducedMotionChange(callback: (prefers: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  // Legacy browsers
  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
}

/**
 * Get animation support information for debugging
 */
export function getScrollAnimationDebugInfo(): DebugInfo {
  return {
    supported: isScrollAnimationsSupported(),
    features: getScrollAnimationFeatures(),
    scrollProgress: getScrollProgress(),
    scrollPosition: getScrollPosition(),
    prefersReducedMotion: prefersReducedMotion(),
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    documentHeight: typeof document !== 'undefined' ? document.documentElement.scrollHeight : 0,
  };
}

/**
 * List of available scroll animation CSS classes
 */
export const SCROLL_ANIMATION_CLASSES = {
  // Fade animations
  fadeIn: 'scroll-fade-in',
  fadeThrough: 'scroll-fade-through',

  // Slide animations
  slideUp: 'scroll-slide-up',
  slideInLeft: 'scroll-slide-in-left',
  slideInRight: 'scroll-slide-in-right',

  // Scale animations
  scaleUp: 'scroll-scale-up',

  // Parallax
  parallaxSlow: 'parallax-slow',
  parallaxMedium: 'parallax-medium',
  parallaxFast: 'parallax-fast',

  // Stagger
  staggerItem: 'scroll-stagger-item',

  // Card/Section
  cardReveal: 'scroll-card-reveal',
  sectionReveal: 'scroll-section-reveal',

  // Special effects
  clipReveal: 'scroll-clip-reveal',
  clipRevealBottom: 'scroll-clip-reveal-bottom',
  revealOnHover: 'scroll-reveal-on-hover',
  epicReveal: 'scroll-epic-reveal',

  // Advanced
  galleryItem: 'scroll-gallery-item',
  counter: 'scroll-counter',
  borderAnimate: 'scroll-border-animate',
  colorChange: 'scroll-color-change',
  rotate: 'scroll-rotate',
  blurIn: 'scroll-blur-in',

  // Progress bar
  progressBar: 'scroll-progress-bar',
} as const;

/**
 * Type definitions
 */
export type ScrollAnimationClass = (typeof SCROLL_ANIMATION_CLASSES)[keyof typeof SCROLL_ANIMATION_CLASSES];

export interface DebugInfo {
  supported: boolean;
  features: {
    scrollTimeline: boolean;
    viewTimeline: boolean;
    animationRange: boolean;
    supported: boolean;
  };
  scrollProgress: number;
  scrollPosition: { x: number; y: number };
  prefersReducedMotion: boolean;
  viewportHeight: number;
  documentHeight: number;
}

/**
 * Initialize scroll animations on page load
 * Call this in your root layout component
 */
export function initializeScrollAnimations(): void {
  if (typeof window === 'undefined') return;

  // Log support info in development
  if (import.meta.env.DEV) {
    const info = getScrollAnimationDebugInfo();
    if (!info.supported) {
      console.warn('Scroll-driven animations not supported. Using CSS fallbacks.');
    }
  }

  // Set up fallback observer if needed
  if (!isScrollAnimationsSupported()) {
    observeScrollAnimations();
  }

  // Watch for reduced motion preference changes
  onReducedMotionChange((prefers) => {
    if (prefers) {
      disableScrollAnimations();
    } else {
      enableScrollAnimations();
    }
  });
}
