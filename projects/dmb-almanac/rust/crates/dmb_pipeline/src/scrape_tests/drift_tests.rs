use super::*;

#[test]
fn warns_on_empty_segues_and_plays_by_year() {
    let html = include_str!("../../tests/fixtures/song_stats_missing.html");
    let document = Html::parse_document(html);

    with_warning_lock(|| {
        let segues = parse_top_segues(&document, true);
        assert!(segues.is_empty());
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });

    with_warning_lock(|| {
        let plays = parse_plays_by_year(&document);
        assert!(plays.is_empty());
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}

#[test]
fn warns_on_missing_song_id_in_segues() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/song_stats_missing_sid.html");
        let document = Html::parse_document(html);
        let segues = parse_top_segues(&document, true);
        assert_eq!(segues.len(), 1);
        assert_eq!(
            segues[0]
                .get("songId")
                .and_then(|v: &serde_json::Value| v.as_str()),
            Some("")
        );
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field.contains_key("song_stats")
                || missing_by_field.contains_key("song_stats.songId")
        );
    });
}

#[test]
fn warns_on_missing_release_date() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/release_missing_date.html");
        let release = parse_release_page_html(html, 2, "No Date Release");
        assert_eq!(release.title, "No Date Release");
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}

#[test]
fn warns_on_missing_show_id_performances() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/song_performances_missing_id.html");
        let document = Html::parse_document(html);
        let performances = parse_song_performances(&document);
        assert!(!performances.is_empty());
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("song_stats.performances.showId")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_missing_liberation_link() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/liberations_missing_link.html");
        let document = Html::parse_document(html);
        let entries = parse_song_liberations(&document);
        assert_eq!(entries.len(), 1);
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}

#[test]
fn warns_on_missing_guest_song_id() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/guest_shows_missing_song_id.html");
        let parsed = parse_guest_shows_page(html, 11, "Guest Y");
        assert_eq!(
            parsed
                .get("totalAppearances")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("guest_shows.songId")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_missing_venue_history_show_id() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/venue_show_history_missing_show_id.html");
        let document = Html::parse_document(html);
        let shows = parse_venue_show_history(&document);
        assert_eq!(shows.len(), 1);
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("venue_stats.show_history.showId")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_song_stats_selector_drift() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/song_stats_selector_drift.html");
        let _ = parse_song_stats_page(html, 7, "Drift Song");
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("song_stats.performanceSelector")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_show_selector_drift() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/show_page_selector_drift.html");
        let document = Html::parse_document(html);
        let _ = extract_show_meta(&document);
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("show.venueLinkSelector")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_release_selector_drift() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/release_selector_drift.html");
        let release = parse_release_page_html(html, 33, "");
        assert_eq!(release.title, "");
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("release.titleSelector")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_selector_drift_for_venue_show_history() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/venue_show_history_selector_drift.html");
        let document = Html::parse_document(html);
        let shows = parse_venue_show_history(&document);
        assert_eq!(shows.len(), 0);
        let (empty, _) = warning_counts();
        assert!(empty >= 1);
        let empty_by_selector = warning_empty_by_selector();
        assert!(
            empty_by_selector
                .get("venue_stats.show_history.show_link")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_missing_top_song_play_count() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/venue_stats_top_song_missing_count.html");
        let parsed = parse_venue_stats_page(html, 99);
        assert!(parsed.is_some(), "venue stats missing");
        let Some(parsed) = parsed else {
            panic!("venue stats missing");
        };
        let top_songs = parsed
            .get("topSongs")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();
        assert_eq!(top_songs.len(), 1);
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("venue_stats.top_songs.playCount")
                .copied()
                .unwrap_or(0)
                >= 1
        );
    });
}

#[test]
fn warns_on_missing_list_id() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/list_missing_id.html");
        let lists = parse_lists_page(html);
        assert_eq!(lists.len(), 1);
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}
