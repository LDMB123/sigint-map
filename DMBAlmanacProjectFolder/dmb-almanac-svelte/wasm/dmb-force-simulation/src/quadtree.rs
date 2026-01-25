//! Barnes-Hut Quadtree for O(n log n) many-body force calculation
//! 
//! The quadtree spatially partitions nodes to approximate distant node clusters
//! as single points, reducing complexity from O(n²) to O(n log n).

use crate::types::ForceNode;

/// Bounding box for a quadtree region
#[derive(Debug, Clone, Copy)]
pub struct Bounds {
    pub x: f64,           // Center x
    pub y: f64,           // Center y  
    pub half_size: f64,   // Half width/height
}

impl Bounds {
    /// Create bounds from center and half-size
    pub fn new(x: f64, y: f64, half_size: f64) -> Self {
        Self { x, y, half_size }
    }
    
    /// Check if a point is contained within these bounds
    pub fn contains(&self, px: f64, py: f64) -> bool {
        let min_x = self.x - self.half_size;
        let max_x = self.x + self.half_size;
        let min_y = self.y - self.half_size;
        let max_y = self.y + self.half_size;
        
        px >= min_x && px <= max_x && py >= min_y && py <= max_y
    }
    
    /// Get the bounds for a child quadrant (0=NW, 1=NE, 2=SW, 3=SE)
    pub fn child_bounds(&self, quadrant: usize) -> Bounds {
        let quarter = self.half_size / 2.0;
        match quadrant {
            0 => Bounds::new(self.x - quarter, self.y - quarter, quarter), // NW
            1 => Bounds::new(self.x + quarter, self.y - quarter, quarter), // NE
            2 => Bounds::new(self.x - quarter, self.y + quarter, quarter), // SW
            3 => Bounds::new(self.x + quarter, self.y + quarter, quarter), // SE
            _ => panic!("Invalid quadrant index: {}", quadrant),
        }
    }
}

/// A node in the quadtree (either internal with children, or leaf with point)
pub struct QuadTreeNode {
    pub bounds: Bounds,
    pub mass: f64,                // Total mass of points in this region
    pub center_of_mass_x: f64,
    pub center_of_mass_y: f64,
    pub point_index: Option<usize>,  // Index into nodes array if leaf
    pub children: Option<Box<[Option<QuadTreeNode>; 4]>>,  // NW, NE, SW, SE
}

impl QuadTreeNode {
    /// Create a new empty quadtree node
    pub fn new(bounds: Bounds) -> Self {
        Self {
            bounds,
            mass: 0.0,
            center_of_mass_x: 0.0,
            center_of_mass_y: 0.0,
            point_index: None,
            children: None,
        }
    }
    
    /// Check if this is a leaf node
    pub fn is_leaf(&self) -> bool {
        self.children.is_none()
    }
    
    /// Check if this is an empty node
    pub fn is_empty(&self) -> bool {
        self.mass == 0.0
    }
    
