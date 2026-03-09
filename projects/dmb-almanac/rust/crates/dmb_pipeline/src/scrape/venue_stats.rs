use scraper::Html;
use serde_json::{Value, json};

#[path = "venue_show_history.rs"]
mod venue_show_history;

use super::{
    normalize_whitespace, parse_date, parse_i64_or_warn, parse_location, parse_mdy_any, regex,
    select_first_text_with_fallback, selector_or_warn, validate_required_fields, warn_if_empty,
    warn_if_no_selector_match, warn_if_out_of_range, warn_missing_field,
};

pub(crate) use self::venue_show_history::parse_venue_show_history;

pub(super) fn parse_venue_stats_page(html: &str, venue_id: i32) -> Option<Value> {
    let document = Html::parse_document(html);
    let venue_name = select_first_text_with_fallback(
        &document,
        "venue_stats",
        "venueName",
        &["span.newsitem[style*='font-size:20px']", "h1", "h2"],
        &[".venue-name", ".page-title", "title"],
    );
    if venue_name.is_empty() {
        warn_missing_field("venue_stats", "venueName");
        return None;
    }
    let mut city = String::new();
    let mut state: Option<String> = None;
    let mut country = "USA".to_string();
    warn_if_no_selector_match(
        &document,
        "venue_stats",
        "locationSelector",
        &["span.news", ".venue-location", ".location"],
    );
    if let Some(sel) = selector_or_warn("span.news", "span.news") {
        warn_if_empty(&document, &sel, "venue_stats.location", "span.news");
        for el in document.select(&sel) {
            let text = normalize_whitespace(&el.text().collect::<String>());
            if let Some((c, s, co)) = parse_location(&text) {
                city = c;
                state = s;
                country = co;
                break;
            }
        }
    }
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    if city.is_empty()
        && let Some((c, s, co)) = parse_location(&body_text)
    {
        city = c;
        state = s;
        country = co;
    }
    if city.is_empty() {
        warn_missing_field("venue_stats", "city");
        return None;
    }

    warn_if_no_selector_match(
        &document,
        "venue_stats",
        "showHistorySelector",
        &["a[href*='ShowSetlist.aspx']", "a[href*='TourShowSet.aspx']"],
    );
    let total_shows = parse_i64_or_warn(
        regex(r"(?i)total\\s+(?:gigs|shows)\\s*:?\\s*(\\d+)")
            .captures(&body_text)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "venue_stats",
        "totalShows",
    );
    if total_shows > 0 {
        warn_if_out_of_range("venue_stats", "totalShows", total_shows, 1, 5000);
    }

    let first_show_date =
        regex(r"(?i)first\\s+(?:show|gig|performance)[:\\s]+([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})")
            .captures(&body_text)
            .and_then(|cap| cap.get(1))
            .map(|m| parse_date(m.as_str()));
    let last_show_date =
        regex(r"(?i)last\\s+(?:show|gig|performance)[:\\s]+([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})")
            .captures(&body_text)
            .and_then(|cap| cap.get(1))
            .map(|m| parse_date(m.as_str()));

    let capacity = regex(r"Seating\\s+Capacity:?\\s*([0-9,]+)")
        .captures(&body_text)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().replace(',', ""))
        .and_then(|v| v.parse::<i64>().ok());

    let mut aka_names: Vec<String> = Vec::new();
    if let Some(idx) = body_text.find("Previous Names:") {
        let section = &body_text[idx..body_text.len().min(idx + 300)];
        if let Some(cap) =
            regex(r"Names:?\\s*([A-Z][a-zA-Z\\s&\\-']+?)\\s+(?:Changed|Seating|Venue|Total)")
                .captures(section)
        {
            let cleaned = normalize_whitespace(cap.get(1).map_or("", |m| m.as_str()));
            if cleaned.len() > 3 {
                aka_names.push(cleaned);
            }
        }
    }
    if let Some(cap) =
        regex(r"(?i)(?:formerly|previously)\\s+(?:known as\\s+)?([^\\.]+)").captures(&body_text)
    {
        let cleaned = normalize_whitespace(cap.get(1).map_or("", |m| m.as_str()));
        if cleaned.len() > 3 && !aka_names.contains(&cleaned) {
            aka_names.push(cleaned);
        }
    }

    let mut top_songs: Vec<Value> = Vec::new();
    if let Some(song_sel) = selector_or_warn(
        "a[href*='/songs/summary.aspx'][href*='sid=']",
        "a[href*='/songs/summary.aspx'][href*='sid=']",
    ) {
        warn_if_empty(&document, &song_sel, "venue_stats.top_songs", "song_link");
        if let Some(row_selector) = selector_or_warn("tr", "tr") {
            warn_if_empty(&document, &row_selector, "venue_stats.top_songs", "tr");
            for row in document.select(&row_selector) {
                let Some(song_link) = row.select(&song_sel).next() else {
                    continue;
                };
                let song_title = normalize_whitespace(&song_link.text().collect::<String>());
                if song_title.is_empty() {
                    continue;
                }
                let song_id = song_link
                    .value()
                    .attr("href")
                    .and_then(|href| regex(r"sid=(\\d+)").captures(href))
                    .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
                if song_id.as_deref().unwrap_or("").is_empty() {
                    warn_missing_field("venue_stats", "songId");
                }
                let row_text = normalize_whitespace(&row.text().collect::<String>());
                let play_count_capture = regex(r"\\b(\\d+)\\b")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1))
                    .map(|m| m.as_str().to_string());
                let play_count = play_count_capture
                    .as_deref()
                    .and_then(|value| value.parse::<i64>().ok())
                    .unwrap_or_else(|| {
                        warn_missing_field("venue_stats.top_songs", "playCount");
                        1
                    });
                if !top_songs.iter().any(|v| {
                    v.get("title")
                        .and_then(|t| t.as_str())
                        .is_some_and(|t| t.eq_ignore_ascii_case(&song_title))
                }) {
                    top_songs.push(json!({
                        "title": song_title,
                        "playCount": play_count,
                        "songId": song_id,
                    }));
                }
            }
        }
    }
    top_songs.sort_by(|a, b| {
        b.get("playCount")
            .and_then(serde_json::Value::as_i64)
            .cmp(&a.get("playCount").and_then(serde_json::Value::as_i64))
    });
    top_songs.truncate(20);

    let mut notable_performances: Vec<String> = Vec::new();
    if let Some(idx) = body_text.find("Longest Performance:") {
        let section = &body_text[idx..body_text.len().min(idx + 200)];
        if let Some(cap) =
            regex(r"Performance:[\\s\\S]*?(\\d{1,2}\\.\\d{2}\\.\\d{2,4}.+?\\([0-9:]+\\))")
                .captures(section)
        {
            let perf = normalize_whitespace(cap.get(1).map_or("", |m| m.as_str()));
            if !perf.is_empty() {
                notable_performances.push(perf);
            }
        }
    }
    if let Some(img_sel) = selector_or_warn(
        "img[src*='cd'], img[src*='dvd'], img[src*='cast']",
        "img[src*='cd'], img[src*='dvd'], img[src*='cast']",
    ) {
        for img in document.select(&img_sel) {
            if let Some(alt) = img.value().attr("alt") {
                let cleaned = normalize_whitespace(alt);
                if !cleaned.is_empty() && !notable_performances.contains(&cleaned) {
                    notable_performances.push(cleaned);
                }
            }
        }
    }
    for cap in regex(r"(?i)first\\s+(?:played?|performance|show|gig)[^\\.]{0,100}")
        .captures_iter(&body_text)
    {
        let cleaned = normalize_whitespace(cap.get(0).map_or("", |m| m.as_str()));
        if cleaned.len() > 10 && !notable_performances.contains(&cleaned) {
            notable_performances.push(cleaned);
        }
    }
    for cap in regex(r"(?i)last\\s+(?:played?|performance|show|gig)[^\\.]{0,100}")
        .captures_iter(&body_text)
    {
        let cleaned = normalize_whitespace(cap.get(0).map_or("", |m| m.as_str()));
        if cleaned.len() > 10 && !notable_performances.contains(&cleaned) {
            notable_performances.push(cleaned);
        }
    }
    notable_performances.truncate(10);

    let mut notes: Option<String> = None;
    if let Some(idx) = body_text.find("Description") {
        let section = &body_text[idx..body_text.len().min(idx + 500)];
        if let Some(cap) =
            regex(r"Description[\\s\\S]*?(The .+?)(?=Sort|Order|Alphabetically|\\n\\s*\\n|$)")
                .captures(section)
        {
            let cleaned = normalize_whitespace(cap.get(1).map_or("", |m| m.as_str()));
            if cleaned.len() > 10 {
                notes = Some(cleaned);
            }
        }
    }

    let shows = parse_venue_show_history(&document);
    if total_shows > 0 && shows.is_empty() {
        warn_missing_field("venue_stats", "shows");
    }
    if total_shows > 0 && top_songs.is_empty() {
        warn_missing_field("venue_stats", "topSongs");
    }

    let mut partial = false;
    if total_shows > 0 && shows.is_empty() {
        partial = true;
    }
    if total_shows > 0 && top_songs.is_empty() {
        partial = true;
    }

    let mut result = json!({
        "originalId": venue_id,
        "venueName": venue_name,
        "city": city,
        "state": state,
        "country": country,
        "firstShowDate": first_show_date,
        "lastShowDate": last_show_date,
        "totalShows": total_shows,
        "capacity": capacity,
        "akaNames": aka_names,
        "topSongs": top_songs,
        "notes": notes,
        "notablePerformances": notable_performances,
        "shows": shows
    });
    validate_required_fields(
        "venue_stats",
        &result,
        &["originalId", "venueName", "city", "totalShows"],
    );
    if partial && let Some(obj) = result.as_object_mut() {
        obj.insert("_partial".to_string(), Value::Bool(true));
    }
    Some(result)
}
