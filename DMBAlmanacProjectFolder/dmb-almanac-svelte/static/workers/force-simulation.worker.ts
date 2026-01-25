// Web Worker for force simulation calculations
// Offloads force simulation computations to a background thread
// to prevent blocking the main thread during graph layout

interface SimulationNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  appearances: number;
}

interface SimulationLink {
  source: number;
  target: number;
  weight: number;
}

interface SimulationConfig {
  nodes: SimulationNode[];
  links: SimulationLink[];
  width: number;
  height: number;
  iterations: number;
}

interface SimulationMessage {
  type: 'init' | 'iterate' | 'stop';
  data?: SimulationConfig;
}

class ForceSimulation {
  nodes: SimulationNode[] = [];
  links: SimulationLink[] = [];
  width = 800;
  height = 600;

  private alpha = 1;
  private alphaDecay = 0.02;
  private minAlpha = 0.001;
  private friction = 0.9;
  private chargeStrength = -300;
  private linkDistance = 100;
  private centerStrength = 0.1;

  init(config: SimulationConfig) {
    this.nodes = config.nodes;
    this.links = config.links;
    this.width = config.width;
    this.height = config.height;
    this.alpha = 1;
  }

  iterate() {
    if (this.alpha < this.minAlpha) {
      return false; // Simulation finished
    }

    // Apply forces
    this.applyChargeForce();
    this.applyLinkForce();
    this.applyCenterForce();
    this.applyCollisionForce();

    // Update positions
    this.updatePositions();

    // Decay alpha
    this.alpha *= (1 - this.alphaDecay);

    return true; // Still simulating
  }

  private applyChargeForce() {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[j].x - this.nodes[i].x;
        const dy = this.nodes[j].y - this.nodes[i].y;
        const distance = Math.hypot(dx, dy) || 0.001;

        const strength = (this.chargeStrength * this.alpha) / (distance * distance);

        this.nodes[i].vx -= (strength * dx) / distance;
        this.nodes[i].vy -= (strength * dy) / distance;

        this.nodes[j].vx += (strength * dx) / distance;
        this.nodes[j].vy += (strength * dy) / distance;
      }
    }
  }

  private applyLinkForce() {
    for (const link of this.links) {
      const source = this.nodes[link.source];
      const target = this.nodes[link.target];

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.hypot(dx, dy) || 0.001;

      const strength = ((distance - this.linkDistance * (link.weight || 1)) * this.alpha) / distance;

      source.vx += strength * dx * 0.5;
      source.vy += strength * dy * 0.5;

      target.vx -= strength * dx * 0.5;
      target.vy -= strength * dy * 0.5;
    }
  }

  private applyCenterForce() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (const node of this.nodes) {
      const dx = centerX - node.x;
      const dy = centerY - node.y;

      node.vx += dx * this.centerStrength * this.alpha;
      node.vy += dy * this.centerStrength * this.alpha;
    }
  }

  private applyCollisionForce() {
    const nodeRadius = 20;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[j].x - this.nodes[i].x;
        const dy = this.nodes[j].y - this.nodes[i].y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const minDistance = nodeRadius * 2;

        if (distance < minDistance) {
          const strength = ((minDistance - distance) / distance) * 0.5;

          this.nodes[i].vx -= strength * dx;
          this.nodes[i].vy -= strength * dy;

          this.nodes[j].vx += strength * dx;
          this.nodes[j].vy += strength * dy;
        }
      }
    }
  }

  private updatePositions() {
    for (const node of this.nodes) {
      node.vx *= this.friction;
      node.vy *= this.friction;

      node.x += node.vx;
      node.y += node.vy;

      // Boundary conditions
      const padding = 30;
      node.x = Math.max(padding, Math.min(this.width - padding, node.x));
      node.y = Math.max(padding, Math.min(this.height - padding, node.y));
    }
  }

  getNodes(): SimulationNode[] {
    return this.nodes;
  }

  isConverged(): boolean {
    return this.alpha < this.minAlpha;
  }
}

const simulation = new ForceSimulation();

self.onmessage = (event: MessageEvent<SimulationMessage>) => {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      if (data) {
        simulation.init(data);
        self.postMessage({
          type: 'initialized',
          nodes: simulation.getNodes()
        });
      }
      break;

    case 'iterate':
      {
        const isRunning = simulation.iterate();
        const isConverged = simulation.isConverged();

        self.postMessage({
          type: 'update',
          nodes: simulation.getNodes(),
          isRunning,
          isConverged
        });
      }
      break;

    case 'stop':
      self.postMessage({
        type: 'stopped',
        nodes: simulation.getNodes()
      });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};

export {};
