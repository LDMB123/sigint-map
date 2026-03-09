use super::*;

#[test]
fn snapshot_song_stats_extracts_core_fields() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/song_stats.html");
        let parsed = parse_song_stats_page(html, 42, "Test Song");
        assert_eq!(
            parsed.get("totalPlays").and_then(serde_json::Value::as_i64),
            Some(12)
        );
        assert_eq!(
            parsed.get("firstPlayedDate").and_then(|v| v.as_str()),
            Some("1999-01-01")
        );
        assert_eq!(
            parsed.get("lastPlayedDate").and_then(|v| v.as_str()),
            Some("2000-12-31")
        );
        assert_eq!(
            parsed
                .get("avgLengthSeconds")
                .and_then(serde_json::Value::as_i64),
            Some(330)
        );

        let Some(longest) = parsed.get("longestVersion") else {
            panic!("longestVersion missing");
        };
        assert_eq!(longest.get("showId").and_then(|v| v.as_str()), Some("123"));
        assert_eq!(
            longest.get("venue").and_then(|v| v.as_str()),
            Some("Test Venue")
        );
        let Some(shortest) = parsed.get("shortestVersion") else {
            panic!("shortestVersion missing");
        };
        assert_eq!(shortest.get("showId").and_then(|v| v.as_str()), Some("123"));

        let plays = parsed
            .get("playsByYear")
            .and_then(|v| v.as_array())
            .unwrap_or_else(|| panic!("playsByYear missing"));
        assert_eq!(plays.len(), 1);
        assert_eq!(
            plays[0].get("year").and_then(serde_json::Value::as_i64),
            Some(2001)
        );
        assert_eq!(
            plays[0].get("plays").and_then(serde_json::Value::as_i64),
            Some(12)
        );

        let segues = parsed
            .get("topSeguesInto")
            .and_then(|v| v.as_array())
            .unwrap_or_else(|| panic!("topSeguesInto missing"));
        assert_eq!(segues.len(), 1);
        assert_eq!(
            segues[0].get("songId").and_then(|v| v.as_str()),
            Some("100")
        );

        let segues_from = parsed
            .get("topSeguesFrom")
            .and_then(|v| v.as_array())
            .unwrap_or_else(|| panic!("topSeguesFrom missing"));
        assert_eq!(segues_from.len(), 1);
        assert_eq!(
            segues_from[0].get("songId").and_then(|v| v.as_str()),
            Some("200")
        );

        let version_types = parsed
            .get("versionTypes")
            .and_then(|v| v.as_object())
            .unwrap_or_else(|| panic!("versionTypes missing"));
        assert_eq!(
            version_types
                .get("full")
                .and_then(serde_json::Value::as_i64),
            Some(10)
        );
        assert_eq!(
            version_types
                .get("tease")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );

        let release_counts = parsed
            .get("releaseCounts")
            .and_then(|v| v.as_object())
            .unwrap_or_else(|| panic!("releaseCounts missing"));
        assert_eq!(
            release_counts
                .get("total")
                .and_then(serde_json::Value::as_i64),
            Some(10)
        );
        assert_eq!(
            release_counts
                .get("studio")
                .and_then(serde_json::Value::as_i64),
            Some(2)
        );
        assert_eq!(
            release_counts
                .get("live")
                .and_then(serde_json::Value::as_i64),
            Some(3)
        );
        assert_eq!(
            release_counts
                .get("dmblive")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
        assert_eq!(
            release_counts
                .get("warehouse")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
        assert_eq!(
            release_counts
                .get("liveTrax")
                .and_then(serde_json::Value::as_i64),
            Some(2)
        );
        assert_eq!(
            release_counts
                .get("broadcasts")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );

        let artist_stats = parsed
            .get("artistStats")
            .and_then(|v| v.as_array())
            .unwrap_or_else(|| panic!("artistStats missing"));
        assert_eq!(artist_stats.len(), 2);
        assert_eq!(
            artist_stats[0]
                .get("playCount")
                .and_then(serde_json::Value::as_i64),
            Some(8)
        );
        assert_eq!(
            artist_stats[1]
                .get("playCount")
                .and_then(serde_json::Value::as_i64),
            Some(4)
        );
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}

#[test]
fn snapshot_venue_stats_extracts_core_fields() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/venue_stats.html");
        let parsed = parse_venue_stats_page(html, 99);
        assert!(parsed.is_some(), "venue stats missing");
        let Some(parsed) = parsed else {
            panic!("venue stats missing");
        };
        assert_eq!(
            parsed.get("venueName").and_then(|v| v.as_str()),
            Some("The Gorge Amphitheatre")
        );
        assert_eq!(parsed.get("city").and_then(|v| v.as_str()), Some("George"));
        assert_eq!(parsed.get("state").and_then(|v| v.as_str()), Some("WA"));
        assert_eq!(
            parsed.get("totalShows").and_then(serde_json::Value::as_i64),
            Some(10)
        );
        assert_eq!(
            parsed.get("firstShowDate").and_then(|v| v.as_str()),
            Some("1995-01-01")
        );
        let shows = parsed
            .get("shows")
            .and_then(|v| v.as_array())
            .unwrap_or_else(|| panic!("shows missing"));
        assert!(!shows.is_empty());
        assert_eq!(shows[0].get("showId").and_then(|v| v.as_str()), Some("321"));
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}

