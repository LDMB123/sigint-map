/**
 * D3 Utility Functions - Shared across all visualizations
 *
 * This module consolidates duplicate utility functions used across multiple D3 components,
 * improving bundle size by ~2-3KB and enabling better tree-shaking.
 *
 * Instead of each visualization redefining max(), min(), and color schemes locally,
 * they import from this shared module.
 *
 * Usage:
 * ```typescript
 * import { arrayMax, colorSchemes, MARGINS } from '$lib/utils/d3-utils';
 *
 * const maxValue = arrayMax(data, d => d.value);
 * const colors = colorSchemes.category10;
 * const margin = MARGINS.heatmap;
 * ```
 */

/**
 * Find maximum value in array using accessor function
 * Performance: O(n) single pass, no spread operator overhead
 *
 * @param arr - Input array to search
 * @param accessor - Function to extract comparable value from each element
 * @returns Maximum value found, or 0 if array is empty
 *
 * @example
 * const max = arrayMax(data, d => d.value);
 * const maxAppearances = arrayMax(nodes, d => d.appearances);
 */
export const arrayMax = <T>(arr: T[], accessor: (d: T) => number): number => {
  if (arr.length === 0) return 0;
  let maxVal = accessor(arr[0]);
  for (let i = 1; i < arr.length; i++) {
    const val = accessor(arr[i]);
    if (val > maxVal) maxVal = val;
  }
  return maxVal;
};

/**
 * Find minimum value in array using accessor function
 * Performance: O(n) single pass, no spread operator overhead
 *
 * @param arr - Input array to search
 * @param accessor - Function to extract comparable value from each element
 * @returns Minimum value found, or Infinity if array is empty
 *
 * @example
 * const min = arrayMin(data, d => d.value);
 * const minGap = arrayMin(gaps, d => d.days);
 */
export const arrayMin = <T>(arr: T[], accessor: (d: T) => number): number => {
  if (arr.length === 0) return Infinity;
  let minVal = accessor(arr[0]);
  for (let i = 1; i < arr.length; i++) {
    const val = accessor(arr[i]);
    if (val < minVal) minVal = val;
  }
  return minVal;
};

/**
 * D3 Color Schemes
 *
 * Replaces d3-scale-chromatic (~12KB) by hardcoding colors directly
 * These are standard D3 color schemes used across visualizations
 *
 * Sequential schemes (category10) work well for categorical data
 * Domain-specific schemes (blues, greens, reds) work for choropleth/heatmap visualizations
 */
export const colorSchemes = {
  /**
   * D3 category10 - 10 distinct colors for categorical data
   * Used by: TransitionFlow, GuestNetwork, GapTimeline
   */
  category10: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ] as const,

  /**
   * Sequential blues - 9-color gradient for choropleth maps
   * Used by: TourMap (as default)
   */
  blues: [
    '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6',
    '#4292c6', '#2171b5', '#08519c', '#08306b'
  ] as const,

  /**
   * Sequential greens - 9-color gradient
   * Used by: TourMap (alternative color scheme)
   */
  greens: [
    '#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476',
    '#41ab5d', '#238b45', '#006d2c', '#00441b'
  ] as const,

  /**
   * Sequential reds - 9-color gradient
   * Used by: TourMap (alternative color scheme)
   */
  reds: [
    '#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a',
    '#ef3b2c', '#cb181d', '#a50f15', '#67000d'
  ] as const,

  /**
   * Sequential purples - 9-color gradient
   * Used by: TourMap (alternative color scheme)
   */
  purples: [
    '#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8',
    '#807dba', '#6a51a3', '#54278f', '#3f007d'
  ] as const
} as const;

/**
 * Create a lightweight hash of data for memoization
 * Used to avoid re-rendering D3 components when data hasn't changed
 *
 * Performance: O(min(n, sampleSize)) - samples first N elements instead of hashing entire dataset
 * This is significantly faster than JSON.stringify for large datasets
 *
 * @param data - Array to hash
 * @param sampleSize - Number of elements to sample (default 100)
 * @returns Hash string combining length and sample values
 *
 * @example
 * let prevHash = '';
 * const currentHash = createDataHash(data);
 * if (currentHash !== prevHash) {
 *   // Re-render visualization
 *   prevHash = currentHash;
 * }
 */
