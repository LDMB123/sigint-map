use crate::types::{
    ChargeForceConfig, CenterForceConfig, CollisionForceConfig, ForceNode,
    LinkForceConfig, WasmForceLink,
};
use crate::quadtree::{QuadTree, QuadTreeNode};

/// Apply center force - pulls nodes toward a center point
pub fn apply_center_force(nodes: &mut [ForceNode], config: &CenterForceConfig) {
    if nodes.is_empty() || config.strength == 0.0 {
        return;
    }

    // Calculate center of mass
    let mut sx = 0.0;
    let mut sy = 0.0;
    let mut count = 0;

    for node in nodes.iter() {
        sx += node.x;
        sy += node.y;
        count += 1;
    }

    if count == 0 {
        return;
    }

    // Calculate offset from desired center
    sx = sx / count as f64 - config.x;
    sy = sy / count as f64 - config.y;

    // Apply correction force scaled by strength
    sx *= config.strength;
    sy *= config.strength;

    // Move all nodes toward center
    for node in nodes.iter_mut() {
        node.vx -= sx;
        node.vy -= sy;
    }
}

/// Apply charge/many-body force using Barnes-Hut quadtree
pub fn apply_charge_force(
    nodes: &mut [ForceNode],
    config: &ChargeForceConfig,
    alpha: f64,
    quadtree: &QuadTree,
) {
    if config.strength == 0.0 || alpha == 0.0 {
        return;
    }

    let strength_alpha = config.strength * alpha;
    let theta2 = config.theta * config.theta;
    let distance_min2 = config.distance_min * config.distance_min;
    let distance_max2 = config.distance_max * config.distance_max;

    for i in 0..nodes.len() {
        let node = &nodes[i];
        let x = node.x;
        let y = node.y;

        // Calculate force from quadtree
        let (fx, fy) = accumulate_force(
            &quadtree.root,
            x,
            y,
            strength_alpha,
            theta2,
            distance_min2,
            distance_max2,
        );

        // Apply to velocity
        nodes[i].vx += fx;
        nodes[i].vy += fy;
    }
}

/// Recursively accumulate force from quadtree nodes
fn accumulate_force(
    quad_node: &Option<QuadTreeNode>,
    x: f64,
    y: f64,
    strength_alpha: f64,
    theta2: f64,
    distance_min2: f64,
    distance_max2: f64,
) -> (f64, f64) {
    let quad_node = match quad_node {
        Some(node) => node,
        None => return (0.0, 0.0),
    };

    let mut fx = 0.0;
    let mut fy = 0.0;

    // Distance from point to quad center of mass
    let dx = quad_node.center_of_mass_x - x;
    let dy = quad_node.center_of_mass_y - y;
    let dist2 = dx * dx + dy * dy;

    // Width of this quad
    let width = quad_node.bounds.half_size * 2.0;

    // If this is a leaf node with data, or if quad is far enough away
    if quad_node.is_leaf() || width * width / theta2 < dist2 {
        // Treat as single body
        if dist2 < distance_max2 {
            // Clamp distance to minimum
            let dist2_clamped = if dist2 < distance_min2 {
                (dist2 * distance_min2).sqrt()
            } else {
                dist2
            };

            if dist2_clamped > 0.0 {
                // Force calculation: F = strength / distance^2
                let force = strength_alpha * quad_node.mass / dist2_clamped;
                fx += dx * force;
                fy += dy * force;
            }
        }
    } else {
        // Recursively process children
        if let Some(ref children) = quad_node.children {
            for child in children.iter() {
                let (cfx, cfy) = accumulate_force(
                    child,
                    x,
                    y,
                    strength_alpha,
                    theta2,
                    distance_min2,
                    distance_max2,
                );
                fx += cfx;
                fy += cfy;
            }
        }
    }

    (fx, fy)
}

/// Apply charge force with O(n²) pairwise calculation (fallback/small datasets)
pub fn apply_charge_force_direct(
    nodes: &mut [ForceNode],
    config: &ChargeForceConfig,
    alpha: f64,
) {
    if config.strength == 0.0 || alpha == 0.0 {
        return;
    }

    let strength_alpha = config.strength * alpha;
    let distance_min2 = config.distance_min * config.distance_min;
    let distance_max2 = config.distance_max * config.distance_max;

    let n = nodes.len();

    // Calculate forces for all pairs
    for i in 0..n {
        let mut fx = 0.0;
        let mut fy = 0.0;

        let xi = nodes[i].x;
        let yi = nodes[i].y;

        for j in 0..n {
            if i == j {
                continue;
            }

            let dx = nodes[j].x - xi;
            let dy = nodes[j].y - yi;
            let mut dist2 = dx * dx + dy * dy;

            // Apply distance constraints
            if dist2 < distance_min2 {
                dist2 = (dist2 * distance_min2).sqrt();
            }
            if dist2 > distance_max2 {
                continue;
            }

            if dist2 > 0.0 {
                let force = strength_alpha / dist2;
                fx += dx * force;
                fy += dy * force;
            }
        }

        nodes[i].vx += fx;
        nodes[i].vy += fy;
    }
}

