/**
 * DMB Almanac - WASM-Optimized Force Simulation Bridge
 *
 * Provides a high-performance force simulation that can run in:
 * 1. WASM (when available) - Fastest, uses native code
 * 2. Web Worker (fallback) - Offloads from main thread
 * 3. Main thread (final fallback) - Uses optimized JS
 *
 * Key features:
 * - Float64Array for zero-copy position data transfer
 * - Batch tick calculations for reduced message overhead
 * - scheduler.yield() integration for UI responsiveness
 * - Full D3 compatibility - nodes work with d3.forceSimulation
 *
 * Memory Layout (per node, 6 Float64 values = 48 bytes):
 * [x, y, vx, vy, fx, fy] stored contiguously for cache efficiency
 *
 * @example
 * ```typescript
 * import { createForceSimulation } from '$lib/wasm/forceSimulation';
 *
 * const simulation = await createForceSimulation({
 *   nodes: myNodes,
 *   links: myLinks,
 *   width: 800,
 *   height: 600,
 * });
 *
 * simulation.onTick((nodes) => {
 *   // Update visualization
 * });
 *
 * simulation.start();
 * ```
 */

import { browser } from '$app/environment';

// ==================== TYPES ====================

/**
 * Node compatible with D3 force simulation
 * Extends the standard D3 simulation node interface
 */
export interface ForceNode {
  /** Unique identifier for the node */
  id: number | string;
  /** Node label/name for display */
  name?: string;
  /** Current x position */
  x?: number;
  /** Current y position */
  y?: number;
  /** Current x velocity */
  vx?: number;
  /** Current y velocity */
  vy?: number;
  /** Fixed x position (null = not fixed) */
  fx?: number | null;
  /** Fixed y position (null = not fixed) */
  fy?: number | null;
  /** Node radius for collision detection */
  radius?: number;
  /** Node mass/weight for charge calculations */
  mass?: number;
  /** Custom data attached to node */
  [key: string]: unknown;
}

/**
 * Link between two nodes
 */
export interface ForceLink {
  /** Source node ID or reference */
  source: number | string | ForceNode;
  /** Target node ID or reference */
  target: number | string | ForceNode;
  /** Link strength (0-1) */
  strength?: number;
  /** Link distance */
  distance?: number;
  /** Custom data attached to link */
  [key: string]: unknown;
}

/**
 * Force simulation configuration
 */
export interface ForceSimulationConfig {
  /** Nodes to simulate */
  nodes: ForceNode[];
  /** Links between nodes */
  links?: ForceLink[];
  /** Canvas/SVG width */
  width: number;
  /** Canvas/SVG height */
  height: number;
  /** Alpha decay rate (default: 0.0228) */
  alphaDecay?: number;
  /** Velocity decay/friction (default: 0.4) */
  velocityDecay?: number;
  /** Minimum alpha to continue simulation (default: 0.001) */
  alphaMin?: number;
  /** Initial alpha value (default: 1.0) */
  alphaTarget?: number;
  /** Force configurations */
  forces?: ForceConfigs;
  /** Number of ticks to batch before yielding (default: 5) */
  ticksPerBatch?: number;
  /** Use WASM if available (default: true) */
  useWasm?: boolean;
  /** Use Web Worker if WASM unavailable (default: true) */
  useWorker?: boolean;
}

/**
 * Individual force configurations
 */
export interface ForceConfigs {
  /** Center force - pulls nodes toward center */
  center?: {
    enabled?: boolean;
    x?: number;
    y?: number;
    strength?: number;
  };
  /** Many-body force - repulsion/attraction between nodes */
  charge?: {
    enabled?: boolean;
    strength?: number;
    distanceMin?: number;
    distanceMax?: number;
    theta?: number;
  };
  /** Link force - spring connections between nodes */
  link?: {
    enabled?: boolean;
    distance?: number | ((link: ForceLink) => number);
    strength?: number | ((link: ForceLink) => number);
    iterations?: number;
  };
  /** Collision force - prevents node overlap */
  collision?: {
    enabled?: boolean;
    radius?: number | ((node: ForceNode) => number);
    strength?: number;
    iterations?: number;
  };
  /** X-positioning force */
  forceX?: {
    enabled?: boolean;
    x?: number | ((node: ForceNode) => number);
    strength?: number;
  };
  /** Y-positioning force */
  forceY?: {
    enabled?: boolean;
    y?: number | ((node: ForceNode) => number);
    strength?: number;
  };
}

/**
 * Simulation state
 */
export type SimulationState = 'idle' | 'running' | 'paused' | 'stopped';

/**
 * Tick callback with updated nodes
 */
export type TickCallback = (nodes: ForceNode[]) => void;

/**
 * End callback when simulation stabilizes
 */
export type EndCallback = (nodes: ForceNode[]) => void;

/**
 * Force simulation instance interface
 */
export interface ForceSimulation {
  /** Start/resume the simulation */
  start(): void;
  /** Pause the simulation */
  pause(): void;
  /** Stop and cleanup the simulation */
  stop(): void;
  /** Restart with new alpha */
  restart(alpha?: number): void;
  /** Get current simulation state */
  getState(): SimulationState;
  /** Get current nodes with positions */
  getNodes(): ForceNode[];
  /** Get position data as TypedArray (zero-copy) */
  getPositionBuffer(): Float64Array;
  /** Update node positions from TypedArray */
  setPositionBuffer(buffer: Float64Array): void;
  /** Register tick callback */
  onTick(callback: TickCallback): () => void;
  /** Register end callback */
  onEnd(callback: EndCallback): () => void;
  /** Handle drag start for a node */
  dragStart(nodeId: number | string): void;
  /** Handle drag move for a node */
  drag(nodeId: number | string, x: number, y: number): void;
  /** Handle drag end for a node */
  dragEnd(nodeId: number | string): void;
  /** Get current alpha value */
  alpha(): number;
  /** Set alpha value */
  alpha(value: number): this;
  /** Dispose and cleanup resources */
  dispose(): void;
}