export const createDataHash = <T extends Record<string, any>>(
  data: T[],
  sampleSize = 100
): string => {
  let hash = data.length;
  for (let i = 0; i < Math.min(data.length, sampleSize); i++) {
    const val = data[i];
    // Use value-based hashing for numbers, character code for objects
    hash = (hash * 31 + (typeof val.value === 'number' ? val.value : JSON.stringify(val).charCodeAt(0))) | 0;
  }
  return String(hash);
};

/**
 * D3 SVG Margin Conventions
 *
 * Standardizes margins across different visualization types
 * Following D3's margin convention pattern for consistent layouts
 *
 * @see https://observablehq.com/@d3/margin-convention
 */
export const MARGINS = {
  /**
   * Default margins - used for basic charts
   * Used by: Simple bar/line charts
   */
  default: { top: 20, right: 20, bottom: 20, left: 20 },

  /**
   * Heatmap margins - extra space for rotated labels
   * Used by: SongHeatmap (rotated column headers)
   */
  heatmap: { top: 100, right: 30, bottom: 30, left: 100 },

  /**
   * Timeline margins - extra left space for time axis labels
   * Used by: GapTimeline (vertical time axis)
   */
  timeline: { top: 20, right: 20, bottom: 20, left: 60 },

  /**
   * Sankey margins - extra right space for flow labels
   * Used by: TransitionFlow (node labels on right side)
   */
  sankey: { top: 20, right: 160, bottom: 20, left: 20 }
} as const;

/**
 * D3 Debounce Helper - Optimizes resize handling
 *
 * Prevents excessive re-renders during window resize events
 * Used by all visualization components with ResizeObserver
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds (default 150ms - optimized for INP)
 * @returns Debounced function
 *
 * @example
 * const debouncedRender = createDebounce(renderChart, 150);
 * const resizeObserver = new ResizeObserver(debouncedRender);
 * resizeObserver.observe(container);
 */
export const createDebounce = (callback: () => void, delay = 150) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
};

/**
 * Clamp value to range [min, max]
 * Used for constraining node/element positions in force simulations
 *
 * @param value - Value to clamp
 * @param min - Minimum bound (inclusive)
 * @param max - Maximum bound (inclusive)
 * @returns Clamped value
 *
 * @example
 * const clampedX = clamp(x, radius, containerWidth - radius);
 */
export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

/**
 * Parse CSV data (lightweight alternative to d3-dsv if needed)
 * Currently not used, but included for reference
 *
 * For CSV parsing, prefer native or lightweight alternatives:
 * - papaparse (~30KB but feature-complete)
 * - Simple regex for known formats
 */

/**
 * SVG Utility: Create a gradient definition
 * Useful for heatmap/choropleth legends
 *
 * @param svg - D3 selection of SVG element
 * @param id - Unique ID for gradient reference
 * @param colors - Start and end colors for gradient
 * @returns Gradient ID for use in fill/stroke attributes
 *
 * @example
 * const gradId = createLinearGradient(svg, 'heatmap-gradient', ['#f0f9ff', '#0c4a6e']);
 * svg.append('rect').attr('fill', `url(#${gradId})`);
 */
export const createLinearGradient = (
  svg: any,
  id: string,
  colors: [string, string]
): string => {
  const defs = svg.append('defs');
  const gradient = defs
    .append('linearGradient')
    .attr('id', id)
    .attr('x1', '0%')
    .attr('x2', '100%');

  gradient.append('stop').attr('offset', '0%').attr('stop-color', colors[0]);
  gradient.append('stop').attr('offset', '100%').attr('stop-color', colors[1]);

  return id;
};

/**
 * Type-safe color scheme selector
 * Prevents typos when accessing color schemes
 *
 * @param schemeName - Name of color scheme
 * @returns Array of colors, or category10 as fallback
 *
 * @example
 * const scheme = getColorScheme('blues');  // type-safe
 * const scheme2 = getColorScheme('invalid');  // returns category10
 */
export const getColorScheme = (
  schemeName: keyof typeof colorSchemes
): readonly string[] => colorSchemes[schemeName] ?? colorSchemes.category10;
