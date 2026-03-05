/// Normalize a search query for prefix matching.
#[must_use]
pub fn normalize_query(query: &str) -> String {
    if query.is_ascii() {
        let mut normalized = String::with_capacity(query.len());
        let mut previous_was_space = true;
        for byte in query.bytes() {
            if byte.is_ascii_whitespace() {
                if !previous_was_space {
                    normalized.push(' ');
                    previous_was_space = true;
                }
            } else {
                normalized.push((byte.to_ascii_lowercase()) as char);
                previous_was_space = false;
            }
        }
        if normalized.ends_with(' ') {
            let _ = normalized.pop();
        }
        return normalized;
    }

    // Lowercase and collapse all whitespace runs into single spaces in one pass.
    let mut normalized = String::with_capacity(query.len());
    let mut previous_was_space = true;
    for ch in query.chars() {
        if ch.is_whitespace() {
            if !previous_was_space {
                normalized.push(' ');
                previous_was_space = true;
            }
        } else {
            for lc in ch.to_lowercase() {
                normalized.push(lc);
            }
            previous_was_space = false;
        }
    }
    if normalized.ends_with(' ') {
        let _ = normalized.pop();
    }
    normalized
}

/// Simple prefix score: higher is better.
#[must_use]
pub fn prefix_score(query: &str, haystack: &str) -> f32 {
    if query.is_empty() {
        return 0.0;
    }

    let query = normalize_query(query);
    prefix_score_with_normalized_query(&query, haystack)
}

/// Simple prefix score with a pre-normalized query (from [`normalize_query`]).
#[must_use]
pub fn prefix_score_with_normalized_query(query_normalized: &str, haystack: &str) -> f32 {
    if query_normalized.is_empty() {
        return 0.0;
    }
    let haystack = normalize_query(haystack);
    if haystack.starts_with(query_normalized) {
        1.0
    } else if haystack.contains(query_normalized) {
        0.5
    } else {
        0.0
    }
}