// ==================== CONSTANTS ====================

/** Number of Float64 values per node: x, y, vx, vy, fx, fy */
const VALUES_PER_NODE = 6;

/** Default force configuration */
const DEFAULT_FORCES: ForceConfigs = {
  center: { enabled: true, strength: 1.0 },
  charge: { enabled: true, strength: -200, distanceMax: 300, theta: 0.9 },
  collision: { enabled: true, strength: 0.7, iterations: 1 },
  link: { enabled: true, distance: 30, strength: 0.3, iterations: 1 },
};

/** Default simulation config */
const DEFAULT_CONFIG: Partial<ForceSimulationConfig> = {
  alphaDecay: 0.0228,
  velocityDecay: 0.4,
  alphaMin: 0.001,
  alphaTarget: 0,
  ticksPerBatch: 5,
  useWasm: true,
  useWorker: true,
};

// ==================== TYPED ARRAY UTILITIES ====================

/**
 * Allocate Float64Array for node positions
 * Layout: [x0, y0, vx0, vy0, fx0, fy0, x1, y1, vx1, vy1, fx1, fy1, ...]
 */
export function allocatePositionBuffer(nodeCount: number): Float64Array {
  return new Float64Array(nodeCount * VALUES_PER_NODE);
}

/**
 * Pack node positions into Float64Array (for transfer to WASM/Worker)
 * PERF: Single loop, direct array access, no intermediate allocations
 */
export function packNodesIntoBuffer(nodes: ForceNode[], buffer: Float64Array): void {
  const len = nodes.length;
  for (let i = 0; i < len; i++) {
    const node = nodes[i];
    const offset = i * VALUES_PER_NODE;
    buffer[offset] = node.x ?? 0;
    buffer[offset + 1] = node.y ?? 0;
    buffer[offset + 2] = node.vx ?? 0;
    buffer[offset + 3] = node.vy ?? 0;
    // Use NaN to represent null for fixed positions
    buffer[offset + 4] = node.fx ?? NaN;
    buffer[offset + 5] = node.fy ?? NaN;
  }
}

/**
 * Unpack Float64Array back into node objects
 * PERF: Direct buffer reads, no intermediate copies
 */
export function unpackBufferIntoNodes(buffer: Float64Array, nodes: ForceNode[]): void {
  const len = nodes.length;
  for (let i = 0; i < len; i++) {
    const offset = i * VALUES_PER_NODE;
    const node = nodes[i];
    node.x = buffer[offset];
    node.y = buffer[offset + 1];
    node.vx = buffer[offset + 2];
    node.vy = buffer[offset + 3];
    // Convert NaN back to null for fixed positions
    const fx = buffer[offset + 4];
    const fy = buffer[offset + 5];
    node.fx = Number.isNaN(fx) ? null : fx;
    node.fy = Number.isNaN(fy) ? null : fy;
  }
}

/**
 * Create node index map for O(1) lookups
 */
function createNodeIndexMap(nodes: ForceNode[]): Map<number | string, number> {
  const map = new Map<number | string, number>();
  for (let i = 0; i < nodes.length; i++) {
    map.set(nodes[i].id, i);
  }
  return map;
}

// ==================== YIELDING UTILITIES ====================

/**
 * Yield to main thread using scheduler.yield() or setTimeout fallback
 * PERF: Uses native scheduler.yield when available for better INP
 */
async function yieldToMainThread(): Promise<void> {
  if (typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function') {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ==================== OPTIMIZED JS FORCE CALCULATIONS ====================

/**
 * Optimized center force calculation
 * Pulls all nodes toward a center point
 */
function applyCenterForce(
  buffer: Float64Array,
  nodeCount: number,
  cx: number,
  cy: number,
  strength: number
): void {
  // Calculate center of mass
  let sx = 0, sy = 0;
  for (let i = 0; i < nodeCount; i++) {
    const offset = i * VALUES_PER_NODE;
    sx += buffer[offset];
    sy += buffer[offset + 1];
  }
  sx = (sx / nodeCount - cx) * strength;
  sy = (sy / nodeCount - cy) * strength;

  // Apply correction
  for (let i = 0; i < nodeCount; i++) {
    const offset = i * VALUES_PER_NODE;
    buffer[offset] -= sx;
    buffer[offset + 1] -= sy;
  }
}

/**
 * Optimized many-body force using Barnes-Hut approximation
 * O(n log n) instead of O(n^2)
 */
function applyChargeForce(
  buffer: Float64Array,
  nodeCount: number,
  strength: number,
  distanceMin: number,
  distanceMax: number,
  _theta: number
): void {
  const distanceMin2 = distanceMin * distanceMin;
  const distanceMax2 = distanceMax * distanceMax;

  // Simplified O(n^2) for correctness - Barnes-Hut would be in WASM
  for (let i = 0; i < nodeCount; i++) {
    const iOffset = i * VALUES_PER_NODE;
    const ix = buffer[iOffset];
    const iy = buffer[iOffset + 1];

    for (let j = i + 1; j < nodeCount; j++) {
      const jOffset = j * VALUES_PER_NODE;
      const jx = buffer[jOffset];
      const jy = buffer[jOffset + 1];

      let dx = jx - ix;
      let dy = jy - iy;
      let d2 = dx * dx + dy * dy;

      if (d2 < distanceMax2) {
        if (d2 < distanceMin2) d2 = distanceMin2;
        const d = Math.sqrt(d2);
        const force = strength / d2;

        dx = (dx / d) * force;
        dy = (dy / d) * force;

        // Apply to velocities (repulsive force)
        buffer[iOffset + 2] -= dx;
        buffer[iOffset + 3] -= dy;
        buffer[jOffset + 2] += dx;
        buffer[jOffset + 3] += dy;
      }
    }
  }
}

/**
 * Optimized link force calculation
 * Spring-like forces between connected nodes
 */
function applyLinkForce(
  buffer: Float64Array,
  links: ForceLink[],
  nodeIndexMap: Map<number | string, number>,
  distance: number,
  strength: number,
  iterations: number
): void {
  for (let iter = 0; iter < iterations; iter++) {
    for (const link of links) {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;

      const sourceIdx = nodeIndexMap.get(sourceId);
      const targetIdx = nodeIndexMap.get(targetId);

      if (sourceIdx === undefined || targetIdx === undefined) continue;

      const sourceOffset = sourceIdx * VALUES_PER_NODE;
      const targetOffset = targetIdx * VALUES_PER_NODE;

      const x1 = buffer[sourceOffset];
      const y1 = buffer[sourceOffset + 1];
      const x2 = buffer[targetOffset];
      const y2 = buffer[targetOffset + 1];

      let dx = x2 - x1;
      let dy = y2 - y1;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;

      const linkDistance = link.distance ?? distance;
      const linkStrength = link.strength ?? strength;

      const force = ((d - linkDistance) / d) * linkStrength;

      dx *= force;
      dy *= force;

      // Apply to velocities
      buffer[sourceOffset + 2] += dx;
      buffer[sourceOffset + 3] += dy;
      buffer[targetOffset + 2] -= dx;
      buffer[targetOffset + 3] -= dy;
    }
  }
}

/**
 * Optimized collision force
 * Prevents nodes from overlapping
 */
function applyCollisionForce(
  buffer: Float64Array,
  nodes: ForceNode[],
  defaultRadius: number,
  strength: number,
  iterations: number
): void {
  const nodeCount = nodes.length;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodeCount; i++) {
      const iOffset = i * VALUES_PER_NODE;
      const ix = buffer[iOffset];
      const iy = buffer[iOffset + 1];
      const ri = nodes[i].radius ?? defaultRadius;

      for (let j = i + 1; j < nodeCount; j++) {
        const jOffset = j * VALUES_PER_NODE;
        const jx = buffer[jOffset];
        const jy = buffer[jOffset + 1];
        const rj = nodes[j].radius ?? defaultRadius;

        let dx = jx - ix;
        let dy = jy - iy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = ri + rj;

        if (d < minDist) {
          const overlap = (minDist - d) * strength;
          dx = (dx / d) * overlap * 0.5;
          dy = (dy / d) * overlap * 0.5;

          buffer[iOffset] -= dx;
          buffer[iOffset + 1] -= dy;
          buffer[jOffset] += dx;
          buffer[jOffset + 1] += dy;
        }
      }
    }
  }
}

