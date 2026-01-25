//! Force-directed graph simulation engine
//!
//! This module provides the main simulation loop that coordinates all force
//! calculations and position updates. Designed for efficient WASM execution
//! with zero-copy Float64Array data transfer.

use crate::forces::{
    apply_center_force, apply_charge_force, apply_collision_force, apply_link_force,
    integrate_positions,
};
use crate::quadtree::QuadTree;
use crate::types::{
    CenterForceConfig, ChargeForceConfig, CollisionForceConfig, ForceNode, LinkForceConfig,
    SimulationConfig, TickResult, WasmForceLink,
};

/// Main simulation state
pub struct ForceSimulation {
    pub nodes: Vec<ForceNode>,
    pub links: Vec<WasmForceLink>,
    pub config: SimulationConfig,
    pub center_config: Option<CenterForceConfig>,
    pub charge_config: Option<ChargeForceConfig>,
    pub link_config: Option<LinkForceConfig>,
    pub collision_config: Option<CollisionForceConfig>,
}

impl ForceSimulation {
    /// Create a new simulation with default configuration
    pub fn new(width: f64, height: f64) -> Self {
        Self {
            nodes: Vec::new(),
            links: Vec::new(),
            config: SimulationConfig::new(width, height),
            center_config: Some(CenterForceConfig::new(width / 2.0, height / 2.0)),
            charge_config: Some(ChargeForceConfig::new()),
            link_config: Some(LinkForceConfig::new()),
            collision_config: Some(CollisionForceConfig::new()),
        }
    }

    /// Add a node to the simulation
    pub fn add_node(&mut self, node: ForceNode) {
        self.nodes.push(node);
    }

    /// Add a link between nodes
    pub fn add_link(&mut self, link: WasmForceLink) {
        self.links.push(link);
    }

    /// Set nodes from a vec
    pub fn set_nodes(&mut self, nodes: Vec<ForceNode>) {
        self.nodes = nodes;
    }

    /// Set links from a vec
    pub fn set_links(&mut self, links: Vec<WasmForceLink>) {
        self.links = links;
    }

    /// Execute a single simulation tick
    pub fn tick(&mut self) -> TickResult {
        let alpha = self.config.alpha;

        // Apply center force
        if let Some(ref config) = self.center_config {
            apply_center_force(&mut self.nodes, config);
        }

        // Apply charge force with quadtree optimization
        if let Some(ref config) = self.charge_config {
            if self.nodes.len() > 100 {
                // Use Barnes-Hut for larger datasets
                let quadtree = QuadTree::build(&self.nodes);
                apply_charge_force(&mut self.nodes, config, alpha, &quadtree);
            } else {
                // Direct calculation for small datasets
                crate::forces::apply_charge_force_direct(&mut self.nodes, config, alpha);
            }
        }

        // Apply link force
        if let Some(ref config) = self.link_config {
            apply_link_force(&mut self.nodes, &self.links, config, alpha);
        }

        // Apply collision force
        if let Some(ref config) = self.collision_config {
            apply_collision_force(&mut self.nodes, config);
        }

        // Integrate positions
        integrate_positions(&mut self.nodes, self.config.velocity_decay);

        // Update alpha (cooling)
        self.config.alpha +=
            (self.config.alpha_target - self.config.alpha) * self.config.alpha_decay;

        // Check convergence
        let should_continue = self.config.alpha >= self.config.alpha_min;

        TickResult::new(should_continue, self.config.alpha)
    }

    /// Run multiple ticks (batch execution)
    pub fn tick_batch(&mut self, count: usize) -> TickResult {
        let mut result = TickResult::new(true, self.config.alpha);

        for _ in 0..count {
            result = self.tick();
            if !result.should_continue {
                break;
            }
        }

        result
    }

    /// Get positions as a flat array [x0, y0, x1, y1, ...]
    /// PERF: Pre-allocates exact capacity to avoid reallocation
    pub fn get_positions_flat(&self) -> Vec<f64> {
        let mut positions = Vec::with_capacity(self.nodes.len() * 2);
        for node in &self.nodes {
            positions.push(node.x);
            positions.push(node.y);
        }
        positions
    }

    /// Get full node state as flat array [x, y, vx, vy, fx, fy] per node
    /// PERF: Pre-allocates exact capacity to avoid reallocation
    pub fn get_state_flat(&self) -> Vec<f64> {
        let mut state = Vec::with_capacity(self.nodes.len() * 6);
        for node in &self.nodes {
            state.push(node.x);
            state.push(node.y);
            state.push(node.vx);
            state.push(node.vy);
            state.push(node.fx);
            state.push(node.fy);
        }
        state
    }

    /// Set positions from a flat array
    pub fn set_positions_flat(&mut self, positions: &[f64]) {
        for (i, node) in self.nodes.iter_mut().enumerate() {
            let base = i * 2;
            if base + 1 < positions.len() {
                node.x = positions[base];
                node.y = positions[base + 1];
            }
        }
    }

    /// Set full state from a flat array
    pub fn set_state_flat(&mut self, state: &[f64]) {
        for (i, node) in self.nodes.iter_mut().enumerate() {
            let base = i * 6;
            if base + 5 < state.len() {
                node.x = state[base];
                node.y = state[base + 1];
                node.vx = state[base + 2];
                node.vy = state[base + 3];
                node.fx = state[base + 4];
                node.fy = state[base + 5];
            }
        }
    }

