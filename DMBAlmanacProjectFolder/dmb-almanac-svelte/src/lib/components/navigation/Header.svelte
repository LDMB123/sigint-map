<script lang="ts">
  import { page } from "$app/stores";
  import { browser } from "$app/environment";

  /**
   * Header Component - Zero JavaScript mobile menu
   *
   * Svelte 5 + Chromium 143+ Optimization: Uses native HTML <details>/<summary> for mobile menu
   * - No Svelte state needed for toggle
   * - CSS handles all animations via :has([open])
   * - Escape key handled natively by browser
   * - Auto-closes on navigation via page reactivity
   *
   * Lines removed from React version: ~35 (useState, onClick handlers, conditional rendering)
   */

  interface NavItem {
    label: string;
    href: string;
    children?: { label: string; href: string }[];
  }

  const navigation: NavItem[] = [
    {
      label: "Tours",
      href: "/tours",
      children: [
        { label: "All Tours", href: "/tours" },
        { label: "2025", href: "/tours/2025" },
        { label: "2024", href: "/tours/2024" },
        { label: "2023", href: "/tours/2023" },
      ],
    },
    { label: "Songs", href: "/songs" },
    { label: "Venues", href: "/venues" },
    { label: "Guests", href: "/guests" },
    { label: "Discography", href: "/discography" },
    { label: "Liberation", href: "/liberation" },
    { label: "Stats", href: "/stats" },
    { label: "Visualizations", href: "/visualizations" },
    { label: "Search", href: "/search" },
    { label: "My Shows", href: "/my-shows" },
  ];

  let mobileMenuDetails = $state<HTMLDetailsElement | null>(null);

  // Auto-close mobile menu when page changes
  $effect(() => {
    if (browser && mobileMenuDetails && $page) {
      mobileMenuDetails.open = false;
    }
  });

  function isActive(href: string): boolean {
    return (
      $page.url.pathname === href || $page.url.pathname.startsWith(href + "/")
    );
  }
</script>

