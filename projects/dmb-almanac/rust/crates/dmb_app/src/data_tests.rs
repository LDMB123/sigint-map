use super::*;
#[cfg(feature = "hydrate")]
use dmb_idb::{TABLE_SETLIST_ENTRIES, TABLE_SONGS};
use std::collections::HashMap;

#[test]
fn manifest_diff_reports_deltas() {
    let mut previous = HashMap::new();
    previous.insert("songs".to_string(), 10);
    previous.insert("shows".to_string(), 5);
    let mut next = HashMap::new();
    next.insert("songs".to_string(), 12);
    next.insert("shows".to_string(), 5);
    next.insert("venues".to_string(), 2);

    let diff = compute_manifest_diff(&previous, &next);
    assert_eq!(diff.len(), 2);
    let Some(songs) = diff.iter().find(|d| d.name == "songs") else {
        panic!("songs diff missing");
    };
    assert_eq!(songs.before, 10);
    assert_eq!(songs.after, 12);
    assert_eq!(songs.delta, 2);
    let Some(venues) = diff.iter().find(|d| d.name == "venues") else {
        panic!("venues diff missing");
    };
    assert_eq!(venues.before, 0);
    assert_eq!(venues.after, 2);
    assert_eq!(venues.delta, 2);
}

#[test]
fn integrity_report_default_empty() {
    let report = IntegrityReport::default();
    assert_eq!(report.total_mismatches, 0);
    assert!(report.mismatches.is_empty());
}

