/**
 * Speculation Rules API for Chrome 109+ / Chromium 2025
 * Intelligent prerendering and prefetching for instant navigation
 *
 * @see https://developer.chrome.com/docs/web-platform/speculation-rules/
 * @see https://wicg.github.io/nav-speculation/speculation-rules.html
 *
 * Features:
 * - Automatic prerendering of common routes
 * - Dynamic speculation rule injection
 * - Hover-triggered prerendering (document rules)
 * - SSR-safe client-only initialization
 * - Chrome 109+ with fallback for older browsers
 */

/**
 * Eagerness levels for speculation rules
 * - immediate: Start loading right away (use sparingly)
 * - eager: Load when document becomes interactive
 * - moderate: Load when user indicates intent (hover, focus)
 * - conservative: Only load when explicitly prefetch/prerender requested
 */
export type SpeculationEagerness = 'immediate' | 'eager' | 'moderate' | 'conservative';

/**
 * Referrer policy options
 */
export type ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'same-origin'
  | 'strict-origin-when-cross-origin'
  | 'strict-origin';

/**
 * Link matching condition using CSS selectors
 */
export interface SelectorCondition {
  selector_matches: string;
}

/**
 * Link matching condition using href patterns
 */
export interface HrefMatchesCondition {
  href_matches: string;
}

/**
 * AND condition - all conditions must match
 */
export interface AndCondition {
  and: WhereCondition[];
}

/**
 * OR condition - at least one condition must match
 */
export interface OrCondition {
  or: WhereCondition[];
}

/**
 * NOT condition - condition must not match
 */
export interface NotCondition {
  not: WhereCondition;
}

/**
 * Any valid where condition for rules
 */
export type WhereCondition =
  | SelectorCondition
  | HrefMatchesCondition
  | AndCondition
  | OrCondition
  | NotCondition;

/**
 * Single speculation rule
 */
export interface SpeculationRule {
  /** Condition for matching links */
  where?: WhereCondition;

  /** How eagerly to load matched links */
  eagerness?: SpeculationEagerness;

  /** Referrer policy for requests */
  referrer_policy?: ReferrerPolicy;
}

/**
 * Prerender rule - loads entire page in background
 */
export interface PrerenderRule extends SpeculationRule {
  where: WhereCondition;
  eagerness?: SpeculationEagerness;
}

/**
 * Prefetch rule - downloads page resources
 */
export interface PrefetchRule extends SpeculationRule {
  where?: WhereCondition;
  eagerness?: SpeculationEagerness;
}

/**
 * Complete speculation rules configuration
 */
export interface SpeculationRulesConfig {
  prerender?: PrerenderRule[];
  prefetch?: PrefetchRule[];
}

/**
 * Check if Speculation Rules API is supported
 * Chrome 109+ (released January 2023)
 */
export function isSpeculationRulesSupported(): boolean {
  if (typeof document === 'undefined') return false;

  // Primary check: use built-in HTMLScriptElement
  if ('speculationrules' in HTMLScriptElement.prototype) {
    return true;
  }

  // Fallback check: use window's HTMLScriptElement if different
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winScriptElement = (window as any).HTMLScriptElement;
  if (winScriptElement?.prototype && 'speculationrules' in winScriptElement.prototype) {
    return true;
  }

  return false;
}

/**
 * Add speculation rules to the document head dynamically
 * Creates and injects a <script type="speculationrules"> element
 *
 * @param config - Speculation rules configuration
 * @returns The script element created, or null if not supported
 */
export function addSpeculationRules(config: SpeculationRulesConfig): HTMLScriptElement | null {
  if (typeof document === 'undefined' || !isSpeculationRulesSupported()) {
    return null;
  }

  // Check if we already have a dynamic speculation rules script
  const existing = document.querySelector('script[type="speculationrules"][data-dynamic="true"]');
  if (existing) {
    existing.remove();
  }

  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.dataset.dynamic = 'true';

  try {
    script.textContent = JSON.stringify(config);
    document.head.appendChild(script);

    console.debug('[SpeculationRules] Added dynamic rules:', config);
    return script;
  } catch (error) {
    console.error('[SpeculationRules] Failed to add rules:', error);
    return null;
  }
}

/**
 * Remove all dynamically-added speculation rules
 */
export function removeSpeculationRules(): void {
  if (typeof document === 'undefined') return;

  const dynamic = document.querySelectorAll('script[type="speculationrules"][data-dynamic="true"]');
  dynamic.forEach(script => script.remove());

  console.debug('[SpeculationRules] Removed dynamic rules');
}