#[test]
fn snapshot_guest_shows_extracts_core_fields() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/guest_shows.html");
        let parsed = parse_guest_shows_page(html, 7, "Guest X");
        assert_eq!(
            parsed
                .get("totalAppearances")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
        assert_eq!(
            parsed.get("firstAppearanceDate").and_then(|v| v.as_str()),
            Some("2003-01-02")
        );
        let appearances = parsed
            .get("appearances")
            .and_then(|v| v.as_array())
            .unwrap_or_else(|| panic!("appearances missing"));
        assert_eq!(appearances.len(), 1);
        assert_eq!(
            appearances[0].get("showId").and_then(|v| v.as_str()),
            Some("555")
        );
        let songs = appearances[0]
            .get("songs")
            .and_then(|v| v.as_array())
            .unwrap_or_else(|| panic!("songs missing"));
        assert_eq!(songs[0].get("songId").and_then(|v| v.as_str()), Some("77"));
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}

#[test]
fn snapshot_liberations_extracts_core_fields() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/liberations.html");
        let document = Html::parse_document(html);
        let entries = parse_song_liberations(&document);
        assert_eq!(entries.len(), 1);
        assert_eq!(
            entries[0]
                .get("lastPlayedShowId")
                .and_then(|v: &serde_json::Value| v.as_str()),
            Some("100")
        );
        assert_eq!(
            entries[0]
                .get("liberationShowId")
                .and_then(|v: &serde_json::Value| v.as_str()),
            Some("200")
        );
        assert_eq!(
            entries[0]
                .get("daysSince")
                .and_then(serde_json::Value::as_i64),
            Some(10)
        );
        assert_eq!(
            entries[0]
                .get("showsSince")
                .and_then(serde_json::Value::as_i64),
            Some(2)
        );
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}

#[test]
fn snapshot_venue_show_history_extracts_core_fields() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/venue_show_history.html");
        let document = Html::parse_document(html);
        let shows = parse_venue_show_history(&document);
        assert_eq!(shows.len(), 1);
        assert_eq!(shows[0].get("showId").and_then(|v| v.as_str()), Some("222"));
        assert_eq!(
            shows[0].get("date").and_then(|v| v.as_str()),
            Some("1996-01-03")
        );
        assert_eq!(
            shows[0]
                .get("songCount")
                .and_then(serde_json::Value::as_i64),
            Some(20)
        );
        assert_eq!(
            shows[0]
                .get("isOnRelease")
                .and_then(serde_json::Value::as_bool),
            Some(true)
        );
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}

#[test]
fn snapshot_song_performances_extracts_core_fields() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/song_performances.html");
        let document = Html::parse_document(html);
        let performances = parse_song_performances(&document);
        assert_eq!(performances.len(), 6);
        assert_eq!(
            performances[0]
                .get("showId")
                .and_then(|v: &serde_json::Value| v.as_str()),
            Some("1")
        );
        assert_eq!(
            performances[0]
                .get("duration")
                .and_then(|v: &serde_json::Value| v.as_str()),
            Some("4:32")
        );
        assert_eq!(
            performances[0]
                .get("isTease")
                .and_then(serde_json::Value::as_bool),
            Some(true)
        );
        assert_eq!(
            performances[0]
                .get("isSegue")
                .and_then(serde_json::Value::as_bool),
            Some(true)
        );
        assert_eq!(
            performances[0]
                .get("isOnRelease")
                .and_then(serde_json::Value::as_bool),
            Some(true)
        );
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}

#[test]
fn snapshot_lists_extracts_core_fields() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/lists.html");
        let lists = parse_lists_page(html);
        assert_eq!(lists.len(), 2);
        assert_eq!(lists[0].get("id").and_then(|v| v.as_str()), Some("101"));
        assert_eq!(
            lists[0].get("title").and_then(|v| v.as_str()),
            Some("Top Shows")
        );
        assert_eq!(
            lists[0].get("category").and_then(|v| v.as_str()),
            Some("Fan Lists")
        );
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}
