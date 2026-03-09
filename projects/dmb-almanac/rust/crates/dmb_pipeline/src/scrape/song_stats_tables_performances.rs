use scraper::element_ref::ElementRef;
use scraper::Html;
use serde_json::{json, Value};

use super::super::super::{
    normalize_whitespace, parse_i64_or_warn, parse_mdy_any, regex, selector_or_warn, warn_if_empty,
    warn_missing_field,
};

pub(crate) fn parse_song_liberations(document: &Html) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
    ) else {
        return Vec::new();
    };
    warn_if_empty(document, &table_selector, "song_stats.liberations", "table");
    warn_if_empty(document, &row_selector, "song_stats.liberations", "tr");
    warn_if_empty(
        document,
        &show_link_selector,
        "song_stats.liberations",
        "show_link",
    );
    let mut entries = Vec::new();
    for table in document.select(&table_selector) {
        let table_text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        if !(table_text.contains("liberation") || table_text.contains("gap")) {
            continue;
        }
        for row in table.select(&row_selector) {
            let mut show_links = row.select(&show_link_selector);
            let last_played = show_links.next();
            let liberation = show_links.next();
            if last_played.is_none() || liberation.is_none() {
                continue;
            }
            let Some(last_played) = last_played else {
                continue;
            };
            let Some(liberation) = liberation else {
                continue;
            };
            let last_played_show_id = last_played
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
                .unwrap_or_default();
            if last_played_show_id.is_empty() {
                warn_missing_field("song_stats.liberations", "lastPlayedShowId");
            }
            let liberation_show_id = liberation
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
                .unwrap_or_default();
            if liberation_show_id.is_empty() {
                warn_missing_field("song_stats.liberations", "liberationShowId");
            }
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let days_since = parse_i64_or_warn(
                regex(r"(\d+)\s+days?")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.liberations",
                "daysSince",
            );
            let shows_since = parse_i64_or_warn(
                regex(r"(\d+)\s+shows?")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.liberations",
                "showsSince",
            );
            entries.push(json!({
                "lastPlayedDate": parse_mdy_any(&last_played.text().collect::<String>()),
                "lastPlayedShowId": last_played_show_id,
                "daysSince": days_since,
                "showsSince": shows_since,
                "liberationDate": parse_mdy_any(&liberation.text().collect::<String>()),
                "liberationShowId": liberation_show_id
            }));
        }
    }
    entries
}

pub(crate) fn parse_song_performances(document: &Html) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
    ) else {
        return Vec::new();
    };
    let Some(venue_selector) = selector_or_warn("a[href*='VenueStats']", "a[href*='VenueStats']")
    else {
        return Vec::new();
    };
    warn_if_empty(
        document,
        &table_selector,
        "song_stats.performances",
        "table",
    );
    warn_if_empty(document, &row_selector, "song_stats.performances", "tr");
    warn_if_empty(
        document,
        &show_link_selector,
        "song_stats.performances",
        "show_link",
    );
    warn_if_empty(
        document,
        &venue_selector,
        "song_stats.performances",
        "venue_link",
    );
    let td_selector = selector_or_warn("td", "td");
    if let Some(selector) = &td_selector {
        warn_if_empty(document, selector, "song_stats.performances", "td");
    }
    let release_img_selector = selector_or_warn(
        "img[src*='album'], img[src*='cd']",
        "img[src*='album'], img[src*='cd']",
    );
    let mut performances = Vec::new();
    for table in document.select(&table_selector) {
        let show_links = table.select(&show_link_selector).count();
        let table_text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        let looks_like_performance = table_text.contains("performance");
        if show_links == 0 {
            continue;
        }
        if show_links < 5 && !looks_like_performance {
            continue;
        }
        for row in table.select(&row_selector) {
            let Some(show_link) = row.select(&show_link_selector).next() else {
                continue;
            };
            let show_id = show_link
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            let date_text = normalize_whitespace(&show_link.text().collect::<String>());
            let date = parse_mdy_any(&date_text);
            if date.is_none() {
                continue;
            }
            let venue = row
                .select(&venue_selector)
                .next()
                .map(|link| normalize_whitespace(&link.text().collect::<String>()))
                .unwrap_or_default();
            if venue.is_empty() {
                warn_missing_field("song_stats.performances", "venue");
            }
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let duration = regex(r"(\d+:\d{2})")
                .captures(&row_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            let notes = td_selector
                .as_ref()
                .and_then(|selector| row.select(selector).last())
                .map(|cell: ElementRef<'_>| normalize_whitespace(&cell.text().collect::<String>()))
                .filter(|v: &String| !v.is_empty());
            let lower_notes = notes.clone().unwrap_or_default().to_lowercase();
            let mut version = "full".to_string();
            let mut is_tease = false;
            let mut is_segue = false;
            if lower_notes.contains("tease") {
                version = "tease".to_string();
                is_tease = true;
            } else if lower_notes.contains("partial") {
                version = "partial".to_string();
            } else if lower_notes.contains("reprise") {
                version = "reprise".to_string();
            } else if lower_notes.contains("fake") {
                version = "fake".to_string();
            } else if lower_notes.contains("aborted") {
                version = "aborted".to_string();
            }
            if lower_notes.contains("->")
                || lower_notes.contains("»")
                || lower_notes.contains("segue")
            {
                is_segue = true;
            }
            if row_text.contains("->") || row_text.contains("»") || row_text.contains(">") {
                is_segue = true;
            }
            let is_on_release = release_img_selector
                .as_ref()
                .is_some_and(|selector| row.select(selector).next().is_some());
            performances.push(json!({
                "showId": show_id,
                "date": date,
                "venue": if venue.is_empty() { Value::Null } else { Value::String(venue) },
                "city": Value::Null,
                "state": Value::Null,
                "country": "USA",
                "duration": duration,
                "version": version,
                "isTease": is_tease,
                "isSegue": is_segue,
                "isOnRelease": is_on_release,
                "notes": notes,
                "guests": []
            }));
            if show_id.as_deref().unwrap_or("").is_empty() {
                warn_missing_field("song_stats.performances", "showId");
            }
        }
    }
    if performances.is_empty() {
        warn_missing_field("song_stats.performances", "performances");
    }
    performances
}
