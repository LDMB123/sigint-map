---
name: speculation-rules
description: Configure Speculation Rules API to prerender pages and improve LCP through prefetching and prerendering
trigger: /speculation-rules
used_by: [full-stack-developer, senior-frontend-engineer, performance-engineer]
---

# Speculation Rules API (Chrome 121+)

Enable prerendering of likely navigation targets to reduce LCP (Largest Contentful Paint) from ~2.5s to ~0.3s for prerendered pages.

**Chromium 2025 Baseline:** Chrome 121+ provides production-ready prerendering and prefetching. Instant page loads for predictable navigation.

## When to Use

- Multi-page applications (MPAs) or traditional server-rendered sites
- High-traffic navigation paths (product pages, search results, pagination)
- Improving perceived performance for user journeys
- LCP scores > 2.5s that need improvement
- Sites with predictable navigation patterns
- E-commerce product browsing, article reading, documentation sites

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| Navigation Patterns | array | Yes | URLs or URL patterns to prerender |
| Eagerness Level | string | Yes | How aggressively to prerender (conservative, moderate, eager, immediate) |
| Framework | string | Yes | SvelteKit, Next.js, vanilla HTML, etc. |
| Server Support | boolean | No | Whether server supports prerendering |

## Steps

### 1. Static Implementation (Recommended for Getting Started)

Add directly to your HTML template (before closing `</head>`):

```html
<!-- index.html or app.html -->
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/products/*" },
      "eagerness": "moderate"
    },
    {
      "where": { "href_matches": "/blog/*" },
      "eagerness": "conservative"
    },
    {
      "where": { "href_matches": "/docs/*" },
      "eagerness": "conservative"
    }
  ],
  "prefetch": [
    {
      "where": { "href_matches": "/*" },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

### 2. Dynamic Implementation (Advanced)

Create utility functions for runtime injection:

```typescript
// utils/speculation-rules.ts

/**
 * Add speculation rule for specific URLs
 */
export function addSpeculationRule(
  urls: string[],
  eagerness: 'conservative' | 'moderate' | 'eager' | 'immediate' = 'moderate'
): void {
  if (!('speculationrules' in HTMLScriptElement)) {
    console.warn('Speculation Rules not supported');
    return;
  }

  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    prerender: [
      {
        source: 'list',
        urls: urls,
        eagerness: eagerness
      }
    ]
  });

  document.head.appendChild(script);
}

/**
 * Prerender on hover intent (200ms hover delay)
 */
export function prerenderOnHoverIntent(
  selector: string,
  getUrl: (element: Element) => string
): void {
  let hoverTimeout: number | null = null;
  let lastUrl: string | null = null;

  document.addEventListener('mouseover', (e) => {
    const target = (e.target as Element).closest(selector);
    if (!target) return;

    const url = getUrl(target);
    if (!url || url === lastUrl) return;

    hoverTimeout = window.setTimeout(() => {
      addSpeculationRule([url], 'eager');
      lastUrl = url;
    }, 200);  // 200ms hover intent threshold
  });

  document.addEventListener('mouseout', (e) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  });
}

/**
 * Add URL pattern-based speculation rules
 */
export function addPatternSpeculationRule(
  pattern: string,
  eagerness: 'conservative' | 'moderate' | 'eager' | 'immediate' = 'moderate',
  type: 'prerender' | 'prefetch' = 'prerender'
): void {
  if (!('speculationrules' in HTMLScriptElement)) return;

  const script = document.createElement('script');
  script.type = 'speculationrules';

  const rules: any = {};
  rules[type] = [
    {
      where: { href_matches: pattern },
      eagerness: eagerness
    }
  ];

  script.textContent = JSON.stringify(rules);
  document.head.appendChild(script);
}

/**
 * Prerender pagination (next page, etc.)
 */
export function prerenderPagination(
  currentPage: number,
  baseUrl: string,
  lookahead: number = 2
): void {
  const urls: string[] = [];

  // Prerender next N pages
  for (let i = 1; i <= lookahead; i++) {
    urls.push(`${baseUrl}?page=${currentPage + i}`);
  }

  addSpeculationRule(urls, 'moderate');
}

/**
 * Check if page was prerendered
 */
export function wasPrerendered(): boolean {
  return document.prerendering || false;
}

/**
 * Setup prerender monitoring
 */
