use anyhow::Result;
use dmb_core::Guest;
use scraper::Html;
use serde_json::{Value, json};

use super::{
    BASE_URL, ScrapeClient, normalize_whitespace, parse_i64_or_warn, parse_location, parse_mdy_any,
    regex, selector_or_warn, validate_required_fields, warn_if_empty, warn_if_no_selector_match,
    warn_if_out_of_range, warn_missing_field,
};

pub(super) fn scrape_guest_shows(client: &ScrapeClient, guests: &[Guest]) -> Result<Vec<Value>> {
    let mut entries = Vec::new();
    for guest in guests {
        if guest.id <= 0 {
            continue;
        }
        let url = format!("{BASE_URL}/TourGuestShows.aspx?gid={}", guest.id);
        let html = client.fetch_html(&url)?;
        let entry = parse_guest_shows_page(&html, guest.id, &guest.name);
        entries.push(entry);
    }
    Ok(entries)
}

pub(super) fn parse_guest_shows_page(html: &str, guest_id: i32, guest_name: &str) -> Value {
    let document = Html::parse_document(html);
    let mut appearances: Vec<Value> = Vec::new();
    let mut first_date: Option<String> = None;
    let mut last_date: Option<String> = None;

    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return empty_guest_shows_response(guest_id, guest_name, None, None);
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='TourShowSet.aspx'][href*='id=']",
        "a[href*='TourShowSet.aspx'][href*='id=']",
    ) else {
        return empty_guest_shows_response(guest_id, guest_name, None, None);
    };
    let Some(venue_selector) =
        selector_or_warn("a[href*='VenueStats.aspx']", "a[href*='VenueStats.aspx']")
    else {
        return empty_guest_shows_response(guest_id, guest_name, None, None);
    };
    let Some(song_selector) = selector_or_warn(
        "a[href*='SongStats.aspx'][href*='sid='], a[href*='summary.aspx'][href*='sid=']",
        "a[href*='SongStats.aspx'][href*='sid='], a[href*='summary.aspx'][href*='sid=']",
    ) else {
        return empty_guest_shows_response(guest_id, guest_name, None, None);
    };
    warn_if_no_selector_match(
        &document,
        "guest_shows",
        "showSelector",
        &[
            "a[href*='TourShowSet.aspx'][href*='id=']",
            "a[href*='ShowSetlist.aspx'][href*='id=']",
        ],
    );
    warn_if_no_selector_match(
        &document,
        "guest_shows",
        "venueSelector",
        &["a[href*='VenueStats.aspx']"],
    );
    warn_if_no_selector_match(
        &document,
        "guest_shows",
        "songSelector",
        &[
            "a[href*='SongStats.aspx'][href*='sid=']",
            "a[href*='summary.aspx'][href*='sid=']",
        ],
    );
    warn_if_empty(&document, &row_selector, "guest_shows", "tr");
    warn_if_empty(&document, &show_link_selector, "guest_shows", "show_link");
    warn_if_empty(&document, &venue_selector, "guest_shows", "venue_link");
    warn_if_empty(&document, &song_selector, "guest_shows", "song_link");

    for row in document.select(&row_selector) {
        let Some(show_link) = row.select(&show_link_selector).next() else {
            continue;
        };
        let show_id = show_link
            .value()
            .attr("href")
            .and_then(|href| regex(r"id=(\\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
        if show_id.as_deref().unwrap_or("").is_empty() {
            warn_missing_field("guest_shows", "showId");
        }
        let row_text = normalize_whitespace(&row.text().collect::<String>());
        let show_date = regex(r"(\\d{2}\\.[\\d]{2}\\.\\d{4}|\\d{4}-\\d{2}-\\d{2})")
            .captures(&row_text)
            .and_then(|cap| cap.get(1))
            .and_then(|m| {
                let value = m.as_str();
                parse_mdy_any(value).or_else(|| {
                    if regex(r"^\\d{4}-\\d{2}-\\d{2}$").is_match(value) {
                        Some(value.to_string())
                    } else {
                        None
                    }
                })
            });
        if let Some(date) = &show_date {
            if first_date.as_ref().is_none_or(|d| date < d) {
                first_date = Some(date.clone());
            }
            if last_date.as_ref().is_none_or(|d| date > d) {
                last_date = Some(date.clone());
            }
        }
        let venue_name = row
            .select(&venue_selector)
            .next()
            .map(|link| normalize_whitespace(&link.text().collect::<String>()))
            .unwrap_or_default();
        let (city, state, country) =
            parse_location(&row_text).unwrap_or((String::new(), None, "USA".to_string()));

        let mut songs: Vec<Value> = Vec::new();
        for song_link in row.select(&song_selector) {
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
                warn_missing_field("guest_shows", "songId");
            }
            let context_text = normalize_whitespace(&row_text).to_lowercase();
            let instruments = detect_instruments(&context_text);
            songs.push(json!({
                "songTitle": song_title,
                "songId": song_id,
                "instruments": instruments
            }));
        }
        appearances.push(json!({
            "showId": show_id,
            "showDate": show_date,
            "venueName": if venue_name.is_empty() { Value::Null } else { Value::String(venue_name) },
            "city": if city.is_empty() { Value::Null } else { Value::String(city) },
            "state": state,
            "country": country,
            "songs": songs
        }));
    }

    if appearances.is_empty() {
        let Some(li_selector) = selector_or_warn(
            "li, .show-entry, .appearance",
            "li, .show-entry, .appearance",
        ) else {
            return empty_guest_shows_response(guest_id, guest_name, first_date, last_date);
        };
        warn_if_empty(&document, &li_selector, "guest_shows", "li");
        for item in document.select(&li_selector) {
            let Some(show_link) = item.select(&show_link_selector).next() else {
                continue;
            };
            let show_id = show_link
                .value()
                .attr("href")
                .and_then(|href| regex(r"id=(\\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
            if show_id.as_deref().unwrap_or("").is_empty() {
                warn_missing_field("guest_shows", "showId");
            }
            let text = normalize_whitespace(&item.text().collect::<String>());
            let show_date = parse_mdy_any(&text);
            let venue_name = item.select(&venue_selector).next().map_or_else(
                || normalize_whitespace(&show_link.text().collect::<String>()),
                |link| normalize_whitespace(&link.text().collect::<String>()),
            );
            appearances.push(json!({
                "showId": show_id,
                "showDate": show_date,
                "venueName": if venue_name.is_empty() { Value::Null } else { Value::String(venue_name) },
                "city": Value::Null,
                "state": Value::Null,
                "country": "USA",
                "songs": []
            }));
        }
    }

    let total_appearances = regex(r"(\\d+)\\s+(?:total\\s+)?(?:appearances?|shows?|performances?)")
        .captures(&document.root_element().text().collect::<Vec<_>>().join(" "))
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .map_or_else(
            || i64::try_from(appearances.len()).unwrap_or(i64::MAX),
            |value| parse_i64_or_warn(Some(value), "guest_shows", "totalAppearances"),
        );
    if total_appearances > 0 {
        warn_if_out_of_range(
            "guest_shows",
            "totalAppearances",
            total_appearances,
            1,
            2000,
        );
    }

    if total_appearances > 0 && appearances.is_empty() {
        warn_missing_field("guest_shows", "appearances");
    }

    let mut result = json!({
        "guestId": guest_id,
        "guestName": guest_name,
        "totalAppearances": total_appearances,
        "firstAppearanceDate": first_date,
        "lastAppearanceDate": last_date,
        "appearances": appearances
    });
    validate_required_fields(
        "guest_shows",
        &result,
        &["guestId", "guestName", "totalAppearances", "appearances"],
    );
    if total_appearances > 0 {
        let empty = result
            .get("appearances")
            .and_then(|v| v.as_array())
            .is_none_or(std::vec::Vec::is_empty);
        if empty && let Some(obj) = result.as_object_mut() {
            obj.insert("_partial".to_string(), Value::Bool(true));
        }
    }
    result
}

fn empty_guest_shows_response(
    guest_id: i32,
    guest_name: &str,
    first_date: Option<String>,
    last_date: Option<String>,
) -> Value {
    json!({
        "guestId": guest_id,
        "guestName": guest_name,
        "totalAppearances": 0,
        "firstAppearanceDate": first_date,
        "lastAppearanceDate": last_date,
        "appearances": []
    })
}

fn detect_instruments(context_text: &str) -> Vec<String> {
    let mut instruments = Vec::new();
    let patterns = [
        "guitar",
        "bass",
        "drums",
        "percussion",
        "keyboard",
        "piano",
        "violin",
        "viola",
        "cello",
        "trumpet",
        "saxophone",
        "sax",
        "harmonica",
        "vocals",
        "backing vocals",
        "lead vocals",
        "mandolin",
        "banjo",
        "fiddle",
        "flute",
        "clarinet",
    ];
    for pattern in patterns {
        if context_text.contains(pattern) {
            instruments.push(pattern.to_string());
        }
    }
    instruments.sort();
    instruments.dedup();
    instruments
}