#[test]
fn sqlite_parity_report_default_empty() {
    let report = SqliteParityReport::default();
    assert!(!report.available);
    assert_eq!(report.total_mismatches, 0);
    assert!(report.mismatches.is_empty());
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_governor_reduces_on_slow_chunks() {
    let mut governor = AdaptiveImportGovernor::new();
    governor.update_after_chunk(ADAPTIVE_SLOW_CHUNK_MS + 5.0, true);
    assert!(governor.chunk_records < ADAPTIVE_CHUNK_RECORDS_START);
    assert!(governor.tx_batch_size < ADAPTIVE_TX_BATCH_START);
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_governor_increases_after_fast_streak_without_pending_interaction() {
    let mut governor = AdaptiveImportGovernor::new();
    for _ in 0..ADAPTIVE_FAST_STREAK_REQUIRED {
        governor.update_after_chunk(ADAPTIVE_FAST_CHUNK_MS - 5.0, true);
    }
    assert!(governor.chunk_records > ADAPTIVE_CHUNK_RECORDS_START);
    assert_eq!(governor.tx_batch_size, ADAPTIVE_TX_BATCH_START);
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_governor_does_not_increase_when_interaction_pending() {
    let mut governor = AdaptiveImportGovernor::new();
    for _ in 0..=ADAPTIVE_FAST_STREAK_REQUIRED {
        governor.update_after_chunk(ADAPTIVE_FAST_CHUNK_MS - 5.0, false);
    }
    assert_eq!(governor.chunk_records, ADAPTIVE_CHUNK_RECORDS_START);
    assert_eq!(governor.tx_batch_size, ADAPTIVE_TX_BATCH_START);
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_governor_prepares_next_work_item_to_baseline_floor() {
    let mut governor = AdaptiveImportGovernor::new();
    governor.update_after_chunk(ADAPTIVE_SLOW_CHUNK_MS + 10.0, true);
    let work_item = ImportWorkItem {
        label: "songs.json".to_string(),
        url: "/data/songs.json".to_string(),
        store: TABLE_SONGS,
        prechunked: false,
    };
    governor.prepare_for_work_item(&work_item, DEFAULT_IMPORT_CHUNK_SIZE / 2);

    assert_eq!(governor.chunk_records, 1_500);
    assert!(governor.tx_batch_size >= DEFAULT_IMPORT_CHUNK_SIZE);
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_governor_primes_large_work_items_to_nonadaptive_floor() {
    let mut governor = AdaptiveImportGovernor::new();
    let work_item = ImportWorkItem {
        label: "setlist-entries.json".to_string(),
        url: "/data/setlist-entries.json".to_string(),
        store: TABLE_SETLIST_ENTRIES,
        prechunked: false,
    };
    governor.prepare_for_work_item(&work_item, LARGE_IMPORT_RECORD_THRESHOLD);

    assert_eq!(governor.chunk_records, LARGE_IMPORT_CHUNK_SIZE);
    assert_eq!(
        governor.tx_batch_size,
        dmb_idb::DEFAULT_BULK_PUT_TX_BATCH_SIZE
    );
}

#[cfg(feature = "hydrate")]
#[test]
fn prechunked_work_items_use_single_file_chunk_size() {
    let work_item = ImportWorkItem {
        label: "setlist-entries-chunk-0001.json".to_string(),
        url: "/data/setlist-entries-chunk-0001.json".to_string(),
        store: TABLE_SETLIST_ENTRIES,
        prechunked: true,
    };

    assert_eq!(import_chunk_size_for_work_item(&work_item, 2_500), 2_500);
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_yield_skips_fast_chunk_without_pending_interaction() {
    assert!(!should_yield_after_adaptive_chunk(20.0, true, false));
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_yield_happens_for_slow_chunks() {
    assert!(should_yield_after_adaptive_chunk(
        ADAPTIVE_TARGET_CHUNK_MS,
        true,
        false
    ));
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_yield_happens_when_interaction_is_pending() {
    assert!(should_yield_after_adaptive_chunk(20.0, false, false));
}

#[cfg(feature = "hydrate")]
#[test]
fn adaptive_yield_skips_terminal_chunk() {
    assert!(!should_yield_after_adaptive_chunk(90.0, false, true));
}

#[cfg(feature = "hydrate")]
#[test]
fn resolve_resume_record_offset_prefers_persisted_offset() {
    let resolved = resolve_resume_record_offset(Some(321), 9, 10_000);
    assert_eq!(resolved, 321);
}

#[cfg(feature = "hydrate")]
#[test]
fn resolve_resume_record_offset_falls_back_to_chunk_hint_when_offset_missing() {
    let resolved = resolve_resume_record_offset(None, 3, 10_000);
    assert_eq!(resolved, ADAPTIVE_CHUNK_RECORDS_START * 3);
}

#[cfg(feature = "hydrate")]
#[test]
fn resolve_resume_record_offset_clamps_to_total_records() {
    let resolved = resolve_resume_record_offset(Some(9_999), 1, 500);
    assert_eq!(resolved, 500);
}

#[cfg(feature = "hydrate")]
#[test]
fn record_counts_prefers_setlist_single_file_over_chunks() {
    let manifest = DataManifest {
        version: "2026-02-04".to_string(),
        record_counts: HashMap::new(),
        files: vec![
            ManifestFile {
                name: "setlist-entries.json".to_string(),
                count: Some(3),
            },
            ManifestFile {
                name: "setlist-entries-chunk-0001.json".to_string(),
                count: Some(4),
            },
            ManifestFile {
                name: "setlist-entries-chunk-0002.json".to_string(),
                count: Some(5),
            },
            ManifestFile {
                name: "songs.json".to_string(),
                count: Some(2),
            },
        ],
    };

    let counts = manifest.record_counts_map();
    assert_eq!(counts.get("setlist-entries"), Some(&3));
    assert_eq!(counts.get("songs"), Some(&2));
}

#[cfg(feature = "hydrate")]
#[test]
fn record_counts_uses_setlist_chunk_sum_when_single_file_missing() {
    let manifest = DataManifest {
        version: "2026-02-04".to_string(),
        record_counts: HashMap::new(),
        files: vec![
            ManifestFile {
                name: "setlist-entries-chunk-0001.json".to_string(),
                count: Some(4),
            },
            ManifestFile {
                name: "setlist-entries-chunk-0002.json".to_string(),
                count: Some(5),
            },
        ],
    };

    let counts = manifest.record_counts_map();
    assert_eq!(counts.get("setlist-entries"), Some(&9));
}

#[cfg(feature = "hydrate")]
#[test]
fn import_preflight_accepts_required_manifest_files() {
    let manifest = DataManifest {
        version: "2026-02-04".to_string(),
        record_counts: HashMap::new(),
        files: IMPORT_SPECS
            .iter()
            .map(|spec| ManifestFile {
                name: spec.file.to_string(),
                count: Some(1),
            })
            .collect(),
    };
    let work = build_import_work_items(&manifest);

    assert!(validate_import_preflight(&manifest, &work).is_ok());
}

#[cfg(feature = "hydrate")]
#[test]
fn import_preflight_rejects_missing_required_files() {
    let manifest = DataManifest {
        version: "2026-02-04".to_string(),
        record_counts: HashMap::new(),
        files: vec![ManifestFile {
            name: "venues.json".to_string(),
            count: Some(1),
        }],
    };
    let work = build_import_work_items(&manifest);

    let err = validate_import_preflight(&manifest, &work)
        .err()
        .unwrap_or_else(|| panic!("preflight should fail"));
    assert!(err.contains("songs.json"));
    assert!(err.contains("setlist-entries.json"));
}