/**
 * Create optimized speculation rules for common DMB Almanac routes
 * Prerender high-traffic pages, prefetch secondary navigation
 */
export function createNavigationRules(): SpeculationRulesConfig {
  return {
    prerender: [
      // High-traffic landing pages - prerender with eager priority
      {
        where: { href_matches: '/songs' },
        eagerness: 'eager',
        referrer_policy: 'strict-origin-when-cross-origin'
      },
      {
        where: { href_matches: '/tours' },
        eagerness: 'eager',
        referrer_policy: 'strict-origin-when-cross-origin'
      },
      {
        where: { href_matches: '/venues' },
        eagerness: 'eager',
        referrer_policy: 'strict-origin-when-cross-origin'
      },

      // Secondary pages with moderate eagerness
      {
        where: { href_matches: '/liberation' },
        eagerness: 'moderate',
        referrer_policy: 'strict-origin-when-cross-origin'
      },

      // Featured/hero links from homepage
      {
        where: { selector_matches: '.hero-link, .featured-link, [data-prerender="true"]' },
        eagerness: 'eager'
      },

      // Recent tours (2020+)
      {
        where: {
          and: [
            { href_matches: '/tours/*' },
            { selector_matches: 'a[href^="/tours/202"]' }
          ]
        },
        eagerness: 'moderate'
      },

      // High-priority shows
      {
        where: {
          and: [
            { href_matches: '/shows/*' },
            { selector_matches: '[data-priority="eager"] a' }
          ]
        },
        eagerness: 'eager'
      }
    ],

    prefetch: [
      // All internal links - conservative to avoid bandwidth waste
      {
        where: {
          and: [
            { href_matches: '/*' },
            { not: { href_matches: '/api/*' } },
            { not: { href_matches: '/_next/*' } }
          ]
        },
        eagerness: 'conservative',
        referrer_policy: 'strict-origin-when-cross-origin'
      },

      // Navigation links - moderate when user hovers
      {
        where: {
          selector_matches: 'nav a, a[href^="/songs"], a[href^="/tours"], a[href^="/venues"], a[href^="/guests"]'
        },
        eagerness: 'moderate'
      },

      // Show links - moderate prefetch
      {
        where: { selector_matches: 'a[href^="/shows/"]' },
        eagerness: 'moderate'
      },

      // Statistics and analysis pages
      {
        where: {
          selector_matches: 'a[href^="/stats"], a[href^="/analysis"], a[data-analytics="true"]'
        },
        eagerness: 'conservative'
      }
    ]
  };
}

/**
 * Prerender a single URL with optional eagerness
 * Creates inline speculation rules for immediate effect
 *
 * @param url - URL to prerender (relative or absolute)
 * @param eagerness - How eagerly to load the page
 */
export function prerenderUrl(
  url: string,
  eagerness: SpeculationEagerness = 'moderate'
): void {
  if (!isSpeculationRulesSupported()) {
    console.debug('[SpeculationRules] Not supported, skipping prerender for:', url);
    return;
  }

  // Normalize URL
  const normalizedUrl = url.startsWith('/') ? url : '/' + url;

  const config: SpeculationRulesConfig = {
    prerender: [
      {
        where: { href_matches: normalizedUrl },
        eagerness
      }
    ]
  };

  addSpeculationRules(config);
}

/**
 * Prefetch a single URL with optional eagerness
 *
 * @param url - URL to prefetch (relative or absolute)
 * @param eagerness - How eagerly to load the page
 */
export function prefetchUrl(
  url: string,
  eagerness: SpeculationEagerness = 'conservative'
): void {
  if (!isSpeculationRulesSupported()) {
    console.debug('[SpeculationRules] Not supported, skipping prefetch for:', url);
    return;
  }

  // Normalize URL
  const normalizedUrl = url.startsWith('/') ? url : '/' + url;

  const config: SpeculationRulesConfig = {
    prefetch: [
      {
        where: { href_matches: normalizedUrl },
        eagerness
      }
    ]
  };

  addSpeculationRules(config);
}

/**
 * Get information about active speculation in the browser
 * Chrome 125+ feature to check prerendering state
 */
export function getSpeculationInfo(): SpeculationInfo {
  return {
    isSupported: isSpeculationRulesSupported(),
    isPrerendering: typeof document !== 'undefined' && (document as any).prerendering === true,
    hasActiveViewTransition: typeof document !== 'undefined' && (document as any).activeViewTransition !== null
  };
}

