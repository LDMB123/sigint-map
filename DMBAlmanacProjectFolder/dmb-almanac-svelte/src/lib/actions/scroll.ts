/**
 * Svelte Actions for Scroll-Driven Animations
 * Easy-to-use directives: use:scrollFadeIn, use:parallax, etc.
 *
 * Usage:
 * <div use:scrollFadeIn>Content fades in on scroll</div>
 * <div use:parallax={{ speed: 0.5 }}>Parallax background</div>
 */

import { isScrollAnimationsSupported } from '$lib/utils/scrollAnimations';
import type { ScrollAnimationClass } from '$lib/utils/scrollAnimations';

/**
 * Generic scroll animation action
 * Applies a CSS class for scroll-driven animation
 */
export function scrollAnimate(
  element: HTMLElement,
  animationClass: ScrollAnimationClass
): { destroy: () => void } {
  if (isScrollAnimationsSupported()) {
    element.classList.add(animationClass);
  }

  return {
    destroy() {
      element.classList.remove(animationClass);
    },
  };
}

/**
 * Fade in on scroll - common pattern
 * Element becomes visible as it enters viewport
 */
export function scrollFadeIn(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-fade-in');
}

/**
 * Slide up on scroll - cards, sections
 * Element slides in from bottom with fade
 */
export function scrollSlideUp(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-slide-up');
}

/**
 * Slide in from left on scroll
 */
export function scrollSlideInLeft(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-slide-in-left');
}

/**
 * Slide in from right on scroll
 */
export function scrollSlideInRight(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-slide-in-right');
}

/**
 * Scale up on scroll - for emphasis
 * Element grows from 0.9 to 1 scale
 */
export function scrollScaleUp(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-scale-up');
}

/**
 * Parallax effect - background moves slower than scroll
 * Options:
 * - speed: 0-1, where lower = slower (more parallax)
 */
export function parallax(
  element: HTMLElement,
  options?: { speed?: 'slow' | 'medium' | 'fast' }
): { destroy: () => void } {
  const speed = options?.speed ?? 'medium';
  const speedClass = `parallax-${speed}`;

  if (isScrollAnimationsSupported()) {
    element.classList.add(speedClass);
  }

  return {
    destroy() {
      element.classList.remove(speedClass);
    },
  };
}

/**
 * Card reveal on scroll - fade + slide + scale
 * Great for gallery cards, product cards, etc.
 */
export function scrollCardReveal(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-card-reveal');
}

/**
 * Section reveal on scroll
 */
export function scrollSectionReveal(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-section-reveal');
}

/**
 * Clip path reveal from left
 * Text or content reveals horizontally
 */
export function scrollClipReveal(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-clip-reveal');
}

/**
 * Clip path reveal from bottom
 * Text or content reveals from bottom
 */
export function scrollClipRevealBottom(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-clip-reveal-bottom');
}

/**
 * Epic reveal - slide + fade + scale + rotate
 * Maximum visual impact for hero sections
 */
export function scrollEpicReveal(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-epic-reveal');
}

/**
 * Gallery item animation
 * Items scale and fade as they move through viewport
 */
export function scrollGalleryItem(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-gallery-item');
}

/**
 * Blur in on scroll
 * Content comes into focus as it enters viewport
 */
export function scrollBlurIn(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-blur-in');
}

/**
 * Rotate on scroll
 * Element rotates as user scrolls
 */
export function scrollRotate(element: HTMLElement): { destroy: () => void } {
  return scrollAnimate(element, 'scroll-rotate');
}

/**
 * Staggered animations for lists
 * Apply to container, children animate with delay
 */
export function scrollStagger(element: HTMLElement): { destroy: () => void } {
  if (isScrollAnimationsSupported()) {
    element.classList.add('scroll-stagger-container');
    const children = element.querySelectorAll('[data-stagger-item]');
    children.forEach((child) => {
      (child as HTMLElement).classList.add('scroll-stagger-item');
    });
  }

  return {
    destroy() {
      element.classList.remove('scroll-stagger-container');
      const children = element.querySelectorAll('[data-stagger-item]');
      children.forEach((child) => {
        (child as HTMLElement).classList.remove('scroll-stagger-item');
      });
    },
  };
}

/**
 * Advanced options for scroll animations
 */
export interface ScrollAnimateOptions {
  // Animation type
  animation?: ScrollAnimationClass;

  // Custom animation range (Chrome 115+)
  animationRange?: string; // e.g., "entry 0% cover 50%"

  // Custom timing function
  timingFunction?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

  // Enable/disable based on media query
  mediaQuery?: string;

  // Callback when animation starts
  onStart?: () => void;

  // Callback when animation completes
  onComplete?: () => void;

  // Debug mode
  debug?: boolean;
}

/**
 * Advanced scroll animation action with options
 */
export function scrollAnimateAdvanced(
  element: HTMLElement,
  options: ScrollAnimateOptions
): { destroy: () => void } {
  const {
    animation = 'scroll-fade-in',
    animationRange,
    timingFunction = 'linear',
    mediaQuery,
    onStart,
    onComplete: _onComplete,
    debug,
  } = options;

  // Check media query if specified
  if (mediaQuery && !window.matchMedia(mediaQuery).matches) {
    return { destroy: () => {
      // Intentionally empty
    } };
  }

  if (isScrollAnimationsSupported()) {
    element.classList.add(animation);

    // Set custom animation range via CSS custom properties
    if (animationRange) {
      element.style.setProperty('--animation-range', animationRange);
    }

    // Set custom timing function
    element.style.setProperty('--animation-timing', timingFunction);

    if (debug) {
      console.warn('Scroll animation applied:', {
        element,
        animation,
        animationRange,
        timingFunction,
      });
    }

    // Callback support (basic - would need animation events)
    onStart?.();
  }

  return {
    destroy() {
      element.classList.remove(animation);
      if (animationRange) {
        element.style.removeProperty('--animation-range');
      }
      element.style.removeProperty('--animation-timing');
    },
  };
}

/**
 * Conditional scroll animation based on media query
 * Example: only animate on desktop
 */
export function scrollAnimateResponsive(
  element: HTMLElement,
  options: {
    mobile?: ScrollAnimationClass;
    tablet?: ScrollAnimationClass;
    desktop?: ScrollAnimationClass;
  }
): { destroy: () => void } {
  const getAnimation = (): ScrollAnimationClass | null => {
    if (window.matchMedia('(max-width: 640px)').matches) {
      return options.mobile ?? null;
    }
    if (window.matchMedia('(max-width: 1024px)').matches) {
      return options.tablet ?? null;
    }
    return options.desktop ?? null;
  };

  let currentAnimation = getAnimation();

  if (currentAnimation && isScrollAnimationsSupported()) {
    element.classList.add(currentAnimation);
  }

  const handleResize = () => {
    const newAnimation = getAnimation();
    if (newAnimation !== currentAnimation) {
      if (currentAnimation) {
        element.classList.remove(currentAnimation);
      }
      if (newAnimation) {
        element.classList.add(newAnimation);
      }
      currentAnimation = newAnimation;
    }
  };

  // Passive flag: resize events can't be prevented, passive improves performance
  window.addEventListener('resize', handleResize, { passive: true });

  return {
    destroy() {
      window.removeEventListener('resize', handleResize);
      if (currentAnimation) {
        element.classList.remove(currentAnimation);
      }
    },
  };
}
