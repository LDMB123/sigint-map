/**
 * D3 Module Lazy Loader
 * Enables on-demand loading of D3 modules to reduce initial bundle size
 * Caches loaded modules to avoid redundant imports
 *
 * Usage:
 *   const selection = await loadD3Selection();
 *   const scale = await loadD3Scale();
 *   const axis = await loadD3Axis();
 */

// Module cache for loaded D3 components
const moduleCache = new Map<string, any>();

/**
 * Load d3-selection module on demand
 * Used by: TransitionFlow, GapTimeline, SongHeatmap, RarityScorecard, GuestNetwork, TourMap
 */
export async function loadD3Selection() {
  if (moduleCache.has('d3-selection')) {
    return moduleCache.get('d3-selection');
  }

  const module = await import('d3-selection');
  moduleCache.set('d3-selection', module);
  return module;
}

/**
 * Load d3-scale module on demand
 * Used by: TransitionFlow, GapTimeline, SongHeatmap, RarityScorecard, GuestNetwork, TourMap
 */
export async function loadD3Scale() {
  if (moduleCache.has('d3-scale')) {
    return moduleCache.get('d3-scale');
  }

  const module = await import('d3-scale');
  moduleCache.set('d3-scale', module);
  return module;
}

/**
 * Load d3-axis module on demand
 * Used by: GapTimeline, SongHeatmap, RarityScorecard
 */
export async function loadD3Axis() {
  if (moduleCache.has('d3-axis')) {
    return moduleCache.get('d3-axis');
  }

  const module = await import('d3-axis');
  moduleCache.set('d3-axis', module);
  return module;
}

/**
 * Load d3-sankey module on demand
 * Used by: TransitionFlow only
 * ~8KB gzipped - significant for single-use component
 */
export async function loadD3Sankey() {
  if (moduleCache.has('d3-sankey')) {
    return moduleCache.get('d3-sankey');
  }

  const module = await import('d3-sankey');
  moduleCache.set('d3-sankey', module);
  return module;
}

/**
 * Load d3-force module on demand
 * Used by: GuestNetwork only
 * ~22KB gzipped - significant for single-use component
 */
export async function loadD3Force() {
  if (moduleCache.has('d3-force')) {
    return moduleCache.get('d3-force');
  }

  const module = await import('d3-force');
  moduleCache.set('d3-force', module);
  return module;
}

/**
 * Load d3-drag module on demand
 * Used by: GuestNetwork only
 * ~3KB gzipped
 */
export async function loadD3Drag() {
  if (moduleCache.has('d3-drag')) {
    return moduleCache.get('d3-drag');
  }

  const module = await import('d3-drag');
  moduleCache.set('d3-drag', module);
  return module;
}

/**
 * Load d3-geo module on demand
 * Used by: TourMap only
 * ~16KB gzipped - significant for single-use component
 */
export async function loadD3Geo() {
  if (moduleCache.has('d3-geo')) {
    return moduleCache.get('d3-geo');
  }

  const module = await import('d3-geo');
  moduleCache.set('d3-geo', module);
  return module;
}

/**
 * Preload D3 modules for a specific visualization
 * Call this when the user hovers over or navigates near a visualization
 * to ensure modules are ready when the component mounts
 *
 * @param visualizationType - The type of visualization
 */
export async function preloadVisualization(visualizationType: 'transitions' | 'guests' | 'map' | 'timeline' | 'heatmap' | 'rarity') {
  try {
    switch (visualizationType) {
      case 'transitions':
        // TransitionFlow uses: selection, scale, sankey
        await Promise.all([
          loadD3Selection(),
          loadD3Scale(),
          loadD3Sankey()
        ]);
        break;

      case 'guests':
        // GuestNetwork uses: selection, scale, force, drag
        await Promise.all([
          loadD3Selection(),
          loadD3Scale(),
          loadD3Force(),
          loadD3Drag()
        ]);
        break;

      case 'map':
        // TourMap uses: selection, scale, geo
        await Promise.all([
          loadD3Selection(),
          loadD3Scale(),
          loadD3Geo()
        ]);
        break;

      case 'timeline':
        // GapTimeline uses: selection, scale, axis
        await Promise.all([
          loadD3Selection(),
          loadD3Scale(),
          loadD3Axis()
        ]);
        break;

      case 'heatmap':
        // SongHeatmap uses: selection, scale, axis (native max replaces d3-array)
        await Promise.all([
          loadD3Selection(),
          loadD3Scale(),
          loadD3Axis()
        ]);
        break;

      case 'rarity':
        // RarityScorecard uses: selection, scale, axis
        await Promise.all([
          loadD3Selection(),
          loadD3Scale(),
          loadD3Axis()
        ]);
        break;
    }
  } catch (error) {
    console.warn(`Failed to preload ${visualizationType} visualization:`, error);
    // Preload failures are non-critical - components will load modules on mount
  }
}

/**
 * Clear the module cache (useful for testing or memory pressure scenarios)
 */
export function clearD3Cache() {
  moduleCache.clear();
}

/**
 * Get cache statistics (for debugging bundle impact)
 */
export function getD3CacheStats() {
  return {
    cachedModules: Array.from(moduleCache.keys()),
    cacheSize: moduleCache.size
  };
}
