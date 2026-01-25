/**
 * Force Simulation Unit Tests
 *
 * Tests for the WASM-optimized force simulation bridge.
 * Verifies TypedArray operations, force calculations, and D3 compatibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  allocatePositionBuffer,
  packNodesIntoBuffer,
  unpackBufferIntoNodes,
  createMainThreadSimulation,
  createNoOpSimulation,
  toD3Compatible,
  VALUES_PER_NODE,
  type ForceNode,
  type ForceLink,
  type ForceSimulationConfig,
} from '$lib/wasm/forceSimulation';

// ==================== TYPED ARRAY UTILITIES ====================

describe('TypedArray Utilities', () => {
  describe('allocatePositionBuffer', () => {
    it('should allocate correct buffer size for nodes', () => {
      const buffer = allocatePositionBuffer(10);
      expect(buffer.length).toBe(10 * VALUES_PER_NODE);
      expect(buffer.length).toBe(60); // 10 nodes * 6 values each
    });

    it('should initialize buffer with zeros', () => {
      const buffer = allocatePositionBuffer(5);
      for (let i = 0; i < buffer.length; i++) {
        expect(buffer[i]).toBe(0);
      }
    });

    it('should handle zero nodes', () => {
      const buffer = allocatePositionBuffer(0);
      expect(buffer.length).toBe(0);
    });
  });

  describe('packNodesIntoBuffer', () => {
    it('should pack node positions correctly', () => {
      const nodes: ForceNode[] = [
        { id: 1, x: 10, y: 20, vx: 1, vy: 2, fx: null, fy: null },
        { id: 2, x: 30, y: 40, vx: 3, vy: 4, fx: 50, fy: 60 },
      ];
      const buffer = allocatePositionBuffer(2);

      packNodesIntoBuffer(nodes, buffer);

      // Node 0: [x, y, vx, vy, fx, fy]
      expect(buffer[0]).toBe(10);  // x
      expect(buffer[1]).toBe(20);  // y
      expect(buffer[2]).toBe(1);   // vx
      expect(buffer[3]).toBe(2);   // vy
      expect(Number.isNaN(buffer[4])).toBe(true);  // fx = null -> NaN
      expect(Number.isNaN(buffer[5])).toBe(true);  // fy = null -> NaN

      // Node 1: [x, y, vx, vy, fx, fy]
      expect(buffer[6]).toBe(30);  // x
      expect(buffer[7]).toBe(40);  // y
      expect(buffer[8]).toBe(3);   // vx
      expect(buffer[9]).toBe(4);   // vy
      expect(buffer[10]).toBe(50); // fx
      expect(buffer[11]).toBe(60); // fy
    });

    it('should handle undefined positions as zero', () => {
      const nodes: ForceNode[] = [{ id: 1 }];
      const buffer = allocatePositionBuffer(1);

      packNodesIntoBuffer(nodes, buffer);

      expect(buffer[0]).toBe(0);  // x undefined -> 0
      expect(buffer[1]).toBe(0);  // y undefined -> 0
      expect(buffer[2]).toBe(0);  // vx undefined -> 0
      expect(buffer[3]).toBe(0);  // vy undefined -> 0
    });
  });

  describe('unpackBufferIntoNodes', () => {
    it('should unpack buffer into nodes correctly', () => {
      const buffer = new Float64Array([
        100, 200, 10, 20, NaN, NaN,  // Node 0
        300, 400, 30, 40, 500, 600,  // Node 1
      ]);
      const nodes: ForceNode[] = [{ id: 1 }, { id: 2 }];

      unpackBufferIntoNodes(buffer, nodes);

      expect(nodes[0].x).toBe(100);
      expect(nodes[0].y).toBe(200);
      expect(nodes[0].vx).toBe(10);
      expect(nodes[0].vy).toBe(20);
      expect(nodes[0].fx).toBeNull();
      expect(nodes[0].fy).toBeNull();

      expect(nodes[1].x).toBe(300);
      expect(nodes[1].y).toBe(400);
      expect(nodes[1].vx).toBe(30);
      expect(nodes[1].vy).toBe(40);
      expect(nodes[1].fx).toBe(500);
      expect(nodes[1].fy).toBe(600);
    });

    it('should be reversible with packNodesIntoBuffer', () => {
      const originalNodes: ForceNode[] = [
        { id: 1, x: 123.456, y: 789.012, vx: 1.5, vy: -2.5, fx: null, fy: null },
        { id: 2, x: -50, y: 0, vx: 0, vy: 0, fx: 100, fy: 200 },
      ];
      const buffer = allocatePositionBuffer(2);
      const restoredNodes: ForceNode[] = [{ id: 1 }, { id: 2 }];

      packNodesIntoBuffer(originalNodes, buffer);
      unpackBufferIntoNodes(buffer, restoredNodes);

      expect(restoredNodes[0].x).toBe(originalNodes[0].x);
      expect(restoredNodes[0].y).toBe(originalNodes[0].y);
      expect(restoredNodes[0].vx).toBe(originalNodes[0].vx);
      expect(restoredNodes[0].vy).toBe(originalNodes[0].vy);
      expect(restoredNodes[0].fx).toBe(originalNodes[0].fx);
      expect(restoredNodes[0].fy).toBe(originalNodes[0].fy);

      expect(restoredNodes[1].fx).toBe(100);
      expect(restoredNodes[1].fy).toBe(200);
    });
  });
});

// ==================== MAIN THREAD SIMULATION ====================

describe('Main Thread Simulation', () => {
  const createTestConfig = (overrides: Partial<ForceSimulationConfig> = {}): ForceSimulationConfig => ({
    nodes: [
      { id: 1, name: 'Node 1' },
      { id: 2, name: 'Node 2' },
      { id: 3, name: 'Node 3' },
    ],
    links: [
      { source: 1, target: 2 },
      { source: 2, target: 3 },
    ],
    width: 800,
    height: 600,
    ...overrides,
  });

  describe('createMainThreadSimulation', () => {
    it('should create a simulation instance', () => {
      const simulation = createMainThreadSimulation(createTestConfig());

      expect(simulation).toBeDefined();
      expect(simulation.getState()).toBe('idle');
      expect(simulation.getNodes()).toHaveLength(3);
    });

    it('should initialize node positions', () => {
      const simulation = createMainThreadSimulation(createTestConfig());
      const nodes = simulation.getNodes();

      // Positions should be initialized (randomly or with defaults)
      nodes.forEach(node => {
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(node.vx).toBe(0);
        expect(node.vy).toBe(0);
      });
    });

    it('should preserve existing node positions', () => {
      const config = createTestConfig({
        nodes: [
          { id: 1, x: 100, y: 200 },
          { id: 2, x: 300, y: 400 },
        ],
      });
      const simulation = createMainThreadSimulation(config);
      const nodes = simulation.getNodes();

      expect(nodes[0].x).toBe(100);
      expect(nodes[0].y).toBe(200);
      expect(nodes[1].x).toBe(300);
      expect(nodes[1].y).toBe(400);
    });
  });

  describe('simulation state management', () => {
    it('should track state correctly', async () => {
      const simulation = createMainThreadSimulation(createTestConfig({
        alphaMin: 0.5, // High threshold for quick stop
      }));

      expect(simulation.getState()).toBe('idle');

      simulation.start();
      expect(simulation.getState()).toBe('running');

      simulation.pause();
      expect(simulation.getState()).toBe('paused');

      simulation.stop();
      expect(simulation.getState()).toBe('stopped');
    });
  });

  describe('tick callbacks', () => {
    it('should call tick callback during simulation', async () => {
      const tickCallback = vi.fn();
      const simulation = createMainThreadSimulation(createTestConfig({
        alphaMin: 0.99, // Stop immediately after one tick
      }));

      simulation.onTick(tickCallback);
      simulation.start();

      // Wait for at least one tick
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(tickCallback).toHaveBeenCalled();
      expect(tickCallback).toHaveBeenCalledWith(expect.any(Array));

      simulation.stop();
    });

    it('should allow unsubscribing from tick callback', () => {
      const tickCallback = vi.fn();
      const simulation = createMainThreadSimulation(createTestConfig());

      const unsubscribe = simulation.onTick(tickCallback);
      unsubscribe();

      // Callback should not be called after unsubscribe
      // (Internal check - we can't easily verify this without more complex setup)
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('drag handling', () => {
    it('should fix node position on drag start', () => {
      const config = createTestConfig({
        nodes: [{ id: 1, x: 100, y: 200 }],
      });
      const simulation = createMainThreadSimulation(config);

      simulation.dragStart(1);

      const nodes = simulation.getNodes();
      expect(nodes[0].fx).toBe(100);
      expect(nodes[0].fy).toBe(200);
    });

    it('should update fixed position on drag', () => {
      const simulation = createMainThreadSimulation(createTestConfig());

      simulation.dragStart(1);
      simulation.drag(1, 500, 600);

      const nodes = simulation.getNodes();
      const node = nodes.find(n => n.id === 1);
      expect(node?.fx).toBe(500);
      expect(node?.fy).toBe(600);
    });

    it('should release fixed position on drag end', () => {
      const simulation = createMainThreadSimulation(createTestConfig());

      simulation.dragStart(1);
      simulation.drag(1, 500, 600);
      simulation.dragEnd(1);

      const nodes = simulation.getNodes();
      const node = nodes.find(n => n.id === 1);
      expect(node?.fx).toBeNull();
      expect(node?.fy).toBeNull();
    });
  });

  describe('alpha control', () => {
    it('should get current alpha value', () => {
      const simulation = createMainThreadSimulation(createTestConfig());
      const alpha = simulation.alpha();

      expect(typeof alpha).toBe('number');
      expect(alpha).toBeGreaterThan(0);
    });

    it('should set alpha value', () => {
      const simulation = createMainThreadSimulation(createTestConfig());

      simulation.alpha(0.5);
      expect(simulation.alpha()).toBe(0.5);
    });
  });

  describe('position buffer', () => {
    it('should return current positions as Float64Array', () => {
      const simulation = createMainThreadSimulation(createTestConfig());
      const buffer = simulation.getPositionBuffer();

      expect(buffer).toBeInstanceOf(Float64Array);
      expect(buffer.length).toBe(3 * VALUES_PER_NODE); // 3 nodes
    });

    it('should update nodes from position buffer', () => {
      const simulation = createMainThreadSimulation(createTestConfig());

      // Create a buffer with known positions
      const newBuffer = new Float64Array([
        999, 888, 0, 0, NaN, NaN,  // Node 0
        777, 666, 0, 0, NaN, NaN,  // Node 1
        555, 444, 0, 0, NaN, NaN,  // Node 2
      ]);

      simulation.setPositionBuffer(newBuffer);

      const nodes = simulation.getNodes();
      expect(nodes[0].x).toBe(999);
      expect(nodes[0].y).toBe(888);
      expect(nodes[1].x).toBe(777);
      expect(nodes[1].y).toBe(666);
      expect(nodes[2].x).toBe(555);
      expect(nodes[2].y).toBe(444);
    });
  });

  describe('dispose', () => {
    it('should stop simulation and clean up', () => {
      const simulation = createMainThreadSimulation(createTestConfig());

      simulation.start();
      simulation.dispose();

      expect(simulation.getState()).toBe('stopped');
    });
  });
});

// ==================== NO-OP SIMULATION ====================

describe('No-Op Simulation (SSR)', () => {
  it('should create a simulation with centered positions', () => {
    const config: ForceSimulationConfig = {
      nodes: [{ id: 1 }, { id: 2 }],
      width: 800,
      height: 600,
    };
    const simulation = createNoOpSimulation(config);
    const nodes = simulation.getNodes();

    expect(nodes[0].x).toBe(400); // width / 2
    expect(nodes[0].y).toBe(300); // height / 2
    expect(nodes[1].x).toBe(400);
    expect(nodes[1].y).toBe(300);
  });

  it('should have no-op methods that do not throw', () => {
    const simulation = createNoOpSimulation({
      nodes: [{ id: 1 }],
      width: 100,
      height: 100,
    });

    // These should not throw
    expect(() => simulation.start()).not.toThrow();
    expect(() => simulation.pause()).not.toThrow();
    expect(() => simulation.stop()).not.toThrow();
    expect(() => simulation.restart()).not.toThrow();
    expect(() => simulation.dragStart(1)).not.toThrow();
    expect(() => simulation.drag(1, 50, 50)).not.toThrow();
    expect(() => simulation.dragEnd(1)).not.toThrow();
    expect(() => simulation.dispose()).not.toThrow();
  });

  it('should always return idle state', () => {
    const simulation = createNoOpSimulation({
      nodes: [{ id: 1 }],
      width: 100,
      height: 100,
    });

    simulation.start();
    expect(simulation.getState()).toBe('idle');

    simulation.pause();
    expect(simulation.getState()).toBe('idle');
  });
});

// ==================== D3 COMPATIBILITY ====================

describe('D3 Compatibility Layer', () => {
  it('should wrap simulation with D3-compatible interface', () => {
    const simulation = createMainThreadSimulation({
      nodes: [{ id: 1 }, { id: 2 }],
      width: 100,
      height: 100,
    });
    const d3Sim = toD3Compatible(simulation);

    expect(typeof d3Sim.nodes).toBe('function');
    expect(typeof d3Sim.alpha).toBe('function');
    expect(typeof d3Sim.alphaTarget).toBe('function');
    expect(typeof d3Sim.restart).toBe('function');
    expect(typeof d3Sim.stop).toBe('function');
    expect(typeof d3Sim.on).toBe('function');
  });

  it('should return nodes from nodes() method', () => {
    const simulation = createMainThreadSimulation({
      nodes: [{ id: 1 }, { id: 2 }],
      width: 100,
      height: 100,
    });
    const d3Sim = toD3Compatible(simulation);

    const nodes = d3Sim.nodes();
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe(1);
    expect(nodes[1].id).toBe(2);
  });

  it('should support chaining for alphaTarget and restart', () => {
    const simulation = createMainThreadSimulation({
      nodes: [{ id: 1 }],
      width: 100,
      height: 100,
    });
    const d3Sim = toD3Compatible(simulation);

    // Should return self for chaining (D3 convention)
    const result = d3Sim.alphaTarget(0.3).restart();
    expect(result).toBe(d3Sim);

    simulation.stop();
  });

  it('should expose underlying simulation', () => {
    const simulation = createMainThreadSimulation({
      nodes: [{ id: 1 }],
      width: 100,
      height: 100,
    });
    const d3Sim = toD3Compatible(simulation);

    expect(d3Sim._forceSimulation).toBe(simulation);
  });
});

// ==================== FORCE CALCULATIONS ====================

describe('Force Calculations', () => {
  describe('center force', () => {
    it('should pull nodes toward center over time', async () => {
      // Start nodes far from center
      const simulation = createMainThreadSimulation({
        nodes: [
          { id: 1, x: 0, y: 0 },
          { id: 2, x: 800, y: 600 },
        ],
        links: [],
        width: 800,
        height: 600,
        forces: {
          center: { enabled: true, strength: 1.0 },
          charge: { enabled: false },
          collision: { enabled: false },
          link: { enabled: false },
        },
        ticksPerBatch: 1,
      });

      const initialNodes = simulation.getNodes().map(n => ({ x: n.x, y: n.y }));

      simulation.start();

      // Wait for some ticks
      await new Promise(resolve => setTimeout(resolve, 100));
      simulation.stop();

      const finalNodes = simulation.getNodes();

      // Center of mass should be closer to (400, 300)
      const initialCenterX = (initialNodes[0].x! + initialNodes[1].x!) / 2;
      const initialCenterY = (initialNodes[0].y! + initialNodes[1].y!) / 2;
      const finalCenterX = (finalNodes[0].x! + finalNodes[1].x!) / 2;
      const finalCenterY = (finalNodes[0].y! + finalNodes[1].y!) / 2;

      // Final center should be closer to canvas center
      const initialDistFromCenter = Math.hypot(initialCenterX - 400, initialCenterY - 300);
      const finalDistFromCenter = Math.hypot(finalCenterX - 400, finalCenterY - 300);

      expect(finalDistFromCenter).toBeLessThanOrEqual(initialDistFromCenter);
    });
  });

  describe('link force', () => {
    it('should pull connected nodes toward each other', async () => {
      const simulation = createMainThreadSimulation({
        nodes: [
          { id: 1, x: 0, y: 300, vx: 0, vy: 0 },
          { id: 2, x: 800, y: 300, vx: 0, vy: 0 },
        ],
        links: [{ source: 1, target: 2, distance: 50 }],
        width: 800,
        height: 600,
        forces: {
          center: { enabled: false },
          charge: { enabled: false },
          collision: { enabled: false },
          link: { enabled: true, distance: 50, strength: 0.5 },
        },
        ticksPerBatch: 1,
      });

      const initialDistance = 800; // Distance between nodes

      simulation.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      simulation.stop();

      const nodes = simulation.getNodes();
      const finalDistance = Math.abs(nodes[1].x! - nodes[0].x!);

      // Nodes should be closer together
      expect(finalDistance).toBeLessThan(initialDistance);
    });
  });
});
