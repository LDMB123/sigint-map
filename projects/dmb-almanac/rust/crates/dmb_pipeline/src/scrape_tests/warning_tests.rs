use super::*;

#[test]
fn apply_max_items_truncates() {
    let mut items = vec![1, 2, 3, 4];
    apply_max_items(&mut items, Some(2));
    assert_eq!(items, vec![1, 2]);
}

#[test]
fn warns_on_missing_release_ids() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/release_links_missing_id.html");
        let document = Html::parse_document(html);
        let releases = parse_release_links(&document);
        assert!(!releases.is_empty());
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
        let missing_by_field = warning_missing_by_field();
        assert!(
            missing_by_field
                .get("release.id")
                .or_else(|| missing_by_field.get("release"))
                .is_some()
        );
    });
}

#[test]
fn release_page_fixture_reports_missing_date() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/release_missing_date.html");
        let release = parse_release_page_html(html, 101, "Mock Release");
        assert_eq!(release.id, 101);
        let (_, missing) = warning_counts();
        assert!(missing >= 1);
    });
}

#[test]
fn show_page_fixture_has_required_selectors() {
    with_warning_lock(|| {
        let html = include_str!("../../tests/fixtures/show_page.html");
        let show = parse_show_page_html(html, "1234");
        assert_eq!(show.id, 1234);
        let counts = warning_counts();
        assert_eq!(counts, (0, 0));
    });
}

#[test]
fn warning_report_includes_error_counts() {
    with_warning_lock(|| {
        reset_warning_state();
        record_scrape_error(
            ScrapeErrorKind::HttpStatus,
            "http",
            "https://example.com",
            Some("status 500"),
        );
        let temp_dir =
            std::env::temp_dir().join(format!("dmb_scrape_report_{}", rand::random::<u64>()));
        fs::create_dir_all(&temp_dir).unwrap_or_else(|err| panic!("create temp dir: {err}"));
        let report_path = temp_dir.join("warning-report.json");
        write_warning_report(&report_path, 0, 0, None)
            .unwrap_or_else(|err| panic!("write warning report: {err}"));
        let contents = fs::read_to_string(&report_path)
            .unwrap_or_else(|err| panic!("read warning report: {err}"));
        let parsed: Value = serde_json::from_str(&contents)
            .unwrap_or_else(|err| panic!("parse warning report json: {err}"));
        let error_counts = parsed
            .get("errorCounts")
            .unwrap_or_else(|| panic!("missing errorCounts"))
            .as_object()
            .unwrap_or_else(|| panic!("errorCounts is not object"));
        assert_eq!(
            error_counts
                .get("http_status")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
        let error_summary = parsed
            .get("errorEventsSummary")
            .unwrap_or_else(|| panic!("missing errorEventsSummary"))
            .as_object()
            .unwrap_or_else(|| panic!("errorEventsSummary is not object"));
        assert_eq!(
            error_summary
                .get("http_status")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
    });
}

#[test]
fn scrape_summary_includes_error_counts() {
    with_warning_lock(|| {
        reset_warning_state();
        record_scrape_error(
            ScrapeErrorKind::CacheRead,
            "cache",
            "dummy",
            Some("read failure"),
        );
        let temp_dir =
            std::env::temp_dir().join(format!("dmb_scrape_summary_{}", rand::random::<u64>()));
        fs::create_dir_all(&temp_dir).unwrap_or_else(|err| panic!("create temp dir: {err}"));
        let report_path = temp_dir.join("warning-report.json");
        write_scrape_summary(&report_path, 0, 0)
            .unwrap_or_else(|err| panic!("write scrape summary: {err}"));
        let summary_path = temp_dir.join("scrape-summary.json");
        let contents = fs::read_to_string(&summary_path)
            .unwrap_or_else(|err| panic!("read scrape summary: {err}"));
        let parsed: Value = serde_json::from_str(&contents)
            .unwrap_or_else(|err| panic!("parse scrape summary json: {err}"));
        let error_counts = parsed
            .get("errorCounts")
            .unwrap_or_else(|| panic!("missing errorCounts"))
            .as_object()
            .unwrap_or_else(|| panic!("errorCounts is not object"));
        assert_eq!(
            error_counts
                .get("cache_read")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
        let error_summary = parsed
            .get("errorEventsSummary")
            .unwrap_or_else(|| panic!("missing errorEventsSummary"))
            .as_object()
            .unwrap_or_else(|| panic!("errorEventsSummary is not object"));
        assert_eq!(
            error_summary
                .get("cache_read")
                .and_then(serde_json::Value::as_i64),
            Some(1)
        );
    });
}

#[test]
fn selector_parse_error_is_tracked() {
    with_warning_lock(|| {
        reset_warning_state();
        let selector = selector_or_warn("bad", "a[");
        assert!(selector.is_none());
        let counts = error_counts();
        assert_eq!(counts.get("selector_parse").copied(), Some(1));
        let events = error_events();
        assert!(events.iter().any(|event: &Value| {
            event
                .get("kind")
                .and_then(|v: &Value| v.as_str())
                .is_some_and(|kind| kind == "selector_parse")
        }));
    });
}

#[test]
fn regex_parse_error_is_tracked() {
    with_warning_lock(|| {
        reset_warning_state();
        let _ = regex("[");
        let counts = error_counts();
        assert_eq!(counts.get("regex_parse").copied(), Some(1));
    });
}

#[test]
fn warns_on_endpoint_retry_accounting() {
    with_warning_lock(|| {
        record_endpoint_retry("ShowSetlist.aspx");
        record_endpoint_retry("ShowSetlist.aspx");
        let retries = warning_endpoint_retries();
        assert_eq!(retries.get("ShowSetlist.aspx").copied().unwrap_or(0), 2);
    });
}

#[test]
fn selector_missing_events_are_recorded() {
    with_warning_lock(|| {
        let html = "<html><body><div>No selectors</div></body></html>";
        let document = Html::parse_document(html);
        warn_if_no_selector_match(
            &document,
            "show",
            "dateSelector",
            &["select option:selected", ".show-date"],
        );
        let events = warning_events();
        assert!(events.iter().any(|event: &Value| {
            event
                .get("kind")
                .and_then(|v: &Value| v.as_str())
                .is_some_and(|kind| kind == "selector_missing")
        }));
    });
}