/// Apply link/spring force between connected nodes
pub fn apply_link_force(
    nodes: &mut [ForceNode],
    links: &[WasmForceLink],
    config: &LinkForceConfig,
    alpha: f64,
) {
    if links.is_empty() || alpha == 0.0 {
        return;
    }

    let distance_min2 = config.distance_min * config.distance_min;
    let distance_max2 = config.distance_max * config.distance_max;

    // Calculate link forces
    for link in links.iter() {
        let source_idx = link.source_idx;
        let target_idx = link.target_idx;

        if source_idx >= nodes.len() || target_idx >= nodes.len() {
            continue;
        }

        // Get positions
        let sx = nodes[source_idx].x;
        let sy = nodes[source_idx].y;
        let tx = nodes[target_idx].x;
        let ty = nodes[target_idx].y;

        // Calculate distance
        let mut dx = tx - sx;
        let mut dy = ty - sy;
        let mut dist2 = dx * dx + dy * dy;

        // Clamp distance
        if dist2 < distance_min2 {
            dist2 = (dist2 * distance_min2).sqrt();
        }
        if dist2 > distance_max2 {
            dist2 = distance_max2;
        }

        if dist2 == 0.0 {
            continue;
        }

        let dist = dist2.sqrt();

        // Normalize direction
        dx /= dist;
        dy /= dist;

        // Calculate spring force: (distance - target_distance) * strength
        let force = (dist - link.distance) * link.strength * alpha;

        // Apply force proportional to mass (bias = 0.5 for equal distribution)
        let bias_source = 0.5;
        let bias_target = 0.5;

        dx *= force;
        dy *= force;

        // Update velocities
        nodes[target_idx].vx -= dx * bias_target;
        nodes[target_idx].vy -= dy * bias_target;
        nodes[source_idx].vx += dx * bias_source;
        nodes[source_idx].vy += dy * bias_source;
    }
}

/// Apply collision force to prevent node overlap
pub fn apply_collision_force(nodes: &mut [ForceNode], config: &CollisionForceConfig) {
    if config.strength == 0.0 {
        return;
    }

    let n = nodes.len();
    let iterations = config.iterations.max(1);

    // Run multiple iterations for better convergence
    for _ in 0..iterations {
        // Check all pairs for collisions
        for i in 0..n {
            let radius_i = nodes[i].radius;
            let xi = nodes[i].x + nodes[i].vx;
            let yi = nodes[i].y + nodes[i].vy;

            for j in (i + 1)..n {
                let radius_j = nodes[j].radius;
                let xj = nodes[j].x + nodes[j].vx;
                let yj = nodes[j].y + nodes[j].vy;

                // Calculate distance between nodes
                let dx = xj - xi;
                let dy = yj - yi;
                let dist2 = dx * dx + dy * dy;

                // Check if nodes overlap
                let min_distance = radius_i + radius_j;
                let min_dist2 = min_distance * min_distance;

                if dist2 < min_dist2 && dist2 > 0.0 {
                    let dist = dist2.sqrt();
                    let overlap = (min_distance - dist) / dist * config.strength;

                    // Separate nodes proportional to their radii
                    let weight_i = radius_j / (radius_i + radius_j);
                    let weight_j = radius_i / (radius_i + radius_j);

                    let fx = dx * overlap;
                    let fy = dy * overlap;

                    nodes[i].vx -= fx * weight_i;
                    nodes[i].vy -= fy * weight_i;
                    nodes[j].vx += fx * weight_j;
                    nodes[j].vy += fy * weight_j;
                }
            }
        }
    }
}

