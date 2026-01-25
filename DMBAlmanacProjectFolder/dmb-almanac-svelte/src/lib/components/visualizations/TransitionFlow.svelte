<script lang="ts">
  import { onMount } from "svelte";
  import {
    loadD3Selection,
    loadD3Scale,
    loadD3Sankey,
  } from "$lib/utils/d3-loader";
  import { colorSchemes } from "$lib/utils/d3-utils";
  import { progressiveRender, debouncedYieldingHandler } from "$lib/utils/inpOptimization";
  import type { SankeyNode, SankeyLink, SankeyGraph } from "d3-sankey";

  // Lazy-loaded D3 modules
  let d3Selection: typeof import("d3-selection") | null = null;
  let d3Scale: typeof import("d3-scale") | null = null;
  let d3Sankey: typeof import("d3-sankey") | null = null;
  let modulesLoaded = $state(false);

  // Custom node type for Sankey diagram
  interface FlowNode {
    name: string;
  }

  // Custom link type for Sankey diagram
  interface FlowLink {
    source: number;
    target: number;
    value: number;
  }

  // Computed types with Sankey layout data
  type ComputedNode = SankeyNode<FlowNode, FlowLink>;
  type ComputedLink = SankeyLink<FlowNode, FlowLink>;

  type Props = {
    data?: Array<{
      source: string;
      target: string;
      value: number;
    }>;
    width?: number;
    height?: number;
    class?: string;
  };

  let {
    data = [],
    width = 960,
    height = 600,
    class: className = "",
  }: Props = $props();

  let svgElement: SVGSVGElement | undefined;
  let containerElement: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let resizeDebounceTimeout: ReturnType<typeof setTimeout> | undefined;

  // Memoization: track previous data to avoid unnecessary re-renders
  let prevDataHash = $state<string>("");

  onMount(() => {
    if (!containerElement || !svgElement) return;

    // Load D3 modules asynchronously
    const loadModules = async () => {
      const [selection, scale, sankey] = await Promise.all([
        loadD3Selection(),
        loadD3Scale(),
        loadD3Sankey(),
      ]);
      d3Selection = selection;
      d3Scale = scale;
      d3Sankey = sankey;
      modulesLoaded = true;

      // Render after modules load
      if (data.length > 0) renderChart();
    };

    const renderChart = async (forceRender = false) => {
      if (
        !containerElement ||
        !svgElement ||
        data.length === 0 ||
        !modulesLoaded
      )
        return;
      if (!d3Selection || !d3Scale || !d3Sankey) return;

      // Memoization: skip re-render if data hasn't changed (unless forced by resize)
      // PERF: Use lightweight hash instead of JSON.stringify (O(n) vs O(n*len))
      let hash = data.length;
      for (let i = 0; i < Math.min(data.length, 100); i++) {
        hash = (hash * 31 + (data[i].value || 0)) | 0;
      }
      const dataHash = `${hash}:${data[0]?.source || ""}:${data[data.length - 1]?.target || ""}`;
      if (!forceRender && dataHash === prevDataHash) {
        return;
      }
      prevDataHash = dataHash;

      // Get container dimensions - container queries handle responsive breakpoints via CSS
      // This approach allows CSS to control layout breakpoints instead of JavaScript
      const rect = containerElement.getBoundingClientRect();
      const containerWidth = rect.width || width;
      const containerHeight = rect.height || height;

      // Use CSS custom properties to allow container queries to control margins
      // This enables responsive margin adjustment based on container width
      // via @container rules in app.css (TransitionFlow section)
      const computedStyle = getComputedStyle(svgElement);
      const marginTop =
        parseInt(
          computedStyle.getPropertyValue("--sankey-margin-top") || "20",
        ) || 20;
      const marginRight =
        parseInt(
          computedStyle.getPropertyValue("--sankey-margin-right") || "160",
        ) || 160;
      const marginBottom =
        parseInt(
          computedStyle.getPropertyValue("--sankey-margin-bottom") || "20",
        ) || 20;
      const marginLeft =
        parseInt(
          computedStyle.getPropertyValue("--sankey-margin-left") || "20",
        ) || 20;

      const margin = {
        top: marginTop,
        right: marginRight,
        bottom: marginBottom,
        left: marginLeft,
      };
      const innerWidth = containerWidth - margin.left - margin.right;
      const innerHeight = containerHeight - margin.top - margin.bottom;

      // Clear previous content
      d3Selection.select(svgElement).selectAll("*").remove();

      const svg = d3Selection
        .select(svgElement)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("width", containerWidth)
        .attr("height", containerHeight);

      // Create group for margins
      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Prepare nodes and links
      // Build nodes array and name→index map in single pass for O(1) lookups
      const nodeNames = Array.from(
        new Set(data.flatMap((d) => [d.source, d.target])),
      );
      const nodeIndexMap = new Map<string, number>();
      const nodes: FlowNode[] = nodeNames.map((name, index) => {
        nodeIndexMap.set(name, index);
        return { name };
      });

      // O(n) link creation with O(1) index lookups (instead of O(n²) with findIndex)
      const links: FlowLink[] = data.map((d) => ({
        source: nodeIndexMap.get(d.source)!,
        target: nodeIndexMap.get(d.target)!,
        value: d.value,
      }));

      // Create sankey generator
      const sankeyGenerator = d3Sankey
        .sankey<FlowNode, FlowLink>()
        .nodeWidth(15)
        .nodePadding(50)
        .extent([
          [0, 0],
          [innerWidth, innerHeight],
        ]);

      const graph: SankeyGraph<FlowNode, FlowLink> = sankeyGenerator({
        nodes: nodes.map((n) => ({ ...n })),
        links: links.map((l) => ({ ...l })),
      });

      const computedNodes = graph.nodes as ComputedNode[];
      const computedLinks = graph.links as ComputedLink[];

      // Color scale for nodes
      const colorScale = d3Scale
        .scaleOrdinal<string>()
        .domain(nodes.map((n) => n.name))
        .range(colorSchemes.category10);

      // Create link group (pre-create DOM structure)
      const linkGroup = g.append("g");
      const linkPathGenerator = d3Sankey.sankeyLinkHorizontal();

      // Progressive rendering: Draw links in batches to avoid main thread blocking
      await progressiveRender(
        computedLinks,
        (link: ComputedLink, i: number) => {
          const path = linkGroup
            .append("path")
            .datum(link)
            .attr("d", linkPathGenerator)
            .attr("stroke", () => {
              const sourceNode = link.source as ComputedNode;
              return colorScale(sourceNode.name);
            })
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", Math.max(1, link.width || 0));

          // Add title for tooltip
          path.append("title").text(() => {
            const sourceNode = link.source as ComputedNode;
            const targetNode = link.target as ComputedNode;
            return `${sourceNode.name} → ${targetNode.name}: ${link.value} transitions`;
          });
        },
        {
          batchSize: 50, // Render 50 links at a time
          priority: 'user-visible',
          onProgress: (rendered, total) => {
            console.debug(`[TransitionFlow] Rendered ${rendered}/${total} links`);
          }
        }
      );

      // Create node group
      const nodeGroup = g.append("g");

      // Progressive rendering: Draw nodes in batches
      await progressiveRender(
        computedNodes,
        (node: ComputedNode, i: number) => {
          const rect = nodeGroup
            .append("rect")
            .datum(node)
            .attr("x", node.x0 ?? 0)
            .attr("y", node.y0 ?? 0)
            .attr("width", (node.x1 ?? 0) - (node.x0 ?? 0))
            .attr("height", (node.y1 ?? 0) - (node.y0 ?? 0))
            .attr("fill", colorScale(node.name))
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .on("mouseover", function () {
              d3Selection!
                .select(this)
                .attr("stroke-width", 3)
                .attr("opacity", 0.8);
            })
            .on("mouseout", function () {
              d3Selection!.select(this).attr("stroke-width", 2).attr("opacity", 1);
            });

          // Add title for tooltip
          rect.append("title").text(node.name);
        },
        {
          batchSize: 20, // Render 20 nodes at a time
          priority: 'user-visible'
        }
      );

      // Create label group
      const labelGroup = g.append("g");

      // Progressive rendering: Draw labels in batches
      await progressiveRender(
        computedNodes,
        (node: ComputedNode, i: number) => {
          const nodeWidth = (node.x1 ?? 0) - (node.x0 ?? 0);
          labelGroup
            .append("text")
            .datum(node)
            .attr("x", (node.x0 ?? 0) + nodeWidth / 2)
            .attr("y", ((node.y1 ?? 0) + (node.y0 ?? 0)) / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#fff")
            .attr("pointer-events", "none")
            .text(node.name);
        },
        {
          batchSize: 20, // Render 20 labels at a time
          priority: 'user-visible'
        }
      );
    };

    // Load modules and trigger initial render
    loadModules();

    // Reactive resize with ResizeObserver
    // Container queries (in app.css) handle responsive text sizing and margins
    // ResizeObserver now only triggers chart re-render for significant layout changes
    // This reduces resize handler frequency while CSS handles responsive adjustments
    // Use debounced yielding handler for optimal INP performance
    const debouncedRender = debouncedYieldingHandler(
      () => renderChart(true),
      200, // 200ms debounce
      { priority: 'user-visible' }
    );

    resizeObserver = new ResizeObserver(debouncedRender);
    resizeObserver.observe(containerElement);

    return () => {
      // Disconnect observer
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      // Clear debounce timeout (no longer needed with debouncedYieldingHandler, but kept for safety)
      if (resizeDebounceTimeout) {
        clearTimeout(resizeDebounceTimeout);
      }

      // Explicit D3 event handler cleanup to prevent memory leaks
      if (svgElement && d3Selection) {
        d3Selection
          .select(svgElement)
          .selectAll("rect")
          .on("mouseover", null)
          .on("mouseout", null);

        // Clear all event listeners from paths as well
        d3Selection
          .select(svgElement)
          .selectAll("path")
          .on("mouseover", null)
          .on("mouseout", null);
      }

      console.debug('[TransitionFlow] Cleaned up resources on unmount');
    };
  });
</script>

<div bind:this={containerElement} class="transition-flow {className}">
  {#if !modulesLoaded}
    <div class="loading-modules" aria-live="polite">
      Loading visualization...
    </div>
  {/if}
  <svg
    bind:this={svgElement}
    class="sankey-diagram"
    class:hidden={!modulesLoaded}
  />
</div>

<style>
  .transition-flow {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    overflow: hidden;
    /* Performance optimizations for Chromium 143+ */
    content-visibility: auto;
    contain: layout style paint;

    /* View Transition Name - enables smooth morphing between charts */
    view-transition-name: active-visualization;

    /* Container Query Setup - enables component-level responsive design
     * CSS custom properties (--sankey-margin-*) are controlled via @container rules
     * in app.css, allowing responsive layout without JavaScript media queries */
    container-type: inline-size;
    container-name: transition-flow;

    /* Default CSS custom properties for fallback (non-supporting browsers) */
    --sankey-margin-top: 20px;
    --sankey-margin-right: 160px;
    --sankey-margin-bottom: 20px;
    --sankey-margin-left: 20px;
    --sankey-label-font-size: 12px;
    --sankey-node-width: 15px;
    --sankey-node-padding: 50px;
  }

  :global(.sankey-diagram) {
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  :global(.sankey-diagram rect) {
    cursor: pointer;
    transition:
      stroke-width 200ms,
      opacity 200ms;
  }

  :global(.sankey-diagram path) {
    transition: stroke-opacity 200ms;
  }

  :global(.sankey-diagram path:hover) {
    stroke-opacity: 0.8;
  }

  :global(.sankey-diagram.hidden) {
    visibility: hidden;
  }

  /* Container query responsive text sizing - automatically applied by CSS
   * @container transition-flow (width < 400px) { font-size: 9px; }
   * @container transition-flow (width >= 400px) and (width < 800px) { font-size: 11px; }
   * @container transition-flow (width >= 800px) { font-size: 12px; }
   * See app.css for @container rules */
  :global(.sankey-diagram text) {
    font-size: var(--sankey-label-font-size);
  }

  .loading-modules {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--foreground-secondary);
    font-size: 14px;
  }
</style>