/**
 * Apply velocity integration and decay
 */
function integratePositions(
  buffer: Float64Array,
  nodeCount: number,
  velocityDecay: number
): void {
  const decay = 1 - velocityDecay;

  for (let i = 0; i < nodeCount; i++) {
    const offset = i * VALUES_PER_NODE;
    const fx = buffer[offset + 4];
    const fy = buffer[offset + 5];

    // If fixed, set position directly
    if (!Number.isNaN(fx)) {
      buffer[offset] = fx;
      buffer[offset + 2] = 0;
    } else {
      buffer[offset + 2] *= decay;
      buffer[offset] += buffer[offset + 2];
    }

    if (!Number.isNaN(fy)) {
      buffer[offset + 1] = fy;
      buffer[offset + 3] = 0;
    } else {
      buffer[offset + 3] *= decay;
      buffer[offset + 1] += buffer[offset + 3];
    }
  }
}

// ==================== MAIN THREAD SIMULATION ====================

/**
 * Creates a force simulation that runs on the main thread with optimized JS
 * Used as fallback when WASM and Workers are unavailable
 */
function createMainThreadSimulation(config: ForceSimulationConfig): ForceSimulation {
  const nodes = [...config.nodes];
  const links = config.links ?? [];
  const forces = { ...DEFAULT_FORCES, ...config.forces };
  const nodeIndexMap = createNodeIndexMap(nodes);

  // Allocate position buffer
  const positionBuffer = allocatePositionBuffer(nodes.length);

  // Initialize positions randomly if not set
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.x === undefined) node.x = Math.random() * config.width;
    if (node.y === undefined) node.y = Math.random() * config.height;
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  }

  packNodesIntoBuffer(nodes, positionBuffer);

  // State
  let state: SimulationState = 'idle';
  let alphaValue = 1.0;
  const alphaDecay = config.alphaDecay ?? DEFAULT_CONFIG.alphaDecay!;
  const alphaMin = config.alphaMin ?? DEFAULT_CONFIG.alphaMin!;
  const alphaTarget = config.alphaTarget ?? DEFAULT_CONFIG.alphaTarget!;
  const velocityDecay = config.velocityDecay ?? DEFAULT_CONFIG.velocityDecay!;
  const ticksPerBatch = config.ticksPerBatch ?? DEFAULT_CONFIG.ticksPerBatch!;

  // Callbacks
  const tickCallbacks = new Set<TickCallback>();
  const endCallbacks = new Set<EndCallback>();

  // Animation frame handle
  let rafHandle: number | null = null;

  /**
   * Perform a single simulation tick
   */
  function tick(): boolean {
    // Apply forces
    if (forces.center?.enabled) {
      applyCenterForce(
        positionBuffer,
        nodes.length,
        forces.center.x ?? config.width / 2,
        forces.center.y ?? config.height / 2,
        forces.center.strength ?? 1.0
      );
    }

    if (forces.charge?.enabled) {
      applyChargeForce(
        positionBuffer,
        nodes.length,
        (forces.charge.strength ?? -200) * alphaValue,
        forces.charge.distanceMin ?? 1,
        forces.charge.distanceMax ?? 300,
        forces.charge.theta ?? 0.9
      );
    }

    if (forces.link?.enabled && links.length > 0) {
      const linkDistance = typeof forces.link.distance === 'function'
        ? 30 // Use default if function (computed per-link in applyLinkForce)
        : (forces.link.distance ?? 30);
      const linkStrength = typeof forces.link.strength === 'function'
        ? 0.3
        : (forces.link.strength ?? 0.3);

      applyLinkForce(
        positionBuffer,
        links,
        nodeIndexMap,
        linkDistance,
        linkStrength * alphaValue,
        forces.link.iterations ?? 1
      );
    }

    if (forces.collision?.enabled) {
      const collisionRadius = typeof forces.collision.radius === 'function'
        ? 10 // Default radius if function
        : (forces.collision.radius ?? 10);

      applyCollisionForce(
        positionBuffer,
        nodes,
        collisionRadius,
        forces.collision.strength ?? 0.7,
        forces.collision.iterations ?? 1
      );
    }

    // Integrate positions
    integratePositions(positionBuffer, nodes.length, velocityDecay);

    // Decay alpha
    alphaValue += (alphaTarget - alphaValue) * alphaDecay;

    // Update nodes from buffer
    unpackBufferIntoNodes(positionBuffer, nodes);

    // Check if converged
    return alphaValue >= alphaMin;
  }

  /**
   * Animation loop with batching and yielding
   */
  async function runSimulation(): Promise<void> {
    while (state === 'running') {
      // Run batch of ticks
      let shouldContinue = true;
      for (let i = 0; i < ticksPerBatch && shouldContinue; i++) {
        shouldContinue = tick();
      }

      // Notify tick callbacks
      for (const callback of tickCallbacks) {
        callback(nodes);
      }

      // Check if simulation ended
      if (!shouldContinue) {
        state = 'stopped';
        for (const callback of endCallbacks) {
          callback(nodes);
        }
        break;
      }

      // Yield to main thread for UI responsiveness
      await yieldToMainThread();
    }
  }

  const simulation: ForceSimulation = {
    start() {
      if (state === 'running') return;
      state = 'running';
      runSimulation();
    },

    pause() {
      state = 'paused';
    },

    stop() {
      state = 'stopped';
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    },

    restart(alpha = 1.0) {
      alphaValue = alpha;
      if (state !== 'running') {
        this.start();
      }
    },

    getState() {
      return state;
    },

    getNodes() {
      return nodes;
    },

    getPositionBuffer() {
      packNodesIntoBuffer(nodes, positionBuffer);
      return positionBuffer;
    },

    setPositionBuffer(buffer: Float64Array) {
      positionBuffer.set(buffer);
      unpackBufferIntoNodes(positionBuffer, nodes);
    },

    onTick(callback: TickCallback) {
      tickCallbacks.add(callback);
      return () => tickCallbacks.delete(callback);
    },

    onEnd(callback: EndCallback) {
      endCallbacks.add(callback);
      return () => endCallbacks.delete(callback);
    },

    dragStart(nodeId: number | string) {
      const idx = nodeIndexMap.get(nodeId);
      if (idx === undefined) return;

      const node = nodes[idx];
      node.fx = node.x;
      node.fy = node.y;
      packNodesIntoBuffer(nodes, positionBuffer);

      // Reheat simulation
      alphaValue = Math.max(alphaValue, 0.3);
      if (state !== 'running') {
        this.start();
      }
    },

    drag(nodeId: number | string, x: number, y: number) {
      const idx = nodeIndexMap.get(nodeId);
      if (idx === undefined) return;

      const node = nodes[idx];
      node.fx = x;
      node.fy = y;
      packNodesIntoBuffer(nodes, positionBuffer);
    },

    dragEnd(nodeId: number | string) {
      const idx = nodeIndexMap.get(nodeId);
      if (idx === undefined) return;

      const node = nodes[idx];
      node.fx = null;
      node.fy = null;
      packNodesIntoBuffer(nodes, positionBuffer);
    },

    alpha(value?: number): any {
      if (value === undefined) return alphaValue;
      alphaValue = value;
      return simulation;
    },

    dispose() {
      this.stop();
      tickCallbacks.clear();
      endCallbacks.clear();
    },
  };

  return simulation;
}

