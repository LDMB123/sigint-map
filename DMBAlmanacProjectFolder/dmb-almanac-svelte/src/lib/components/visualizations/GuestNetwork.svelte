<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    loadD3Selection,
    loadD3Scale,
    loadD3Drag,
    clearD3Cache,
  } from "$lib/utils/d3-loader";
  import { arrayMax, colorSchemes } from "$lib/utils/d3-utils";
  import {
    createForceSimulation,
    toD3Compatible,
    type ForceNode,
    type ForceSimulation,
  } from "$lib/wasm/forceSimulation";
  import { debouncedYieldingHandler } from "$lib/utils/inpOptimization";
  import type { Selection } from "d3-selection";

  // Lazy-loaded D3 modules
  let d3Selection: typeof import("d3-selection") | null = null;
  let d3Scale: typeof import("d3-scale") | null = null;
  let d3Drag: typeof import("d3-drag") | null = null;
  let modulesLoaded = $state(false);

  // Node type for force simulation
  interface NetworkNode extends ForceNode {
    id: string;
    name: string;
    appearances: number;
  }

  // Link type
  interface NetworkLink {
    source: string | NetworkNode;
    target: string | NetworkNode;
    weight: number;
  }

  type Props = {
    data?: Array<{
      id: string;
      name: string;
      appearances: number;
    }>;
    links?: Array<{
      source: string;
      target: string;
      weight: number;
    }>;
    width?: number;
    height?: number;
    class?: string;
  };

  let {
    data = [],
    links = [],
    width = 800,
    height = 600,
    class: className = "",
  }: Props = $props();

  let svgElement: SVGSVGElement | undefined;
  let containerElement: HTMLDivElement | undefined;
  let simulation: any | undefined; // D3-compatible wrapper
  let rawSimulation: ForceSimulation | undefined; // Underlying WASM simulation
  let resizeObserver: ResizeObserver | undefined;
  let resizeDebounceTimeout: ReturnType<typeof setTimeout> | undefined;
  let isSimulating = $state(false);

  // Memoization: track previous data to avoid unnecessary re-renders
  let prevDataHash = $state<string>("");
  let prevLinksHash = $state<string>("");

  onMount(() => {
    if (!containerElement || !svgElement) return;

    // Load D3 modules asynchronously (exclude d3-force, effectively replaced by WASM)
    const loadModules = async () => {
      const [selection, scale, drag] = await Promise.all([
        loadD3Selection(),
        loadD3Scale(),
        loadD3Drag(),
      ]);
      d3Selection = selection;
      d3Scale = scale;
      d3Drag = drag;
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
      if (!d3Selection || !d3Scale || !d3Drag) return;

      // Memoization: skip re-render if data hasn't changed
      let dataHashNum = data.length;
      for (let i = 0; i < Math.min(data.length, 50); i++) {
        dataHashNum = (dataHashNum * 31 + (data[i].appearances || 0)) | 0;
      }
      const dataHash = `${dataHashNum}:${data[0]?.id || ""}`;

      let linksHashNum = links.length;
      for (let i = 0; i < Math.min(links.length, 50); i++) {
        linksHashNum = (linksHashNum * 31 + (links[i].weight || 0)) | 0;
      }
      const linksHash = `${linksHashNum}:${links[0]?.source || ""}`;

      if (
        !forceRender &&
        dataHash === prevDataHash &&
        linksHash === prevLinksHash
      ) {
        return;
      }
      prevDataHash = dataHash;
      prevLinksHash = linksHash;

      // Stop existing simulation
      if (simulation) simulation.stop();
      if (rawSimulation) rawSimulation.stop();

      isSimulating = true;

      // Get container dimensions
      const rect = containerElement.getBoundingClientRect();
      const containerWidth = rect.width || width;
      const containerHeight = rect.height || height;

      // Clear previous content
      d3Selection.select(svgElement).selectAll("*").remove();

      const svg = d3Selection
        .select(svgElement)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("width", containerWidth)
        .attr("height", containerHeight);

      // Create scales
      const computedStyle = getComputedStyle(svgElement);
      const minRadius =
        parseInt(
          computedStyle.getPropertyValue("--network-node-min-radius") || "5",
        ) || 5;
      const maxRadius =
        parseInt(
          computedStyle.getPropertyValue("--network-node-max-radius") || "30",
        ) || 30;

      const nodeScale = d3Scale
        .scaleLinear()
        .domain([0, arrayMax(data, (d) => d.appearances) || 1])
        .range([minRadius, maxRadius]);

      const colorScale = d3Scale
        .scaleOrdinal<string>()
        .range(colorSchemes.category10);

      // Prepare nodes for simulation
      const nodes: NetworkNode[] = data.map((d) => ({
        id: d.id,
        name: d.name,
        appearances: d.appearances,
        radius: nodeScale(d.appearances), // Pre-calculate radius for collision
        x: Math.random() * containerWidth,
        y: Math.random() * containerHeight,
        vx: 0,
        vy: 0,
      }));

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // Force simulation parameters
      const chargeStrength =
        parseInt(
          computedStyle.getPropertyValue("--network-charge-strength") || "-250",
        ) || -250;
      const linkDistanceBase =
        parseInt(
          computedStyle.getPropertyValue("--network-link-distance") || "100",
        ) || 100;

      // Create WASM simulation
      rawSimulation = await createForceSimulation({
        nodes,
        links,
        width: containerWidth,
        height: containerHeight,
        forces: {
          center: {
            enabled: true,
            x: containerWidth / 2,
            y: containerHeight / 2,
          },
          charge: { enabled: true, strength: chargeStrength },
          collision: { enabled: true, radius: (d) => (d.radius || 5) + 5 },
          link: {
            enabled: true,
            distance: (l) => linkDistanceBase / ((l as any).weight || 1),
            strength: (l) => 0.3, // Default strength
          },
        },
      });

      // Wrap for D3 compatibility (drag/events)
      simulation = toD3Compatible(rawSimulation);

      // Draw links
      // Note: rawSimulation.getNodes() returns updated node references
      // We need to reconstruct full link objects for D3 data binding if we want lines
      // But we can just use the input 'links' array and look up coordinates via ID map for drawing
      // D3 force replaces source/target string IDs with object references. WASM sim does NOT modify original link objects in place in the same way.
      // So we need to map positions manually for lines.

      const linkElements = svg
        .append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", (d) => Math.sqrt(d.weight) * 1.5)
        .attr("marker-end", "url(#arrowhead)");

      // Add arrow marker definition
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("refX", 9)
        .attr("refY", 3)
        .attr("orient", "auto")
        .append("polygon")
        .attr("points", "0 0, 10 3, 0 6")
        .attr("fill", "#999");

      // Draw nodes
      const nodeElements = svg
        .append("g")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", (d) => d.radius || 5)
        .attr("fill", (_d, i) => colorScale(String(i)))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function () {
          d3Selection!.select(this).attr("stroke-width", 4).raise();
        })
        .on("mouseout", function () {
          d3Selection!.select(this).attr("stroke-width", 2);
        });

      // Draw labels
      const labelElements = svg
        .append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("pointer-events", "none")
        .text((d) => d.name)
        .attr("fill", "#fff");

      // Update positions on simulation tick
      simulation.on("tick", () => {
        // Optimally, nodes array is updated in place by WASM bridge packed/unpacking

        linkElements
          .attr("x1", (d) => {
            const s = nodeMap.get(
              typeof d.source === "object" ? (d.source as any).id : d.source,
            );
            return s ? s.x || 0 : 0;
          })
          .attr("y1", (d) => {
            const s = nodeMap.get(
              typeof d.source === "object" ? (d.source as any).id : d.source,
            );
            return s ? s.y || 0 : 0;
          })
          .attr("x2", (d) => {
            const t = nodeMap.get(
              typeof d.target === "object" ? (d.target as any).id : d.target,
            );
            return t ? t.x || 0 : 0;
          })
          .attr("y2", (d) => {
            const t = nodeMap.get(
              typeof d.target === "object" ? (d.target as any).id : d.target,
            );
            return t ? t.y || 0 : 0;
          });

        nodeElements.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

        labelElements.attr("x", (d) => d.x || 0).attr("y", (d) => d.y || 0);
      });

      simulation.on("end", () => {
        isSimulating = false;
        // Ensure final positions are clamped or handled if needed
      });

      // Drag behavior
      const dragBehavior = d3Drag
        .drag<Element, NetworkNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          // WASM simulation handles fx/fy internally via dragStart/drag/dragEnd calls from simulation wrapper
          // But toD3Compatible wrapper maps these events if we use d3-drag?
          // No, d3-drag modifies d.fx/d.fy directly on the node object.
          // We need to tell the simulation about these changes if using WASM.

          if (rawSimulation) rawSimulation.dragStart(d.id);
        })
        .on("drag", (event, d) => {
          // Update local node state for immediate visual feedback (though tick will overwrite)
          d.fx = event.x;
          d.fy = event.y;
          if (rawSimulation) rawSimulation.drag(d.id, event.x, event.y);
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          if (rawSimulation) rawSimulation.dragEnd(d.id);
        });

      (
        nodeElements as Selection<Element, NetworkNode, SVGGElement, unknown>
      ).call(dragBehavior);

      // Start simulation
      simulation.restart();
    };

    // Load modules and trigger initial render
    loadModules();

    // Use debounced yielding handler for optimal INP performance
    const debouncedRender = debouncedYieldingHandler(
      () => renderChart(true),
      200, // 200ms debounce
      { priority: 'user-visible' }
    );

    resizeObserver = new ResizeObserver(debouncedRender);
    resizeObserver.observe(containerElement);

    return () => {
      // Stop simulations
      if (simulation) simulation.stop();
      if (rawSimulation) rawSimulation.dispose();

      // Disconnect observer
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      // Clear debounce timeout
      if (resizeDebounceTimeout !== undefined) {
        clearTimeout(resizeDebounceTimeout);
      }

      // Explicit D3 event handler cleanup to prevent memory leaks
      if (svgElement && d3Selection) {
        d3Selection
          .select(svgElement)
          .selectAll("circle")
          .on("mouseover", null)
          .on("mouseout", null);
      }

      // Release D3 module references
      clearD3Cache();

      console.debug('[GuestNetwork] Cleaned up resources on unmount');
    };
  });