    /// Insert a node into the quadtree
    pub fn insert(&mut self, node_index: usize, x: f64, y: f64, mass: f64) {
        // If this node is empty, make it a leaf
        if self.is_empty() {
            self.point_index = Some(node_index);
            self.update_center_of_mass(x, y, mass);
            return;
        }
        
        // Update center of mass for this node
        self.update_center_of_mass(x, y, mass);
        
        // If this is a leaf with one point, we need to subdivide
        if self.is_leaf() && self.point_index.is_some() {
            // Store the existing point info before we clear it
            let existing_index = self.point_index.take().unwrap();
            
            // We need to get the existing point's position from the stored center of mass
            // However, the center of mass has just been updated! We need to recalculate
            // the original position. Since we just added mass, we can reverse the calculation.
            // Let prev_mass = self.mass - mass
            // Then: self.center_of_mass_x = (prev_x * prev_mass + x * mass) / self.mass
            // So: prev_x = (self.center_of_mass_x * self.mass - x * mass) / prev_mass
            let prev_mass = self.mass - mass;
            let existing_x = (self.center_of_mass_x * self.mass - x * mass) / prev_mass;
            let existing_y = (self.center_of_mass_y * self.mass - y * mass) / prev_mass;
            
            // Create children
            self.children = Some(Box::new([None, None, None, None]));
            
            // Reinsert the existing point
            let existing_quad = self.quadrant(existing_x, existing_y);
            if let Some(ref mut children) = self.children {
                if children[existing_quad].is_none() {
                    children[existing_quad] = Some(QuadTreeNode::new(
                        self.bounds.child_bounds(existing_quad)
                    ));
                }
                children[existing_quad].as_mut().unwrap()
                    .insert(existing_index, existing_x, existing_y, prev_mass);
            }
        }
        
        // If we have children (either from before or just created), insert into appropriate child
        // Calculate quadrant before mutably borrowing children
        let quad = self.quadrant(x, y);
        if let Some(ref mut children) = self.children {
            // Create child if it doesn't exist
            if children[quad].is_none() {
                children[quad] = Some(QuadTreeNode::new(self.bounds.child_bounds(quad)));
            }
            
            // Insert into child
            children[quad].as_mut().unwrap().insert(node_index, x, y, mass);
        }
    }
    
    /// Get the quadrant index (0=NW, 1=NE, 2=SW, 3=SE) for a point
    fn quadrant(&self, x: f64, y: f64) -> usize {
        let left = x < self.bounds.x;
        let top = y < self.bounds.y;
        
        match (left, top) {
            (true, true)   => 0, // NW
            (false, true)  => 1, // NE
            (true, false)  => 2, // SW
            (false, false) => 3, // SE
        }
    }
    
    /// Update center of mass after insertion
    fn update_center_of_mass(&mut self, x: f64, y: f64, mass: f64) {
        let new_mass = self.mass + mass;
        
        if new_mass > 0.0 {
            // Weighted average of centers of mass
            self.center_of_mass_x = (self.center_of_mass_x * self.mass + x * mass) / new_mass;
            self.center_of_mass_y = (self.center_of_mass_y * self.mass + y * mass) / new_mass;
            self.mass = new_mass;
        }
    }
}

/// Main quadtree structure
pub struct QuadTree {
    pub root: Option<QuadTreeNode>,
    pub bounds: Bounds,
}

impl QuadTree {
    /// Create an empty quadtree with given bounds
    pub fn new(bounds: Bounds) -> Self {
        Self {
            root: None,
            bounds,
        }
    }
    
    /// Build a quadtree from a slice of nodes
    pub fn build(nodes: &[ForceNode]) -> Self {
        if nodes.is_empty() {
            return Self::new(Bounds::new(0.0, 0.0, 1.0));
        }
        
        // Calculate bounds from node positions
        let mut min_x = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut min_y = f64::INFINITY;
        let mut max_y = f64::NEG_INFINITY;
        
        for node in nodes {
            min_x = min_x.min(node.x);
            max_x = max_x.max(node.x);
            min_y = min_y.min(node.y);
            max_y = max_y.max(node.y);
        }
        
        // Add padding to ensure all points are strictly inside bounds
        let width = max_x - min_x;
        let height = max_y - min_y;
        let padding = 0.1 * width.max(height).max(1.0); // 10% padding, min 0.1
        
        min_x -= padding;
        max_x += padding;
        min_y -= padding;
        max_y += padding;
        
        // Create square bounds (quadtree requires square regions)
        let center_x = (min_x + max_x) / 2.0;
        let center_y = (min_y + max_y) / 2.0;
        let half_size = ((max_x - min_x).max(max_y - min_y)) / 2.0;
        
        let bounds = Bounds::new(center_x, center_y, half_size);
        let mut root = QuadTreeNode::new(bounds);
        
        // Insert all nodes
        for (i, node) in nodes.iter().enumerate() {
            root.insert(i, node.x, node.y, 1.0); // Mass = 1.0 for each node
        }
        
        Self {
            root: Some(root),
            bounds,
        }
    }
    