export function setupPrerenderMonitoring(
  onActivate?: () => void
): void {
  if (document.prerendering) {
    console.log('Page was prerendered');

    document.addEventListener('prerenderingchange', () => {
      console.log('Prerendered page activated');
      if (onActivate) onActivate();
    }, { once: true });
  }
}
```

### 3. Framework-Specific Implementations

**SvelteKit:**

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import {
    addPatternSpeculationRule,
    prerenderOnHoverIntent,
    setupPrerenderMonitoring
  } from '$lib/utils/speculation-rules';

  onMount(() => {
    // Setup monitoring
    setupPrerenderMonitoring(() => {
      // Track prerender activation for analytics
      trackPageView({ prerendered: true });
    });

    // Prerender common navigation patterns
    addPatternSpeculationRule('/products/[0-9]+$', 'moderate');
    addPatternSpeculationRule('/blog/[0-9]+$', 'moderate');

    // Prerender on hover for product links
    prerenderOnHoverIntent('a[href^="/products/"]', (el) => {
      return (el as HTMLAnchorElement).href;
    });
  });
</script>

<slot />
```

**Next.js (App Router):**

```tsx
// app/layout.tsx
'use client';

import { useEffect } from 'react';
import { addPatternSpeculationRule } from '@/lib/speculation-rules';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Add speculation rules on mount
    addPatternSpeculationRule('/products/*', 'moderate');
    addPatternSpeculationRule('/blog/*', 'conservative');
  }, []);

  return (
    <html>
      <head>
        {/* Static speculation rules can also go here */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Vanilla JavaScript:**

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Static speculation rules -->
  <script type="speculationrules">
  {
    "prerender": [
      {
        "where": { "href_matches": "/pages/*" },
        "eagerness": "moderate"
      }
    ]
  }
  </script>
</head>
<body>
  <script>
    // Dynamic rules on page load
    import { prerenderOnHoverIntent } from './utils/speculation-rules.js';

    prerenderOnHoverIntent('a[href^="/pages/"]', (el) => el.href);
  </script>
</body>
</html>
```

### 4. Eagerness Levels Configuration

Choose the right eagerness for your use case:

```typescript
/**
 * Eagerness level guide:
 *
 * immediate - Prerender as soon as link is visible
 *   - CPU: High (uses P-cores)
 *   - Memory: 200MB+ per page
 *   - Best for: Search results, checkout flow, high-confidence paths
 *
 * eager - Prerender on hover (no delay)
 *   - CPU: Medium-High
 *   - Memory: 100-150MB per page
 *   - Best for: Primary navigation, product pages
 *
 * moderate - Prerender after 200ms hover
 *   - CPU: Medium
 *   - Memory: 50-100MB per page
 *   - Best for: Most links, detail pages
 *
 * conservative - Prerender on pointerdown (click/tap start)
 *   - CPU: Low
 *   - Memory: 10-50MB per page
 *   - Best for: Archive pages, low-traffic routes
 */

const eagernessByPageType = {
  'search-results': 'immediate',
  'navigation': 'eager',
  'product-detail': 'moderate',
  'blog-post': 'moderate',
  'archive': 'conservative'
};
```

### 5. Advanced Patterns

**Conditional Prerendering (Network-Aware):**

```typescript
function addNetworkAwareSpeculation(
  pattern: string,
  defaultEagerness: string = 'moderate'
) {
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || '4g';

  // Reduce eagerness on slow connections
  const eagerness = effectiveType === '4g'
    ? defaultEagerness
    : 'conservative';

  addPatternSpeculationRule(pattern, eagerness as any);
}
```

**Exclude User-Specific Pages:**

```typescript
// Don't prerender pages with user-specific content
const script = document.createElement('script');
script.type = 'speculationrules';
script.textContent = JSON.stringify({
  prerender: [
    {
      where: {
        href_matches: "/products/*",
        not_selector_matches: "[data-requires-auth]"
      },
      eagerness: "moderate"
    }
  ]
});
document.head.appendChild(script);
```

**Prefetch vs. Prerender:**

```typescript
// Prefetch: Fetch HTML/resources only (lighter)
addPatternSpeculationRule('/blog/*', 'conservative', 'prefetch');

// Prerender: Fully render page in background (heavier, faster activation)
addPatternSpeculationRule('/products/*', 'moderate', 'prerender');
```

## Expected Output

After implementing Speculation Rules:

**Performance Improvements:**

| Metric | Before | After (Prerendered) | Improvement |
|--------|--------|---------------------|-------------|
| LCP | 2800ms | 300ms | 89% faster |
| TTFB | 200ms | <20ms | 90% faster |
| User-perceived speed | Slow | Instant | Significantly better |

