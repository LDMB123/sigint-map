use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashSet};

#[derive(Serialize, Deserialize)]
pub struct HeatmapItem {
    pub row: String,
    pub column: String,
    pub value: f64,
}

#[derive(Serialize, Deserialize)]
pub struct HeatmapMargins {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

#[derive(Serialize, Deserialize)]
pub struct HeatmapConfig {
    pub width: f64,
    pub height: f64,
    pub margins: HeatmapMargins,
    pub color_range: Vec<String>, // Hex colors e.g. ["#f0f9ff", "#0c4a6e"]
}

#[derive(Serialize)]
pub struct HeatmapRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub fill: String,
    pub row: String,
    pub column: String,
    pub value: f64,
}

#[derive(Serialize)]
pub struct AxisTick {
    pub label: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize)]
pub struct HeatmapResult {
    pub rects: Vec<HeatmapRect>,
    pub x_ticks: Vec<AxisTick>,
    pub y_ticks: Vec<AxisTick>,
    pub legend_gradient: Vec<String>, // Colors for linear gradient
}

/// Parse hex color to (r, g, b) tuple
fn parse_hex(hex: &str) -> (u8, u8, u8) {
    let hex = hex.trim_start_matches('#');
    if hex.len() == 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
        let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
        let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
        (r, g, b)
    } else {
        (0, 0, 0)
    }
}

/// Interpolate between two colors
fn interpolate_color(c1: &str, c2: &str, t: f64) -> String {
    let (r1, g1, b1) = parse_hex(c1);
    let (r2, g2, b2) = parse_hex(c2);

    let r = (r1 as f64 + (r2 as f64 - r1 as f64) * t) as u8;
    let g = (g1 as f64 + (g2 as f64 - g1 as f64) * t) as u8;
    let b = (b1 as f64 + (b2 as f64 - b1 as f64) * t) as u8;

    format!("#{:02x}{:02x}{:02x}", r, g, b)
}

#[wasm_bindgen(js_name = "prepareHeatmapData")]
pub fn prepare_heatmap_data(
    data: JsValue,
    config: JsValue,
) -> Result<JsValue, JsError> {
    let items: Vec<HeatmapItem> = serde_wasm_bindgen::from_value(data)
        .map_err(|e| JsError::new(&format!("Invalid data: {}", e)))?;
    
    let config: HeatmapConfig = serde_wasm_bindgen::from_value(config)
        .map_err(|e| JsError::new(&format!("Invalid config: {}", e)))?;

    if items.is_empty() {
        return Ok(JsValue::NULL);
    }

    // 1. Extract domains
    let mut rows: Vec<String> = items.iter().map(|i| i.row.clone()).collect::<HashSet<_>>().into_iter().collect();
    let mut cols: Vec<String> = items.iter().map(|i| i.column.clone()).collect::<HashSet<_>>().into_iter().collect();
    
    // Sort for consistent axis
    rows.sort();
    cols.sort();

    // 2. Calculate scales
    let inner_width = config.width - config.margins.left - config.margins.right;
    let inner_height = config.height - config.margins.top - config.margins.bottom;

    let x_step = inner_width / cols.len().max(1) as f64;
    let y_step = inner_height / rows.len().max(1) as f64;
    
    let x_bandwidth = x_step * 0.95; // padding 0.05
    let y_bandwidth = y_step * 0.95;
    
    // 3. Color scale
    let max_val = items.iter().map(|i| i.value).fold(0.0f64, |a, b| a.max(b)).max(1.0);
    let min_color = &config.color_range[0];
    let max_color = &config.color_range[1];

    // 4. Generate Rects
    let mut rects = Vec::with_capacity(items.len());
    
    for item in &items {
        let col_idx = cols.iter().position(|c| c == &item.column).unwrap_or(0);
        let row_idx = rows.iter().position(|r| r == &item.row).unwrap_or(0);

        let x = config.margins.left + (col_idx as f64 * x_step);
        let y = config.margins.top + (row_idx as f64 * y_step);
        
        let t = (item.value / max_val).clamp(0.0, 1.0);
        let fill = interpolate_color(min_color, max_color, t);

        rects.push(HeatmapRect {
            x,
            y,
            width: x_bandwidth,
            height: y_bandwidth,
            fill,
            row: item.row.clone(),
            column: item.column.clone(),
            value: item.value,
        });
    }

    // 5. Generate Ticks
    let x_ticks = cols.iter().enumerate().map(|(i, col)| {
        AxisTick {
            label: col.clone(),
            x: config.margins.left + (i as f64 * x_step) + (x_step / 2.0),
            y: config.margins.top - 10.0,
        }
    }).collect();

    let y_ticks = rows.iter().enumerate().map(|(i, row)| {
        AxisTick {
            label: row.clone(),
            x: config.margins.left - 10.0, // simplified, usually handled by text-anchor
            y: config.margins.top + (i as f64 * y_step) + (y_step / 2.0),
        }
    }).collect();

    let result = HeatmapResult {
        rects,
        x_ticks,
        y_ticks,
        legend_gradient: config.color_range,
    };

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}
