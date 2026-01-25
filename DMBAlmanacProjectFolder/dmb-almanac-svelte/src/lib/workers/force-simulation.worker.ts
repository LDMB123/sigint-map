/**
 * Web Worker for D3 Force Simulation
 * Offloads CPU-intensive force calculations from main thread
 * Optimized for Apple Silicon M-series chips
 *
 * SECURITY: All incoming messages are validated before processing
 */

import { scaleSqrt } from 'd3-scale';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import type { Simulation, SimulationLinkDatum } from 'd3-force';

interface WorkerNode {
  id: number;
  name: string;
  instruments: string[];
  totalAppearances: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface WorkerLink {
  source: number;
  target: number;
  coAppearances: number;
}

interface SimulationConfig {
  width: number;
  height: number;
  nodes: WorkerNode[];
  links: WorkerLink[];
}

interface DragData {
  nodeId: number;
  x?: number;
  y?: number;
  type: 'start' | 'drag' | 'end';
}

// SECURITY: Constants for validation
const MAX_NODES = 10000; // Prevent memory exhaustion
const MAX_LINKS = 50000;
const MAX_DIMENSION = 10000; // Maximum canvas dimension
const ALLOWED_MESSAGE_TYPES = ['init', 'drag', 'stop', 'reheat'] as const;
// AllowedMessageType used for type safety in message validation
type _AllowedMessageType = typeof ALLOWED_MESSAGE_TYPES[number];

interface TickMessage {
  type: 'tick';
  nodes: WorkerNode[];
}

interface EndMessage {
  type: 'end';
  nodes: WorkerNode[];
}

let simulation: Simulation<WorkerNode, SimulationLinkDatum<WorkerNode>> | null = null;

/**
 * SECURITY: Validates worker message structure and type
 */
function isValidMessage(message: any): { valid: boolean; error?: string } {
  // Check message exists and has type
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Invalid message format' };
  }

  if (typeof message.type !== 'string') {
    return { valid: false, error: 'Message type must be a string' };
  }

  // Check message type is allowed
  if (!ALLOWED_MESSAGE_TYPES.includes(message.type as any)) {
    return { valid: false, error: `Invalid message type: ${message.type}` };
  }

  return { valid: true };
}

/**
 * SECURITY: Validates simulation configuration
 */
function isValidSimulationConfig(config: any): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Invalid config format' };
  }

  // Validate dimensions
  if (typeof config.width !== 'number' || config.width <= 0 || config.width > MAX_DIMENSION) {
    return { valid: false, error: `Invalid width: must be between 0 and ${MAX_DIMENSION}` };
  }

  if (typeof config.height !== 'number' || config.height <= 0 || config.height > MAX_DIMENSION) {
    return { valid: false, error: `Invalid height: must be between 0 and ${MAX_DIMENSION}` };
  }

  // Validate nodes
  if (!Array.isArray(config.nodes)) {
    return { valid: false, error: 'Nodes must be an array' };
  }

  if (config.nodes.length === 0) {
    return { valid: false, error: 'Nodes array cannot be empty' };
  }

  if (config.nodes.length > MAX_NODES) {
    return { valid: false, error: `Too many nodes: maximum ${MAX_NODES}` };
  }

  // Validate node structure
  for (let i = 0; i < config.nodes.length; i++) {
    const node = config.nodes[i];
    if (typeof node !== 'object' || node === null) {
      return { valid: false, error: `Invalid node at index ${i}` };
    }

    if (typeof node.id !== 'number') {
      return { valid: false, error: `Node ${i}: id must be a number` };
    }

    if (typeof node.name !== 'string') {
      return { valid: false, error: `Node ${i}: name must be a string` };
    }

    if (!Array.isArray(node.instruments)) {
      return { valid: false, error: `Node ${i}: instruments must be an array` };
    }

    if (typeof node.totalAppearances !== 'number' || node.totalAppearances < 0) {
      return { valid: false, error: `Node ${i}: totalAppearances must be a non-negative number` };
    }
  }

  // Validate links
  if (!Array.isArray(config.links)) {
    return { valid: false, error: 'Links must be an array' };
  }

  if (config.links.length > MAX_LINKS) {
    return { valid: false, error: `Too many links: maximum ${MAX_LINKS}` };
  }

  // Create node ID set for link validation
  const nodeIds = new Set(config.nodes.map((n: WorkerNode) => n.id));

  // Validate link structure
  for (let i = 0; i < config.links.length; i++) {
    const link = config.links[i];
    if (typeof link !== 'object' || link === null) {
      return { valid: false, error: `Invalid link at index ${i}` };
    }

    if (typeof link.source !== 'number') {
      return { valid: false, error: `Link ${i}: source must be a number` };
    }

    if (typeof link.target !== 'number') {
      return { valid: false, error: `Link ${i}: target must be a number` };
    }

    if (!nodeIds.has(link.source)) {
      return { valid: false, error: `Link ${i}: source node ${link.source} not found` };
    }

    if (!nodeIds.has(link.target)) {
      return { valid: false, error: `Link ${i}: target node ${link.target} not found` };
    }

    if (typeof link.coAppearances !== 'number' || link.coAppearances < 0) {
      return { valid: false, error: `Link ${i}: coAppearances must be a non-negative number` };
    }
  }

  return { valid: true };
}

/**
 * SECURITY: Validates drag data
 */
