/**
 * Native SVG Axis Generation - Replaces d3-axis (~8KB gzipped)
 *
 * This file should be saved as: /src/lib/utils/native-axis.ts
 *
 * Generates SVG axis elements without d3-axis dependency.
 * Works with d3-scale.scaleBand and d3-scale.scaleLinear.
 *
 * Usage example:
 *   import { createAxisTop, createAxisLeft } from '$lib/utils/native-axis';
 *
 *   const xAxis = createAxisTop(xScale, { tickSize: 6 });
 *   g.append('g').call(xAxis);
 */

import type { Selection } from 'd3-selection';
import type { ScaleBand, ScaleLinear } from 'd3-scale';

/**
 * Options for axis customization
 */
export interface AxisOptions {
  /** Length of tick mark lines (default: 6) */
  tickSize?: number;
  /** Space between tick mark and label text (default: 3) */
  tickPadding?: number;
  /** Custom formatter for tick labels (default: String(d)) */
  tickFormat?: (d: any, i: number) => string;
  /** Explicit tick values to use (default: scale.domain() or scale.ticks()) */
  tickValues?: any[];
}

/**
 * Type for any d3-scale that we support
 * Includes scaleBand and scaleLinear
 */
type D3Scale = ScaleBand<string> | ScaleLinear<number, number> | any;

/**
 * Helper function to get ticks from a scale
 * Handles both band scales (categorical) and linear scales (numeric)
 *
 * @param scale The d3 scale object
 * @param tickValues Optional explicit tick values
 * @returns Array of tick values
 */
function getScaleTicks(scale: D3Scale, tickValues?: any[]): any[] {
  if (tickValues) return tickValues;

  // Band scale - use all domain values
  if (typeof scale.bandwidth === 'function') {
    return scale.domain();
  }

  // Linear scale - smart tick generation
  if (scale.ticks) {
    return scale.ticks(5);
  }

  // Fallback to domain
  return scale.domain();
}

/**
 * Helper function to get position from scale
 * Handles band scales (center of band) and linear scales (direct position)
 *
 * @param scale The d3 scale object
 * @param value The value to position
 * @returns Numeric position coordinate
 */
function getScalePosition(scale: D3Scale, value: any): number {
  if (typeof scale.bandwidth === 'function') {
    // Band scale - center the position within the band
    const bandPos = scale(value);
    const bandwidth = scale.bandwidth();
    return bandPos !== undefined ? bandPos + bandwidth / 2 : 0;
  }

  // Linear/other scale - direct positioning
  const pos = scale(value);
  return pos !== undefined ? pos : 0;
}

/**
 * Get the range extent of a scale (max value)
 *
 * @param scale The d3 scale object
 * @returns Maximum value in scale range
 */
function getScaleRangeMax(scale: D3Scale): number {
  const range = scale.range?.();
  if (Array.isArray(range) && range.length > 0) {
    return Math.max(...range.map(r => typeof r === 'number' ? r : 0));
  }
  return 0;
}

/**
 * Create a top axis generator
 * Suitable for x-axis at top of chart (e.g., column labels)
 *
 * @param scale The d3 scale for positioning ticks
 * @param options Customization options
 * @returns Function that takes a d3 selection and renders the axis
 *
 * @example
 * const xAxis = createAxisTop(xScale, { tickSize: 6 });
 * g.append('g').call(xAxis);
 */
export function createAxisTop(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const ticks = getScaleTicks(scale, tickValues);
    const rangeMax = getScaleRangeMax(scale);

    // Create tick elements
    const tickElements = selection
      .selectAll('.tick')
      .data(ticks, (d: any) => d)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => `translate(${getScalePosition(scale, d)}, 0)`);

    // Add tick line
    tickElements
      .selectAll('line')
      .data(() => [null])
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('y1', 0)
      .attr('y2', -tickSize);

    // Add tick text label
    tickElements
      .selectAll('text')
      .data(() => [null])
      .join('text')
      .attr('fill', 'currentColor')
      .attr('y', -tickSize - tickPadding)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('dominant-baseline', 'auto')
      .text((d: any, i: number) => tickFormat ? tickFormat(d, i) : String(d));

    // Add axis line
    selection
      .selectAll('line.axis-line')
      .data([null])
      .join('line')
      .attr('class', 'axis-line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', rangeMax)
      .attr('y1', 0)
      .attr('y2', 0);
  };
}

/**
 * Create a left axis generator
 * Suitable for y-axis on left side of chart (e.g., row labels)
 *
 * @param scale The d3 scale for positioning ticks
 * @param options Customization options
 * @returns Function that takes a d3 selection and renders the axis
 *
 * @example
 * const yAxis = createAxisLeft(yScale, { tickSize: 6 });
 * g.append('g').call(yAxis);
 */
export function createAxisLeft(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const ticks = getScaleTicks(scale, tickValues);
    const rangeMax = getScaleRangeMax(scale);

    // Create tick elements
    const tickElements = selection
      .selectAll('.tick')
      .data(ticks, (d: any) => d)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => `translate(0, ${getScalePosition(scale, d)})`);

    // Add tick line
    tickElements
      .selectAll('line')
      .data(() => [null])
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', -tickSize);

    // Add tick text label
    tickElements
      .selectAll('text')
      .data(() => [null])
      .join('text')
      .attr('fill', 'currentColor')
      .attr('x', -tickSize - tickPadding)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('dominant-baseline', 'middle')
      .text((d: any, i: number) => tickFormat ? tickFormat(d, i) : String(d));

    // Add axis line
    selection
      .selectAll('line.axis-line')
      .data([null])
      .join('line')
      .attr('class', 'axis-line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', rangeMax);
  };
}

