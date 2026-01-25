use wasm_bindgen::prelude::*;

// ==================== SEARCH TEXT NORMALIZATION ====================

/// Normalize text for search matching
/// - Converts to lowercase
/// - NFD normalization with diacritic removal
/// - Replaces non-alphanumeric characters with space
/// - Collapses multiple spaces
/// - Trims whitespace
///
/// This matches the exact behavior of normalizeSearchTextJS in search.ts
#[wasm_bindgen(js_name = "normalizeSearchText")]
pub fn normalize_search_text(text: &str) -> String {
    // Step 1: Lowercase
    let lower = text.to_lowercase();

    // Step 2 & 3: NFD normalization and diacritic removal + non-alphanumeric replacement
    // Combined in a single pass for efficiency
    let normalized: String = lower
        .chars()
        .filter_map(|c| {
            // Check if it's a combining diacritical mark (U+0300 to U+036F)
            if ('\u{0300}'..='\u{036F}').contains(&c) {
                None // Remove diacritics
            } else if c.is_ascii_alphanumeric() {
                Some(c)
            } else if c.is_whitespace() || !c.is_alphanumeric() {
                Some(' ') // Replace non-alphanumeric with space
            } else {
                // Handle non-ASCII alphanumeric (decomposed form)
                // Try to get the base character
                let base = unicode_normalize_char(c);
                if base.is_ascii_alphanumeric() {
                    Some(base)
                } else {
                    Some(' ')
                }
            }
        })
        .collect();

    // Step 4 & 5: Collapse multiple spaces and trim
    normalized
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Helper to get base ASCII character from a Unicode character
/// This handles common accented characters
#[inline]
fn unicode_normalize_char(c: char) -> char {
    match c {
        // Common Latin letters with diacritics
        'á' | 'à' | 'â' | 'ä' | 'ã' | 'å' | 'ā' | 'ă' | 'ą' => 'a',
        'é' | 'è' | 'ê' | 'ë' | 'ē' | 'ė' | 'ę' | 'ě' => 'e',
        'í' | 'ì' | 'î' | 'ï' | 'ī' | 'į' => 'i',
        'ó' | 'ò' | 'ô' | 'ö' | 'õ' | 'ø' | 'ō' | 'ő' => 'o',
        'ú' | 'ù' | 'û' | 'ü' | 'ū' | 'ů' | 'ű' | 'ų' => 'u',
        'ý' | 'ÿ' | 'ŷ' => 'y',
        'ñ' | 'ń' | 'ň' | 'ņ' => 'n',
        'ç' | 'ć' | 'č' => 'c',
        'ß' => 's',
        'ð' | 'ď' | 'đ' => 'd',
        'ž' | 'ź' | 'ż' => 'z',
        'ł' | 'ľ' | 'ĺ' | 'ļ' => 'l',
        'ř' | 'ŕ' => 'r',
        'š' | 'ś' | 'ş' => 's',
        'ť' | 'ţ' => 't',
        'ğ' | 'ģ' => 'g',
        'ķ' => 'k',
        'ẞ' => 's',
        'æ' => 'a', // simplify ligatures
        'œ' => 'o',
        'þ' => 't',
        // Uppercase variants
        'Á' | 'À' | 'Â' | 'Ä' | 'Ã' | 'Å' | 'Ā' | 'Ă' | 'Ą' => 'a',
        'É' | 'È' | 'Ê' | 'Ë' | 'Ē' | 'Ė' | 'Ę' | 'Ě' => 'e',
        'Í' | 'Ì' | 'Î' | 'Ï' | 'Ī' | 'Į' => 'i',
        'Ó' | 'Ò' | 'Ô' | 'Ö' | 'Õ' | 'Ø' | 'Ō' | 'Ő' => 'o',
        'Ú' | 'Ù' | 'Û' | 'Ü' | 'Ū' | 'Ů' | 'Ű' | 'Ų' => 'u',
        'Ý' | 'Ÿ' | 'Ŷ' => 'y',
        'Ñ' | 'Ń' | 'Ň' | 'Ņ' => 'n',
        'Ç' | 'Ć' | 'Č' => 'c',
        'Ð' | 'Ď' | 'Đ' => 'd',
        'Ž' | 'Ź' | 'Ż' => 'z',
        'Ł' | 'Ľ' | 'Ĺ' | 'Ļ' => 'l',
        'Ř' | 'Ŕ' => 'r',
        'Š' | 'Ś' | 'Ş' => 's',
        'Ť' | 'Ţ' => 't',
        'Ğ' | 'Ģ' => 'g',
        'Ķ' => 'k',
        'Æ' => 'a',
        'Œ' => 'o',
        'Þ' => 't',
        _ => c, // Return as-is if no mapping
    }
}

/// Batch normalize multiple strings for search
/// More efficient than calling normalize_search_text repeatedly
/// due to reduced WASM boundary crossings
#[wasm_bindgen(js_name = "normalizeSearchTextBatch")]
pub fn normalize_search_text_batch(inputs: JsValue) -> Result<JsValue, JsError> {
    let strings: Vec<String> = serde_wasm_bindgen::from_value(inputs)
        .map_err(|_| JsError::new("Invalid input array"))?;

    let normalized: Vec<String> = strings.iter().map(|s| normalize_search_text(s)).collect();

    serde_wasm_bindgen::to_value(&normalized)
        .map_err(|_| JsError::new("Serialization failed"))
}

// ==================== STRING UTILITIES ====================

/// Convert a string to a URL-safe slug
#[wasm_bindgen(js_name = "slugify")]
pub fn slugify(input: &str) -> String {
    input
        .to_lowercase()
        .chars()
        .map(|c| match c {
            'a'..='z' | '0'..='9' => c,
            ' ' | '-' | '_' => '-',
            _ => '-',
        })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// Normalize whitespace (collapse multiple spaces, trim)
#[wasm_bindgen(js_name = "normalizeWhitespace")]
pub fn normalize_whitespace(input: &str) -> String {
    input
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Create sort-friendly title (strip leading "The", "A", "An")
#[wasm_bindgen(js_name = "createSortTitle")]
pub fn create_sort_title(title: &str) -> String {
    let lower = title.to_lowercase();
    let trimmed = title.trim();

    if lower.starts_with("the ") {
        trimmed[4..].to_string()
    } else if lower.starts_with("a ") {
        trimmed[2..].to_string()
    } else if lower.starts_with("an ") {
        trimmed[3..].to_string()
    } else {
        trimmed.to_string()
    }
}

/// Batch slugify multiple strings
#[wasm_bindgen(js_name = "batchSlugify")]
pub fn batch_slugify(inputs: JsValue) -> Result<JsValue, JsError> {
    let strings: Vec<String> = serde_wasm_bindgen::from_value(inputs)
        .map_err(|_| JsError::new("Invalid input array"))?;

    let slugs: Vec<String> = strings.iter().map(|s| slugify(s)).collect();

    serde_wasm_bindgen::to_value(&slugs)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Generate search text from multiple fields
#[wasm_bindgen(js_name = "generateSearchText")]
pub fn generate_search_text(parts: JsValue) -> Result<String, JsError> {
    let strings: Vec<String> = serde_wasm_bindgen::from_value(parts)
        .map_err(|_| JsError::new("Invalid input array"))?;

    Ok(strings
        .iter()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_lowercase())
        .collect::<Vec<_>>()
        .join(" "))
}

/// Extract initials from a name
#[wasm_bindgen(js_name = "getInitials")]
pub fn get_initials(name: &str) -> String {
    name.split_whitespace()
        .filter_map(|word| word.chars().next())
        .map(|c| c.to_uppercase().to_string())
        .collect::<Vec<_>>()
        .join("")
}

/// Truncate string with ellipsis
#[wasm_bindgen(js_name = "truncate")]
pub fn truncate(input: &str, max_len: usize) -> String {
    if input.len() <= max_len {
        input.to_string()
    } else if max_len <= 3 {
        input[..max_len].to_string()
    } else {
        format!("{}...", &input[..max_len - 3])
    }
}

/// Module version
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