export interface SpeculationInfo {
  isSupported: boolean;
  isPrerendering: boolean;
  hasActiveViewTransition: boolean;
}

/**
 * Listen for prerendering state changes
 * Fired when prerendered page becomes visible
 *
 * @param callback - Function to call when page transitions from prerendering
 */
export function onPrerenderingComplete(callback: () => void): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  // Check if already visible
  if (!(document as any).prerendering) {
    callback();
    return () => {};
  }

  // Listen for visibility change
  const handler = () => {
    if (!(document as any).prerendering) {
      document.removeEventListener('prerenderingchange', handler);
      callback();
    }
  };

  document.addEventListener('prerenderingchange', handler);

  // Return cleanup function
  return () => {
    document.removeEventListener('prerenderingchange', handler);
  };
}

/**
 * Initialize speculation rules for the entire app
 * Should be called once on app startup in +layout.svelte
 */
export function initializeSpeculationRules(): void {
  if (typeof document === 'undefined') {
    // SSR - skip initialization
    return;
  }

  if (!isSpeculationRulesSupported()) {
    console.debug('[SpeculationRules] Not supported in this browser');
    return;
  }

  // Add default navigation rules
  const rules = createNavigationRules();
  addSpeculationRules(rules);

  console.info('[SpeculationRules] Initialized with default navigation rules');

  // Log prerendering state
  const info = getSpeculationInfo();
  if (info.isPrerendering) {
    console.info('[SpeculationRules] Page is being prerendered, waiting for visibility...');

    onPrerenderingComplete(() => {
      console.info('[SpeculationRules] Prerendered page is now visible');
      // Page is now visible - animations and interactions can begin
    });
  }
}

/**
 * Optimize speculation rules based on user's network connection
 * Use faster eagerness on fast connections, slower on slow connections
 */
export function createConnectionAwareRules(
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
): SpeculationRulesConfig {
  const baseRules = createNavigationRules();

  // Determine connection speed
  const connection = effectiveType ||
    ('connection' in navigator && (navigator as any).connection?.effectiveType);

  if (!connection || connection === '4g') {
    // Fast connection - use eager prerendering
    return baseRules;
  }

  if (connection === '3g') {
    // Moderate connection - use moderate eagerness
    if (baseRules.prerender) {
      baseRules.prerender = baseRules.prerender.map(rule => ({
        ...rule,
        eagerness: 'moderate' as SpeculationEagerness
      }));
    }
    if (baseRules.prefetch) {
      baseRules.prefetch = baseRules.prefetch.map(rule => ({
        ...rule,
        eagerness: 'conservative' as SpeculationEagerness
      }));
    }
    return baseRules;
  }

  // Slow connection (2g, slow-2g) - minimal preloading
  if (baseRules.prerender) {
    baseRules.prerender = baseRules.prerender.slice(0, 1);
  }
  if (baseRules.prefetch) {
    baseRules.prefetch = baseRules.prefetch.slice(0, 1);
  }
  return baseRules;
}

/**
 * Create hover-triggered prerendering rules using document rules
 * Chrome 126+ feature - prerender on hover without selector_matches
 */
export function createHoverPrerenderRules(): SpeculationRulesConfig {
  return {
    prerender: [
      // Prerender on hover for navigation links
      {
        where: {
          and: [
            { selector_matches: 'a[data-prerender-hover="true"], nav a, .primary-nav a' },
            { href_matches: '/*' }
          ]
        },
        eagerness: 'moderate'
      }
    ]
  };
}

/**
 * Create route-specific speculation rules for song detail pages
 * Prerender related songs and prefetch adjacent songs in setlist
 */
export function createSongDetailRules(songId?: string): SpeculationRulesConfig {
  return {
    prerender: [
      // Prerender related/similar songs
      {
        where: { selector_matches: 'a[href^="/songs/"][data-related="true"]' },
        eagerness: 'moderate'
      },
      // Prerender songs in same tour
      {
        where: {
          and: [
            { href_matches: '/songs/*' },
            { selector_matches: '[data-tour-context] a' }
          ]
        },
        eagerness: 'moderate'
      }
    ],
    prefetch: [
      // Prefetch song statistics pages
      {
        where: { selector_matches: 'a[href^="/songs/"][href$="/stats"]' },
        eagerness: 'conservative'
      },
      // Prefetch tours featuring this song
      {
        where: {
          and: [
            { href_matches: '/tours/*' },
            { selector_matches: '[data-song-context] a' }
          ]
        },
        eagerness: 'conservative'
      }
    ]
  };
}

