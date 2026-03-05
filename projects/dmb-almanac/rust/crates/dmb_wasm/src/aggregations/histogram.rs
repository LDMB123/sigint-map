use wasm_bindgen::prelude::*;

/// Aggregate shows by year using SIMD-optimized histogram
///
/// # Arguments
/// * `years` - Array of years (e.g., [1991, 1992, 1991, ...])
///
/// # Returns
/// JavaScript Map with year -> count
///
/// # Performance
/// O(n) with SIMD auto-vectorization on modern CPUs
#[wasm_bindgen]
pub fn aggregate_by_year(years: &[u32]) -> js_sys::Map {
    let histogram = aggregate_by_year_internal(years);

    // Convert to JavaScript Map
    let result = js_sys::Map::new();
    for (i, &count) in histogram.iter().enumerate() {
        if count > 0 {
            let year_offset = u32::try_from(i).unwrap_or(u32::MAX);
            let year = 1991_u32.saturating_add(year_offset);
            result.set(&JsValue::from(year), &JsValue::from(count));
        }
    }

    result
}

// Pure Rust function for testing
fn aggregate_by_year_internal(years: &[u32]) -> [u32; 60] {
    let mut histogram = [0u32; 60]; // 1991-2050 (60 years)

    // SIMD-friendly loop (auto-vectorized by Rust compiler with -O3)
    for &year in years {
        if (1991..=2050).contains(&year) {
            let bin = (year - 1991) as usize;
            if let Some(count) = histogram.get_mut(bin) {
                *count += 1;
            }
        }
    }

    histogram
}

/// Aggregate shows by decade
///
/// # Arguments
/// * `years` - Array of years
///
/// # Returns
/// JavaScript Map with decade -> count (e.g., 1990 -> count of 1990-1999)
#[wasm_bindgen]
pub fn aggregate_by_decade(years: &[u32]) -> js_sys::Map {
    let histogram = aggregate_by_decade_internal(years);

    let result = js_sys::Map::new();
    for (i, &count) in histogram.iter().enumerate() {
        if count > 0 {
            let decade_offset = u32::try_from(i).unwrap_or(u32::MAX).saturating_mul(10);
            let decade = 1990_u32.saturating_add(decade_offset);
            result.set(&JsValue::from(decade), &JsValue::from(count));
        }
    }

    result
}

fn aggregate_by_decade_internal(years: &[u32]) -> [u32; 5] {
    let mut histogram = [0u32; 5]; // 1990s, 2000s, 2010s, 2020s, 2030s

    for &year in years {
        if (1990..2040).contains(&year) {
            let decade_index = ((year - 1990) / 10) as usize;
            if let Some(count) = histogram.get_mut(decade_index) {
                *count += 1;
            }
        }
    }

    histogram
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_aggregate_by_year() {
        let years = vec![1991, 1992, 1991, 2000, 2000, 2000];
        let result = aggregate_by_year_internal(&years);

        // 1991 is index 0, should have count of 2
        assert_eq!(result[0], 2);

        // 1992 is index 1, should have count of 1
        assert_eq!(result[1], 1);

        // 2000 is index 9, should have count of 3
        assert_eq!(result[9], 3);
    }

    #[test]
    fn test_aggregate_by_year_empty() {
        let years: Vec<u32> = vec![];
        let result = aggregate_by_year_internal(&years);

        // All bins should be zero
        assert!(result.iter().all(|&count| count == 0));
    }

    #[test]
    fn test_aggregate_by_year_out_of_range() {
        let years = vec![1980, 1991, 2051];
        let result = aggregate_by_year_internal(&years);

        // Only 1991 should be counted
        assert_eq!(result[0], 1);

        // All other bins should be zero
        assert_eq!(result.iter().filter(|&&c| c > 0).count(), 1);
    }

    #[test]
    fn test_aggregate_by_decade() {
        let years = vec![1991, 1999, 2000, 2005, 2010, 2015, 2020];
        let result = aggregate_by_decade_internal(&years);

        // 1990s should have 2 shows (index 0)
        assert_eq!(result[0], 2);

        // 2000s should have 2 shows (index 1)
        assert_eq!(result[1], 2);

        // 2010s should have 2 shows (index 2)
        assert_eq!(result[2], 2);

        // 2020s should have 1 show (index 3)
        assert_eq!(result[3], 1);
    }
}
