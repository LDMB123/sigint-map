<script lang="ts">
  import { onMount } from "svelte";
  import {
    loadD3Selection,
    loadD3Scale,
    loadD3Axis,
  } from "$lib/utils/d3-loader";
  import { arrayMax, colorSchemes, MARGINS } from "$lib/utils/d3-utils";

  type Props = {
    data?: Array<{
      date: string;
      songId: string;
      songName: string;
      gap: number;
    }>;
    width?: number;
    height?: number;
    class?: string;
  };

  let {
    data = [],
    width = 1200,
    height = 400,
    class: className = "",
  }: Props = $props();

  let canvasElement: HTMLCanvasElement | undefined;
  let svgElement: SVGSVGElement | undefined;
  let containerElement: HTMLDivElement | undefined;
  let tooltip = $state<{ x: number; y: number; content: string } | null>(null);
  let resizeObserver: ResizeObserver | undefined;
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

  // Lazy-loaded D3 modules
  let d3Selection: any = $state(null);
  let d3Scale: any = $state(null);
  let d3Axis: any = $state(null);
  let modulesLoaded = $state(false);

  // Memoization: track previous data to avoid unnecessary re-renders
  let prevDataHash = $state<string>("");

  onMount(() => {
    if (!containerElement || !canvasElement || !svgElement) return;

    const renderChart = (forceRender = false) => {
      // Guard: ensure modules and DOM elements are ready
      if (!modulesLoaded || !d3Selection || !d3Scale || !d3Axis) return;
      if (
        !containerElement ||
        !canvasElement ||
        !svgElement ||
        data.length === 0
      )
        return;

      // Memoization: skip re-render if data hasn't changed (unless forced by resize)
      // PERF: Use lightweight hash instead of JSON.stringify (O(n) vs O(n*len))
      let hash = data.length;
      for (let i = 0; i < Math.min(data.length, 100); i++) {
        hash = (hash * 31 + (data[i].gap || 0)) | 0;
      }
      const dataHash = `${hash}:${data[0]?.date || ""}:${data[data.length - 1]?.songId || ""}`;
      if (!forceRender && dataHash === prevDataHash) {
        return;
      }
      prevDataHash = dataHash;

      const rect = containerElement.getBoundingClientRect();
      const containerWidth = rect.width || width;
      const containerHeight = rect.height || height;

      const margin = MARGINS.timeline;
      const innerWidth = containerWidth - margin.left - margin.right;
      const innerHeight = containerHeight - margin.top - margin.bottom;

      // Parse dates
      const parsedData = data.map((d) => ({
        ...d,
        date: new Date(d.date),
      }));

      // Find date extent - helper for time scale domain
      const getDateExtent = (arr: any[]): [Date, Date] => {
        if (arr.length === 0) return [new Date(), new Date()];
        let minTime = arr[0].date.getTime();
        let maxTime = minTime;
        for (let i = 1; i < arr.length; i++) {
          const time = arr[i].date.getTime();
          if (time < minTime) minTime = time;
          if (time > maxTime) maxTime = time;
        }
        return [new Date(minTime), new Date(maxTime)];
      };

      // Set up scales with loaded D3 modules
      const xScale = d3Scale
        .scaleTime()
        .domain(getDateExtent(parsedData))
        .range([0, innerWidth]);

      const yScale = d3Scale
        .scaleLinear()
        .domain([0, arrayMax(parsedData, (d) => d.gap) || 100])
        .range([innerHeight, 0]);

      // Set up canvas
      const ctx = canvasElement.getContext("2d");
      if (!ctx) return;

      const context = ctx; // Non-null reference for closure
      canvasElement.width = containerWidth;
      canvasElement.height = containerHeight;
      context.globalAlpha = 1;

      // Create color scale with lazy-loaded module
      const uniqueSongs = Array.from(
        new Set(parsedData.map((d) => d.songName)),
      );
      const colorScale = d3Scale
        .scaleOrdinal()
        .domain(uniqueSongs)
        .range(colorSchemes.category10);

      // Draw on canvas with shadow for performance
      function drawChart() {
        // Clear canvas
        context.clearRect(0, 0, containerWidth, containerHeight);

        // Draw background
        context.fillStyle =
          getComputedStyle(document.documentElement).getPropertyValue(
            "--background",
          ) || "#fff";
        context.fillRect(0, 0, containerWidth, containerHeight);

        // Translate to margin
        context.save();
        context.translate(margin.left, margin.top);

        // Draw grid lines
        context.strokeStyle = "#e5e7eb";
        context.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
          const y = (innerHeight / 5) * i;
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(innerWidth, y);
          context.stroke();
        }

        // Draw bars
        const barWidth = Math.max(1, innerWidth / parsedData.length);
        parsedData.forEach((d) => {
          const x = xScale(d.date);
          const y = yScale(d.gap);
          const barHeight = innerHeight - y;

          context.fillStyle = colorScale(d.songName);
          context.globalAlpha = 0.8;
          context.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        });

        context.globalAlpha = 1;
        context.restore();
      }

      drawChart();

      // Set up SVG for axes and interactivity with lazy-loaded modules
      d3Selection.select(svgElement).selectAll("*").remove();

      const svg = d3Selection
        .select(svgElement)
        .attr("width", containerWidth)
        .attr("height", containerHeight);

      const mainGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // X Axis
      mainGroup
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3Axis.axisBottom(xScale))
        .style("font-size", "12px");

      // Y Axis
      mainGroup
        .append("g")
        .call(d3Axis.axisLeft(yScale))
        .style("font-size", "12px");

      // Y Axis Label
      mainGroup
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - innerHeight / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "currentColor")
        .text("Gap (days)");

      // Invisible overlay for tooltips
      mainGroup
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mousemove", function (event: any) {
          const [mouseX] = d3Selection.pointer(event, this);
          const date = xScale.invert(mouseX);

          const closestPoint = parsedData.reduce((closest, point) => {
            const pointDate = point.date.getTime();
            const currentDate = date.getTime();
            const closestDate = closest.date.getTime();

            const currentDist = Math.abs(pointDate - currentDate);
            const closestDist = Math.abs(closestDate - currentDate);

            return currentDist < closestDist ? point : closest;
          });

          if (closestPoint) {
            const x = margin.left + xScale(closestPoint.date);
            const y = margin.top + yScale(closestPoint.gap);
            tooltip = {
              x,
              y: y - 10,
              content: `${closestPoint.songName}: ${closestPoint.gap} days gap`,
            };
          }
        })
        .on("mouseout", () => {
          tooltip = null;
        });
    };

    /**
     * Load D3 modules in parallel
     * Called on mount to prepare modules before first render
     */
    const loadModules = async () => {
      try {
        const [selection, scale, axis] = await Promise.all([
          loadD3Selection(),
          loadD3Scale(),
          loadD3Axis(),
        ]);

        d3Selection = selection;
        d3Scale = scale;
        d3Axis = axis;
        modulesLoaded = true;

        // Render after modules are loaded
        if (data.length > 0) renderChart();
      } catch (error) {
        console.error("Failed to load D3 modules:", error);
        modulesLoaded = false;
      }
    };

    // Load D3 modules on mount
    loadModules();

    // Reactive resize with ResizeObserver (debounced for performance)
    resizeObserver = new ResizeObserver(() => {
      // Clear any pending resize timeout
      if (resizeTimeout) clearTimeout(resizeTimeout);

      // Debounce resize events - force render on resize
      resizeTimeout = setTimeout(() => {
        if (data.length > 0 && modulesLoaded) renderChart(true);
      }, 150);
    });
    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver?.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      // Explicit D3 event handler cleanup to prevent memory leaks
      if (svgElement && d3Selection) {
        d3Selection
          .select(svgElement)
          .selectAll("rect")
          .on("mousemove", null)
          .on("mouseout", null);
      }
    };
  });
