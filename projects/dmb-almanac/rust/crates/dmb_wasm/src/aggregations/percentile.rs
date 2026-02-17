use wasm_bindgen::prelude::*;

/// Calculate percentile from array using linear interpolation
///
/// # Arguments
/// * `values` - Array of numeric values (will be sorted internally)
/// * `percentile` - Percentile to calculate (0.0 to 1.0, e.g., 0.5 for median)
///
/// # Returns
/// Value at the given percentile using linear interpolation
///
/// # Performance
/// O(n log n) for sorting + O(1) for interpolation
/// For pre-sorted data, use calculate_percentile_sorted for O(1) performance
#[wasm_bindgen]
pub fn calculate_percentile(values: &[f64], percentile: f64) -> f64 {
    if values.is_empty() {
        return 0.0;
    }

    if percentile <= 0.0 {
        return *values.iter().min_by(|a, b| a.total_cmp(b)).unwrap_or(&0.0);
    }

    if percentile >= 1.0 {
        return *values.iter().max_by(|a, b| a.total_cmp(b)).unwrap_or(&0.0);
    }

    // Sort values for percentile calculation
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));

    calculate_percentile_sorted(&sorted, percentile)
}

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
#[wasm_bindgen]
pub fn calculate_percentile_sorted(sorted_values: &[f64], percentile: f64) -> f64 {
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

/// Calculate multiple percentiles efficiently (single sort)
///
/// # Arguments
/// * `values` - Array of numeric values
/// * `percentiles` - Array of percentiles to calculate (e.g., [0.25, 0.5, 0.75])
///
/// # Returns
/// JavaScript Array of percentile values in same order as input percentiles
///
/// # Performance
/// O(n log n + k) where k=number of percentiles
/// More efficient than calling calculate_percentile k times
#[wasm_bindgen]
pub fn calculate_percentiles(values: &[f64], percentiles: &[f64]) -> js_sys::Array {
    let result = js_sys::Array::new();

    if values.is_empty() {
        for _ in percentiles {
            result.push(&JsValue::from(0.0));
        }
        return result;
    }

    // Sort once
    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.total_cmp(b));

    // Calculate each percentile
    for &percentile in percentiles {
        let value = calculate_percentile_sorted(&sorted, percentile);
        result.push(&JsValue::from(value));
    }

    result
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
    sorted.sort_by(|a, b| a.total_cmp(b));

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

    #[test]
    fn test_calculate_percentile() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];

        assert_eq!(calculate_percentile(&values, 0.0), 1.0);
        assert_eq!(calculate_percentile(&values, 0.5), 3.0);
        assert_eq!(calculate_percentile(&values, 1.0), 5.0);
    }

    #[test]
    fn test_calculate_percentile_unsorted() {
        let values = vec![5.0, 1.0, 3.0, 2.0, 4.0];

        assert_eq!(calculate_percentile(&values, 0.5), 3.0);
    }

    #[test]
    fn test_calculate_percentile_interpolation() {
        let values = vec![1.0, 2.0, 3.0, 4.0];

        // 25th percentile should be 1.75 (interpolated between 1 and 2)
        let p25 = calculate_percentile(&values, 0.25);
        assert!((p25 - 1.75).abs() < 0.01);

        // 75th percentile should be 3.25 (interpolated between 3 and 4)
        let p75 = calculate_percentile(&values, 0.75);
        assert!((p75 - 3.25).abs() < 0.01);
    }

    #[test]
    fn test_calculate_percentile_empty() {
        let values: Vec<f64> = vec![];
        assert_eq!(calculate_percentile(&values, 0.5), 0.0);
    }

    #[test]
    fn test_calculate_percentile_single() {
        let values = vec![42.0];
        assert_eq!(calculate_percentile(&values, 0.0), 42.0);
        assert_eq!(calculate_percentile(&values, 0.5), 42.0);
        assert_eq!(calculate_percentile(&values, 1.0), 42.0);
    }

    // Note: Tests for calculate_percentiles and calculate_quartiles are skipped
    // because they use wasm-bindgen types (js_sys::Array, js_sys::Object)
    // which are not available in native Rust tests.
    // These functions are tested in JavaScript integration tests.

    #[test]
    fn test_calculate_percentile_sorted() {
        let sorted = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        assert_eq!(calculate_percentile_sorted(&sorted, 0.5), 3.0);
    }
}
