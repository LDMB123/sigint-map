use scraper::Html;
use serde_json::{Value, json};

use super::super::{
    normalize_whitespace, parse_i64_or_warn, parse_mdy_any, regex, selector_or_warn, warn_if_empty,
    warn_missing_field,
};

pub(super) fn parse_slot_breakdown(document: &Html, body_text: &str) -> Value {
    let extract = |pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.slot_breakdown",
            field,
        )
    };
    let extract_from = |text: &str, pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.slot_breakdown",
            field,
        )
    };

    let mut opener = extract(r"(?i)opener[:\s]+(\d+)", "opener");
    let mut set1_closer = extract(r"(?i)set\s*1\s*closer[:\s]+(\d+)", "set1Closer");
    let mut set2_opener = extract(r"(?i)set\s*2\s*opener[:\s]+(\d+)", "set2Opener");
    let mut closer = extract(r"(?i)(?:set2closer|closer)[:\s]+(\d+)", "closer");
    let mut midset = extract(r"(?i)midset[:\s]+(\d+)", "midset");
    let mut encore2 = extract(r"(?i)encore\s*2[:\s]+(\d+)", "encore2");
    let cleaned_text = regex(r"(?i)encore\s*2[:\s]+\d+").replace_all(body_text, " ");
    let mut encore = extract_from(&cleaned_text, r"(?i)encore[:\s]+(\d+)", "encore");

    let total_from_text = opener + set1_closer + set2_opener + closer + midset + encore + encore2;
    if total_from_text < 5 {
        let count = |selector: &str| -> i64 {
            selector_or_warn("setlist count selector", selector).map_or_else(
                || {
                    warn_missing_field("song_stats.slot_breakdown", "setlistRows");
                    0
                },
                |sel| i64::try_from(document.select(&sel).count()).unwrap_or(i64::MAX),
            )
        };
        opener = count("tr.opener, tr[class*='opener']");
        set1_closer = count("tr.set1closer, tr[class*='set1closer']");
        set2_opener = count("tr.set2opener, tr[class*='set2opener']");
        closer = count("tr.closer, tr[class*='closer']");
        midset = count("tr.midset, tr[class*='midset']");
        let encore_all = count("tr.encore, tr[class*='encore']");
        encore2 = count("tr.encore2, tr[class*='encore2']");
        encore = (encore_all - encore2).max(0);
    }

    json!({
        "opener": opener,
        "set1Closer": set1_closer,
        "set2Opener": set2_opener,
        "closer": closer,
        "midset": midset,
        "encore": encore,
        "encore2": encore2
    })
}

pub(super) fn parse_version_types(body_text: &str) -> Value {
    let extract = |pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.version_types",
            field,
        )
    };
    json!({
        "full": extract(r"(?i)(?:full|complete)\s+versions?[:\s]+(\d+)", "full"),
        "tease": extract(r"(?i)tease[:\s]+(\d+)", "tease"),
        "partial": extract(r"(?i)partial[:\s]+(\d+)", "partial"),
        "reprise": extract(r"(?i)reprise[:\s]+(\d+)", "reprise"),
        "fake": extract(r"(?i)fake[:\s]+(\d+)", "fake"),
        "aborted": extract(r"(?i)aborted[:\s]+(\d+)", "aborted")
    })
}

