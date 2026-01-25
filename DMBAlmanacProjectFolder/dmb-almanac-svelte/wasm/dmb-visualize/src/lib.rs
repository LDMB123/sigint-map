use wasm_bindgen::prelude::*;

pub mod network;
pub mod heatmap;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}
