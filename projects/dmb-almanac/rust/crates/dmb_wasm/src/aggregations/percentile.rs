use wasm_bindgen::prelude::*;

/// Calculate percentile from pre-sorted array (O(1) performance)
///
/// # Arguments
/// * `sorted_values` - Pre-sorted array of numeric values
/// * `percentile` - Percentile to calculate (0.0 to 1.0)
///
/// # Returns
/// Value at the given percentile using linear interpolation
///
/// # Performance
/// O(1) - assumes input is already sorted
fn calculate_percentile_sorted(sorted_values: &[f64], percentile: f64) -> f64 {
    if sorted_values.is_empty() {
        return 0.0;
    }

    if sorted_values.len() == 1 {
        return sorted_values[0];
    }

    // Use linear interpolation between ranks
    let rank = percentile * (sorted_values.len() - 1) as f64;
    let lower_index = rank.floor() as usize;
    let upper_index = rank.ceil() as usize;

    // Handle edge cases
    if upper_index >= sorted_values.len() {
        return sorted_values[sorted_values.len() - 1];
    }

    if lower_index == upper_index {
        return sorted_values[lower_index];
    }

    // Linear interpolation
    let lower_value = sorted_values[lower_index];
    let upper_value = sorted_values[upper_index];
    let fraction = rank - lower_index as f64;

    lower_value + fraction * (upper_value - lower_value)
}

/// Calculate quartiles (Q1, Q2/median, Q3) and IQR
///
/// # Arguments
/// * `values` - Array of numeric values
///
/// # Returns
/// JavaScript object with {q1, median, q3, iqr, min, max}
#[wasm_bindgen]
pub fn calculate_quartiles(values: &[f64]) -> Result<js_sys::Object, JsValue> {
    if values.is_empty() {
        return Err(JsValue::from_str(
            "Cannot calculate quartiles for empty array",
        ));
    }

    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);

    let q1 = calculate_percentile_sorted(&sorted, 0.25);
    let median = calculate_percentile_sorted(&sorted, 0.5);
    let q3 = calculate_percentile_sorted(&sorted, 0.75);
    let iqr = q3 - q1;
    let min = sorted[0];
    let max = sorted[sorted.len() - 1];

    let obj = js_sys::Object::new();
    js_sys::Reflect::set(&obj, &"q1".into(), &JsValue::from(q1))?;
    js_sys::Reflect::set(&obj, &"median".into(), &JsValue::from(median))?;
    js_sys::Reflect::set(&obj, &"q3".into(), &JsValue::from(q3))?;
    js_sys::Reflect::set(&obj, &"iqr".into(), &JsValue::from(iqr))?;
    js_sys::Reflect::set(&obj, &"min".into(), &JsValue::from(min))?;
    js_sys::Reflect::set(&obj, &"max".into(), &JsValue::from(max))?;

    Ok(obj)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: Tests for calculate_quartiles are skipped
    // because they use wasm-bindgen types (js_sys::Array, js_sys::Object)
    // which are not available in native Rust tests.
    // These functions are tested in JavaScript integration tests.
    #[test]
    fn test_calculate_percentile_sorted() {
        let sorted = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert_eq!(calculate_percentile_sorted(&sorted, 0.5), 3.0);
    }
}