</script>

<div
  bind:this={containerElement}
  class="gap-timeline scroll-reveal {className}"
>
  {#if !modulesLoaded}
    <div class="loading-modules" aria-label="Loading visualization">
      <div class="loading-spinner"></div>
      <p>Loading visualization...</p>
    </div>
  {/if}
  <canvas
    bind:this={canvasElement}
    class="timeline-canvas"
    class:hidden={!modulesLoaded}
    aria-label="Gap timeline showing days between song performances"
  ></canvas>
  <svg
    bind:this={svgElement}
    class="timeline-axes"
    class:hidden={!modulesLoaded}
  ></svg>
  {#if tooltip}
    <div class="tooltip" style="left: {tooltip.x}px; top: {tooltip.y}px;">
      {tooltip.content}
    </div>
  {/if}
</div>

<style>
  .gap-timeline {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;
    /* CSS Containment for rendering performance */
    contain: layout style paint;
    /* Lazy rendering when off-screen */
    content-visibility: auto;

    /* View Transition Name - enables smooth morphing between charts */
    view-transition-name: active-visualization;
  }

  /* Add scroll-driven animation support */
  :global(.gap-timeline.scroll-reveal) {
    /* Styles are handled by global utility class */
  }

  .loading-modules {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    z-index: 1;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--foreground);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-modules p {
    margin: 0;
    font-size: 14px;
    color: var(--foreground-secondary);
  }

  .hidden {
    display: none;
  }

  :global(.timeline-canvas) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  :global(.timeline-axes) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  :global(.timeline-axes text) {
    fill: var(--foreground);
  }

  :global(.timeline-axes line) {
    stroke: var(--border-color);
  }

  :global(.timeline-axes path) {
    stroke: var(--border-color);
  }

  .tooltip {
    position: absolute;
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    font-size: 12px;
    box-shadow: var(--shadow-lg);
    pointer-events: none;
    white-space: nowrap;
    z-index: 10;
    transform: translate(-50%, -100%);
  }
</style>
