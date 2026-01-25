use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Represents a node in the force simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ForceNode {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
    pub fx: f64,
    pub fy: f64,
    pub radius: f64,
    pub mass: f64,
}

#[wasm_bindgen]
impl ForceNode {
    #[wasm_bindgen(constructor)]
    pub fn new(id: String, x: f64, y: f64) -> Self {
        Self {
            id,
            x,
            y,
            vx: 0.0,
            vy: 0.0,
            fx: f64::NAN,
            fy: f64::NAN,
            radius: 5.0,
            mass: 1.0,
        }
    }
}

/// Represents a link between two nodes in the force simulation
/// Used internally by the force functions
#[derive(Debug, Clone)]
pub struct ForceLink {
    pub source: usize,
    pub target: usize,
    pub distance: f64,
    pub strength: f64,
    pub bias: f64,
}

/// Represents a link between two nodes (WASM interface)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct WasmForceLink {
    pub source_idx: usize,
    pub target_idx: usize,
    pub strength: f64,
    pub distance: f64,
}

#[wasm_bindgen]
impl WasmForceLink {
    #[wasm_bindgen(constructor)]
    pub fn new(source_idx: usize, target_idx: usize) -> Self {
        Self {
            source_idx,
            target_idx,
            strength: 1.0,
            distance: 30.0,
        }
    }
}

/// Configuration for the force simulation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct SimulationConfig {
    pub width: f64,
    pub height: f64,
    pub alpha: f64,
    pub alpha_decay: f64,
    pub alpha_min: f64,
    pub alpha_target: f64,
    pub velocity_decay: f64,
}

#[wasm_bindgen]
impl SimulationConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(width: f64, height: f64) -> Self {
        Self {
            width,
            height,
            alpha: 1.0,
            alpha_decay: 0.0228, // ~300 iterations
            alpha_min: 0.001,
            alpha_target: 0.0,
            velocity_decay: 0.4,
        }
    }
}

/// Configuration for center force
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct CenterForceConfig {
    pub x: f64,
    pub y: f64,
    pub strength: f64,
}

#[wasm_bindgen]
impl CenterForceConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f64, y: f64) -> Self {
        Self {
            x,
            y,
            strength: 1.0,
        }
    }
}

/// Configuration for charge (many-body) force
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct ChargeForceConfig {
    pub strength: f64,
    pub theta: f64,
    pub distance_min: f64,
    pub distance_max: f64,
}

#[wasm_bindgen]
impl ChargeForceConfig {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            strength: -30.0,
            theta: 0.9, // Barnes-Hut approximation parameter
            distance_min: 1.0,
            distance_max: f64::INFINITY,
        }
    }
}

impl Default for ChargeForceConfig {
    fn default() -> Self {
        Self::new()
    }
}

/// Configuration for link force
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct LinkForceConfig {
    pub iterations: usize,
    pub strength: f64,
    pub distance: f64,
    pub distance_min: f64,
    pub distance_max: f64,
}

#[wasm_bindgen]
impl LinkForceConfig {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            iterations: 1,
            strength: 1.0,
            distance: 30.0,
            distance_min: 1.0,
            distance_max: f64::INFINITY,
        }
    }
}

impl Default for LinkForceConfig {
    fn default() -> Self {
        Self::new()
    }
}

/// Configuration for collision force
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct CollisionForceConfig {
    pub radius: f64,
    pub strength: f64,
    pub iterations: usize,
}

#[wasm_bindgen]
impl CollisionForceConfig {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            radius: 5.0,
            strength: 1.0,
            iterations: 1,
        }
    }
}

impl Default for CollisionForceConfig {
    fn default() -> Self {
        Self::new()
    }
}

/// Result of a simulation tick
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct TickResult {
    pub should_continue: bool,
    pub alpha: f64,
}

#[wasm_bindgen]
impl TickResult {
    #[wasm_bindgen(constructor)]
    pub fn new(should_continue: bool, alpha: f64) -> Self {
        Self {
            should_continue,
            alpha,
        }
    }
}
