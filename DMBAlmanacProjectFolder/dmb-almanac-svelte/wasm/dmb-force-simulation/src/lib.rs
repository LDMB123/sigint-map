//! DMB Force Simulation - WASM Module
//!
//! High-performance force-directed graph layout with Barnes-Hut optimization.
//! Designed for zero-copy Float64Array data transfer with JavaScript.

use js_sys::Float64Array;
use wasm_bindgen::prelude::*;

// Re-export types
pub mod types;
pub use types::*;

// Force implementations
pub mod forces;

// Quadtree for Barnes-Hut optimization
pub mod quadtree;

// Simulation engine
pub mod simulation;
pub use simulation::ForceSimulation;

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get the version of the force simulation library
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ==================== WASM SIMULATION API ====================

/// WASM-exposed simulation wrapper
#[wasm_bindgen]
pub struct WasmSimulation {
    inner: ForceSimulation,
}

#[wasm_bindgen]
impl WasmSimulation {
    /// Create a new simulation with given dimensions
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64) -> Self {
        Self {
            inner: ForceSimulation::new(width, height),
        }
    }

    /// Initialize nodes from a Float64Array
    /// Format: [x0, y0, radius0, mass0, x1, y1, radius1, mass1, ...]
    #[wasm_bindgen(js_name = "initNodesFromBuffer")]
    pub fn init_nodes_from_buffer(&mut self, buffer: &Float64Array, node_count: usize) {
        let data: Vec<f64> = buffer.to_vec();
        let mut nodes = Vec::with_capacity(node_count);

        for i in 0..node_count {
            let base = i * 4;
            if base + 3 < data.len() {
                let mut node = ForceNode::new(i.to_string(), data[base], data[base + 1]);
                node.radius = data[base + 2];
                node.mass = data[base + 3];
                nodes.push(node);
            }
        }

        self.inner.set_nodes(nodes);
    }

    /// Initialize nodes with just positions
    /// Format: [x0, y0, x1, y1, ...]
    #[wasm_bindgen(js_name = "initNodesFromPositions")]
    pub fn init_nodes_from_positions(&mut self, positions: &Float64Array) {
        let data: Vec<f64> = positions.to_vec();
        let node_count = data.len() / 2;
        let mut nodes = Vec::with_capacity(node_count);

        for i in 0..node_count {
            let base = i * 2;
            nodes.push(ForceNode::new(i.to_string(), data[base], data[base + 1]));
        }

        self.inner.set_nodes(nodes);
    }

    /// Initialize links from indices
    /// Format: [source0, target0, source1, target1, ...]
    #[wasm_bindgen(js_name = "initLinksFromIndices")]
    pub fn init_links_from_indices(&mut self, indices: &[u32]) {
        let link_count = indices.len() / 2;
        let mut links = Vec::with_capacity(link_count);

        for i in 0..link_count {
            let base = i * 2;
            links.push(WasmForceLink::new(
                indices[base] as usize,
                indices[base + 1] as usize,
            ));
        }

        self.inner.set_links(links);
    }

    /// Initialize links with custom strength and distance
    /// Format: [source0, target0, strength0, distance0, ...]
    #[wasm_bindgen(js_name = "initLinksFromBuffer")]
    pub fn init_links_from_buffer(&mut self, buffer: &Float64Array) {
        let data: Vec<f64> = buffer.to_vec();
        let link_count = data.len() / 4;
        let mut links = Vec::with_capacity(link_count);

        for i in 0..link_count {
            let base = i * 4;
            let mut link = WasmForceLink::new(data[base] as usize, data[base + 1] as usize);
            link.strength = data[base + 2];
            link.distance = data[base + 3];
            links.push(link);
        }

        self.inner.set_links(links);
    }

    /// Configure center force
    #[wasm_bindgen(js_name = "setCenterForce")]
    pub fn set_center_force(&mut self, x: f64, y: f64, strength: f64) {
        let mut config = CenterForceConfig::new(x, y);
        config.strength = strength;
        self.inner.center_config = Some(config);
    }

    /// Disable center force
    #[wasm_bindgen(js_name = "disableCenterForce")]
    pub fn disable_center_force(&mut self) {
        self.inner.center_config = None;
    }

    /// Configure charge force
    #[wasm_bindgen(js_name = "setChargeForce")]
    pub fn set_charge_force(
        &mut self,
        strength: f64,
        distance_min: f64,
        distance_max: f64,
        theta: f64,
    ) {
        let mut config = ChargeForceConfig::new();
        config.strength = strength;
        config.distance_min = distance_min;
        config.distance_max = distance_max;
        config.theta = theta;
        self.inner.charge_config = Some(config);
    }

    /// Disable charge force
    #[wasm_bindgen(js_name = "disableChargeForce")]
    pub fn disable_charge_force(&mut self) {
        self.inner.charge_config = None;
    }

    /// Configure link force
    #[wasm_bindgen(js_name = "setLinkForce")]
    pub fn set_link_force(&mut self, distance: f64, strength: f64, iterations: u32) {
        let mut config = LinkForceConfig::new();
        config.distance = distance;
        config.strength = strength;
        config.iterations = iterations as usize;
        self.inner.link_config = Some(config);
    }

    /// Disable link force
    #[wasm_bindgen(js_name = "disableLinkForce")]
    pub fn disable_link_force(&mut self) {
        self.inner.link_config = None;
    }

    /// Configure collision force
    #[wasm_bindgen(js_name = "setCollisionForce")]
    pub fn set_collision_force(&mut self, radius: f64, strength: f64, iterations: u32) {
        let mut config = CollisionForceConfig::new();
        config.radius = radius;
        config.strength = strength;
        config.iterations = iterations as usize;
        self.inner.collision_config = Some(config);
    }

    /// Disable collision force
    #[wasm_bindgen(js_name = "disableCollisionForce")]
    pub fn disable_collision_force(&mut self) {
        self.inner.collision_config = None;
    }

    /// Set simulation parameters
    #[wasm_bindgen(js_name = "setSimulationParams")]
    pub fn set_simulation_params(
        &mut self,
        alpha: f64,
        alpha_min: f64,
        alpha_decay: f64,
        alpha_target: f64,
        velocity_decay: f64,
    ) {
        self.inner.config.alpha = alpha;
        self.inner.config.alpha_min = alpha_min;
        self.inner.config.alpha_decay = alpha_decay;
        self.inner.config.alpha_target = alpha_target;
        self.inner.config.velocity_decay = velocity_decay;
    }

    /// Execute a single tick
    #[wasm_bindgen]
    pub fn tick(&mut self) -> TickResult {
        self.inner.tick()
    }

    /// Execute multiple ticks
    #[wasm_bindgen(js_name = "tickBatch")]
    pub fn tick_batch(&mut self, count: u32) -> TickResult {
        self.inner.tick_batch(count as usize)
    }

    /// Get positions as Float64Array [x0, y0, x1, y1, ...]
    #[wasm_bindgen(js_name = "getPositions")]
    pub fn get_positions(&self) -> Float64Array {
        let positions = self.inner.get_positions_flat();
        Float64Array::from(&positions[..])
    }

    /// Get full state as Float64Array [x, y, vx, vy, fx, fy] per node
    #[wasm_bindgen(js_name = "getState")]
    pub fn get_state(&self) -> Float64Array {
        let state = self.inner.get_state_flat();
        Float64Array::from(&state[..])
    }

    /// Set positions from Float64Array
    #[wasm_bindgen(js_name = "setPositions")]
    pub fn set_positions(&mut self, positions: &Float64Array) {
        let data: Vec<f64> = positions.to_vec();
        self.inner.set_positions_flat(&data);
    }

    /// Set full state from Float64Array
    #[wasm_bindgen(js_name = "setState")]
    pub fn set_state(&mut self, state: &Float64Array) {
        let data: Vec<f64> = state.to_vec();
        self.inner.set_state_flat(&data);
    }

    /// Fix a node at a position
    #[wasm_bindgen(js_name = "fixNode")]
    pub fn fix_node(&mut self, index: usize, x: f64, y: f64) {
        self.inner.fix_node(index, x, y);
    }

    /// Unfix a node
    #[wasm_bindgen(js_name = "unfixNode")]
    pub fn unfix_node(&mut self, index: usize) {
        self.inner.unfix_node(index);
    }

    /// Reheat the simulation
    #[wasm_bindgen]
    pub fn reheat(&mut self, alpha: f64) {
        self.inner.reheat(alpha);
    }

    /// Get current alpha
    #[wasm_bindgen(js_name = "getAlpha")]
    pub fn get_alpha(&self) -> f64 {
        self.inner.config.alpha
    }

    /// Get node count
    #[wasm_bindgen(js_name = "nodeCount")]
    pub fn node_count(&self) -> usize {
        self.inner.node_count()
    }

    /// Get link count
    #[wasm_bindgen(js_name = "linkCount")]
    pub fn link_count(&self) -> usize {
        self.inner.link_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_force_node_creation() {
        let node = ForceNode::new("test".to_string(), 10.0, 20.0);
        assert_eq!(node.id, "test");
        assert_eq!(node.x, 10.0);
        assert_eq!(node.y, 20.0);
        assert_eq!(node.vx, 0.0);
        assert_eq!(node.vy, 0.0);
        assert_eq!(node.radius, 5.0);
        assert_eq!(node.mass, 1.0);
    }

    #[test]
    fn test_force_link_creation() {
        let link = WasmForceLink::new(0, 1);
        assert_eq!(link.source_idx, 0);
        assert_eq!(link.target_idx, 1);
        assert_eq!(link.strength, 1.0);
        assert_eq!(link.distance, 30.0);
    }

    #[test]
    fn test_simulation_config() {
        let config = SimulationConfig::new(800.0, 600.0);
        assert_eq!(config.width, 800.0);
        assert_eq!(config.height, 600.0);
        assert_eq!(config.alpha, 1.0);
        assert!(config.alpha_decay > 0.0);
    }

    #[test]
    fn test_center_force_config() {
        let config = CenterForceConfig::new(400.0, 300.0);
        assert_eq!(config.x, 400.0);
        assert_eq!(config.y, 300.0);
        assert_eq!(config.strength, 1.0);
    }

    #[test]
    fn test_charge_force_config() {
        let config = ChargeForceConfig::new();
        assert_eq!(config.strength, -30.0);
        assert_eq!(config.theta, 0.9);
        assert_eq!(config.distance_min, 1.0);
    }

    #[test]
    fn test_link_force_config() {
        let config = LinkForceConfig::new();
        assert_eq!(config.iterations, 1);
        assert_eq!(config.strength, 1.0);
        assert_eq!(config.distance, 30.0);
    }

    #[test]
    fn test_collision_force_config() {
        let config = CollisionForceConfig::new();
        assert_eq!(config.radius, 5.0);
        assert_eq!(config.strength, 1.0);
        assert_eq!(config.iterations, 1);
    }

    #[test]
    fn test_tick_result() {
        let result = TickResult::new(true, 0.5);
        assert!(result.should_continue);
        assert_eq!(result.alpha, 0.5);
    }
}
