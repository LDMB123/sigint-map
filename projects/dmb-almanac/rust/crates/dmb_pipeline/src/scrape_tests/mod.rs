use super::*;

mod drift_tests;
mod edge_case_tests;
mod snapshot_tests;
mod warning_tests;

fn parse_show_page_html(html: &str, id: &str) -> Show {
    let document = Html::parse_document(html);
    warn_if_no_selector_match(
        &document,
        "show",
        "dateSelector",
        &["select option:selected", ".show-date", "h1", "h2"],
    );
    let date = extract_show_date_with_body(&document);
    if date.is_none() {
        warn_missing_field("show", "date");
    }
    let date = date.unwrap_or_else(|| "1990-01-01".to_string());
    let year = date
        .get(0..4)
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(1990);
    let (venue_id, song_count) = extract_show_meta(&document);
    Show {
        id: parse_i32_or_warn(Some(id), "show", "id"),
        date,
        venue_id,
        tour_id: Some(1990),
        year,
        song_count,
        rarity_index: None,
    }
}