<header class="app-header header">
  <div class="container">
    <!-- Logo -->
    <a href="/" class="logo" aria-label="DMB Almanac Home">
      <span class="logoIcon" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
          <circle cx="16" cy="16" r="4" fill="currentColor" />
          <path
            d="M16 6 L18 14 L16 12 L14 14 Z"
            fill="currentColor"
            transform="rotate(0 16 16)"
          />
          <path
            d="M16 6 L18 14 L16 12 L14 14 Z"
            fill="currentColor"
            transform="rotate(72 16 16)"
          />
          <path
            d="M16 6 L18 14 L16 12 L14 14 Z"
            fill="currentColor"
            transform="rotate(144 16 16)"
          />
          <path
            d="M16 6 L18 14 L16 12 L14 14 Z"
            fill="currentColor"
            transform="rotate(216 16 16)"
          />
          <path
            d="M16 6 L18 14 L16 12 L14 14 Z"
            fill="currentColor"
            transform="rotate(288 16 16)"
          />
        </svg>
      </span>
      <span class="logoText" aria-hidden="true">
        <span class="logoPrimary">DMB</span>
        <span class="logoSecondary">Almanac</span>
      </span>
    </a>

    <!-- Desktop Navigation -->
    <nav class="nav" aria-label="Main navigation">
      {#each navigation as item}
        <a
          href={item.href}
          class="navLink"
          aria-current={isActive(item.href) ? "page" : undefined}
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <!-- Mobile Menu - CSS-only toggle using <details>/<summary> -->
    <details class="mobileMenuDetails" bind:this={mobileMenuDetails}>
      <summary
        class="menuButton"
        aria-label="Mobile navigation menu"
        aria-controls="mobile-navigation"
      >
        <span class="menuIcon" aria-hidden="true">
          <!-- Hamburger icon - transforms to X via CSS when [open] -->
          <span class="menuLine"></span>
          <span class="menuLine"></span>
          <span class="menuLine"></span>
        </span>
      </summary>

      <!-- Mobile Navigation - rendered inside details, shown/hidden by browser -->
      <nav
        id="mobile-navigation"
        class="mobileNav"
        aria-label="Mobile navigation"
      >
        {#each navigation as item, index}
          <a
            href={item.href}
            class="mobileNavLink"
            aria-current={isActive(item.href) ? "page" : undefined}
            style="--stagger-index: {index + 1}"
          >
            {item.label}
          </a>
        {/each}
      </nav>
    </details>
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: var(--z-sticky);

    /* GPU acceleration for smooth sticky behavior */
    transform: translateZ(0);
    backface-visibility: hidden;

    /* Safe area support for MacBook Pro notch */
    padding-top: var(--safe-area-inset-top);

    /* Containment for Metal rendering optimization */
    contain: layout style;

    /* Enhanced frosted glass effect */
    background: var(--glass-bg-strong);
    backdrop-filter: var(--glass-blur-strong) var(--glass-saturation);
    -webkit-backdrop-filter: var(--glass-blur-strong) var(--glass-saturation);

    /* Borders and shadows for depth */
    border-bottom: 1px solid var(--glass-border);
    box-shadow:
      inset 0 1px 0 0 oklch(1 0 0 / 0.12),
      0 1px 3px 0 rgb(0 0 0 / 0.06),
      0 4px 12px -4px rgb(0 0 0 / 0.05);

    /* Week 5: Adaptive Header Shrinking with Scroll-Driven Animation */
    /* Shrinks header height as user scrolls down for more content space */
    /* Chrome 115+ scroll-timeline support */
  }

  /* Adaptive header shrinking on scroll (Chrome 115+) */
  @supports (animation-timeline: scroll()) {
    .header {
      /* Animate header shrinking as user scrolls */
      animation: shrinkHeader linear both;
      animation-timeline: scroll(root);
      animation-range: 0px 200px; /* Shrink during first 200px of scroll */
      will-change: padding, backdrop-filter;
    }

    @keyframes shrinkHeader {
      from {
        /* Full height at top of page */
        padding-block: var(--space-3);
        backdrop-filter: var(--glass-blur-strong) var(--glass-saturation);
      }
      to {
        /* Compact height when scrolled */
        padding-block: var(--space-2);
        backdrop-filter: blur(20px) saturate(180%);
        box-shadow:
          inset 0 1px 0 0 oklch(1 0 0 / 0.08),
          0 2px 8px 0 rgb(0 0 0 / 0.1);
      }
    }

    /* Logo shrinks proportionally */
    .logo {
      animation: shrinkLogo linear both;
      animation-timeline: scroll(root);
      animation-range: 0px 200px;
      will-change: transform;
    }

    @keyframes shrinkLogo {
      from {
        transform: scale(1);
      }
      to {
        transform: scale(0.9);
      }
    }

    /* Desktop nav links reduce padding */
    .navLink {
      animation: shrinkNavLink linear both;
      animation-timeline: scroll(root);
      animation-range: 0px 200px;
      will-change: padding;
    }

    @keyframes shrinkNavLink {
      from {
        padding-block: var(--space-2);
      }
      to {
        padding-block: var(--space-1);
      }
    }
  }

  /* Scroll progress indicator */
  .header::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background: linear-gradient(
      90deg,
      var(--color-primary-500),
      var(--color-accent-cyan),
      var(--color-primary-500)
    );
    transform: scaleX(0);
    transform-origin: left;
    opacity: 0;
    transition: opacity 200ms ease;
  }

  /* Activate progress bar with scroll-driven animation when supported */
  @supports (animation-timeline: scroll()) {
    .header::after {
      opacity: 1;
      animation: scrollProgress linear both;
      animation-timeline: scroll(root);
    }

    @keyframes scrollProgress {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }
  }

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: var(--container-xl);
    margin: 0 auto;
    padding: var(--space-3) var(--space-4);
  }

  @media (min-width: 640px) {
    .container {
      padding: var(--space-3) var(--space-6);
    }
  }

  /* Logo */
  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
    color: var(--foreground);
    transition: transform var(--transition-fast);
  }

  .logo:hover {
    text-decoration: none;
    transform: scale(1.02);
  }

  .logo:active {
    transform: scale(0.98);
  }

  .logoIcon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    color: var(--color-primary-500);
    transition:
      color var(--transition-fast),
      transform var(--transition-fast);
  }

  .logo:hover .logoIcon {
    color: var(--color-primary-600);
    transform: rotate(10deg);
  }

  .logoIcon svg {
    width: 100%;
    height: 100%;
  }

  .logoText {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .logoPrimary {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--foreground);
    letter-spacing: var(--tracking-tight);
  }

  .logoSecondary {
    font-size: var(--text-xs);
    font-weight: var(--font-medium);
    color: var(--foreground-secondary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Desktop Navigation */
  .nav {
    display: none;
    align-items: center;
    gap: var(--space-1);
  }

  @media (min-width: 1024px) {
    .nav {
      display: flex;
    }
  }

  .navLink {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--foreground-secondary);
    text-decoration: none;
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;

    /* GPU-optimized transitions for 120Hz hover */
    transition:
      color 200ms var(--ease-smooth),
      background-color 200ms var(--ease-smooth),
      transform 200ms var(--ease-spring);

    /* GPU acceleration */
    transform: translateZ(0);
  }

  /* Hover background glow */
  .navLink::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at center,
      oklch(0.7 0.19 82 / 0.12) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 200ms ease;
    border-radius: inherit;
  }

  .navLink:hover::before {
    opacity: 1;
  }

  .navLink:hover {
    color: var(--foreground);
    background-color: color-mix(in oklch, var(--foreground) 6%, transparent);
    text-decoration: none;
    transform: translateY(-2px);
  }

  .navLink:active {
    transform: translateY(0) scale(0.98);
    transition-duration: 100ms;
  }

  .navLink[aria-current="page"] {
    color: var(--color-primary-600);
    background: linear-gradient(
      135deg,
      var(--color-primary-50),
      color-mix(in oklch, var(--color-primary-100) 70%, var(--background))
    );
    font-weight: var(--font-semibold);
    box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.15);
  }

  /* Active indicator underline with animated glow */
  .navLink::after {
    content: "";
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: calc(100% - var(--space-6));
    height: 3px;
    background: linear-gradient(
      90deg,
      var(--color-primary-400),
      var(--color-primary-500),
      var(--color-primary-400)
    );
    border-radius: var(--radius-full);
    transition: transform 250ms var(--ease-spring);
    box-shadow: 0 0 8px oklch(0.7 0.19 82 / 0.4);
  }

  .navLink[aria-current="page"]::after {
    transform: translateX(-50%) scaleX(1);
  }

  .navLink:hover::after {
    transform: translateX(-50%) scaleX(0.6);
  }

  .navLink[aria-current="page"]:hover::after {
    transform: translateX(-50%) scaleX(1.05);
  }

  /* ==========================================
   * Mobile Menu - CSS-only <details>/<summary>
   * Zero JavaScript toggle implementation
   * ========================================== */

  .mobileMenuDetails {
    display: block;
  }

  @media (min-width: 1024px) {
    .mobileMenuDetails {
      display: none;
    }
  }

  /* Remove default details marker */
  .mobileMenuDetails > :global(summary) {
    list-style: none;
  }

  .mobileMenuDetails > :global(summary::-webkit-details-marker) {
    display: none;
  }

  .mobileMenuDetails > :global(summary::marker) {
    display: none;
  }

  /* Mobile Menu Button - Enhanced */
  .menuButton {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--foreground);
    border-radius: var(--radius-lg);
    transition:
      background-color var(--transition-fast),
      transform var(--transition-fast);
  }

  .menuButton:hover {
    background-color: var(--background-secondary);
  }

  .menuButton:active {
    transform: scale(0.95);
  }

  .menuIcon {
    display: flex;
    flex-direction: column;
    place-items: center;
    width: 24px;
    height: 24px;
    gap: 5px;
  }

  /* Hamburger lines that transform to X */
  .menuLine {
    display: block;
    width: 20px;
    height: 2px;
    background-color: currentColor;
    border-radius: var(--radius-full);
    transition:
      transform 200ms var(--ease-smooth),
      opacity 200ms var(--ease-smooth);
    transform-origin: center;
  }

  /* Transform hamburger to X when details is open */
  .mobileMenuDetails[open] .menuLine:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }

  .mobileMenuDetails[open] .menuLine:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }

  .mobileMenuDetails[open] .menuLine:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }

  /* Mobile Navigation - Enhanced with animations */
  .mobileNav {
    /* Position below header, full width */
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    padding: var(--space-2) var(--space-4) var(--space-4);
    border-top: 1px solid var(--border-color);
    background-color: var(--background);
    animation: slideDown 200ms var(--ease-out-expo);
    transform-origin: top;

    /* Ensure it's above other content */
    z-index: var(--z-dropdown, 50);
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (min-width: 1024px) {
    .mobileNav {
      display: none;
    }
  }

  .mobileNavLink {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    font-size: var(--text-base);
    font-weight: var(--font-medium);
    color: var(--foreground-secondary);
    text-decoration: none;
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
    /* Minimum touch target size */
    min-height: 48px;
  }

  .mobileNavLink:hover {
    color: var(--foreground);
    background-color: var(--background-secondary);
    text-decoration: none;
  }

  .mobileNavLink:active {
    background-color: var(--background-tertiary);
    transform: scale(0.98);
  }

  .mobileNavLink[aria-current="page"] {
    color: var(--color-primary-600);
    background-color: var(--color-primary-50);
    font-weight: var(--font-semibold);
  }

  /* Active indicator for mobile */
  .mobileNavLink[aria-current="page"]::before {
    content: "";
    width: 4px;
    height: 24px;
    background-color: var(--color-primary-500);
    border-radius: var(--radius-full);
    margin-right: calc(var(--space-3) * -1);
  }

  /* Staggered animation for mobile nav items via data-index attribute */
  /* CSS-first: Uses data-index for scalable stagger delays */
  .mobileNavLink {
    --stagger-delay: 20ms;
    animation: slideInFromRight 200ms var(--ease-out-expo) both;
    animation-delay: calc(var(--stagger-index, 0) * var(--stagger-delay));
  }

  /* Stagger index is now set via inline style for scalability */

  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(16px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .header {
      background-color: color-mix(in oklch, var(--background) 80%, transparent);
      border-bottom-color: var(--color-gray-700);
      box-shadow:
        inset 0 1px 0 0 rgb(255 255 255 / 0.03),
        0 1px 3px 0 rgb(0 0 0 / 0.2);
    }

    .navLink:hover {
      background-color: color-mix(in oklch, var(--foreground) 8%, transparent);
    }

    .navLink[aria-current="page"],
    .mobileNavLink[aria-current="page"] {
      background-color: oklch(0.7 0.19 82 / 0.15);
      color: var(--color-primary-400);
    }

    .navLink[aria-current="page"]::after,
    .mobileNavLink[aria-current="page"]::before {
      background-color: var(--color-primary-400);
    }

    .mobileNav {
      background-color: color-mix(in oklch, var(--background) 95%, transparent);
      border-top-color: var(--color-gray-700);
    }

    .logo:hover .logoIcon {
      color: var(--color-primary-400);
    }
  }

  /* Accessibility: Focus indicators */
  .navLink:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  .mobileNavLink:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  .logo:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 4px;
    border-radius: var(--radius-md);
  }

  .menuButton:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
    border-radius: var(--radius-md);
  }

  /* High Contrast Mode support */
  @media (forced-colors: active) {
    .navLink:focus-visible,
    .mobileNavLink:focus-visible,
    .logo:focus-visible,
    .menuButton:focus-visible {
      outline: 2px solid Highlight;
    }

    .navLink[aria-current="page"],
    .mobileNavLink[aria-current="page"] {
      border: 2px solid Highlight;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .mobileNav,
    .mobileNavLink,
    .navLink::after,
    .logo,
    .menuIcon {
      animation: none;
      transition: none;
    }
  }
</style>
