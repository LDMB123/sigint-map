use anyhow::Result;
use scraper::Html;
use serde_json::{Value, json};

use super::{
    BASE_URL, ScrapeClient, normalize_whitespace, parse_dot_date, parse_i64_or_warn, regex,
    selector_or_warn, warn_if_empty, warn_missing_field,
};

pub(super) fn scrape_liberation(client: &ScrapeClient) -> Result<Vec<Value>> {
    let url = format!("{BASE_URL}/Liberation.aspx");
    let html = client.fetch_html(&url)?;
    Ok(parse_liberation_page(&html))
}

fn parse_liberation_page(html: &str) -> Vec<Value> {
    let document = Html::parse_document(html);
    let Some(row_selector) = selector_or_warn(
        "table.liberation-list tbody tr",
        "table.liberation-list tbody tr",
    ) else {
        return Vec::new();
    };
    let Some(song_selector) = selector_or_warn(
        "td.rowcell.lj a[href*='summary.aspx']",
        "td.rowcell.lj a[href*='summary.aspx']",
    ) else {
        return Vec::new();
    };
    let Some(last_played_selector) = selector_or_warn(
        "td.rowcell.cj a[href*='TourShowSet']",
        "td.rowcell.cj a[href*='TourShowSet']",
    ) else {
        return Vec::new();
    };
    let Some(days_selector) = selector_or_warn(
        "td.rowcell.cj.d-none.d-sm-table-cell",
        "td.rowcell.cj.d-none.d-sm-table-cell",
    ) else {
        return Vec::new();
    };
    let notes_selector = selector_or_warn("td.endcell.lj", "td.endcell.lj");
    warn_if_empty(&document, &row_selector, "liberation", "row");
    warn_if_empty(&document, &song_selector, "liberation", "song_link");
    warn_if_empty(
        &document,
        &last_played_selector,
        "liberation",
        "last_played_link",
    );
    warn_if_empty(&document, &days_selector, "liberation", "days_cells");

    let mut entries = Vec::new();
    for row in document.select(&row_selector) {
        let is_liberated = row
            .value()
            .attr("style")
            .is_some_and(|v| v.contains("background-color"));
        let song_link = row.select(&song_selector).next();
        let last_played = row.select(&last_played_selector).next();
        if song_link.is_none() || last_played.is_none() {
            continue;
        }
        let Some(song_link) = song_link else {
            continue;
        };
        let song_title = normalize_whitespace(&song_link.text().collect::<String>());
        let song_id = song_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"sid=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
            .unwrap_or_default();
        if song_id.is_empty() {
            warn_missing_field("liberation", "songId");
        }

        let Some(last_played_link) = last_played else {
            continue;
        };
        let last_played_date_text =
            normalize_whitespace(&last_played_link.text().collect::<String>());
        let last_played_date = parse_dot_date(&last_played_date_text).unwrap_or_else(|| {
            warn_missing_field("liberation", "lastPlayedDate");
            String::new()
        });
        let last_played_show_id = last_played_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"id=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
            .unwrap_or_default();
        if last_played_show_id.is_empty() {
            warn_missing_field("liberation", "lastPlayedShowId");
        }

        let mut days_since = 0;
        let mut shows_since = 0;
        let mut cells = row.select(&days_selector);
        if let Some(cell) = cells.next() {
            let text = normalize_whitespace(&cell.text().collect::<String>());
            days_since = parse_i64_or_warn(Some(&text), "liberation", "daysSince");
        }
        if let Some(cell) = cells.next() {
            let text = normalize_whitespace(&cell.text().collect::<String>());
            shows_since = parse_i64_or_warn(Some(&text), "liberation", "showsSince");
        }

        let notes_cell = notes_selector
            .as_ref()
            .and_then(|selector| row.select(selector).next());
        let mut notes = notes_cell
            .as_ref()
            .map(|cell| normalize_whitespace(&cell.text().collect::<String>()))
            .unwrap_or_default();
        let mut liberated_date = None;
        let mut liberated_show_id = None;
        if let Some(cell) = notes_cell
            && is_liberated
            && let Some(link) = cell.select(&last_played_selector).last()
        {
            if let Some(href) = link.value().attr("href") {
                liberated_show_id = regex(r"id=(\\d+)")
                    .captures(href)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            }
            let link_text = normalize_whitespace(&link.text().collect::<String>());
            liberated_date = parse_dot_date(&link_text);
        }
        if is_liberated && liberated_show_id.as_deref().unwrap_or("").is_empty() {
            warn_missing_field("liberation", "liberatedShowId");
        }

        let notes_lower = notes.to_lowercase();
        let configuration =
            if notes_lower.contains("dave & tim") || notes_lower.contains("dave and tim") {
                "dave_tim"
            } else if notes_lower.contains("dave solo") {
                "dave_solo"
            } else {
                "full_band"
            };
        if notes.contains("LIBERATED") {
            notes = notes.replace("-=LIBERATED", "").trim().to_string();
        }

        entries.push(json!({
            "songId": song_id,
            "songTitle": song_title,
            "lastPlayedDate": last_played_date,
            "lastPlayedShowId": last_played_show_id,
            "daysSince": days_since,
            "showsSince": shows_since,
            "notes": if notes.is_empty() { Value::Null } else { Value::String(notes) },
            "configuration": configuration,
            "isLiberated": is_liberated,
            "liberatedDate": liberated_date,
            "liberatedShowId": liberated_show_id,
        }));
    }

    if entries.is_empty() {
        warn_missing_field("liberation", "entries");
    }
    entries
}
