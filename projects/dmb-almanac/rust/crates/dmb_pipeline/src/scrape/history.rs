use anyhow::Result;
use chrono::Datelike;
use scraper::Html;
use serde_json::{Value, json};

use super::{
    BASE_URL, ScrapeClient, normalize_whitespace, parse_dot_date, parse_i32_or_warn, regex,
    selector_or_warn, warn_if_empty, warn_missing_field,
};

pub(super) fn scrape_history(client: &ScrapeClient) -> Result<Vec<Value>> {
    let mut entries = Vec::new();
    let days_in_month = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (month_idx, days) in days_in_month.iter().enumerate() {
        let month = month_idx + 1;
        for day in 1..=*days {
            let url = format!("{BASE_URL}/ThisDayinHistory.aspx?month={month}&day={day}");
            let html = client.fetch_html(&url)?;
            entries.extend(parse_history_page(&html, month, day));
        }
    }
    if entries.is_empty() {
        warn_missing_field("history", "entries");
    }
    Ok(entries)
}

fn parse_history_page(html: &str, month: usize, day: i32) -> Vec<Value> {
    let document = Html::parse_document(html);
    let Some(selector) = selector_or_warn(
        "a[href*='TourShowSet.aspx'][href*='id=']",
        "a[href*='TourShowSet.aspx'][href*='id=']",
    ) else {
        warn_missing_field("history", "showLinks");
        return Vec::new();
    };
    warn_if_empty(&document, &selector, "history", "show_link");

    let mut entries = Vec::new();
    for link in document.select(&selector) {
        let href = link.value().attr("href").unwrap_or("");
        let show_id = regex(r"id=(\\d+)")
            .captures(href)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().to_string());
        if show_id.as_deref().unwrap_or("").is_empty() {
            warn_missing_field("history", "showId");
        }
        let text = normalize_whitespace(&link.text().collect::<String>());
        let date = parse_dot_date(&text).unwrap_or_else(|| {
            let year_match = regex(r"(19|20)\\d{2}")
                .captures(&text)
                .and_then(|cap| cap.get(0).map(|m| m.as_str().to_string()));
            if let Some(year) = year_match {
                format!("{year}-{month:02}-{day:02}")
            } else {
                format!("{}-{:02}-{:02}", chrono::Utc::now().year(), month, day)
            }
        });
        let year = parse_i32_or_warn(date.get(0..4), "history", "year");
        entries.push(json!({
            "originalId": show_id,
            "showDate": date,
            "year": year,
            "venueName": text,
            "city": "",
            "state": Value::Null,
            "country": "USA",
            "notes": Value::Null,
        }));
    }

    entries
}
