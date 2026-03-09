use super::*;

#[test]
fn cache_read_error_is_tracked() {
    with_warning_lock(|| {
        reset_warning_state();
        let temp_dir =
            std::env::temp_dir().join(format!("dmb_scrape_cache_read_{}", rand::random::<u64>()));
        fs::create_dir_all(&temp_dir).unwrap_or_else(|err| panic!("create temp dir: {err}"));
        let url = "https://example.com/BadCache.html";
        let hash = blake3::hash(url.as_bytes()).to_hex().to_string();
        let cache_path = temp_dir.join(format!("{hash}.html"));
        fs::write(&cache_path, [0xff, 0xfe, 0xfd])
            .unwrap_or_else(|err| panic!("write invalid cache: {err}"));
        let client = ScrapeClient::new(temp_dir.clone(), 0, 0, 0, None, true, None)
            .unwrap_or_else(|err| panic!("client: {err}"));
        let result = client.fetch_html(url);
        assert!(result.is_err());
        let counts = error_counts();
        assert_eq!(counts.get("cache_read").copied(), Some(1));
    });
}

#[test]
fn cache_missing_error_is_tracked() {
    with_warning_lock(|| {
        reset_warning_state();
        let temp_dir = std::env::temp_dir().join(format!(
            "dmb_scrape_cache_missing_{}",
            rand::random::<u64>()
        ));
        fs::create_dir_all(&temp_dir).unwrap_or_else(|err| panic!("create temp dir: {err}"));
        let client = ScrapeClient::new(temp_dir, 0, 0, 0, None, true, None)
            .unwrap_or_else(|err| panic!("client: {err}"));
        let result = client.fetch_html("https://example.com/Miss.html");
        assert!(result.is_err());
        let counts = error_counts();
        assert_eq!(counts.get("cache_missing").copied(), Some(1));
    });
}

#[test]
fn show_date_falls_back_to_body_text() {
    with_warning_lock(|| {
        let html = "<html><body><div>Show Date: 2002-05-03</div></body></html>";
        let show = parse_show_page_html(html, "77");
        assert_eq!(show.date, "2002-05-03");
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}

#[test]
fn venue_page_missing_location_warns() {
    with_warning_lock(|| {
        let html = "<html><body><h1>Test Venue</h1></body></html>";
        let venue = parse_venue_page_html(html, "https://example.com/VenueStats.aspx?vid=99");
        assert!(venue.is_ok(), "venue parse ok");
        let venue = venue.unwrap_or_else(|err| panic!("venue parse ok: {err}"));
        let Some(venue) = venue else {
            panic!("venue missing");
        };
        assert_eq!(venue.name, "Test Venue");
        assert_eq!(venue.city, "");
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}

#[test]
fn parse_show_date_supports_multiple_formats() {
    assert_eq!(
        parse_show_date("2004-07-04"),
        Some("2004-07-04".to_string())
    );
    assert_eq!(
        parse_show_date("2004/07/04"),
        Some("2004-07-04".to_string())
    );
    assert_eq!(
        parse_show_date("07/04/2004"),
        Some("2004-07-04".to_string())
    );
}

#[test]
fn parse_functions_do_not_panic_on_malformed_html() {
    with_warning_lock(|| {
        let html = "<html><body><div>broken</div></body></html>";
        let result = std::panic::catch_unwind(|| {
            let _ = parse_song_stats_page(html, 99, "Broken");
            let _ = parse_guest_shows_page(html, 99, "Broken");
            let _ = parse_venue_stats_page(html, 99);
            let _ = parse_lists_page(html);
        });
        assert!(result.is_ok());
    });
}

#[test]
fn venue_show_history_smoke_no_missing_when_ids_present() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/venue_stats.html");
        let document = Html::parse_document(html);
        let shows = parse_venue_show_history(&document);
        assert_eq!(shows.len(), 1);
        let (_, missing) = warning_counts();
        assert_eq!(missing, 0);
    });
}

#[test]
fn release_type_detection_handles_unknowns() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/release_unknown.html");
        let release = parse_release_page_html(html, 1, "Mystery Release");
        assert!(release.release_type.is_none());
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}

#[test]
fn detect_release_type_recognizes_known_patterns() {
    assert_eq!(
        detect_release_type("Live Trax volume 10"),
        Some("live_trax".to_string())
    );
    assert_eq!(
        detect_release_type("Warehouse 10 Vol. 3"),
        Some("warehouse".to_string())
    );
    assert_eq!(
        detect_release_type("Greatest Hits compilation"),
        Some("compilation".to_string())
    );
}
