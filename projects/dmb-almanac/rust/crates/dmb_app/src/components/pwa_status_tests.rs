use super::{
    UPDATE_SNOOZE_MS, e2e_version_from_sw_script_url, remaining_snooze_ms,
    should_suppress_update_notice,
};

#[test]
fn suppress_update_notice_within_snooze_window() {
    let now = 1_000_000.0;
    let last = now - (UPDATE_SNOOZE_MS / 2.0);
    assert!(should_suppress_update_notice(Some(last), now));
}

#[test]
fn allow_update_notice_after_snooze_window() {
    let now = 1_000_000.0;
    let last = now - (UPDATE_SNOOZE_MS * 1.2);
    assert!(!should_suppress_update_notice(Some(last), now));
}

#[test]
fn remaining_snooze_reports_time_left() {
    let now = 1_000_000.0;
    let last = now - (UPDATE_SNOOZE_MS / 2.0);
    let Some(remaining) = remaining_snooze_ms(Some(last), now) else {
        panic!("remaining snooze missing");
    };
    assert!(remaining > 0.0);
    assert!(remaining < UPDATE_SNOOZE_MS);
}

#[test]
fn suppress_update_notice_with_clock_skew() {
    let now = 1_000_000.0;
    let last = now + 5_000.0;
    assert!(should_suppress_update_notice(Some(last), now));
}

#[test]
fn remaining_snooze_none_after_window() {
    let now = 2_000_000.0;
    let last = now - (UPDATE_SNOOZE_MS * 2.0);
    assert!(remaining_snooze_ms(Some(last), now).is_none());
}

#[test]
fn e2e_version_parser_handles_query_shapes() {
    assert_eq!(
        e2e_version_from_sw_script_url("/sw.js?e2e=build123"),
        Some("build123".to_string())
    );
    assert_eq!(
        e2e_version_from_sw_script_url("/sw.js?foo=1&e2e=build999&bar=2"),
        Some("build999".to_string())
    );
    assert_eq!(e2e_version_from_sw_script_url("/sw.js"), None);
}