pub(super) fn parse_duration_extremes(document: &Html) -> (Value, Value) {
    let Some(row_selector) = selector_or_warn("tr, .song-performance", "tr, .song-performance")
    else {
        return (Value::Null, Value::Null);
    };
    let Some(show_link_selector) = selector_or_warn(
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
        "a[href*='ShowSetlist'], a[href*='TourShowSet']",
    ) else {
        return (Value::Null, Value::Null);
    };
    let Some(venue_selector) = selector_or_warn("a[href*='VenueStats']", "a[href*='VenueStats']")
    else {
        return (Value::Null, Value::Null);
    };
    warn_if_empty(
        document,
        &row_selector,
        "song_stats.duration_extremes",
        "tr,.song-performance",
    );
    warn_if_empty(
        document,
        &show_link_selector,
        "song_stats.duration_extremes",
        "show_link",
    );
    warn_if_empty(
        document,
        &venue_selector,
        "song_stats.duration_extremes",
        "venue_link",
    );
    let mut longest: Option<Value> = None;
    let mut shortest: Option<Value> = None;
    for row in document.select(&row_selector) {
        let text = normalize_whitespace(&row.text().collect::<String>());
        let Some(caps) = regex(r"(\d+):(\d{2})").captures(&text) else {
            continue;
        };
        let minutes = parse_i64_or_warn(
            caps.get(1).map(|m| m.as_str()),
            "song_stats.duration_extremes",
            "minutes",
        );
        let seconds = parse_i64_or_warn(
            caps.get(2).map(|m| m.as_str()),
            "song_stats.duration_extremes",
            "seconds",
        );
        if seconds >= 60 {
            continue;
        }
        let total_seconds = minutes * 60 + seconds;
        if !(30_i64..=1800_i64).contains(&total_seconds) {
            continue;
        }
        let Some(date_match) = regex(r"(\d{1,2}[\./]\d{1,2}[\./]\d{2,4})")
            .captures(&text)
            .and_then(|cap| cap.get(1))
            .and_then(|m| parse_mdy_any(m.as_str()))
        else {
            continue;
        };
        let show_id = row
            .select(&show_link_selector)
            .next()
            .and_then(|link| link.value().attr("href"))
            .and_then(|href| regex(r"id=(\d+)").captures(href))
            .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()));
        let venue = row
            .select(&venue_selector)
            .next()
            .map(|link| normalize_whitespace(&link.text().collect::<String>()))
            .filter(|v: &String| !v.is_empty())
            .unwrap_or_else(|| "Unknown".to_string());
        let entry = json!({
            "durationSeconds": total_seconds,
            "date": date_match,
            "showId": show_id,
            "venue": venue
        });
        if longest
            .as_ref()
            .and_then(|v| v.get("durationSeconds"))
            .and_then(serde_json::Value::as_i64)
            .is_none_or(|d| total_seconds > d)
        {
            longest = Some(entry.clone());
        }
        if shortest
            .as_ref()
            .and_then(|v| v.get("durationSeconds"))
            .and_then(serde_json::Value::as_i64)
            .is_none_or(|d| total_seconds < d)
        {
            shortest = Some(entry);
        }
    }
    (
        longest.unwrap_or(Value::Null),
        shortest.unwrap_or(Value::Null),
    )
}

pub(super) fn parse_release_counts(body_text: &str) -> Value {
    let extract = |pattern: &str, field: &str| -> i64 {
        parse_i64_or_warn(
            regex(pattern)
                .captures(body_text)
                .and_then(|cap| cap.get(1).map(|m| m.as_str())),
            "song_stats.release_counts",
            field,
        )
    };
    json!({
        "total": extract(r"(?i)(\d+)\s+(?:official\s+)?releases?", "total"),
        "studio": extract(r"(?i)(\d+)\s+studio", "studio"),
        "live": extract(r"(?i)(\d+)\s+live\s+(?:releases?|albums?)", "live"),
        "dmblive": extract(r"(?i)(\d+)\s+dmblive", "dmblive"),
        "warehouse": extract(r"(?i)(\d+)\s+warehouse", "warehouse"),
        "liveTrax": extract(r"(?i)(\d+)\s+live\s*trax", "liveTrax"),
        "broadcasts": extract(r"(?i)(\d+)\s+broadcasts?", "broadcasts")
    })
}

pub(super) fn parse_artist_stats(body_text: &str) -> Vec<Value> {
    let mut stats = Vec::new();
    let dmb_match = regex(r"(?i)(?:dave\s+matthews\s+band|dmb)[^\d]*(\d+)\s+times?")
        .captures(body_text)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse::<i64>().ok());
    let dt_match = regex(r"(?i)(?:dave\s*&\s*tim|d&t)[^\d]*(\d+)\s+times?")
        .captures(body_text)
        .and_then(|cap| cap.get(1))
        .and_then(|m| m.as_str().parse::<i64>().ok());
    if let Some(plays) = dmb_match {
        stats.push(json!({
            "artistName": "Dave Matthews Band",
            "playCount": plays,
            "avgLength": Value::Null,
            "percentOfTotal": 0
        }));
    }
    if let Some(plays) = dt_match {
        stats.push(json!({
            "artistName": "Dave & Tim",
            "playCount": plays,
            "avgLength": Value::Null,
            "percentOfTotal": 0
        }));
    }
    let total: i64 = stats
        .iter()
        .filter_map(|v| v.get("playCount").and_then(serde_json::Value::as_i64))
        .sum();
    if total > 0 {
        for stat in &mut stats {
            if let Some(count) = stat.get("playCount").and_then(serde_json::Value::as_i64) {
                let percent = (count as f64 / total as f64) * 100.0;
                if let Some(obj) = stat.as_object_mut() {
                    obj.insert("percentOfTotal".to_string(), json!(percent));
                }
            }
        }
    }
    stats
}