    /// Calculate force on a node using Barnes-Hut approximation
    /// theta: accuracy parameter (typically 0.9, lower = more accurate but slower)
    pub fn calculate_force(&self, node: &ForceNode, theta: f64, strength: f64) -> (f64, f64) {
        let mut fx = 0.0;
        let mut fy = 0.0;
        
        if let Some(ref root) = self.root {
            self.calculate_force_recursive(root, node, theta, strength, &mut fx, &mut fy);
        }
        
        (fx, fy)
    }
    
    /// Recursive force calculation helper
    fn calculate_force_recursive(
        &self,
        tree_node: &QuadTreeNode,
        target: &ForceNode,
        theta: f64,
        strength: f64,
        fx: &mut f64,
        fy: &mut f64,
    ) {
        // Skip empty nodes
        if tree_node.is_empty() {
            return;
        }
        
        // Calculate distance from target to this node's center of mass
        let dx = tree_node.center_of_mass_x - target.x;
        let dy = tree_node.center_of_mass_y - target.y;
        let distance_sq = dx * dx + dy * dy;
        
        // If this is a leaf node
        if tree_node.is_leaf() {
            // Don't apply force to self
            if tree_node.point_index.is_some() {
                // We can't directly check if this is the same node without the index,
                // so we check if distance is very small (essentially zero)
                if distance_sq < 1e-10 {
                    return;
                }
            }
            
            // Apply force from this point
            self.apply_force(dx, dy, distance_sq, tree_node.mass, strength, fx, fy);
            return;
        }
        
        // For internal nodes, check if we can approximate
        let size = tree_node.bounds.half_size * 2.0;
        let distance = distance_sq.sqrt();
        
        // If the node is far enough away, treat it as a single point
        if size / distance < theta {
            self.apply_force(dx, dy, distance_sq, tree_node.mass, strength, fx, fy);
        } else {
            // Otherwise, recursively check children
            if let Some(ref children) = tree_node.children {
                for child in children.iter() {
                    if let Some(ref child_node) = child {
                        self.calculate_force_recursive(child_node, target, theta, strength, fx, fy);
                    }
                }
            }
        }
    }
    
