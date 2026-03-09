use super::*;

pub(crate) fn parse_positive_i32_param(raw: &str, param_name: &str) -> Result<i32, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(format!("Missing `{param_name}` parameter."));
    }
    let value = trimmed
        .parse::<i32>()
        .map_err(|_| format!("Invalid `{param_name}` parameter: expected integer."))?;
    if value <= 0 {
        return Err(format!(
            "Invalid `{param_name}` parameter: expected positive integer."
        ));
    }
    Ok(value)
}

pub(crate) fn parse_route_slug_param(raw: &str) -> Result<String, String> {
    let slug = raw.trim();
    if slug.is_empty() {
        return Err("Missing `slug` parameter.".to_string());
    }
    Ok(slug.to_string())
}

pub(crate) fn render_route_param_subhead<T>(
    label: &str,
    raw: &str,
    parse: impl FnOnce(&str) -> Result<T, String>,
) -> AnyView
where
    T: std::fmt::Display,
{
    match parse(raw) {
        Ok(value) => view! { <p class="page-subhead">{format!("{label}: {value}")}</p> }.into_any(),
        Err(message) => view! { <p class="muted">{message}</p> }.into_any(),
    }
}

pub(crate) fn route_param_or_default(param_name: &'static str) -> impl Fn() -> String + Copy {
    let params = use_params_map();
    move || params.with(|p| p.get(param_name).unwrap_or_default())
}

pub(crate) fn reset_filter_and_query_on_route_change(
    route_param: impl Fn() -> String + Copy + 'static,
    active_filter: RwSignal<String>,
    query: RwSignal<String>,
) {
    Effect::new(move |_| {
        let _ = route_param();
        active_filter.set("all".to_string());
        query.set(String::new());
    });
}

pub(crate) fn search_result_href(item: &dmb_core::SearchResult) -> Option<String> {
    match item.result_type.as_str() {
        "song" => item.slug.as_ref().map(|slug| format!("/songs/{slug}")),
        "venue" => Some(format!("/venues/{}", item.id)),
        "tour" => Some(format!("/tours/{}", item.id)),
        "guest" => item.slug.as_ref().map(|slug| format!("/guests/{slug}")),
        "release" => item.slug.as_ref().map(|slug| format!("/releases/{slug}")),
        _ => None,
    }
}

pub(crate) fn merge_search_results(
    mut prefix: Vec<dmb_core::SearchResult>,
    mut semantic: Vec<dmb_core::SearchResult>,
    limit: usize,
) -> Vec<dmb_core::SearchResult> {
    use std::collections::HashMap;

    #[derive(Hash, PartialEq, Eq)]
    struct SearchResultKey {
        result_type: String,
        id: i32,
        slug: Option<String>,
    }

    struct SearchResultValue {
        label: String,
        score: f32,
    }

    let mut merged: HashMap<SearchResultKey, SearchResultValue> =
        HashMap::with_capacity(prefix.len() + semantic.len());

    for item in &mut prefix {
        item.score = (item.score + 0.5).min(1.5);
    }

    for item in &mut semantic {
        item.score = item.score.min(1.0);
    }

    for item in prefix.into_iter().chain(semantic.into_iter()) {
        let dmb_core::SearchResult {
            result_type,
            id,
            slug,
            label,
            score,
        } = item;
        let key = SearchResultKey {
            result_type,
            id,
            slug,
        };
        match merged.get_mut(&key) {
            Some(existing) => {
                if score > existing.score {
                    existing.score = score;
                    existing.label = label;
                }
            }
            None => {
                merged.insert(key, SearchResultValue { label, score });
            }
        }
    }

    let mut out: Vec<dmb_core::SearchResult> = merged
        .into_iter()
        .map(|(key, value)| dmb_core::SearchResult {
            result_type: key.result_type,
            id: key.id,
            slug: key.slug,
            label: value.label,
            score: value.score,
        })
        .collect();
    out.sort_unstable_by(|a, b| {
        b.score
            .total_cmp(&a.score)
            .then_with(|| a.result_type.cmp(&b.result_type))
            .then_with(|| a.label.cmp(&b.label))
    });
    out.truncate(limit);
    out
}