function isValidDragData(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid drag data format' };
  }

  if (typeof data.nodeId !== 'number') {
    return { valid: false, error: 'nodeId must be a number' };
  }

  if (!['start', 'drag', 'end'].includes(data.type)) {
    return { valid: false, error: 'Invalid drag type' };
  }

  // For drag type, x and y are required
  if (data.type === 'drag') {
    if (typeof data.x !== 'number' || typeof data.y !== 'number') {
      return { valid: false, error: 'Drag type requires x and y coordinates' };
    }

    // Validate coordinates are reasonable (prevent extreme values)
    if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) {
      return { valid: false, error: 'Coordinates must be finite numbers' };
    }
  }

  return { valid: true };
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent) => {
  try {
    // SECURITY: Validate message structure
    const messageValidation = isValidMessage(event.data);
    if (!messageValidation.valid) {
      console.error('Worker: Invalid message:', messageValidation.error);
      self.postMessage({ type: 'error', error: messageValidation.error });
      return;
    }

    const { type, data } = event.data;

    switch (type) {
      case 'init': {
        // SECURITY: Validate simulation config
        const configValidation = isValidSimulationConfig(data);
        if (!configValidation.valid) {
          console.error('Worker: Invalid config:', configValidation.error);
          self.postMessage({ type: 'error', error: configValidation.error });
          return;
        }
        initSimulation(data as SimulationConfig);
        break;
      }
      case 'drag': {
        // SECURITY: Validate drag data
        const dragValidation = isValidDragData(data);
        if (!dragValidation.valid) {
          console.error('Worker: Invalid drag data:', dragValidation.error);
          self.postMessage({ type: 'error', error: dragValidation.error });
          return;
        }
        handleDrag(data as DragData);
        break;
      }
      case 'stop':
        stopSimulation();
        break;
      case 'reheat':
        reheatSimulation();
        break;
      default:
        // Should never reach here due to type validation
        console.error('Worker: Unexpected message type:', type);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Worker: Error processing message:', errorMessage);
    self.postMessage({ type: 'error', error: errorMessage });
  }
};

function initSimulation(config: SimulationConfig) {
  const { width, height, nodes, links } = config;

  // Stop existing simulation
  if (simulation) {
    simulation.stop();
  }

  // Create node map for link resolution
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Resolve links to node references
  const resolvedLinks = links.map((link) => ({
    // biome-ignore lint/style/noNonNullAssertion: nodeMap contains all link source/target references from initial nodes array
    source: nodeMap.get(link.source)!,
    // biome-ignore lint/style/noNonNullAssertion: nodeMap contains all link source/target references from initial nodes array
    target: nodeMap.get(link.target)!,
    coAppearances: link.coAppearances,
  }));

  // Radius scale for collision detection
  // PERF: Use loop instead of Math.max(...spread) to avoid stack overflow on large arrays
  let maxAppearances = 100;
  for (const node of nodes) {
    if (node.totalAppearances > maxAppearances) maxAppearances = node.totalAppearances;
  }
  const radiusScale = scaleSqrt().domain([0, maxAppearances]).range([4, 20]);

  // Create force simulation
  simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink(resolvedLinks)
        .id((d: any) => d.id)
        .distance((d) => {
          const strength = (d as any).coAppearances || 1;
          return 100 - strength * 5;
        })
        .strength(0.3)
    )
    .force('charge', forceManyBody().strength(-200).distanceMax(300))
    .force('center', forceCenter(width / 2, height / 2))
    .force(
      'collide',
      forceCollide<WorkerNode>()
        .radius((d) => radiusScale(d.totalAppearances) + 5)
        .strength(0.7)
    )
    .alphaDecay(0.02)
    .velocityDecay(0.4);

  // Send tick updates to main thread
  simulation.on('tick', () => {
    const message: TickMessage = {
      type: 'tick',
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        instruments: n.instruments,
        totalAppearances: n.totalAppearances,
        x: n.x,
        y: n.y,
        vx: n.vx,
        vy: n.vy,
        fx: n.fx,
        fy: n.fy,
      })),
    };
    self.postMessage(message);
  });

  // Notify when simulation ends
  simulation.on('end', () => {
    const message: EndMessage = {
      type: 'end',
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        instruments: n.instruments,
        totalAppearances: n.totalAppearances,
        x: n.x,
        y: n.y,
        vx: n.vx,
        vy: n.vy,
        fx: n.fx,
        fy: n.fy,
      })),
    };
    self.postMessage(message);
  });
}

function handleDrag(data: DragData) {
  if (!simulation) {
    console.warn('Worker: Cannot handle drag, simulation not initialized');
    return;
  }

  const nodes = simulation.nodes();
  const node = nodes.find((n) => n.id === data.nodeId);

  if (!node) {
    console.warn(`Worker: Node ${data.nodeId} not found for drag operation`);
    return;
  }

  switch (data.type) {
    case 'start':
      simulation.alphaTarget(0.3).restart();
      node.fx = node.x;
      node.fy = node.y;
      break;
    case 'drag':
      // SECURITY: data.x and data.y are validated before this function is called
      node.fx = data.x;
      node.fy = data.y;
      break;
    case 'end':
      simulation.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      break;
  }
}

function stopSimulation() {
  if (simulation) {
    simulation.stop();
  }
}

function reheatSimulation() {
  if (simulation) {
    simulation.alpha(0.3).restart();
  }
}
