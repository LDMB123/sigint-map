/// Normalize a search query for prefix matching.
pub fn normalize_query(query: &str) -> String {
    query
        .trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Simple prefix score: higher is better.
pub fn prefix_score(query: &str, haystack: &str) -> f32 {
    if query.is_empty() {
        return 0.0;
    }

    let query = normalize_query(query);
    let haystack = normalize_query(haystack);

    if haystack.starts_with(&query) {
        1.0
    } else if haystack.contains(&query) {
        0.5
    } else {
        0.0
    }
}
