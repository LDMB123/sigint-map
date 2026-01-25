use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use js_sys::Math;

#[derive(Serialize, Deserialize)]
pub struct InputNode {
    pub id: String,
    pub name: String,
    pub appearances: i32,
}

#[derive(Serialize, Deserialize)]
pub struct InputLink {
    pub source: String,
    pub target: String,
    pub weight: f64,
}

#[derive(Serialize, Deserialize)]
pub struct OutputNode {
    pub id: String,
    pub name: String,
    pub appearances: i32,
    pub x: f64,
    pub y: f64,
    pub vx: f64,
    pub vy: f64,
}

#[derive(Serialize, Deserialize)]
pub struct OutputLink {
    pub source: String,
    pub target: String,
    pub weight: f64,
}

#[derive(Serialize)]
pub struct NetworkData {
    pub nodes: Vec<OutputNode>,
    pub links: Vec<OutputLink>,
}

#[wasm_bindgen]
pub fn prepare_network_data(
    nodes_val: JsValue,
    links_val: JsValue,
    width: f64,
    height: f64
) -> Result<JsValue, JsError> {
    let nodes: Vec<InputNode> = serde_wasm_bindgen::from_value(nodes_val)?;
    let links: Vec<InputLink> = serde_wasm_bindgen::from_value(links_val)?;

    let mut valid_ids = HashSet::with_capacity(nodes.len());
    let mut output_nodes = Vec::with_capacity(nodes.len());

    for node in nodes {
        valid_ids.insert(node.id.clone());
        output_nodes.push(OutputNode {
            id: node.id,
            name: node.name,
            appearances: node.appearances,
            x: Math::random() * width,
            y: Math::random() * height,
            vx: 0.0,
            vy: 0.0,
        });
    }

    let mut output_links = Vec::with_capacity(links.len());
    for link in links {
        if valid_ids.contains(&link.source) && valid_ids.contains(&link.target) {
            output_links.push(OutputLink {
                source: link.source,
                target: link.target,
                weight: link.weight,
            });
        }
    }

    let result = NetworkData {
        nodes: output_nodes,
        links: output_links,
    };

    Ok(serde_wasm_bindgen::to_value(&result)?)
}
