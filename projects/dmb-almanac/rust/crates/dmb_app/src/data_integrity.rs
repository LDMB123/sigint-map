use super::*;
#[cfg(feature = "hydrate")]
use std::collections::HashSet;
#[cfg(feature = "hydrate")]
use std::sync::OnceLock;

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone)]
pub(crate) struct IntegrityMismatch {
    pub(crate) store: String,
    pub(crate) expected: u64,
    pub(crate) actual: u64,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DryRunReport {
    #[serde(default)]
    pub(crate) file_counts: std::collections::HashMap<String, u64>,
}

#[cfg(feature = "hydrate")]
pub(crate) fn validate_import_preflight(
    manifest: &DataManifest,
    import_work: &[ImportWorkItem],
) -> Result<(), String> {
    if manifest.version.trim().is_empty() {
        return Err("manifest version missing".to_string());
    }
    if import_work.is_empty() {
        return Err("no import work items were generated from the manifest".to_string());
    }

    let manifest_files = manifest
        .files
        .iter()
        .filter_map(|file| manifest_name_stem(&file.name).map(str::to_string))
        .collect::<HashSet<_>>();
    let mut missing = Vec::new();

    for spec in IMPORT_SPECS {
        if let Some(prefix) = spec.chunk_prefix {
            let has_chunks = manifest.files.iter().any(|file| {
                manifest_name_stem(&file.name).is_some_and(|stem| stem.starts_with(prefix))
            });
            if has_chunks {
                continue;
            }
        }

        let expected = spec.file.trim_end_matches(".json");
        if !manifest_files.contains(expected) {
            missing.push(spec.file.to_string());
        }
    }

    if missing.is_empty() {
        Ok(())
    } else {
        missing.sort();
        Err(format!(
            "manifest missing required import files: {}",
            missing.join(", ")
        ))
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn integrity_failure_status(mismatches: &[IntegrityMismatch]) -> ImportStatus {
    import_error_status(
        format!("Integrity check failed for {} stores", mismatches.len()),
        1.0,
        format!("{mismatches:?}"),
    )
}

#[cfg(feature = "hydrate")]
fn dry_run_store_counts(report: &DryRunReport) -> std::collections::HashMap<String, u64> {
    let mut store_counts = std::collections::HashMap::with_capacity(IMPORT_SPECS.len());
    let chunk_specs: Vec<(&'static str, &'static str)> = IMPORT_SPECS
        .iter()
        .filter_map(|spec| spec.chunk_prefix.map(|prefix| (prefix, spec.store)))
        .collect();
    let mut chunk_totals: std::collections::HashMap<&'static str, u64> =
        std::collections::HashMap::with_capacity(chunk_specs.len());

    for (name, count) in &report.file_counts {
        let Some(stem) = manifest_name_stem(name) else {
            continue;
        };
        for (prefix, store) in &chunk_specs {
            if stem.starts_with(prefix) {
                *chunk_totals.entry(*store).or_insert(0) += *count;
                break;
            }
        }
    }

    for spec in IMPORT_SPECS {
        if let Some(chunk_total) = chunk_totals.get(spec.store).copied() {
            if chunk_total > 0 {
                store_counts.insert(spec.store.to_string(), chunk_total);
                continue;
            }
        }
        if let Some(count) = report.file_counts.get(spec.file) {
            store_counts.insert(spec.store.to_string(), *count);
        }
    }
    store_counts
}

#[cfg(feature = "hydrate")]
async fn collect_integrity_mismatches_for_checks(
    checks: &[(String, u64)],
    counted: &mut HashMap<String, u64>,
    missing_stores: &HashSet<String>,
    mismatches: &mut Vec<IntegrityMismatch>,
    scope: &'static str,
) {
    for (store, expected_count) in checks {
        if missing_stores.contains(store.as_str()) {
            mismatches.push(IntegrityMismatch {
                store: store.clone(),
                expected: *expected_count,
                actual: 0,
            });
            continue;
        }

        let actual = if let Some(value) = counted.get(store.as_str()).copied() {
            value
        } else {
            match dmb_idb::count_store(store).await {
                Ok(value) => {
                    let value = u64::from(value);
                    counted.insert(store.clone(), value);
                    value
                }
                Err(err) => {
                    tracing::warn!(
                        store,
                        expected_count = *expected_count,
                        scope,
                        error = ?err,
                        "integrity: failed to count store; treating as mismatch"
                    );
                    mismatches.push(IntegrityMismatch {
                        store: store.clone(),
                        expected: *expected_count,
                        actual: 0,
                    });
                    continue;
                }
            }
        };

        if actual != *expected_count {
            mismatches.push(IntegrityMismatch {
                store: store.clone(),
                expected: *expected_count,
                actual,
            });
        }
    }
}

#[cfg(feature = "hydrate")]
fn import_store_lookup_by_manifest_name() -> &'static HashMap<String, &'static str> {
    static LOOKUP: OnceLock<HashMap<String, &'static str>> = OnceLock::new();
    LOOKUP.get_or_init(|| {
        IMPORT_SPECS
            .iter()
            .filter_map(|spec| normalized_manifest_name(spec.file).map(|name| (name, spec.store)))
            .collect()
    })
}

#[cfg(feature = "hydrate")]
fn build_manifest_checks(expected: HashMap<String, u64>) -> Vec<(String, u64)> {
    let stores_by_manifest_name = import_store_lookup_by_manifest_name();
    let mut checks: Vec<(String, u64)> = expected
        .into_iter()
        .filter_map(|(name, expected_count)| {
            stores_by_manifest_name
                .get(&name)
                .map(|store| ((*store).to_string(), expected_count))
        })
        .collect();
    checks.sort_unstable_by(|left, right| left.0.cmp(&right.0));
    checks
}

#[cfg(feature = "hydrate")]
fn dedupe_integrity_mismatches(mismatches: Vec<IntegrityMismatch>) -> Vec<IntegrityMismatch> {
    let mut unique = mismatches;
    unique.sort_unstable_by(|left, right| {
        left.store
            .cmp(&right.store)
            .then(left.expected.cmp(&right.expected))
            .then(left.actual.cmp(&right.actual))
    });
    unique.dedup_by(|left, right| {
        left.store == right.store && left.expected == right.expected && left.actual == right.actual
    });
    unique
}

#[cfg(feature = "hydrate")]
pub(crate) async fn verify_import_integrity(
    manifest: &DataManifest,
    dry_run: Option<&DryRunReport>,
) -> Option<Vec<IntegrityMismatch>> {
    let expected = manifest.record_counts_map();
    if expected.is_empty() && dry_run.is_none() {
        return None;
    }

    let manifest_checks = build_manifest_checks(expected);

    let dry_run_checks = dry_run.map(dry_run_store_counts).unwrap_or_default();
    let mut dry_run_check_entries: Vec<(String, u64)> = dry_run_checks.into_iter().collect();
    dry_run_check_entries.sort_unstable_by(|left, right| left.0.cmp(&right.0));

    let mut stores_to_count: HashSet<&str> = manifest_checks
        .iter()
        .map(|(store, _)| store.as_str())
        .collect();
    stores_to_count.extend(
        dry_run_check_entries
            .iter()
            .map(|(store, _)| store.as_str()),
    );

    let mut counted: HashMap<String, u64> = HashMap::new();
    let mut missing_stores: HashSet<String> = HashSet::new();
    if !stores_to_count.is_empty() {
        let mut store_refs: Vec<&str> = stores_to_count.into_iter().collect();
        store_refs.sort_unstable();
        match dmb_idb::count_stores_with_missing(&store_refs).await {
            Ok((entries, missing)) => {
                for (store, count) in entries {
                    counted.insert(store, u64::from(count));
                }
                missing_stores.extend(missing);
            }
            Err(err) => {
                tracing::warn!(
                    error = ?err,
                    "integrity: batched store counting failed; falling back to per-store counts"
                );
            }
        }
    }

    let mut mismatches = Vec::new();
    collect_integrity_mismatches_for_checks(
        &manifest_checks,
        &mut counted,
        &missing_stores,
        &mut mismatches,
        "manifest",
    )
    .await;
    collect_integrity_mismatches_for_checks(
        &dry_run_check_entries,
        &mut counted,
        &missing_stores,
        &mut mismatches,
        "dry-run",
    )
    .await;

    Some(dedupe_integrity_mismatches(mismatches))
}