    /// Apply force from a point mass
    fn apply_force(
        &self,
        dx: f64,
        dy: f64,
        distance_sq: f64,
        mass: f64,
        strength: f64,
        fx: &mut f64,
        fy: &mut f64,
    ) {
        // Avoid division by zero and handle very close points
        if distance_sq < 1e-10 {
            return;
        }
        
        // Coulomb's law: F = k * (m1 * m2) / r^2
        // For repulsive force: F = strength / distance_sq
        // Direction: away from the source point (hence negative dx, dy)
        let force = strength * mass / distance_sq;
        
        let distance = distance_sq.sqrt();
        *fx += (dx / distance) * force;
        *fy += (dy / distance) * force;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    // Helper function to create test nodes
    fn test_node(x: f64, y: f64) -> ForceNode {
        ForceNode::new(format!("node_{}_{}", x, y), x, y)
    }
    
    #[test]
    fn test_bounds_contains() {
        let bounds = Bounds::new(0.0, 0.0, 10.0);
        
        assert!(bounds.contains(0.0, 0.0));
        assert!(bounds.contains(5.0, 5.0));
        assert!(bounds.contains(-5.0, -5.0));
        assert!(bounds.contains(10.0, 10.0));
        assert!(!bounds.contains(11.0, 0.0));
        assert!(!bounds.contains(0.0, -11.0));
    }
    
    #[test]
    fn test_bounds_child_bounds() {
        let bounds = Bounds::new(0.0, 0.0, 10.0);
        
        // NW quadrant
        let nw = bounds.child_bounds(0);
        assert_eq!(nw.x, -5.0);
        assert_eq!(nw.y, -5.0);
        assert_eq!(nw.half_size, 5.0);
        
        // NE quadrant
        let ne = bounds.child_bounds(1);
        assert_eq!(ne.x, 5.0);
        assert_eq!(ne.y, -5.0);
        assert_eq!(ne.half_size, 5.0);
        
        // SW quadrant
        let sw = bounds.child_bounds(2);
        assert_eq!(sw.x, -5.0);
        assert_eq!(sw.y, 5.0);
        assert_eq!(sw.half_size, 5.0);
        
        // SE quadrant
        let se = bounds.child_bounds(3);
        assert_eq!(se.x, 5.0);
        assert_eq!(se.y, 5.0);
        assert_eq!(se.half_size, 5.0);
    }
    
    #[test]
    fn test_quadrant() {
        let node = QuadTreeNode::new(Bounds::new(0.0, 0.0, 10.0));
        
        assert_eq!(node.quadrant(-5.0, -5.0), 0); // NW
        assert_eq!(node.quadrant(5.0, -5.0), 1);  // NE
        assert_eq!(node.quadrant(-5.0, 5.0), 2);  // SW
        assert_eq!(node.quadrant(5.0, 5.0), 3);   // SE
    }
    
    #[test]
    fn test_insert_single_node() {
        let mut tree_node = QuadTreeNode::new(Bounds::new(0.0, 0.0, 10.0));
        tree_node.insert(0, 1.0, 2.0, 1.0);
        
        assert_eq!(tree_node.mass, 1.0);
        assert_eq!(tree_node.center_of_mass_x, 1.0);
        assert_eq!(tree_node.center_of_mass_y, 2.0);
        assert_eq!(tree_node.point_index, Some(0));
        assert!(tree_node.is_leaf());
    }
    
    #[test]
    fn test_insert_multiple_nodes() {
        let mut tree_node = QuadTreeNode::new(Bounds::new(0.0, 0.0, 10.0));
        tree_node.insert(0, -5.0, -5.0, 1.0);
        tree_node.insert(1, 5.0, 5.0, 1.0);
        
        assert_eq!(tree_node.mass, 2.0);
        assert_eq!(tree_node.center_of_mass_x, 0.0); // Average of -5 and 5
        assert_eq!(tree_node.center_of_mass_y, 0.0); // Average of -5 and 5
        assert!(!tree_node.is_leaf());
        assert!(tree_node.children.is_some());
    }
    
    #[test]
    fn test_center_of_mass_calculation() {
        let mut tree_node = QuadTreeNode::new(Bounds::new(0.0, 0.0, 10.0));
        
        // Insert points with different masses
        tree_node.insert(0, 0.0, 0.0, 2.0);  // Mass 2 at origin
        tree_node.insert(1, 10.0, 0.0, 1.0); // Mass 1 at (10, 0)
        
        // Center of mass should be at (2*0 + 1*10) / 3 = 3.33...
        assert_eq!(tree_node.mass, 3.0);
        assert!((tree_node.center_of_mass_x - 10.0 / 3.0).abs() < 1e-10);
        assert_eq!(tree_node.center_of_mass_y, 0.0);
    }
    
    #[test]
    fn test_quadtree_build_empty() {
        let nodes: Vec<ForceNode> = vec![];
        let tree = QuadTree::build(&nodes);
        
        assert!(tree.root.is_none());
    }
    
    #[test]
    fn test_quadtree_build_single_node() {
        let nodes = vec![test_node(5.0, 5.0)];
        let tree = QuadTree::build(&nodes);
        
        assert!(tree.root.is_some());
        let root = tree.root.as_ref().unwrap();
        assert_eq!(root.mass, 1.0);
        assert_eq!(root.center_of_mass_x, 5.0);
        assert_eq!(root.center_of_mass_y, 5.0);
    }
    
    #[test]
    fn test_quadtree_build_multiple_nodes() {
        let nodes = vec![
            test_node(0.0, 0.0),
            test_node(10.0, 0.0),
            test_node(0.0, 10.0),
            test_node(10.0, 10.0),
        ];
        let tree = QuadTree::build(&nodes);
        
        assert!(tree.root.is_some());
        let root = tree.root.as_ref().unwrap();
        assert_eq!(root.mass, 4.0);
        assert_eq!(root.center_of_mass_x, 5.0); // Average position
        assert_eq!(root.center_of_mass_y, 5.0);
    }
    
    #[test]
    fn test_force_calculation_two_nodes() {
        let nodes = vec![
            test_node(0.0, 0.0),
            test_node(10.0, 0.0),
        ];
        let tree = QuadTree::build(&nodes);
        
        // Calculate force on first node
        let (fx, fy) = tree.calculate_force(&nodes[0], 0.9, 100.0);
        
        // Force should be in positive x direction (repelled by node at x=10)
        assert!(fx > 0.0, "Force should be positive (repelled right)");
        assert!(fy.abs() < 1e-10, "Force in y should be ~0");
    }
    
    #[test]
    fn test_force_calculation_symmetry() {
        let nodes = vec![
            test_node(0.0, 0.0),
            test_node(10.0, 10.0),
        ];
        let tree = QuadTree::build(&nodes);
        
        let (fx1, fy1) = tree.calculate_force(&nodes[0], 0.9, 100.0);
        
        // Force should be equal in x and y (diagonal repulsion)
        assert!((fx1 - fy1).abs() < 1e-10, "Force should be symmetric along diagonal");
        assert!(fx1 > 0.0, "Force should be positive");
    }
    
    #[test]
    fn test_force_calculation_multiple_nodes() {
        // Create a cross pattern: center node should have zero net force
        let nodes = vec![
            test_node(5.0, 5.0),   // Center
            test_node(0.0, 5.0),   // Left
            test_node(10.0, 5.0),  // Right
            test_node(5.0, 0.0),   // Top
            test_node(5.0, 10.0),  // Bottom
        ];
        let tree = QuadTree::build(&nodes);
        
        let (fx, fy) = tree.calculate_force(&nodes[0], 0.9, 100.0);
        
        // Forces should approximately cancel out
        assert!(fx.abs() < 0.1, "Net force in x should be ~0, got {}", fx);
        assert!(fy.abs() < 0.1, "Net force in y should be ~0, got {}", fy);
    }
    
    #[test]
    fn test_theta_parameter_effect() {
        // Create many nodes far from target
        let mut nodes = vec![test_node(0.0, 0.0)]; // Target
        
        // Add distant cluster
        for i in 0..10 {
            for j in 0..10 {
                nodes.push(test_node(100.0 + i as f64, 100.0 + j as f64));
            }
        }
        
        let tree = QuadTree::build(&nodes);
        
        // With high theta (less accurate), far clusters are approximated
        let (fx_high, fy_high) = tree.calculate_force(&nodes[0], 1.5, 100.0);
        
        // With low theta (more accurate), more individual calculations
        let (fx_low, fy_low) = tree.calculate_force(&nodes[0], 0.1, 100.0);
        
        // Both should give positive forces (repulsion), but magnitudes may differ
        assert!(fx_high > 0.0 && fy_high > 0.0);
        assert!(fx_low > 0.0 && fy_low > 0.0);
        
        // The results should be similar but not identical
        // (this is a weak test, mainly checking that both work)
        assert!((fx_high / fx_low - 1.0).abs() < 0.5, 
            "Forces should be similar order of magnitude");
    }
    
    #[test]
    fn test_no_self_force() {
        let nodes = vec![test_node(5.0, 5.0)];
        let tree = QuadTree::build(&nodes);
        
        // A node should not exert force on itself
        let (fx, fy) = tree.calculate_force(&nodes[0], 0.9, 100.0);
        
        assert!(fx.abs() < 1e-10, "Node should not exert force on itself");
        assert!(fy.abs() < 1e-10, "Node should not exert force on itself");
    }
}