</script>

<div bind:this={containerElement} class="guest-network {className}">
  {#if !modulesLoaded}
    <div class="loading-modules" aria-live="polite">
      Loading visualization...
    </div>
  {:else if isSimulating}
    <div class="simulation-status" aria-live="polite">
      Simulating network...
    </div>
  {/if}
  <svg
    bind:this={svgElement}
    class="network-diagram"
    class:hidden={!modulesLoaded}
    role="img"
    aria-label="Guest musician network visualization"
  />
</div>

<style>
  .guest-network {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background);
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;
    /* Rendering performance optimizations for Apple Silicon */
    content-visibility: auto;
    contain: layout style paint;

    /* Container Query Setup - enables component-level responsive design
     * CSS custom properties (--network-node-*, --network-charge-strength, --network-link-distance)
     * are controlled via @container rules in app.css based on container width.
     * This allows responsive force simulation parameters without JavaScript media queries */
    container-type: inline-size;
    container-name: guest-network;

    /* Default CSS custom properties for fallback (non-supporting browsers) */
    --network-node-min-radius: 5px;
    --network-node-max-radius: 30px;
    --network-charge-strength: -250;
    --network-link-distance: 100;
    --network-label-font-size: 11px;
  }

  :global(.network-diagram) {
    width: 100%;
    height: 100%;
    background: var(--background);
  }

  :global(.network-diagram circle) {
    transition: stroke-width 200ms;
  }

  /* Container query responsive text sizing - automatically applied by CSS
   * @container guest-network (width < 400px) { font-size: 9px; }
   * @container guest-network (width >= 400px) and (width < 800px) { font-size: 10px; }
   * @container guest-network (width >= 800px) { font-size: 11px; }
   * See app.css for @container rules */
  :global(.network-diagram text) {
    font-size: var(--network-label-font-size);
  }

  .simulation-status {
    position: absolute;
    bottom: 16px;
    right: 16px;
    padding: 8px 12px;
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 12px;
    color: var(--foreground-secondary);

    /* Container query responsive positioning and sizing
     * @container guest-network (width < 400px) { bottom: 8px; right: 8px; font-size: 11px; }
     * @container guest-network (width >= 400px) and (width < 800px) { bottom: 12px; right: 12px; }
     * See app.css for @container rules */
  }

  :global(.network-diagram.hidden) {
    visibility: hidden;
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
