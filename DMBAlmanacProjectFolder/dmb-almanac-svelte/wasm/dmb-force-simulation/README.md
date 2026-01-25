# dmb-force-simulation

Force-directed graph simulation with Barnes-Hut optimization for WASM.

## Overview

This crate provides high-performance force-directed graph layout algorithms optimized for WebAssembly. It implements D3-force-compatible simulations with several key optimizations:

- **Barnes-Hut approximation** for O(n log n) many-body forces
- **Efficient data structures** for spatial indexing
- **WASM-optimized** memory layout and computation

## Phase 3 Implementation Status

This is the Phase 3 foundation crate. Currently implemented:

- ✅ Type definitions (ForceNode, ForceLink, configs)
- ✅ WASM bindings setup
- ⏳ Force implementations (pending)
- ⏳ Simulation engine (pending)
- ⏳ Barnes-Hut quadtree (pending)

## Types

### ForceNode
Represents a node in the simulation with position, velocity, and force accumulation.

```rust
let node = ForceNode::new("node-1".to_string(), 100.0, 100.0);
node.set_radius(10.0);
node.set_mass(1.5);
```

### ForceLink
Represents a link between two nodes with configurable strength and distance.

```rust
let link = ForceLink::new(0, 1); // source_idx, target_idx
link.set_strength(0.8);
link.set_distance(50.0);
```

### Configuration Types

- **SimulationConfig**: Main simulation parameters (alpha, decay, dimensions)
- **CenterForceConfig**: Gravity towards a center point
- **ChargeForceConfig**: Many-body repulsion/attraction with Barnes-Hut
- **LinkForceConfig**: Spring forces between linked nodes
- **CollisionForceConfig**: Collision detection and response

## Planned Features

### Forces Module
- Center force: Pulls nodes towards a center point
- Charge force: Many-body force with Barnes-Hut optimization
- Link force: Spring force between connected nodes
- Collision force: Prevents node overlap

### Simulation Module
- Tick-based simulation loop
- Alpha-based convergence detection
- Velocity Verlet integration
- Barnes-Hut quadtree for spatial queries

## Usage (Future)

```javascript
import init, { ForceSimulation, ForceNode, ForceLink } from './dmb-force-simulation';

await init();

// Create nodes
const nodes = [
  new ForceNode('a', 100, 100),
  new ForceNode('b', 200, 200),
];

// Create links
const links = [
  new ForceLink(0, 1),
];

// Create simulation
const sim = new ForceSimulation(nodes, links, 800, 600);

// Run simulation
for (let i = 0; i < 300; i++) {
  const result = sim.tick();
  if (!result.should_continue) break;
}

// Get updated positions
const positions = sim.get_node_positions();
```

## Performance Targets

- **Nodes**: 1000-10000 nodes
- **Links**: 2000-20000 links
- **FPS**: 60fps for interactive simulations
- **Convergence**: < 300 iterations for most graphs

## Development

```bash
# Build
cargo build -p dmb-force-simulation

# Test
cargo test -p dmb-force-simulation

# Build for WASM
wasm-pack build --target web --out-dir pkg
```

## License

MIT