**User Experience:**
- Near-instant page loads for prerendered pages
- Smooth navigation experience
- No visible loading states for predicted routes
- Lower bounce rates due to faster perceived performance

**Resource Usage:**
- Memory: +50-200MB per prerendered page (depends on eagerness)
- CPU: Minimal (uses efficient background threads on modern CPUs)
- Network: Additional bandwidth for prerendering (mitigated by caching)

**Browser DevTools Verification:**

```javascript
// Check if speculation rules are active
document.querySelectorAll('script[type="speculationrules"]');

// Check if page was prerendered
console.log('Was prerendered:', document.prerendering);

// Monitor prerender activation
document.addEventListener('prerenderingchange', () => {
  console.log('Prerender activated at', performance.now());
});
```

## Best Practices

**Do:**
- Start with conservative eagerness and tune based on analytics
- Use hover intent (200ms delay) for most links
- Prioritize high-traffic navigation paths
- Monitor memory usage in production
- Test with DevTools network throttling
- Track prerender hit rates with analytics
- Combine with resource hints for broader browser support

**Don't:**
- Don't prerender user-specific content (dashboards, account pages)
- Don't use 'immediate' eagerness for all pages (memory waste)
- Don't prerender pages with side effects (logout, form submissions)
- Don't forget to handle `prerenderingchange` event for analytics
- Don't prerender on metered connections without user consent

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 121+ | Full support |
| Chromium | 121+ | Full support |
| Edge | 121+ | Full support |
| Safari | ❌ | Not supported |
| Firefox | ❌ | Not supported (under consideration) |

**Fallback Strategy:**

```typescript
// Prefetch as fallback for browsers without Speculation Rules
export function addResourceHintsFallback(urls: string[]): void {
  if ('speculationrules' in HTMLScriptElement) {
    // Use Speculation Rules
    addSpeculationRule(urls, 'moderate');
  } else {
    // Fallback to traditional prefetch
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'document';
      document.head.appendChild(link);
    });
  }
}
```

## Monitoring and Analytics

**Track Prerender Effectiveness:**

```typescript
export function trackPrerenderMetrics() {
  if (document.prerendering) {
    // Track activation when user views prerendered page
    document.addEventListener('prerenderingchange', () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0];

      // Send to analytics
      analytics.track('prerender_activated', {
        url: window.location.href,
        activationTime: performance.now(),
        // @ts-ignore
        serverTiming: navigationEntry.serverTiming
      });
    });
  } else {
    // Track normal navigation
    analytics.track('normal_navigation', {
      url: window.location.href
    });
  }
}
```

## Common Issues and Solutions

**Issue: Prerendered page doesn't match user's state**

```typescript
// Solution: Refresh data on activation
document.addEventListener('prerenderingchange', async () => {
  await refreshUserData();
  await refreshCart();
});
```

**Issue: Prerendering causes network waterfall**

```typescript
// Solution: Reduce eagerness on slow connections
const connection = (navigator as any).connection;
const eagerness = connection?.effectiveType === '4g' ? 'moderate' : 'conservative';
```

**Issue: Memory usage too high**

```typescript
// Solution: Limit number of concurrent prerenders
// Browser automatically limits, but you can reduce eagerness
addPatternSpeculationRule('/products/*', 'conservative');  // Instead of 'eager'
```

## Testing

**Chrome DevTools:**

1. Open DevTools → Application → Speculation Rules
2. View active speculation rules
3. Monitor prerender cache
4. Check activation events in Performance tab

**Performance Tab:**

1. Record a navigation
2. Look for "Prerender activation" markers
3. Verify LCP occurs immediately after activation

**Console Testing:**

```javascript
// Check support
console.log('Speculation Rules:', 'speculationrules' in HTMLScriptElement);

// List active rules
document.querySelectorAll('script[type="speculationrules"]').forEach(s => {
  console.log(JSON.parse(s.textContent));
});

// Test prerender detection
console.log('Document prerendering:', document.prerendering);
```

## References

- [Speculation Rules Spec (WICG)](https://github.com/WICG/nav-speculation/blob/main/README.md)
- [Chrome 121 Release Notes](https://developer.chrome.com/blog/new-in-chrome-121/)
- [Web.dev: Prerender Pages](https://web.dev/articles/prerender-pages)
- [Speculation Rules API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)
