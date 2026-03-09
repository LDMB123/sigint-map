use scraper::Html;
use serde_json::{Value, json};

use super::super::super::{
    normalize_whitespace, parse_i64_or_warn, regex, selector_or_warn, warn_if_empty,
    warn_missing_field,
};

pub(crate) fn parse_top_segues(document: &Html, into: bool) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    let Some(link_selector) = selector_or_warn(
        "a[href*='summary.aspx?sid='], a[href*='SongStats.aspx?sid=']",
        "a[href*='summary.aspx?sid='], a[href*='SongStats.aspx?sid=']",
    ) else {
        return Vec::new();
    };
    warn_if_empty(
        document,
        &table_selector,
        if into {
            "song_stats.top_segues.into"
        } else {
            "song_stats.top_segues.from"
        },
        "table",
    );
    warn_if_empty(
        document,
        &row_selector,
        if into {
            "song_stats.top_segues.into"
        } else {
            "song_stats.top_segues.from"
        },
        "tr",
    );
    warn_if_empty(
        document,
        &link_selector,
        if into {
            "song_stats.top_segues.into"
        } else {
            "song_stats.top_segues.from"
        },
        "song_link",
    );
    let mut results: Vec<Value> = Vec::new();
    let keywords = if into {
        vec![
            "top segue",
            "transitions into",
            "followed by",
            "segues into",
        ]
    } else {
        vec!["preceded", "came from", "segued from", "transitions from"]
    };

    for table in document.select(&table_selector) {
        let table_text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        if !keywords.iter().any(|kw| table_text.contains(kw)) {
            continue;
        }
        for row in table.select(&row_selector) {
            let Some(link) = row.select(&link_selector).next() else {
                continue;
            };
            let song_title = normalize_whitespace(&link.text().collect::<String>());
            let song_id = link
                .value()
                .attr("href")
                .and_then(|href| regex(r"sid=(\d+)").captures(href))
                .and_then(|cap| cap.get(1).map(|m| m.as_str().to_string()))
                .unwrap_or_default();
            if song_title.is_empty() {
                warn_missing_field("song_stats.top_segues", "songTitle");
                continue;
            }
            if song_id.is_empty() {
                warn_missing_field("song_stats", "songId");
            }
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let count = parse_i64_or_warn(
                regex(r"(\d+)\s*(?:times?|x|count)?")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.top_segues",
                "count",
            )
            .max(1);
            results.push(json!({
                "songTitle": song_title,
                "songId": song_id,
                "count": count
            }));
        }
    }
    results.sort_by(|a, b| {
        b.get("count")
            .and_then(serde_json::Value::as_i64)
            .cmp(&a.get("count").and_then(serde_json::Value::as_i64))
    });
    results.truncate(10);
    if results.is_empty() {
        if into {
            warn_missing_field("song_stats", "topSeguesInto");
        } else {
            warn_missing_field("song_stats", "topSeguesFrom");
        }
    }
    results
}

pub(crate) fn parse_plays_by_year(document: &Html) -> Vec<Value> {
    let Some(table_selector) = selector_or_warn("table", "table") else {
        return Vec::new();
    };
    let Some(row_selector) = selector_or_warn("tr", "tr") else {
        return Vec::new();
    };
    warn_if_empty(
        document,
        &table_selector,
        "song_stats.plays_by_year",
        "table",
    );
    warn_if_empty(document, &row_selector, "song_stats.plays_by_year", "tr");
    let mut plays: std::collections::HashMap<i64, i64> = std::collections::HashMap::new();
    for table in document.select(&table_selector) {
        let text = normalize_whitespace(&table.text().collect::<String>()).to_lowercase();
        if !(text.contains("by year")
            || text.contains("year breakdown")
            || text.contains("performances by year"))
        {
            continue;
        }
        for row in table.select(&row_selector) {
            let row_text = normalize_whitespace(&row.text().collect::<String>());
            let year = parse_i64_or_warn(
                regex(r"\b(19\d{2}|20[0-2]\d)\b")
                    .captures(&row_text)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.plays_by_year",
                "year",
            );
            if year == 0 {
                continue;
            }

            let row_without_year = row_text.replace(&year.to_string(), " ");
            let count = parse_i64_or_warn(
                regex(r"(\d+)\s*(?:times?|plays?|performances?)?")
                    .captures(&row_without_year)
                    .and_then(|cap| cap.get(1).map(|m| m.as_str())),
                "song_stats.plays_by_year",
                "count",
            );
            let count = if count == 0 {
                if let Some(td_sel) = selector_or_warn("td", "td") {
                    let mut numbers: Vec<i64> = row
                        .select(&td_sel)
                        .filter_map(|cell| {
                            let text = normalize_whitespace(&cell.text().collect::<String>());
                            text.parse::<i64>().ok()
                        })
                        .collect();
                    numbers.retain(|value| *value != year);
                    numbers.into_iter().max().unwrap_or_else(|| {
                        warn_missing_field("song_stats.plays_by_year", "count");
                        0
                    })
                } else {
                    warn_missing_field("song_stats.plays_by_year", "count");
                    0
                }
            } else {
                count
            };
            if count == 0 {
                tracing::warn!(
                    year,
                    row = row_text.as_str(),
                    "plays_by_year row missing count"
                );
                warn_missing_field("song_stats.plays_by_year", "count");
            }
            if count > 0 {
                plays.insert(year, count);
            }
        }
    }
    let mut entries: Vec<Value> = plays
        .into_iter()
        .map(|(year, count)| json!({ "year": year, "plays": count }))
        .collect();
    entries.sort_by(|a, b| {
        a.get("year")
            .and_then(serde_json::Value::as_i64)
            .cmp(&b.get("year").and_then(serde_json::Value::as_i64))
    });
    if entries.is_empty() {
        warn_missing_field("song_stats", "playsByYear");
    }
    entries
}
