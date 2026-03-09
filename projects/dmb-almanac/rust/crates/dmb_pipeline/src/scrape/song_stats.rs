use scraper::Html;
use serde_json::{json, Value};

use super::{
    object_all_zero, parse_date_any, parse_i64_or_warn, regex, validate_required_fields,
    warn_if_missing_value, warn_if_no_selector_match, warn_missing_field,
};

#[path = "song_stats_metrics.rs"]
mod song_stats_metrics;
#[path = "song_stats_tables.rs"]
mod song_stats_tables;

#[cfg(test)]
pub(super) use self::song_stats_tables::{parse_plays_by_year, parse_top_segues};
pub(super) use self::song_stats_tables::{parse_song_liberations, parse_song_performances};

pub(super) fn parse_song_stats_page(html: &str, song_id: i32, song_title: &str) -> Value {
    let document = Html::parse_document(html);
    let body_text = document.root_element().text().collect::<Vec<_>>().join(" ");

    warn_if_no_selector_match(
        &document,
        "song_stats",
        "performanceSelector",
        &["a[href*='ShowSetlist.aspx']", "a[href*='TourShowSet.aspx']"],
    );
    warn_if_no_selector_match(
        &document,
        "song_stats",
        "segueSelector",
        &[
            "a[href*='summary.aspx'][href*='sid=']",
            "a[href*='SongStats.aspx'][href*='sid=']",
        ],
    );

    let total_plays = parse_i64_or_warn(
        regex(r"(?i)played?\s+(\d+)\s+times?")
            .captures(&body_text)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "song_stats",
        "totalPlays",
    );

    let first_played_date = regex(
        r"(?i)(?:first|debut)[^\d]*(\d{1,2}[\./]\d{1,2}[\./]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
    )
    .captures(&body_text)
    .and_then(|cap| cap.get(1))
    .and_then(|m| parse_date_any(m.as_str()));

    let last_played_date = regex(
        r"(?i)last\s+(?:fully\s+)?played[^\d]*(\d{1,2}[\./]\d{1,2}[\./]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
    )
    .captures(&body_text)
    .and_then(|cap| cap.get(1))
    .and_then(|m| parse_date_any(m.as_str()));

    let avg_length_seconds = regex(r"(?i)average[^\d]*(\d+):(\d{2})")
        .captures(&body_text)
        .and_then(|cap| {
            let minutes = cap.get(1)?.as_str().parse::<i64>().ok()?;
            let seconds = cap.get(2)?.as_str().parse::<i64>().ok()?;
            Some(minutes * 60 + seconds)
        });

    let years_active = parse_i64_or_warn(
        regex(r"(\d+)\s+years?")
            .captures(&body_text)
            .and_then(|cap| cap.get(1).map(|m| m.as_str())),
        "song_stats",
        "yearsActive",
    );

    let gap_days = regex(r"(\d+)\s+days?\s+since")
        .captures(&body_text)
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .map(|value| parse_i64_or_warn(Some(value), "song_stats", "currentGap.days"));
    let gap_shows = regex(r"(\d+)\s+shows?\s+since")
        .captures(&body_text)
        .and_then(|cap| cap.get(1).map(|m| m.as_str()))
        .map(|value| parse_i64_or_warn(Some(value), "song_stats", "currentGap.shows"));
    let current_gap = if gap_days.is_some() || gap_shows.is_some() {
        json!({
            "days": gap_days.unwrap_or_else(|| {
                warn_missing_field("song_stats", "currentGap.days");
                0
            }),
            "shows": gap_shows.unwrap_or_else(|| {
                warn_missing_field("song_stats", "currentGap.shows");
                0
            })
        })
    } else {
        Value::Null
    };

    let slot_breakdown = song_stats_metrics::parse_slot_breakdown(&document, &body_text);
    let version_types = song_stats_metrics::parse_version_types(&body_text);
    let (longest_version, shortest_version) =
        song_stats_metrics::parse_duration_extremes(&document);
    let top_segues_into = song_stats_tables::parse_top_segues(&document, true);
    let top_segues_from = song_stats_tables::parse_top_segues(&document, false);
    let plays_by_year = song_stats_tables::parse_plays_by_year(&document);
    let release_counts = song_stats_metrics::parse_release_counts(&body_text);
    let liberations = song_stats_tables::parse_song_liberations(&document);
    let artist_stats = song_stats_metrics::parse_artist_stats(&body_text);
    let performances = song_stats_tables::parse_song_performances(&document);

    let mut result = json!({
        "originalId": song_id,
        "title": song_title,
        "slotBreakdown": slot_breakdown,
        "versionTypes": version_types,
        "avgLengthSeconds": avg_length_seconds,
        "longestVersion": longest_version,
        "shortestVersion": shortest_version,
        "topSeguesInto": top_segues_into,
        "topSeguesFrom": top_segues_from,
        "releaseCounts": release_counts,
        "playsByYear": plays_by_year,
        "artistStats": artist_stats,
        "liberations": liberations,
        "totalPlays": total_plays,
        "firstPlayedDate": first_played_date,
        "lastPlayedDate": last_played_date,
        "yearsActive": years_active,
        "currentGap": current_gap,
        "performances": performances
    });

    let mut partial = false;
    warn_if_missing_value(
        "song_stats",
        "firstPlayedDate",
        result.get("firstPlayedDate"),
    );
    if result
        .get("firstPlayedDate")
        .and_then(|v| v.as_str())
        .is_none()
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "lastPlayedDate", result.get("lastPlayedDate"));
    if result
        .get("lastPlayedDate")
        .and_then(|v| v.as_str())
        .is_none()
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "playsByYear", result.get("playsByYear"));
    if result
        .get("playsByYear")
        .and_then(|v| v.as_array())
        .is_none_or(std::vec::Vec::is_empty)
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "performances", result.get("performances"));
    if result
        .get("performances")
        .and_then(|v| v.as_array())
        .is_none_or(std::vec::Vec::is_empty)
    {
        partial = true;
    }
    warn_if_missing_value("song_stats", "longestVersion", result.get("longestVersion"));
    warn_if_missing_value(
        "song_stats",
        "shortestVersion",
        result.get("shortestVersion"),
    );

    if total_plays > 0 {
        if let Some(version_types) = result.get("versionTypes") {
            if object_all_zero(version_types) {
                warn_missing_field("song_stats", "versionTypes");
            }
        }
        if let Some(slot_breakdown) = result.get("slotBreakdown") {
            if object_all_zero(slot_breakdown) {
                warn_missing_field("song_stats", "slotBreakdown");
            }
        }
        if artist_stats.is_empty() {
            warn_missing_field("song_stats", "artistStats");
        }
    }

    validate_required_fields(
        "song_stats",
        &result,
        &[
            "originalId",
            "title",
            "totalPlays",
            "playsByYear",
            "performances",
        ],
    );

    if partial {
        if let Some(obj) = result.as_object_mut() {
            obj.insert("_partial".to_string(), Value::Bool(true));
        }
    }
    result
}
