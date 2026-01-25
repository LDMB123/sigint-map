<script lang="ts">
  import { onMount } from "svelte";
  import {
    loadD3Selection,
    loadD3Scale,
    loadD3Axis,
  } from "$lib/utils/d3-loader";
  // WASM Layout Bridge
  import { prepareHeatmapData, type HeatmapResult } from "$lib/wasm/visualize";

  // Lazy-loaded D3 modules (Selection only, needed for DOM binding)
  let d3Selection: typeof import("d3-selection") | null = null;
  let modulesLoaded = $state(false);

  type Props = {
    data?: Array<{
      row: string;
      column: string;
      value: number;
    }>;
    width?: number;
    height?: number;
    class?: string;
  };

  let {
    data = [],
    width = 900,
    height = 600,
    class: className = "",
  }: Props = $props();

  let svgElement: SVGSVGElement | undefined;
  let containerElement: HTMLDivElement | undefined;
  let hoveredCell: { row: string; column: string } | null = $state(null);
  let resizeObserver: ResizeObserver | undefined;
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

  // Memoization
  let prevDataHash = $state<string>("");

  onMount(() => {
    if (!containerElement || !svgElement) return;

    const loadModules = async () => {
      // Only load selection, as layout is now done in WASM
      const [selection] = await Promise.all([loadD3Selection()]);
      d3Selection = selection;
      modulesLoaded = true;
      if (data.length > 0) renderChart();
    };

    const renderChart = async (forceRender = false) => {
      // Guard: ensure D3 selection is loaded for DOM manipulation
      if (!modulesLoaded || !d3Selection) return;
      if (!containerElement || !svgElement || data.length === 0) return;

      // Memoization
      let hash = data.length;
      for (let i = 0; i < Math.min(data.length, 100); i++) {
        hash = (hash * 31 + (data[i].value || 0)) | 0;
      }
      const dataHash = `${hash}:${data[0]?.row || ""}:${data[data.length - 1]?.column || ""}`;
      if (!forceRender && dataHash === prevDataHash) {
        return;
      }
      prevDataHash = dataHash;

      const rect = containerElement.getBoundingClientRect();
      const containerWidth = rect.width || width;
      const containerHeight = rect.height || height;
      const margin = { top: 100, right: 30, bottom: 30, left: 100 };

      // Offload layout calculation to WASM
      // This calculates all rect positions, sizes, colors, and tick locations in Rust
      const result: HeatmapResult = await prepareHeatmapData(data, {
        width: containerWidth,
        height: containerHeight,
        margins: margin,
        color_range: ["#f0f9ff", "#0c4a6e"],
      });

      if (!result) return;

      // Clear previous content
      d3Selection.select(svgElement).selectAll("*").remove();

      const svg = d3Selection
        .select(svgElement)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("width", containerWidth)
        .attr("height", containerHeight);

      const g = svg.append("g");

      // Draw cells directly from WASM result
      g.selectAll("rect")
        .data(result.rects)
        .join("rect")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("width", (d) => d.width)
        .attr("height", (d) => d.height)
        .attr("fill", (d) => d.fill)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          hoveredCell = { row: d.row, column: d.column };
          d3Selection!
            .select(this)
            .attr("stroke", "#000")
            .attr("stroke-width", 2);
        })
        .on("mouseout", function () {
          hoveredCell = null;
          d3Selection!
            .select(this)
            .attr("stroke", "#e5e7eb")
            .attr("stroke-width", 1);
        })
        .append("title")
        .text((d) => `${d.row} - ${d.column}: ${d.value}`);

      // X Axis Ticks
      g.append("g")
        .selectAll("text")
        .data(result.x_ticks)
        .join("text")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .text((d) => d.label)
        .style("text-anchor", "start")
        .attr("transform", (d) => `rotate(-45, ${d.x}, ${d.y})`)
        .attr("font-size", "11px")
        .attr("fill", "var(--foreground)");

      // Y Axis Ticks
      g.append("g")
        .selectAll("text")
        .data(result.y_ticks)
        .join("text")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .text((d) => d.label)
        .style("text-anchor", "end")
        .attr("dy", "0.32em")
        .attr("font-size", "11px")
        .attr("fill", "var(--foreground)");

      // Add color legend
      const legendWidth = 300;
      const legendHeight = 20;
      const legendX = containerWidth - legendWidth - margin.right;
      const legendY = margin.top / 2;

      const legend = svg
        .append("g")
        .attr("transform", `translate(${legendX},${legendY})`);

      // Legend gradient
      const gradientId = "heatmap-gradient";
      const gradient = svg
        .append("defs")
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "100%");

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", result.legend_gradient[0]);

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", result.legend_gradient[1]);

      legend
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("fill", `url(#${gradientId})`);

      legend.append("text").attr("y", -5).attr("font-size", "12px").text("Low");

      legend
        .append("text")
        .attr("x", legendWidth)
        .attr("y", -5)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .text("High");
    };

    // Load D3 modules and render
    loadModules();

    // Reactive resize with ResizeObserver (debounced for INP optimization)
    resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      resizeTimeout = setTimeout(() => {
        if (data.length > 0) renderChart(true);
      }, 150);
    });
    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver?.disconnect();
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (svgElement && d3Selection) {
        d3Selection
          .selectAll("rect")
          .on("mouseover", null)
          .on("mouseout", null);
      }
    };
  });
</script>

<div
  bind:this={containerElement}
  class="song-heatmap scroll-reveal {className}"
>
  {#if !modulesLoaded}
    <div class="loading-modules">Loading visualization...</div>
  {/if}
  <svg
    bind:this={svgElement}
    class="heatmap-diagram"
    class:hidden={!modulesLoaded}
    role="img"
    aria-label="Song performance heatmap"
  />
  {#if hoveredCell}
    <div class="cell-info" role="status" aria-live="polite">
      <strong>{hoveredCell.row}</strong> <span>{hoveredCell.column}</span>
    </div>
  {/if}
</div>

<style>
  .song-heatmap {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;
    /* Chromium 2025 performance optimizations */
    content-visibility: auto;
    contain: layout style paint;

    /* View Transition Name - enables smooth morphing between charts */
    view-transition-name: active-visualization;
  }

  :global(.song-heatmap.scroll-reveal) {
    /* Styles handled by global utility */
  }

  .loading-modules {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--foreground-secondary);
    font-size: 14px;
  }

  :global(.heatmap-diagram) {
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  :global(.heatmap-diagram.hidden) {
    display: none;
  }

  :global(.heatmap-diagram rect) {
    transition:
      stroke 200ms,
      stroke-width 200ms;
  }

  :global(.heatmap-diagram text) {
    fill: var(--foreground);
  }

  :global(.heatmap-diagram line) {
    stroke: var(--border-color);
  }

  :global(.heatmap-diagram path) {
    stroke: var(--border-color);
  }

  .cell-info {
    position: absolute;
    top: 20px;
    right: 20px;
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    box-shadow: var(--shadow-md);
  }

  .cell-info strong {
    display: block;
    font-weight: var(--font-semibold);
  }

  .cell-info span {
    display: block;
    font-size: 12px;
    color: var(--foreground-secondary);
  }
</style>
