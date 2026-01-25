<script lang="ts">
  import { onMount } from 'svelte';
  import { loadD3Selection, loadD3Scale, loadD3Geo } from '$lib/utils/d3-loader';
  import { colorSchemes } from '$lib/utils/d3-utils';
  import * as topojson from 'topojson-client';
  import type { Topology, GeometryCollection } from 'topojson-specification';

  // Lazy-loaded D3 modules
  let d3Selection: typeof import('d3-selection') | null = null;
  let d3Scale: typeof import('d3-scale') | null = null;
  let d3Geo: typeof import('d3-geo') | null = null;
  let modulesLoaded = $state(false);

  // TopoJSON structure for US states or countries
  interface TopoData extends Topology {
    objects: {
      states?: GeometryCollection;
      countries?: GeometryCollection;
    };
  }

  // GeoJSON feature with properties
  interface GeoFeature extends GeoJSON.Feature {
    properties: {
      name?: string;
    } | null;
    id?: string | number;
  }

  type Props = {
    topoData?: TopoData;
    data?: Map<string, number> | Record<string, number>;
    colorScheme?: 'blues' | 'greens' | 'reds' | 'purples';
    width?: number;
    height?: number;
    class?: string;
  };

  let {
    topoData,
    data = new Map(),
    colorScheme = 'blues',
    width = 960,
    height = 600,
    class: className = ''
  }: Props = $props();

  let svgElement: SVGSVGElement | undefined;
  let containerElement: HTMLDivElement | undefined;
  let selectedState: string | null = $state(null);
  let _hoveredState: string | null = $state(null); // Used for hover effects in template
  let resizeObserver: ResizeObserver | undefined;
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

  // Memoization: track previous data to avoid unnecessary re-renders
  let prevDataHash = $state<string>('');
  let prevTopoHash = $state<string>('');

  onMount(() => {
    if (!containerElement || !svgElement) return;

    // Load D3 modules asynchronously
    const loadModules = async () => {
      const [selection, scale, geo] = await Promise.all([
        loadD3Selection(),
        loadD3Scale(),
        loadD3Geo()
      ]);
      d3Selection = selection;
      d3Scale = scale;
      d3Geo = geo;
      modulesLoaded = true;

      // Render after modules load
      if (topoData) renderChart();
    };

    const renderChart = (forceRender = false) => {
      if (!containerElement || !svgElement || !topoData) return;
      if (!modulesLoaded || !d3Selection || !d3Scale || !d3Geo) return;

      // Memoization: skip re-render if data hasn't changed (unless forced by resize)
      // PERF: Use lightweight hash instead of JSON.stringify (O(n) vs O(n*len))
      const dataMap = data instanceof Map ? data : new Map(Object.entries(data));
      let hash = dataMap.size;
      let i = 0;
      for (const [key, value] of dataMap) {
        if (i++ > 50) break; // Sample first 50 entries
        hash = (hash * 31 + (typeof value === 'number' ? value : key.charCodeAt(0))) | 0;
      }
      const dataHash = `${hash}:${dataMap.size}`;
      const topoHash = topoData ? 'loaded' : '';
      if (!forceRender && dataHash === prevDataHash && topoHash === prevTopoHash) {
        return;
      }
      prevDataHash = dataHash;
      prevTopoHash = topoHash;

      const rect = containerElement.getBoundingClientRect();
      const containerWidth = rect.width || width;
      const containerHeight = rect.height || height;

      d3Selection.select(svgElement).selectAll('*').remove();

      const svg = d3Selection.select(svgElement)
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('width', containerWidth)
        .attr('height', containerHeight);

      // Convert TopoJSON to GeoJSON
      const objectKey = topoData.objects.states || topoData.objects.countries;
      if (!objectKey) return;
      const geojson = topojson.feature(topoData, objectKey) as GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoFeature['properties']>;

      // Create projection
      const projection = d3Geo.geoAlbersUsa()
        .fitSize([containerWidth, containerHeight], geojson);

      const pathGenerator = d3Geo.geoPath().projection(projection);

      // dataMap already converted above during memoization check

      // Get value domain
      // PERF: Use loop instead of Math.max(...spread) to avoid stack overflow on large arrays
      let maxValue = 1;
      for (const [, value] of dataMap) {
        if (value > 0 && value > maxValue) maxValue = value;
      }

      // Create color scale
      const colorScale = d3Scale.scaleQuantize<string>()
        .domain([0, maxValue])
        .range(colorSchemes[colorScheme]);

      // Helper to get state name from feature
      const getStateName = (d: GeoJSON.Feature): string => {
        const feature = d as GeoFeature;
        return feature.properties?.name || String(feature.id) || 'Unknown';
      };

      // Draw states/regions
      svg.selectAll('path')
        .data(geojson.features)
        .join('path')
        .attr('d', d => pathGenerator(d) || '')
        .attr('fill', (d: GeoJSON.Feature) => {
          const stateName = getStateName(d);
          const value = dataMap.get(stateName);
          return value ? colorScale(value) : '#e5e7eb';
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.5)
        .attr('data-state', (d: GeoJSON.Feature) => getStateName(d))
        .style('cursor', 'pointer')
        .on('mouseover', function(_event, d: GeoJSON.Feature) {
          const stateName = getStateName(d);
          _hoveredState = stateName;
          d3Selection!.select(this)
            .attr('stroke-width', 2)
            .attr('filter', 'url(#shadow)');
        })
        .on('mouseout', function() {
          _hoveredState = null;
          d3Selection!.select(this)
            .attr('stroke-width', 0.5)
            .attr('filter', 'none');
        })
        .on('click', function(event, d: GeoJSON.Feature) {
          event.preventDefault();
          const stateName = getStateName(d);
          selectedState = selectedState === stateName ? null : stateName;
        })
        .append('title')
        .text((d: GeoJSON.Feature) => {
          const stateName = getStateName(d);
          const value = dataMap.get(stateName);
          return value ? `${stateName}: ${value} shows` : stateName;
        });

      // Add filter for shadow effect
      svg.append('defs')
        .append('filter')
        .attr('id', 'shadow')
        .append('feDropShadow')
        .attr('dx', 2)
        .attr('dy', 2)
        .attr('stdDeviation', 3)
        .attr('flood-opacity', 0.3);

      // Add legend
      const legendWidth = 200;
      const legendHeight = 250;
      const legendX = containerWidth - legendWidth - 20;
      const legendY = 20;

      const legend = svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`);

      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .attr('fill', 'white')
        .attr('stroke', '#ccc')
        .attr('rx', 4)
        .attr('opacity', 0.9);

      legend.append('text')
        .attr('x', 10)
        .attr('y', 25)
        .attr('font-weight', 'bold')
        .attr('font-size', '14px')
        .text('Shows per State');

      const legendItems = colorScale.range();
      legendItems.forEach((color, i) => {
        const scale = d3Scale.scaleLinear()
          .domain([0, legendItems.length - 1])
          .range([0, maxValue]);

        const y = 50 + i * 20;

        legend.append('rect')
          .attr('x', 10)
          .attr('y', y)
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', color);

        legend.append('text')
          .attr('x', 30)
          .attr('y', y + 12)
          .attr('font-size', '12px')
          .text(`${Math.round(scale(i))}-${Math.round(scale(i + 1))}`);
      });
    };

    // Load modules and trigger initial render
    loadModules();

    // Reactive resize with ResizeObserver (debounced for performance)
    resizeObserver = new ResizeObserver(() => {
      // Clear any pending timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      // Debounce resize handling - force render on resize
      resizeTimeout = setTimeout(() => {
        if (topoData) renderChart(true);
      }, 150);
    });
    resizeObserver.observe(containerElement);

    return () => {
      // Cleanup: disconnect observer and clear pending timeout
      resizeObserver?.disconnect();
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      // Explicit D3 event handler cleanup to prevent memory leaks
      if (svgElement && d3Selection) {
        d3Selection.select(svgElement).selectAll('path')
          .on('mouseover', null)
          .on('mouseout', null)
          .on('click', null);
      }
    };
  });
</script>

<div bind:this={containerElement} class="tour-map {className}">
  {#if !modulesLoaded}
    <div class="loading-modules" aria-live="polite">Loading visualization...</div>
  {/if}
  <svg bind:this={svgElement} class="map-diagram" class:hidden={!modulesLoaded} role="img" aria-label="US tour map showing show distribution by state" />
  {#if selectedState}
    <div class="state-info" role="status" aria-live="polite">
      <strong>{selectedState}</strong>
      <span>{data instanceof Map ? data.get(selectedState) : data[selectedState] || 0} shows</span>
    </div>
  {/if}
</div>

<style>
  .tour-map {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;

    /* Performance optimizations for Apple Silicon / Chromium 143+ */
    content-visibility: auto;
    contain: layout style paint;
  }

  :global(.map-diagram) {
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  :global(.map-diagram.hidden) {
    visibility: hidden;
  }

  :global(.map-diagram path) {
    transition: stroke-width 200ms, filter 200ms;
  }

  .loading-modules {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--foreground-secondary);
    font-size: 14px;
  }

  .state-info {
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    box-shadow: var(--shadow-md);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .state-info strong {
    font-weight: var(--font-semibold);
  }

  .state-info span {
    font-size: 12px;
    color: var(--foreground-secondary);
  }
</style>