/// Integrate velocities and positions (Verlet-like)
pub fn integrate_positions(nodes: &mut [ForceNode], velocity_decay: f64) {
    for node in nodes.iter_mut() {
        // Apply velocity decay (damping)
        node.vx *= velocity_decay;
        node.vy *= velocity_decay;

        // Update positions from velocities, unless fixed
        if node.fx.is_nan() {
            node.x += node.vx;
        } else {
            node.x = node.fx;
            node.vx = 0.0;
        }

        if node.fy.is_nan() {
            node.y += node.vy;
        } else {
            node.y = node.fy;
            node.vy = 0.0;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_node(x: f64, y: f64) -> ForceNode {
        ForceNode {
            id: String::new(),
            x,
            y,
            vx: 0.0,
            vy: 0.0,
            fx: f64::NAN,
            fy: f64::NAN,
            radius: 1.0,
            mass: 1.0,
        }
    }

    #[test]
    fn test_center_force() {
        let mut nodes = vec![
            create_test_node(10.0, 10.0),
            create_test_node(-10.0, -10.0),
        ];

        let config = CenterForceConfig {
            x: 0.0,
            y: 0.0,
            strength: 0.1,
        };

        apply_center_force(&mut nodes, &config);

        // Center of mass is at (0, 0), which is already at the target
        // So no force should be applied
        // Actually, both nodes move by the same amount in the same direction
        // to move the center of mass toward the target
        assert_eq!(nodes[0].vx, nodes[1].vx, "Both nodes should move the same in x");
        assert_eq!(nodes[0].vy, nodes[1].vy, "Both nodes should move the same in y");
        
        // Since center of mass is already at (0,0), no movement
        assert_eq!(nodes[0].vx, 0.0);
        assert_eq!(nodes[0].vy, 0.0);
    }
    
    #[test]
    fn test_center_force_off_center() {
        let mut nodes = vec![
            create_test_node(10.0, 10.0),
            create_test_node(20.0, 20.0),
        ];

        let config = CenterForceConfig {
            x: 0.0,
            y: 0.0,
            strength: 0.1,
        };

        apply_center_force(&mut nodes, &config);

        // Center of mass is at (15, 15), target is (0, 0)
        // Offset is 15, 15 scaled by 0.1 = 1.5, 1.5
        // All nodes should move by -1.5, -1.5
        assert!(nodes[0].vx < 0.0, "Nodes should move left toward center");
        assert!(nodes[0].vy < 0.0, "Nodes should move down toward center");
        assert_eq!(nodes[0].vx, nodes[1].vx, "Both nodes should move the same");
        assert_eq!(nodes[0].vy, nodes[1].vy, "Both nodes should move the same");
    }

    #[test]
    fn test_center_force_zero_strength() {
        let mut nodes = vec![create_test_node(10.0, 10.0)];

        let config = CenterForceConfig {
            x: 0.0,
            y: 0.0,
            strength: 0.0,
        };

        apply_center_force(&mut nodes, &config);

        // No force should be applied
        assert_eq!(nodes[0].vx, 0.0);
        assert_eq!(nodes[0].vy, 0.0);
    }

    #[test]
    fn test_charge_force_direct() {
        let mut nodes = vec![
            create_test_node(0.0, 0.0),
            create_test_node(10.0, 0.0),
        ];

        let config = ChargeForceConfig {
            strength: -30.0, // Negative = repulsion
            theta: 0.9,
            distance_min: 1.0,
            distance_max: f64::INFINITY,
        };

        apply_charge_force_direct(&mut nodes, &config, 1.0);

        // Nodes should repel each other
        assert!(nodes[0].vx < 0.0, "Node 1 should move left (repulsion)");
        assert_eq!(nodes[0].vy, 0.0, "No y-component in horizontal setup");
        assert!(nodes[1].vx > 0.0, "Node 2 should move right (repulsion)");
        assert_eq!(nodes[1].vy, 0.0, "No y-component in horizontal setup");
    }

    #[test]
    fn test_charge_force_attraction() {
        let mut nodes = vec![
            create_test_node(0.0, 0.0),
            create_test_node(10.0, 0.0),
        ];

        let config = ChargeForceConfig {
            strength: 30.0, // Positive = attraction
            theta: 0.9,
            distance_min: 1.0,
            distance_max: f64::INFINITY,
        };

        apply_charge_force_direct(&mut nodes, &config, 1.0);

        // Nodes should attract each other
        assert!(nodes[0].vx > 0.0, "Node 1 should move right (attraction)");
        assert!(nodes[1].vx < 0.0, "Node 2 should move left (attraction)");
    }

    #[test]
    fn test_charge_force_distance_max() {
        let mut nodes = vec![
            create_test_node(0.0, 0.0),
            create_test_node(100.0, 0.0), // Far apart
        ];

        let config = ChargeForceConfig {
            strength: -30.0,
            theta: 0.9,
            distance_min: 1.0,
            distance_max: 50.0, // Max distance less than separation
        };

        apply_charge_force_direct(&mut nodes, &config, 1.0);

        // No force should be applied (beyond max distance)
        assert_eq!(nodes[0].vx, 0.0);
        assert_eq!(nodes[0].vy, 0.0);
        assert_eq!(nodes[1].vx, 0.0);
        assert_eq!(nodes[1].vy, 0.0);
    }

    #[test]
    fn test_link_force() {
        let mut nodes = vec![
            create_test_node(0.0, 0.0),
            create_test_node(20.0, 0.0),
        ];

        let mut link = WasmForceLink::new(0, 1);
        link.distance = 10.0;
        link.strength = 0.5;
        let links = vec![link];

        let config = LinkForceConfig {
            iterations: 1,
            strength: 1.0,
            distance: 30.0,
            distance_min: 1.0,
            distance_max: f64::INFINITY,
        };

        apply_link_force(&mut nodes, &links, &config, 1.0);

        // Nodes should move toward desired distance
        // Current distance is 20, desired is 10
        // Node 0 should move right, node 1 should move left
        assert!(nodes[0].vx > 0.0, "Source should move right");
        assert!(nodes[1].vx < 0.0, "Target should move left");
    }

    #[test]
    fn test_link_force_bias() {
        let mut nodes = vec![
            create_test_node(0.0, 0.0),
            create_test_node(20.0, 0.0),
        ];

        let mut link = WasmForceLink::new(0, 1);
        link.distance = 10.0;
        link.strength = 0.5;
        let links = vec![link];

        let config = LinkForceConfig {
            iterations: 1,
            strength: 1.0,
            distance: 30.0,
            distance_min: 1.0,
            distance_max: f64::INFINITY,
        };

        apply_link_force(&mut nodes, &links, &config, 1.0);

        // With equal bias (0.5/0.5), both nodes should move equally
        let source_movement = nodes[0].vx.abs();
        let target_movement = nodes[1].vx.abs();
        assert!(
            (source_movement - target_movement).abs() < 0.001,
            "Both nodes should move equally with default bias"
        );
    }

    #[test]
    fn test_collision_force() {
        let mut nodes = vec![
            ForceNode {
                id: String::new(),
                x: 0.0,
                y: 0.0,
                vx: 0.0,
                vy: 0.0,
                fx: f64::NAN,
                fy: f64::NAN,
                radius: 5.0,
                mass: 1.0,
            },
            ForceNode {
                id: String::new(),
                x: 8.0, // Overlapping (distance 8 < 5 + 5)
                y: 0.0,
                vx: 0.0,
                vy: 0.0,
                fx: f64::NAN,
                fy: f64::NAN,
                radius: 5.0,
                mass: 1.0,
            },
        ];

        let config = CollisionForceConfig {
            radius: 5.0,
            strength: 1.0,
            iterations: 1,
        };

        apply_collision_force(&mut nodes, &config);

        // Nodes should separate
        assert!(nodes[0].vx < 0.0, "Node 1 should move left");
        assert!(nodes[1].vx > 0.0, "Node 2 should move right");
    }

    #[test]
    fn test_collision_force_no_overlap() {
        let mut nodes = vec![
            ForceNode {
                id: String::new(),
                x: 0.0,
                y: 0.0,
                vx: 0.0,
                vy: 0.0,
                fx: f64::NAN,
                fy: f64::NAN,
                radius: 5.0,
                mass: 1.0,
            },
            ForceNode {
                id: String::new(),
                x: 20.0, // Not overlapping
                y: 0.0,
                vx: 0.0,
                vy: 0.0,
                fx: f64::NAN,
                fy: f64::NAN,
                radius: 5.0,
                mass: 1.0,
            },
        ];

        let config = CollisionForceConfig {
            radius: 5.0,
            strength: 1.0,
            iterations: 1,
        };

        apply_collision_force(&mut nodes, &config);

        // No force should be applied
        assert_eq!(nodes[0].vx, 0.0);
        assert_eq!(nodes[0].vy, 0.0);
        assert_eq!(nodes[1].vx, 0.0);
        assert_eq!(nodes[1].vy, 0.0);
    }

    #[test]
    fn test_integrate_positions() {
        let mut nodes = vec![ForceNode {
            id: String::new(),
            x: 0.0,
            y: 0.0,
            vx: 10.0,
            vy: 10.0,
            fx: f64::NAN,
            fy: f64::NAN,
            radius: 1.0,
            mass: 1.0,
        }];

        integrate_positions(&mut nodes, 0.6);

        // Velocity should decay
        assert_eq!(nodes[0].vx, 6.0, "Velocity should be decayed to 60%");
        assert_eq!(nodes[0].vy, 6.0, "Velocity should be decayed to 60%");

        // Position should be updated
        assert_eq!(nodes[0].x, 6.0, "Position should update by velocity");
        assert_eq!(nodes[0].y, 6.0, "Position should update by velocity");
    }

    #[test]
    fn test_integrate_positions_fixed() {
        let mut nodes = vec![ForceNode {
            id: String::new(),
            x: 0.0,
            y: 0.0,
            vx: 10.0,
            vy: 10.0,
            fx: 5.0, // Fixed x position
            fy: f64::NAN,
            radius: 1.0,
            mass: 1.0,
        }];

        integrate_positions(&mut nodes, 0.6);

        // X should be fixed, velocity zeroed
        assert_eq!(nodes[0].x, 5.0, "X position should be fixed");
        assert_eq!(nodes[0].vx, 0.0, "X velocity should be zeroed");

        // Y should move normally
        assert_eq!(nodes[0].y, 6.0, "Y position should update");
        assert_eq!(nodes[0].vy, 6.0, "Y velocity should decay");
    }

    #[test]
    fn test_integrate_positions_fully_fixed() {
        let mut nodes = vec![ForceNode {
            id: String::new(),
            x: 0.0,
            y: 0.0,
            vx: 10.0,
            vy: 10.0,
            fx: 5.0,
            fy: 7.0,
            radius: 1.0,
            mass: 1.0,
        }];

        integrate_positions(&mut nodes, 0.6);

        // Both axes should be fixed
        assert_eq!(nodes[0].x, 5.0);
        assert_eq!(nodes[0].y, 7.0);
        assert_eq!(nodes[0].vx, 0.0);
        assert_eq!(nodes[0].vy, 0.0);
    }

    #[test]
    fn test_link_force_distance_clamping() {
        let mut nodes = vec![
            create_test_node(0.0, 0.0),
            create_test_node(0.5, 0.0), // Very close
        ];

        let mut link = WasmForceLink::new(0, 1);
        link.distance = 10.0;
        link.strength = 0.5;
        let links = vec![link];

        let config = LinkForceConfig {
            iterations: 1,
            strength: 1.0,
            distance: 30.0,
            distance_min: 1.0, // Minimum distance
            distance_max: f64::INFINITY,
        };

        apply_link_force(&mut nodes, &links, &config, 1.0);

        // Should not blow up with very small distances
        assert!(nodes[0].vx.is_finite());
        assert!(nodes[0].vy.is_finite());
        assert!(nodes[1].vx.is_finite());
        assert!(nodes[1].vy.is_finite());
    }

    #[test]
    fn test_charge_force_alpha_modulation() {
        let mut nodes = vec![
            create_test_node(0.0, 0.0),
            create_test_node(10.0, 0.0),
        ];

        let config = ChargeForceConfig {
            strength: -30.0,
            theta: 0.9,
            distance_min: 1.0,
            distance_max: f64::INFINITY,
        };

        // Apply with alpha = 0.5
        apply_charge_force_direct(&mut nodes, &config, 0.5);
        let vx_half = nodes[0].vx;

        // Reset
        nodes[0].vx = 0.0;
        nodes[1].vx = 0.0;

        // Apply with alpha = 1.0
        apply_charge_force_direct(&mut nodes, &config, 1.0);
        let vx_full = nodes[0].vx;

        // Force should be proportional to alpha
        assert!(
            (vx_full / vx_half - 2.0).abs() < 0.001,
            "Force should double when alpha doubles"
        );
    }

    #[test]
    fn test_collision_iterations() {
        let mut nodes = vec![
            ForceNode {
                id: String::new(),
                x: 0.0,
                y: 0.0,
                vx: 0.0,
                vy: 0.0,
                fx: f64::NAN,
                fy: f64::NAN,
                radius: 5.0,
                mass: 1.0,
            },
            ForceNode {
                id: String::new(),
                x: 8.0,
                y: 0.0,
                vx: 0.0,
                vy: 0.0,
                fx: f64::NAN,
                fy: f64::NAN,
                radius: 5.0,
                mass: 1.0,
            },
        ];

        let config_single = CollisionForceConfig {
            radius: 5.0,
            strength: 0.7,
            iterations: 1,
        };

        apply_collision_force(&mut nodes, &config_single);
        let separation_single = (nodes[1].vx - nodes[0].vx).abs();

        // Reset
        nodes[0].vx = 0.0;
        nodes[1].vx = 0.0;

        let config_multiple = CollisionForceConfig {
            radius: 5.0,
            strength: 0.7,
            iterations: 3,
        };

        apply_collision_force(&mut nodes, &config_multiple);
        let separation_multiple = (nodes[1].vx - nodes[0].vx).abs();

        // More iterations should give stronger separation
        assert!(
            separation_multiple > separation_single,
            "More iterations should increase separation"
        );
    }
}
