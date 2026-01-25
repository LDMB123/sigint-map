<script lang="ts">
  import { onMount } from 'svelte';
  import { loadD3Selection, loadD3Scale, loadD3Axis } from '$lib/utils/d3-loader';
  import { arrayMax } from '$lib/utils/d3-utils';

  type Props = {
    data?: Array<{
      id: string;
      name: string;
      rarity: number;
      lastPlayed?: string;
      totalAppearances: number;
    }>;
    width?: number;
    height?: number;
    limit?: number;
    class?: string;
  };

  let {
    data = [],
    width = 400,
    height = 500,
    limit = 10,
    class: className = ''
  }: Props = $props();

  let svgElement: SVGSVGElement | undefined;
  let containerElement: HTMLDivElement | undefined;
  let selectedSong: string | null = $state(null);
  let resizeObserver: ResizeObserver | undefined;
  let resizeDebounceTimeout: ReturnType<typeof setTimeout> | undefined;
  let modulesLoaded = $state(false);

  // D3 module references - lazily loaded
  let d3Selection: any;
  let d3Scale: any;
  let d3Axis: any;

  // Load D3 modules on demand
  async function loadModules() {
    try {
      [d3Selection, d3Scale, d3Axis] = await Promise.all([
        loadD3Selection(),
        loadD3Scale(),
        loadD3Axis()
      ]);
      modulesLoaded = true;
    } catch (error) {
      console.error('Failed to load D3 modules for RarityScorecard:', error);
      modulesLoaded = false;
    }
  }

  onMount(() => {
    if (!containerElement || !svgElement) return;

    const renderChart = () => {
      // Guard: ensure modules are loaded
      if (!modulesLoaded || !d3Selection || !d3Scale || !d3Axis) {
        return;
      }

      if (!containerElement || !svgElement || data.length === 0) return;

      const rect = containerElement.getBoundingClientRect();
      const containerWidth = rect.width || width;
      const containerHeight = rect.height || height;

      // Sort by rarity and take top items
      const topData = data
        .sort((a, b) => b.rarity - a.rarity)
        .slice(0, limit);

      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      const innerWidth = containerWidth - margin.left - margin.right;
      const innerHeight = containerHeight - margin.top - margin.bottom;

      // Clear previous content
      d3Selection.select(svgElement).selectAll('*').remove();

      const svg = d3Selection.select(svgElement)
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('width', containerWidth)
        .attr('height', containerHeight);

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Create scales
      const xScale = d3Scale.scaleBand()
        .domain(topData.map(d => d.id))
        .range([0, innerWidth])
        .padding(0.2);

      const yScale = d3Scale.scaleLinear()
        .domain([0, arrayMax(topData, d => d.rarity) || 100])
        .range([innerHeight, 0]);

      // Color scale - more red = more rare
      const colorScale = d3Scale.scaleLinear<string>()
        .domain([0, arrayMax(topData, d => d.rarity) || 100])
        .range(['#86efac', '#dc2626']);

      // Draw bars
      g.selectAll('rect')
        .data(topData)
        .join('rect')
        .attr('x', d => xScale(d.id) || 0)
        .attr('y', d => yScale(d.rarity))
        .attr('width', xScale.bandwidth())
        .attr('height', d => innerHeight - yScale(d.rarity))
        .attr('fill', d => colorScale(d.rarity))
        .attr('rx', 4)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          selectedSong = d.id;
          d3Selection.select(this)
            .transition()
            .duration(200)
            .attr('filter', 'url(#shadow)');
        })
        .on('mouseout', function() {
          selectedSong = null;
          d3Selection.select(this)
            .transition()
            .duration(200)
            .attr('filter', 'none');
        })
        .append('title')
        .text(d => `${d.name}: Rarity ${Math.round(d.rarity)}%`);

      // Add shadow filter
      svg.append('defs')
        .append('filter')
        .attr('id', 'shadow')
        .append('feDropShadow')
        .attr('dx', 0)
        .attr('dy', 2)
        .attr('stdDeviation', 3)
        .attr('flood-opacity', 0.5);

      // Add labels with song names - rotated
      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .selectAll('text')
        .data(topData)
        .join('text')
        .attr('x', d => (xScale(d.id) || 0) + (xScale.bandwidth() / 2))
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', 'currentColor')
        .text(d => d.name);

      // Add rarity value labels on top of bars
      g.selectAll('.value-label')
        .data(topData)
        .join('text')
        .attr('class', 'value-label')
        .attr('x', d => (xScale(d.id) || 0) + (xScale.bandwidth() / 2))
        .attr('y', d => yScale(d.rarity) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', 'currentColor')
        .text(d => `${Math.round(d.rarity)}%`);

      // Y Axis
      g.append('g')
        .call(d3Axis.axisLeft(yScale))
        .selectAll('text')
        .attr('font-size', '11px');

      // Y Axis Label
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - 15)
        .attr('x', 0 - (innerHeight / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', 'currentColor')
        .text('Rarity Score');
    };

    // Load modules, then render chart
    loadModules().then(() => {
      if (data.length > 0) renderChart();

      // Reactive resize with ResizeObserver (debounced)
      resizeObserver = new ResizeObserver(() => {
        // Clear pending timeout
        if (resizeDebounceTimeout !== undefined) {
          clearTimeout(resizeDebounceTimeout);
        }

        // Debounce resize callback (150ms)
        resizeDebounceTimeout = setTimeout(() => {
          if (data.length > 0) renderChart();
        }, 150);
      });
      resizeObserver.observe(containerElement);
    });

    return () => {
      resizeObserver?.disconnect();
      if (resizeDebounceTimeout !== undefined) {
        clearTimeout(resizeDebounceTimeout);
      }
      // Explicit D3 event handler cleanup to prevent memory leaks
      if (svgElement && d3Selection) {
        d3Selection.select(svgElement).selectAll('rect')
          .on('mouseover', null)
          .on('mouseout', null);
      }
    };
  });
</script>

<div bind:this={containerElement} class="rarity-scorecard {className}">
  <svg
    bind:this={svgElement}
    class="rarity-diagram"
    class:hidden={!modulesLoaded}
    role="img"
    aria-label="Rarity score for songs"
  />
  {#if !modulesLoaded}
    <div class="loading-modules" aria-live="polite">
      Loading visualization...
    </div>
  {/if}
  {#if selectedSong}
    <div class="selection-badge" role="status" aria-live="polite">
      Selected: <strong>{selectedSong}</strong>
    </div>
  {/if}
</div>

<style>
  .rarity-scorecard {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;
    content-visibility: auto;
    contain: layout style paint;
  }

  :global(.rarity-diagram) {
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  :global(.rarity-diagram.hidden) {
    display: none;
  }

  :global(.rarity-diagram rect) {
    transition: filter 200ms;
  }

  :global(.rarity-diagram text) {
    fill: var(--foreground);
  }

  :global(.rarity-diagram line) {
    stroke: var(--border-color);
  }

  :global(.rarity-diagram path) {
    stroke: var(--border-color);
  }

  .loading-modules {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--foreground-secondary);
    font-size: 14px;
    text-align: center;
    animation: fade-in 300ms ease-in;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .selection-badge {
    position: absolute;
    top: 20px;
    right: 20px;
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    font-size: 12px;
    box-shadow: var(--shadow-md);
  }

  .selection-badge strong {
    font-weight: var(--font-semibold);
  }
</style>