    /// Reheat the simulation (increase alpha)
    pub fn reheat(&mut self, alpha: f64) {
        self.config.alpha = alpha;
    }

    /// Fix a node at a position
    pub fn fix_node(&mut self, index: usize, x: f64, y: f64) {
        if let Some(node) = self.nodes.get_mut(index) {
            node.fx = x;
            node.fy = y;
            node.x = x;
            node.y = y;
            node.vx = 0.0;
            node.vy = 0.0;
        }
    }

    /// Unfix a node (allow it to move freely)
    pub fn unfix_node(&mut self, index: usize) {
        if let Some(node) = self.nodes.get_mut(index) {
            node.fx = f64::NAN;
            node.fy = f64::NAN;
        }
    }

    /// Get node count
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    /// Get link count
    pub fn link_count(&self) -> usize {
        self.links.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_simulation() -> ForceSimulation {
        let mut sim = ForceSimulation::new(800.0, 600.0);

        // Add some test nodes
        sim.add_node(ForceNode::new("0".to_string(), 100.0, 100.0));
        sim.add_node(ForceNode::new("1".to_string(), 200.0, 200.0));
        sim.add_node(ForceNode::new("2".to_string(), 300.0, 100.0));

        // Add a link
        sim.add_link(WasmForceLink::new(0, 1));
        sim.add_link(WasmForceLink::new(1, 2));

        sim
    }

    #[test]
    fn test_simulation_creation() {
        let sim = ForceSimulation::new(800.0, 600.0);
        assert_eq!(sim.config.width, 800.0);
        assert_eq!(sim.config.height, 600.0);
        assert_eq!(sim.nodes.len(), 0);
        assert_eq!(sim.links.len(), 0);
    }

    #[test]
    fn test_add_nodes_and_links() {
        let sim = create_test_simulation();
        assert_eq!(sim.node_count(), 3);
        assert_eq!(sim.link_count(), 2);
    }

    #[test]
    fn test_single_tick() {
        let mut sim = create_test_simulation();
        let initial_alpha = sim.config.alpha;

        let result = sim.tick();

        assert!(result.should_continue);
        assert!(result.alpha < initial_alpha); // Alpha should decrease
    }

    #[test]
    fn test_tick_batch() {
        let mut sim = create_test_simulation();
        let initial_alpha = sim.config.alpha;

        let result = sim.tick_batch(10);

        assert!(result.alpha < initial_alpha);
    }

    #[test]
    fn test_get_positions_flat() {
        let sim = create_test_simulation();
        let positions = sim.get_positions_flat();

        assert_eq!(positions.len(), 6); // 3 nodes * 2 (x, y)
        assert_eq!(positions[0], 100.0); // node 0 x
        assert_eq!(positions[1], 100.0); // node 0 y
    }

    #[test]
    fn test_get_state_flat() {
        let sim = create_test_simulation();
        let state = sim.get_state_flat();

        assert_eq!(state.len(), 18); // 3 nodes * 6 (x, y, vx, vy, fx, fy)
    }

    #[test]
    fn test_set_positions_flat() {
        let mut sim = create_test_simulation();
        let new_positions = vec![50.0, 60.0, 70.0, 80.0, 90.0, 100.0];

        sim.set_positions_flat(&new_positions);

        assert_eq!(sim.nodes[0].x, 50.0);
        assert_eq!(sim.nodes[0].y, 60.0);
        assert_eq!(sim.nodes[1].x, 70.0);
        assert_eq!(sim.nodes[1].y, 80.0);
    }

    #[test]
    fn test_fix_and_unfix_node() {
        let mut sim = create_test_simulation();

        sim.fix_node(0, 500.0, 400.0);
        assert_eq!(sim.nodes[0].x, 500.0);
        assert_eq!(sim.nodes[0].y, 400.0);
        assert_eq!(sim.nodes[0].fx, 500.0);
        assert_eq!(sim.nodes[0].fy, 400.0);

        sim.unfix_node(0);
        assert!(sim.nodes[0].fx.is_nan());
        assert!(sim.nodes[0].fy.is_nan());
    }

    #[test]
    fn test_reheat() {
        let mut sim = create_test_simulation();

        // Run some ticks to cool down
        sim.tick_batch(50);
        let cooled_alpha = sim.config.alpha;

        // Reheat
        sim.reheat(0.8);
        assert_eq!(sim.config.alpha, 0.8);
        assert!(sim.config.alpha > cooled_alpha);
    }

    #[test]
    fn test_simulation_converges() {
        let mut sim = create_test_simulation();

        // Run until convergence or max iterations
        let mut iterations = 0;
        loop {
            let result = sim.tick();
            iterations += 1;

            if !result.should_continue || iterations > 1000 {
                break;
            }
        }

        // Should converge within reasonable iterations
        assert!(iterations < 1000);
        assert!(sim.config.alpha < sim.config.alpha_min);
    }

    #[test]
    fn test_nodes_move_during_simulation() {
        let mut sim = create_test_simulation();
        let initial_x = sim.nodes[0].x;
        let initial_y = sim.nodes[0].y;

        // Run some ticks
        sim.tick_batch(10);

        // At least some nodes should have moved
        let moved = sim.nodes.iter().any(|n| {
            (n.x - initial_x).abs() > 0.001 || (n.y - initial_y).abs() > 0.001
        });

        assert!(moved);
    }
}