/**
 * Create route-specific speculation rules for venue detail pages
 * Prerender shows at that venue and prefetch adjacent venues
 */
export function createVenueDetailRules(venueId?: string): SpeculationRulesConfig {
  return {
    prerender: [
      // Prerender shows at this venue
      {
        where: {
          and: [
            { href_matches: '/shows/*' },
            { selector_matches: `a[data-venue-id="${venueId || '*'}"]` }
          ]
        },
        eagerness: 'eager'
      },
      // Prerender adjacent venues (same city/state)
      {
        where: { selector_matches: '[data-venue-adjacent] a[href^="/venues/"]' },
        eagerness: 'moderate'
      }
    ],
    prefetch: [
      // Prefetch tours that include this venue
      {
        where: {
          and: [
            { href_matches: '/tours/*' },
            { selector_matches: '[data-venue-context] a' }
          ]
        },
        eagerness: 'conservative'
      }
    ]
  };
}

/**
 * Create route-specific speculation rules for tour detail pages
 * Prerender shows in tour and prefetch adjacent tours
 */
export function createTourDetailRules(tourId?: string): SpeculationRulesConfig {
  return {
    prerender: [
      // Prerender shows in this tour
      {
        where: {
          and: [
            { href_matches: '/shows/*' },
            { selector_matches: `a[data-tour-id="${tourId || '*'}"]` }
          ]
        },
        eagerness: 'eager'
      },
      // Prerender adjacent tours (previous/next years)
      {
        where: {
          and: [
            { href_matches: '/tours/*' },
            { selector_matches: '[data-tour-nav] a' }
          ]
        },
        eagerness: 'moderate'
      }
    ],
    prefetch: [
      // Prefetch tour statistics
      {
        where: { selector_matches: 'a[href^="/tours/"][href$="/stats"]' },
        eagerness: 'conservative'
      },
      // Prefetch venues in this tour
      {
        where: {
          and: [
            { href_matches: '/venues/*' },
            { selector_matches: '[data-tour-context] a' }
          ]
        },
        eagerness: 'conservative'
      }
    ]
  };
}

/**
 * Create route-specific speculation rules for show detail pages
 * Prerender setlist songs and prefetch adjacent shows
 */
export function createShowDetailRules(showId?: string): SpeculationRulesConfig {
  return {
    prerender: [
      // Prerender songs in setlist
      {
        where: {
          and: [
            { href_matches: '/songs/*' },
            { selector_matches: `a[data-setlist-id="${showId || '*'}"]` }
          ]
        },
        eagerness: 'eager'
      },
      // Prerender adjacent shows (same tour/venue)
      {
        where: {
          and: [
            { href_matches: '/shows/*' },
            { selector_matches: '[data-show-context] a' }
          ]
        },
        eagerness: 'moderate'
      }
    ],
    prefetch: [
      // Prefetch venue details
      {
        where: {
          and: [
            { href_matches: '/venues/*' },
            { selector_matches: '[data-show-context] a' }
          ]
        },
        eagerness: 'conservative'
      },
      // Prefetch tour details
      {
        where: {
          and: [
            { href_matches: '/tours/*' },
            { selector_matches: '[data-show-context] a' }
          ]
        },
        eagerness: 'conservative'
      }
    ]
  };
}

/**
 * Create route-specific speculation rules for search results
 * Prerender top results and prefetch pagination
 */
export function createSearchResultRules(query?: string): SpeculationRulesConfig {
  return {
    prerender: [
      // Prerender top search results (first few items)
      {
        where: { selector_matches: 'a[data-result-rank="1"], a[data-result-rank="2"], a[data-result-rank="3"]' },
        eagerness: 'eager'
      }
    ],
    prefetch: [
      // Prefetch pagination links
      {
        where: { selector_matches: 'a[data-page-nav], a[rel="next"], a[rel="prev"]' },
        eagerness: 'moderate'
      },
      // Prefetch filter options
      {
        where: { selector_matches: '[data-search-filters] a' },
        eagerness: 'conservative'
      }
    ]
  };
}

/**
 * Create rules for statistical/analysis pages
 * These are less critical so use conservative prefetching
 */
export function createStatsPageRules(): SpeculationRulesConfig {
  return {
    prefetch: [
      // Prefetch different stat views (yearly, all-time, etc)
      {
        where: {
          and: [
            { href_matches: '/stats/*' },
            { selector_matches: '[data-stat-selector] a' }
          ]
        },
        eagerness: 'conservative'
      },
      // Prefetch guest statistics
      {
        where: { href_matches: '/guests/*' },
        eagerness: 'conservative'
      },
      // Prefetch analysis pages
      {
        where: { href_matches: '/liberation/*' },
        eagerness: 'conservative'
      }
    ]
  };
}