/**
 * Create a bottom axis generator
 * Suitable for x-axis at bottom of chart
 *
 * @param scale The d3 scale for positioning ticks
 * @param options Customization options
 * @returns Function that takes a d3 selection and renders the axis
 *
 * @example
 * const xAxis = createAxisBottom(xScale, { tickSize: 6 });
 * g.append('g').call(xAxis);
 */
export function createAxisBottom(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const ticks = getScaleTicks(scale, tickValues);
    const rangeMax = getScaleRangeMax(scale);

    // Create tick elements
    const tickElements = selection
      .selectAll('.tick')
      .data(ticks, (d: any) => d)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => `translate(${getScalePosition(scale, d)}, 0)`);

    // Add tick line
    tickElements
      .selectAll('line')
      .data(() => [null])
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('y1', 0)
      .attr('y2', tickSize);

    // Add tick text label
    tickElements
      .selectAll('text')
      .data(() => [null])
      .join('text')
      .attr('fill', 'currentColor')
      .attr('y', tickSize + tickPadding)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('dominant-baseline', 'hanging')
      .text((d: any, i: number) => tickFormat ? tickFormat(d, i) : String(d));

    // Add axis line
    selection
      .selectAll('line.axis-line')
      .data([null])
      .join('line')
      .attr('class', 'axis-line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', rangeMax)
      .attr('y1', 0)
      .attr('y2', 0);
  };
}

/**
 * Create a right axis generator
 * Suitable for y-axis on right side of chart
 *
 * @param scale The d3 scale for positioning ticks
 * @param options Customization options
 * @returns Function that takes a d3 selection and renders the axis
 *
 * @example
 * const yAxis = createAxisRight(yScale, { tickSize: 6 });
 * g.append('g').call(yAxis);
 */
export function createAxisRight(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const ticks = getScaleTicks(scale, tickValues);
    const rangeMax = getScaleRangeMax(scale);

    // Create tick elements
    const tickElements = selection
      .selectAll('.tick')
      .data(ticks, (d: any) => d)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => `translate(0, ${getScalePosition(scale, d)})`);

    // Add tick line
    tickElements
      .selectAll('line')
      .data(() => [null])
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', tickSize);

    // Add tick text label
    tickElements
      .selectAll('text')
      .data(() => [null])
      .join('text')
      .attr('fill', 'currentColor')
      .attr('x', tickSize + tickPadding)
      .attr('text-anchor', 'start')
      .attr('font-size', '11px')
      .attr('dominant-baseline', 'middle')
      .text((d: any, i: number) => tickFormat ? tickFormat(d, i) : String(d));

    // Add axis line
    selection
      .selectAll('line.axis-line')
      .data([null])
      .join('line')
      .attr('class', 'axis-line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', rangeMax);
  };
}

/**
 * Create a numeric top axis
 * Better for linear scales with numeric labels
 *
 * @param scale The d3 scale for positioning ticks
 * @param options Customization options
 * @returns Function that takes a d3 selection and renders the axis
 */
export function createAxisTopNumeric(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const ticks = tickValues || (scale.ticks?.(5) || scale.domain());
    const rangeMax = getScaleRangeMax(scale);

    // Create tick elements
    const tickElements = selection
      .selectAll('.tick')
      .data(ticks)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => `translate(${getScalePosition(scale, d)}, 0)`);

    // Add tick line
    tickElements
      .selectAll('line')
      .data(() => [null])
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('y1', 0)
      .attr('y2', -tickSize);

    // Add tick text label with numeric formatting
    tickElements
      .selectAll('text')
      .data(() => [null])
      .join('text')
      .attr('fill', 'currentColor')
      .attr('y', -tickSize - tickPadding)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('dominant-baseline', 'auto')
      .text((d: any) => {
        // Format numbers with appropriate precision
        if (typeof d === 'number') {
          return d % 1 === 0 ? String(d) : d.toFixed(2);
        }
        return String(d);
      });

    // Add axis line
    selection
      .selectAll('line.axis-line')
      .data([null])
      .join('line')
      .attr('class', 'axis-line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', rangeMax)
      .attr('y1', 0)
      .attr('y2', 0);
  };
}

/**
 * Create a numeric left axis
 * Better for linear scales with numeric labels
 *
 * @param scale The d3 scale for positioning ticks
 * @param options Customization options
 * @returns Function that takes a d3 selection and renders the axis
 */
export function createAxisLeftNumeric(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const ticks = tickValues || (scale.ticks?.(5) || scale.domain());
    const rangeMax = getScaleRangeMax(scale);

    // Create tick elements
    const tickElements = selection
      .selectAll('.tick')
      .data(ticks)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => `translate(0, ${getScalePosition(scale, d)})`);

    // Add tick line
    tickElements
      .selectAll('line')
      .data(() => [null])
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', -tickSize);

    // Add tick text label with numeric formatting
    tickElements
      .selectAll('text')
      .data(() => [null])
      .join('text')
      .attr('fill', 'currentColor')
      .attr('x', -tickSize - tickPadding)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('dominant-baseline', 'middle')
      .text((d: any) => {
        // Format numbers with appropriate precision
        if (typeof d === 'number') {
          return d % 1 === 0 ? String(d) : d.toFixed(2);
        }
        return String(d);
      });

    // Add axis line
    selection
      .selectAll('line.axis-line')
      .data([null])
      .join('line')
      .attr('class', 'axis-line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', rangeMax);
  };
}
