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
            let year = (1991 + i) as u32;
            result.set(&JsValue::from(year), &JsValue::from(count));
        }
    }

    result
}

// Pure Rust function for testing
fn aggregate_by_year_internal(years: &[u32]) -> [u32; 36] {
    let mut histogram = [0u32; 36]; // 1991-2026 (36 years)

    // SIMD-friendly loop (auto-vectorized by Rust compiler with -O3)
    for &year in years {
        if (1991..=2026).contains(&year) {
            let bin = (year - 1991) as usize;
            histogram[bin] += 1;
        }
    }

    histogram
}

/// Aggregate shows by year with filtering
///
/// # Arguments
/// * `years` - Array of years
/// * `min_year` - Minimum year to include (inclusive)
/// * `max_year` - Maximum year to include (inclusive)
///
/// # Returns
/// JavaScript Map with year -> count for years in range
#[wasm_bindgen]
pub fn aggregate_by_year_range(years: &[u32], min_year: u32, max_year: u32) -> js_sys::Map {
    if min_year > max_year {
        return js_sys::Map::new();
    }

    let (histogram, range_size) = aggregate_by_year_range_internal(years, min_year, max_year);

    let result = js_sys::Map::new();
    for (i, &count) in histogram.iter().take(range_size).enumerate() {
        if count > 0 {
            let year = min_year + i as u32;
            result.set(&JsValue::from(year), &JsValue::from(count));
        }
    }

    result
}

fn aggregate_by_year_range_internal(
    years: &[u32],
    min_year: u32,
    max_year: u32,
) -> (Vec<u32>, usize) {
    let range_size = (max_year - min_year + 1) as usize;
    let mut histogram = vec![0u32; range_size];

    for &year in years {
        if year >= min_year && year <= max_year {
            let bin = (year - min_year) as usize;
            histogram[bin] += 1;
        }
    }

    (histogram, range_size)
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
            let decade = 1990 + (i as u32 * 10);
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
            if decade_index < histogram.len() {
                histogram[decade_index] += 1;
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
        let years = vec![1980, 1991, 2030];
        let result = aggregate_by_year_internal(&years);

        // Only 1991 should be counted
        assert_eq!(result[0], 1);

        // All other bins should be zero
        assert_eq!(result.iter().filter(|&&c| c > 0).count(), 1);
    }

    #[test]
    fn test_aggregate_by_year_range() {
        let years = vec![1991, 1992, 1993, 2000, 2001];
        let (result, size) = aggregate_by_year_range_internal(&years, 1992, 2000);

        // Should include 1992, 1993, 2000
        assert_eq!(size, 9); // 1992-2000 is 9 years

        // Index 0 = 1992, should have 1
        assert_eq!(result[0], 1);

        // Index 1 = 1993, should have 1
        assert_eq!(result[1], 1);

        // Index 8 = 2000, should have 1
        assert_eq!(result[8], 1);
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