// ==================== WORKER-BASED SIMULATION ====================

/**
 * Worker message types for force simulation
 */
interface ForceWorkerRequest {
  type: 'init' | 'start' | 'pause' | 'stop' | 'drag' | 'setBuffer' | 'getBuffer';
  config?: ForceSimulationConfig;
  nodeId?: number | string;
  x?: number;
  y?: number;
  dragType?: 'start' | 'drag' | 'end';
  buffer?: Float64Array;
}

interface ForceWorkerResponse {
  type: 'tick' | 'end' | 'buffer' | 'error';
  buffer?: Float64Array;
  alpha?: number;
  error?: string;
}

/**
 * Create worker-based force simulation
 * Offloads calculations to a Web Worker
 */
function createWorkerSimulation(config: ForceSimulationConfig): ForceSimulation {
  const nodes = [...config.nodes];
  const links = config.links ?? [];
  const nodeIndexMap = createNodeIndexMap(nodes);

  // Initialize positions
  for (const node of nodes) {
    if (node.x === undefined) node.x = Math.random() * config.width;
    if (node.y === undefined) node.y = Math.random() * config.height;
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  }

  // Allocate buffer
  const positionBuffer = allocatePositionBuffer(nodes.length);
  packNodesIntoBuffer(nodes, positionBuffer);

  // State
  let state: SimulationState = 'idle';
  let alphaValue = 1.0;

  // Callbacks
  const tickCallbacks = new Set<TickCallback>();
  const endCallbacks = new Set<EndCallback>();

  // Create inline worker
  const workerCode = `
    ${applyCenterForce.toString()}
    ${applyChargeForce.toString()}
    ${applyLinkForce.toString()}
    ${applyCollisionForce.toString()}
    ${integratePositions.toString()}

    const VALUES_PER_NODE = 6;
    let buffer = null;
    let nodeCount = 0;
    let links = [];
    let nodeIndexMap = new Map();
    let forces = {};
    let config = {};
    let alpha = 1.0;
    let running = false;

    function tick() {
      if (forces.center?.enabled) {
        applyCenterForce(
          buffer,
          nodeCount,
          forces.center.x ?? config.width / 2,
          forces.center.y ?? config.height / 2,
          forces.center.strength ?? 1.0
        );
      }

      if (forces.charge?.enabled) {
        applyChargeForce(
          buffer,
          nodeCount,
          (forces.charge.strength ?? -200) * alpha,
          forces.charge.distanceMin ?? 1,
          forces.charge.distanceMax ?? 300,
          forces.charge.theta ?? 0.9
        );
      }

      if (forces.link?.enabled && links.length > 0) {
        applyLinkForce(
          buffer,
          links,
          nodeIndexMap,
          forces.link.distance ?? 30,
          (forces.link.strength ?? 0.3) * alpha,
          forces.link.iterations ?? 1
        );
      }

      if (forces.collision?.enabled) {
        const radius = forces.collision.radius ?? 10;
        const nodes = [];
        for (let i = 0; i < nodeCount; i++) {
          nodes.push({ radius });
        }
        applyCollisionForce(
          buffer,
          nodes,
          radius,
          forces.collision.strength ?? 0.7,
          forces.collision.iterations ?? 1
        );
      }

      integratePositions(buffer, nodeCount, config.velocityDecay ?? 0.4);
      alpha += ((config.alphaTarget ?? 0) - alpha) * (config.alphaDecay ?? 0.0228);

      return alpha >= (config.alphaMin ?? 0.001);
    }

    async function runLoop() {
      while (running) {
        const ticksPerBatch = config.ticksPerBatch ?? 5;
        let shouldContinue = true;

        for (let i = 0; i < ticksPerBatch && shouldContinue; i++) {
          shouldContinue = tick();
        }

        self.postMessage({
          type: shouldContinue ? 'tick' : 'end',
          buffer: buffer,
          alpha: alpha
        }, [buffer.buffer]);

        buffer = new Float64Array(nodeCount * VALUES_PER_NODE);

        if (!shouldContinue) {
          running = false;
          break;
        }

        await new Promise(r => setTimeout(r, 0));
      }
    }

    self.onmessage = (e) => {
      const msg = e.data;

      switch (msg.type) {
        case 'init':
          config = msg.config;
          nodeCount = msg.config.nodes.length;
          links = msg.config.links || [];
          forces = msg.config.forces || {};
          buffer = new Float64Array(msg.buffer);
          alpha = 1.0;

          // Build node index map
          nodeIndexMap = new Map();
          for (let i = 0; i < nodeCount; i++) {
            nodeIndexMap.set(msg.config.nodes[i].id, i);
          }
          break;

        case 'start':
          if (!running) {
            running = true;
            runLoop();
          }
          break;

        case 'pause':
          running = false;
          break;

        case 'stop':
          running = false;
          break;

        case 'drag':
          if (buffer && msg.nodeId !== undefined) {
            const idx = nodeIndexMap.get(msg.nodeId);
            if (idx !== undefined) {
              const offset = idx * VALUES_PER_NODE;
              if (msg.dragType === 'start' || msg.dragType === 'drag') {
                buffer[offset + 4] = msg.x ?? buffer[offset];
                buffer[offset + 5] = msg.y ?? buffer[offset + 1];
              } else {
                buffer[offset + 4] = NaN;
                buffer[offset + 5] = NaN;
              }
              if (msg.dragType === 'start') {
                alpha = Math.max(alpha, 0.3);
              }
            }
          }
          break;

        case 'setBuffer':
          if (msg.buffer) {
            buffer = new Float64Array(msg.buffer);
          }
          break;

        case 'getBuffer':
          if (buffer) {
            self.postMessage({ type: 'buffer', buffer: buffer }, [buffer.buffer]);
            buffer = new Float64Array(nodeCount * VALUES_PER_NODE);
          }
          break;
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);

  // Handle messages from worker
  worker.onmessage = (e: MessageEvent<ForceWorkerResponse>) => {
    const msg = e.data;

    switch (msg.type) {
      case 'tick':
      case 'end':
        if (msg.buffer) {
          positionBuffer.set(msg.buffer);
          unpackBufferIntoNodes(positionBuffer, nodes);
        }
        if (msg.alpha !== undefined) {
          alphaValue = msg.alpha;
        }

        if (msg.type === 'tick') {
          for (const callback of tickCallbacks) {
            callback(nodes);
          }
        } else {
          state = 'stopped';
          for (const callback of endCallbacks) {
            callback(nodes);
          }
        }
        break;

      case 'buffer':
        if (msg.buffer) {
          positionBuffer.set(msg.buffer);
          unpackBufferIntoNodes(positionBuffer, nodes);
        }
        break;

      case 'error':
        console.error('[ForceSimulation Worker]', msg.error);
        break;
    }
  };

  // Initialize worker
  worker.postMessage({
    type: 'init',
    config: {
      ...config,
      nodes: nodes.map(n => ({ id: n.id, radius: n.radius })),
      links: links.map(l => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
        distance: l.distance,
        strength: l.strength,
      })),
    },
    buffer: positionBuffer,
  } as ForceWorkerRequest);

  const simulation: ForceSimulation = {
    start() {
      if (state === 'running') return;
      state = 'running';
      worker.postMessage({ type: 'start' } as ForceWorkerRequest);
    },

    pause() {
      state = 'paused';
      worker.postMessage({ type: 'pause' } as ForceWorkerRequest);
    },

    stop() {
      state = 'stopped';
      worker.postMessage({ type: 'stop' } as ForceWorkerRequest);
    },

    restart(alpha = 1.0) {
      alphaValue = alpha;
      packNodesIntoBuffer(nodes, positionBuffer);
      worker.postMessage({
        type: 'setBuffer',
        buffer: positionBuffer,
      } as ForceWorkerRequest);
      worker.postMessage({ type: 'start' } as ForceWorkerRequest);
      state = 'running';
    },

    getState() {
      return state;
    },

    getNodes() {
      return nodes;
    },

    getPositionBuffer() {
      return positionBuffer;
    },

    setPositionBuffer(buffer: Float64Array) {
      positionBuffer.set(buffer);
      unpackBufferIntoNodes(positionBuffer, nodes);
      worker.postMessage({
        type: 'setBuffer',
        buffer: positionBuffer,
      } as ForceWorkerRequest);
    },

    onTick(callback: TickCallback) {
      tickCallbacks.add(callback);
      return () => tickCallbacks.delete(callback);
    },

    onEnd(callback: EndCallback) {
      endCallbacks.add(callback);
      return () => endCallbacks.delete(callback);
    },

    dragStart(nodeId: number | string) {
      const idx = nodeIndexMap.get(nodeId);
      if (idx === undefined) return;

      const node = nodes[idx];
      worker.postMessage({
        type: 'drag',
        nodeId,
        x: node.x,
        y: node.y,
        dragType: 'start',
      } as ForceWorkerRequest);

      if (state !== 'running') {
        this.start();
      }
    },

    drag(nodeId: number | string, x: number, y: number) {
      worker.postMessage({
        type: 'drag',
        nodeId,
        x,
        y,
        dragType: 'drag',
      } as ForceWorkerRequest);
    },

    dragEnd(nodeId: number | string) {
      worker.postMessage({
        type: 'drag',
        nodeId,
        dragType: 'end',
      } as ForceWorkerRequest);
    },

    alpha(value?: number): any {
      if (value === undefined) return alphaValue;
      alphaValue = value;
      return simulation;
    },

    dispose() {
      this.stop();
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      tickCallbacks.clear();
      endCallbacks.clear();
    },
  };

  return simulation;
}

// ==================== WASM SIMULATION ====================

/**
 * WASM Module interface for dmb-force-simulation
 * Must match the Rust WasmSimulation struct exports
 */
interface WasmForceSimulationModule {
  WasmSimulation: {
    new(width: number, height: number): WasmSimulationInstance;
  };
  version(): string;
}

/**
 * WASM Simulation instance interface
 */
interface WasmSimulationInstance {
  initNodesFromBuffer(buffer: Float64Array, nodeCount: number): void;
  initNodesFromPositions(positions: Float64Array): void;
  initLinksFromIndices(indices: Uint32Array): void;
  initLinksFromBuffer(buffer: Float64Array): void;
  setCenterForce(x: number, y: number, strength: number): void;
  disableCenterForce(): void;
  setChargeForce(strength: number, distanceMin: number, distanceMax: number, theta: number): void;
  disableChargeForce(): void;
  setLinkForce(distance: number, strength: number, iterations: number): void;
  disableLinkForce(): void;
  setCollisionForce(radius: number, strength: number, iterations: number): void;
  disableCollisionForce(): void;
  setSimulationParams(alpha: number, alphaMin: number, alphaDecay: number, alphaTarget: number, velocityDecay: number): void;
  tick(): { should_continue: boolean; alpha: number };
  tickBatch(count: number): { should_continue: boolean; alpha: number };
  getPositions(): Float64Array;
  getState(): Float64Array;
  setPositions(positions: Float64Array): void;
  setState(state: Float64Array): void;
  fixNode(index: number, x: number, y: number): void;
  unfixNode(index: number): void;
  reheat(alpha: number): void;
  getAlpha(): number;
  nodeCount(): number;
  linkCount(): number;
  free(): void;
}

/** Cached WASM module */
let wasmModule: WasmForceSimulationModule | null = null;
let wasmLoadPromise: Promise<WasmForceSimulationModule> | null = null;

// Explicitly import WASM URL for correct asset handling by Vite
import wasmUrl from '$wasm/dmb-force-simulation/pkg/dmb_force_simulation_bg.wasm?url';

/**
 * Load the dmb-force-simulation WASM module
 */
async function loadWasmModule(): Promise<WasmForceSimulationModule> {
  if (wasmModule) return wasmModule;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = (async () => {
    try {
      // Dynamic import of the WASM module
      const module = await import('$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js');
      // Initialize with explicit URL to ensure correct path resolution
      await module.default(wasmUrl);
      wasmModule = module as WasmForceSimulationModule;
      return wasmModule;
    } catch (error) {
      console.error('[ForceSimulation] Failed to load WASM module:', error);
      wasmLoadPromise = null;
      throw error;
    }
  })();

  return wasmLoadPromise;
}

/**
 * Create a WASM-based force simulation using dmb-force-simulation crate
 * This provides Barnes-Hut O(n log n) performance for large graphs
 */
async function createWasmSimulation(config: ForceSimulationConfig): Promise<ForceSimulation> {
  const wasm = await loadWasmModule();
  const nodes = [...config.nodes];
  const links = config.links ?? [];
  const forces = { ...DEFAULT_FORCES, ...config.forces };
  const nodeIndexMap = createNodeIndexMap(nodes);

  // Initialize positions randomly if not set
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.x === undefined) node.x = Math.random() * config.width;
    if (node.y === undefined) node.y = Math.random() * config.height;
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  }

  // Create WASM simulation instance
  const wasmSim = new wasm.WasmSimulation(config.width, config.height);

  // Initialize nodes in WASM
  // Format: [x0, y0, radius0, mass0, x1, y1, radius1, mass1, ...]
  const nodeBuffer = new Float64Array(nodes.length * 4);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const offset = i * 4;
    nodeBuffer[offset] = node.x ?? 0;
    nodeBuffer[offset + 1] = node.y ?? 0;
    nodeBuffer[offset + 2] = node.radius ?? 5;
    nodeBuffer[offset + 3] = node.mass ?? 1;
  }
  wasmSim.initNodesFromBuffer(nodeBuffer, nodes.length);

  // Initialize links in WASM
  // Initialize links in WASM
  if (links.length > 0) {
    // Check if we need variable distance/strength
    const isDistanceFn = typeof forces.link?.distance === 'function';
    const isStrengthFn = typeof forces.link?.strength === 'function';

    // Default values if static
    const defaultDistance = typeof forces.link?.distance === 'number' ? forces.link.distance : 30;
    const defaultStrength = typeof forces.link?.strength === 'number' ? forces.link.strength : 0.3;

    if (isDistanceFn || isStrengthFn) {
      // Use buffer initialization for variable properties
      // Format: [source, target, strength, distance] per link
      const linkBuffer = new Float64Array(links.length * 4);

      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const sourceIdx = nodeIndexMap.get(sourceId) ?? 0;
        const targetIdx = nodeIndexMap.get(targetId) ?? 0;

        let strength = defaultStrength;
        if (isStrengthFn && forces.link?.strength) {
          strength = (forces.link.strength as (l: ForceLink) => number)(link);
        } else if (link.strength !== undefined) {
          strength = link.strength;
        }

        let distance = defaultDistance;
        if (isDistanceFn && forces.link?.distance) {
          distance = (forces.link.distance as (l: ForceLink) => number)(link);
        } else if (link.distance !== undefined) {
          distance = link.distance;
        }

        const offset = i * 4;
        linkBuffer[offset] = sourceIdx;
        linkBuffer[offset + 1] = targetIdx;
        linkBuffer[offset + 2] = strength;
        linkBuffer[offset + 3] = distance;
      }

      wasmSim.initLinksFromBuffer(linkBuffer);

      // Still set global configuration for iterations (and defaults used internally if needed)
      wasmSim.setLinkForce(defaultDistance, defaultStrength, forces.link?.iterations ?? 1);

    } else {
      // Use efficient index-only initialization for static properties
      const linkIndices = new Uint32Array(links.length * 2);
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const sourceIdx = nodeIndexMap.get(sourceId) ?? 0;
        const targetIdx = nodeIndexMap.get(targetId) ?? 0;

        linkIndices[i * 2] = sourceIdx;
        linkIndices[i * 2 + 1] = targetIdx;
      }
      wasmSim.initLinksFromIndices(linkIndices);

      if (forces.link?.enabled !== false) {
        wasmSim.setLinkForce(defaultDistance, defaultStrength, forces.link?.iterations ?? 1);
      } else {
        wasmSim.disableLinkForce();
      }
    }
  }

  if (forces.collision?.enabled !== false) {
    const collisionRadius = typeof forces.collision?.radius === 'function'
      ? 10
      : (forces.collision?.radius ?? 10);
    wasmSim.setCollisionForce(
      collisionRadius,
      forces.collision?.strength ?? 0.7,
      forces.collision?.iterations ?? 1
    );
  } else {
    wasmSim.disableCollisionForce();
  }

  // Set simulation parameters
  wasmSim.setSimulationParams(
    1.0, // alpha
    config.alphaMin ?? 0.001,
    config.alphaDecay ?? 0.0228,
    config.alphaTarget ?? 0,
    config.velocityDecay ?? 0.4
  );

  // Local state
  let state: SimulationState = 'idle';
  let alphaValue = 1.0;
  const ticksPerBatch = config.ticksPerBatch ?? 5;

  // Callbacks
  const tickCallbacks = new Set<TickCallback>();
  const endCallbacks = new Set<EndCallback>();

  // Position buffer for updates
  const positionBuffer = allocatePositionBuffer(nodes.length);

  /**
   * Update node positions from WASM
   */
  function syncPositionsFromWasm(): void {
    const positions = wasmSim.getPositions();
    for (let i = 0; i < nodes.length; i++) {
      const offset = i * 2;
      nodes[i].x = positions[offset];
      nodes[i].y = positions[offset + 1];
    }
    alphaValue = wasmSim.getAlpha();
  }

  /**
   * Run simulation loop with yielding
   */
  async function runSimulation(): Promise<void> {
    while (state === 'running') {
      // Run batch of ticks in WASM
      const result = wasmSim.tickBatch(ticksPerBatch);

      // Sync positions back to JS nodes
      syncPositionsFromWasm();

      // Notify tick callbacks
      for (const callback of tickCallbacks) {
        callback(nodes);
      }

      // Check if simulation ended
      if (!result.should_continue) {
        state = 'stopped';
        for (const callback of endCallbacks) {
          callback(nodes);
        }
        break;
      }

      // Yield to main thread
      await yieldToMainThread();
    }
  }

  const simulation: ForceSimulation = {
    start() {
      if (state === 'running') return;
      state = 'running';
      runSimulation();
    },

    pause() {
      state = 'paused';
    },

    stop() {
      state = 'stopped';
    },

    restart(alpha = 1.0) {
      wasmSim.reheat(alpha);
      alphaValue = alpha;
      if (state !== 'running') {
        this.start();
      }
    },

    getState() {
      return state;
    },

    getNodes() {
      return nodes;
    },

    getPositionBuffer() {
      packNodesIntoBuffer(nodes, positionBuffer);
      return positionBuffer;
    },

    setPositionBuffer(buffer: Float64Array) {
      unpackBufferIntoNodes(buffer, nodes);
      // Convert to position-only format for WASM
      const positions = new Float64Array(nodes.length * 2);
      for (let i = 0; i < nodes.length; i++) {
        positions[i * 2] = buffer[i * VALUES_PER_NODE];
        positions[i * 2 + 1] = buffer[i * VALUES_PER_NODE + 1];
      }
      wasmSim.setPositions(positions);
    },

    onTick(callback: TickCallback) {
      tickCallbacks.add(callback);
      return () => tickCallbacks.delete(callback);
    },

    onEnd(callback: EndCallback) {
      endCallbacks.add(callback);
      return () => endCallbacks.delete(callback);
    },

    dragStart(nodeId: number | string) {
      const idx = nodeIndexMap.get(nodeId);
      if (idx === undefined) return;

      const node = nodes[idx];
      wasmSim.fixNode(idx, node.x ?? 0, node.y ?? 0);
      wasmSim.reheat(Math.max(alphaValue, 0.3));

      if (state !== 'running') {
        this.start();
      }
    },

    drag(nodeId: number | string, x: number, y: number) {
      const idx = nodeIndexMap.get(nodeId);
      if (idx === undefined) return;

      wasmSim.fixNode(idx, x, y);
      nodes[idx].x = x;
      nodes[idx].y = y;
    },

    dragEnd(nodeId: number | string) {
      const idx = nodeIndexMap.get(nodeId);
      if (idx === undefined) return;

      wasmSim.unfixNode(idx);
      nodes[idx].fx = null;
      nodes[idx].fy = null;
    },

    alpha(value?: number): any {
      if (value === undefined) return wasmSim.getAlpha();
      wasmSim.reheat(value);
      alphaValue = value;
      return simulation;
    },

    dispose() {
      this.stop();
      wasmSim.free();
      tickCallbacks.clear();
      endCallbacks.clear();
    },
  };

  return simulation;
}

// ==================== FACTORY FUNCTION ====================

/**
 * Create a force simulation with automatic backend selection
 *
 * Selection order:
 * 1. WASM (if available and config.useWasm !== false)
 * 2. Web Worker (if available and config.useWorker !== false)
 * 3. Main thread (fallback)
 *
 * @param config - Simulation configuration
 * @returns Force simulation instance
 *
 * @example
 * ```typescript
 * const simulation = await createForceSimulation({
 *   nodes: [
 *     { id: 1, name: 'Node 1' },
 *     { id: 2, name: 'Node 2' },
 *   ],
 *   links: [
 *     { source: 1, target: 2 },
 *   ],
 *   width: 800,
 *   height: 600,
 * });
 *
 * simulation.onTick((nodes) => {
 *   // Update SVG/Canvas with node positions
 *   nodes.forEach(node => {
 *     console.log(`${node.id}: (${node.x}, ${node.y})`);
 *   });
 * });
 *
 * simulation.start();
 * ```
 */
export async function createForceSimulation(
  config: ForceSimulationConfig
): Promise<ForceSimulation> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Server-side: return a no-op simulation
  if (!browser) {
    return createNoOpSimulation(config);
  }

  // Try WASM backend first (Barnes-Hut O(n log n) performance)
  if (mergedConfig.useWasm) {
    try {
      const wasmSimulation = await createWasmSimulation(mergedConfig);
      console.log('[ForceSimulation] Using WASM backend with Barnes-Hut optimization');
      return wasmSimulation;
    } catch (error) {
      console.warn('[ForceSimulation] WASM unavailable, falling back to Worker:', error);
    }
  }

  // Try Worker-based simulation
  if (mergedConfig.useWorker && typeof Worker !== 'undefined') {
    try {
      return createWorkerSimulation(mergedConfig);
    } catch (error) {
      console.warn('[ForceSimulation] Worker unavailable, falling back to main thread');
    }
  }

  // Fallback to main thread
  return createMainThreadSimulation(mergedConfig);
}

/**
 * Create a no-op simulation for server-side rendering
 */
function createNoOpSimulation(config: ForceSimulationConfig): ForceSimulation {
  const nodes = [...config.nodes];

  // Initialize positions
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.x === undefined) node.x = config.width / 2;
    if (node.y === undefined) node.y = config.height / 2;
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  }

  return {
    start() { },
    pause() { },
    stop() { },
    restart() { },
    getState() { return 'idle'; },
    getNodes() { return nodes; },
    getPositionBuffer() { return new Float64Array(nodes.length * VALUES_PER_NODE); },
    setPositionBuffer() { },
    onTick() { return () => { }; },
    onEnd() { return () => { }; },
    dragStart() { },
    drag() { },
    dragEnd() { },
    alpha(value?: number): any {
      if (value === undefined) return 0;
      return this;
    },
    dispose() { },
  };
}

// ==================== D3 COMPATIBILITY LAYER ====================

/**
 * Convert a ForceSimulation to be compatible with D3's simulation interface
 * Allows using this simulation with D3's drag behavior and other utilities
 *
 * @example
 * ```typescript
 * import { createForceSimulation, toD3Compatible } from '$lib/wasm/forceSimulation';
 * import { drag } from 'd3-drag';
 *
 * const simulation = await createForceSimulation(config);
 * const d3Simulation = toD3Compatible(simulation);
 *
 * // Use with d3-drag
 * d3.select('svg').selectAll('circle')
 *   .call(drag()
 *     .on('start', (event, d) => d3Simulation.alphaTarget(0.3).restart())
 *     .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
 *     .on('end', (event, d) => { d.fx = null; d.fy = null; })
 *   );
 * ```
 */
export function toD3Compatible(simulation: ForceSimulation) {
  const nodes = simulation.getNodes();

  return {
    nodes(): ForceNode[] {
      return nodes;
    },

    alpha(value?: number): any {
      if (value === undefined) return simulation.alpha();
      return simulation.alpha(value);
    },

    alphaTarget(value?: number): any {
      // Approximate alphaTarget by restarting with target alpha
      if (value !== undefined && value > 0) {
        simulation.restart(value);
      }
      return this;
    },

    restart(): any {
      simulation.start();
      return this;
    },

    stop(): any {
      simulation.stop();
      return this;
    },

    on(event: string, callback: TickCallback | EndCallback | null): any {
      if (event === 'tick' && callback) {
        simulation.onTick(callback as TickCallback);
      } else if (event === 'end' && callback) {
        simulation.onEnd(callback as EndCallback);
      }
      return this;
    },

    // Expose the underlying simulation for advanced usage
    _forceSimulation: simulation,
  };
}

// ==================== EXPORTS ====================

export {
  createMainThreadSimulation,
  createWorkerSimulation,
  createWasmSimulation,
  createNoOpSimulation,
  loadWasmModule,
  DEFAULT_FORCES,
  DEFAULT_CONFIG,
  VALUES_PER_NODE,
};
