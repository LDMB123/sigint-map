use scraper::Html;
use serde_json::{Value, json};

use super::{
    normalize_whitespace, parse_i64_or_warn, parse_mdy_any, regex, selector_or_warn, warn_if_empty,
    warn_missing_field,
};

pub(crate) fn parse_venue_show_history(document: &Html) -> Vec<Value> {
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='TourShowSet.aspx'], a[href*='ShowSetlist.aspx']",
        "a[href*='TourShowSet.aspx'], a[href*='ShowSetlist.aspx']",
    ) else {
        return Vec::new();
    };
    warn_if_empty(document, &row_selector, "venue_stats.show_history", "tr");
    warn_if_empty(
        document,
        &show_link_selector,
        "venue_stats.show_history",
        "show_link",
    );
    let release_selector = selector_or_warn(
        "img[src*='album'], img[src*='cd']",
        "img[src*='album'], img[src*='cd']",
    );
    let mut shows = Vec::new();
    for row in document.select(&row_selector) {
        let Some(show_link) = row.select(&show_link_selector).next() else {
            continue;
        };
        let show_id = show_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"id=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
        let date_text = normalize_whitespace(&show_link.text().collect::<String>());
        let parsed_date = parse_mdy_any(&date_text);
        if parsed_date.is_none() {
            warn_missing_field("venue_stats.show_history", "date");
        }
        let date = parsed_date.unwrap_or_else(|| date_text.clone());
        let year = parse_i64_or_warn(date.get(0..4), "venue_stats.show_history", "year");
        let mut song_count = 0;
        if let Some(td_sel) = selector_or_warn("td", "td") {
            for cell in row.select(&td_sel) {
                let text = normalize_whitespace(&cell.text().collect::<String>());
                if regex(r"^\\d+$").is_match(&text) {
                    song_count =
                        parse_i64_or_warn(Some(&text), "venue_stats.show_history", "songCount");
                }
            }
        }
        let has_release = release_selector
            .as_ref()
            .is_some_and(|selector| row.select(selector).next().is_some());
        shows.push(json!({
            "showId": show_id,
            "date": date,
            "year": year,
            "songCount": song_count,
            "isOnRelease": has_release
        }));
    }
    let missing_show_id = shows.iter().any(|show| match show.get("showId") {
        None | Some(Value::Null) => true,
        Some(Value::String(text)) if text.trim().is_empty() => true,
        _ => false,
    });
    if missing_show_id {
        warn_missing_field("venue_stats.show_history", "showId");
    }
    shows
}