/**
 * Get route-specific speculation rules based on current pathname
 * Useful for dynamically loading route-specific preloading strategies
 *
 * @param pathname - Current page path (e.g., '/songs/299')
 * @returns Appropriate SpeculationRulesConfig for that route
 */
export function getRulesByRoute(pathname: string): SpeculationRulesConfig | null {
  // Song detail page
  if (pathname.match(/^\/songs\/\d+/)) {
    const match = pathname.match(/^\/songs\/(\d+)/);
    return createSongDetailRules(match?.[1]);
  }

  // Venue detail page
  if (pathname.match(/^\/venues\/\d+/)) {
    const match = pathname.match(/^\/venues\/(\d+)/);
    return createVenueDetailRules(match?.[1]);
  }

  // Tour detail page
  if (pathname.match(/^\/tours\/\d+/)) {
    const match = pathname.match(/^\/tours\/(\d+)/);
    return createTourDetailRules(match?.[1]);
  }

  // Show detail page
  if (pathname.match(/^\/shows\/\d+/)) {
    const match = pathname.match(/^\/shows\/(\d+)/);
    return createShowDetailRules(match?.[1]);
  }

  // Search results page
  if (pathname.match(/^\/search/)) {
    return createSearchResultRules();
  }

  // Stats pages
  if (pathname.match(/^\/stats|^\/guests|^\/liberation/)) {
    return createStatsPageRules();
  }

  return null;
}

/**
 * Parse and validate speculation rules from JSON
 * Useful for loading rules from external config files
 */
export function parseSpeculationRules(json: string): SpeculationRulesConfig | null {
  try {
    const config = JSON.parse(json);

    // Basic validation
    if (config.prerender && !Array.isArray(config.prerender)) {
      throw new Error('Invalid prerender rules format');
    }
    if (config.prefetch && !Array.isArray(config.prefetch)) {
      throw new Error('Invalid prefetch rules format');
    }

    return config as SpeculationRulesConfig;
  } catch (error) {
    console.error('[SpeculationRules] Failed to parse rules:', error);
    return null;
  }
}

/**
 * Fetch and apply speculation rules from external JSON file
 * Useful for dynamic rule updates without redeploying
 */
export async function loadSpeculationRulesFromFile(
  filePath: string
): Promise<SpeculationRulesConfig | null> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const json = await response.text();
    return parseSpeculationRules(json);
  } catch (error) {
    console.error('[SpeculationRules] Failed to load rules from file:', error);
    return null;
  }
}

/**
 * Monitor and log speculation rules activity for debugging
 * Tracks how many pages are prerendered and their state
 */
export function enableDebugLogging(): void {
  if (typeof document === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navTiming = entry as PerformanceNavigationTiming;
        console.debug('[SpeculationRules] Navigation timing:', {
          name: navTiming.name,
          duration: navTiming.duration,
          type: navTiming.type,
          domContentLoadedEventStart: navTiming.domContentLoadedEventStart,
          loadEventStart: navTiming.loadEventStart
        });
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  } catch (e) {
    console.debug('[SpeculationRules] Performance observer not supported');
  }

  // Log prerendering state changes
  if ((document as any).prerendering) {
    console.info('[SpeculationRules] Page is prerendering');
    document.addEventListener('prerenderingchange', () => {
      console.info('[SpeculationRules] Prerendering complete, page now visible');
    });
  }
}

/**
 * Clear all dynamically-added rules and reset to defaults
 */
export function resetToDefaults(): void {
  removeSpeculationRules();
  initializeSpeculationRules();
  console.debug('[SpeculationRules] Reset to default rules');
}

export default {
  isSupported: isSpeculationRulesSupported,
  add: addSpeculationRules,
  remove: removeSpeculationRules,
  createNavigationRules,
  prerender: prerenderUrl,
  prefetch: prefetchUrl,
  getInfo: getSpeculationInfo,
  onComplete: onPrerenderingComplete,
  initialize: initializeSpeculationRules,
  createConnectionAwareRules,
  createHoverPrerenderRules,
  parseRules: parseSpeculationRules,
  loadFromFile: loadSpeculationRulesFromFile,
  enableDebug: enableDebugLogging,
  reset: resetToDefaults
};
