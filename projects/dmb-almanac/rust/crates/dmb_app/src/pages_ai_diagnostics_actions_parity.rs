use super::*;

#[cfg(feature = "hydrate")]
fn spawn_ai_diagnostics_background_loads(state: AiDiagnosticsState) {
    let ann_meta = state.ann_meta;
    let embed_meta = state.embed_meta;
    let tuning = state.tuning;
    let benchmark_history = state.benchmark_history;
    let telemetry_snapshot = state.telemetry_snapshot;
    let webgpu_probe = state.webgpu_probe;
    spawn_local(async move {
        let (
            loaded_ann_meta,
            loaded_embed_meta,
            loaded_tuning,
            loaded_benchmark_history,
            loaded_telemetry_snapshot,
            loaded_webgpu_probe,
        ) = futures::join!(
            crate::ai::load_ann_meta(),
            crate::ai::load_embedding_manifest_meta(),
            async { Some(crate::ai::load_ai_tuning()) },
            async { crate::ai::benchmark_history() },
            async { crate::ai::load_ai_telemetry_snapshot() },
            crate::ai::probe_webgpu_device(),
        );

        batch(move || {
            let _ = ann_meta.try_set(loaded_ann_meta);
            let _ = embed_meta.try_set(loaded_embed_meta);
            let _ = tuning.try_set(loaded_tuning);
            let _ = benchmark_history.try_set(loaded_benchmark_history);
            let _ = telemetry_snapshot.try_set(loaded_telemetry_snapshot);
            let _ = webgpu_probe.try_set(loaded_webgpu_probe);
        });
    });
}

#[cfg(feature = "hydrate")]
fn spawn_ai_diagnostics_parity_refresh(state: AiDiagnosticsState) {
    let sqlite_parity = state.sqlite_parity;
    let integrity_report = state.integrity_report;
    let sqlite_parity_summary = state.sqlite_parity_summary;
    let parity_check_running = state.parity_check_running;
    parity_check_running.set(true);
    spawn_local(async move {
        let (mut parity, mut integrity) = fetch_parity_diagnostics_bundle().await;
        update_parity_diagnostics_signals(
            sqlite_parity,
            integrity_report,
            parity.clone(),
            integrity.clone(),
        );
        if parity_diagnostics_retryable(parity.as_ref(), integrity.as_ref()) {
            wait_ms(1_200).await;
            (parity, integrity) = fetch_parity_diagnostics_bundle().await;
            update_parity_diagnostics_signals(
                sqlite_parity,
                integrity_report,
                parity.clone(),
                integrity.clone(),
            );
        }
        let summary = parity_summary_from_report(parity.as_ref());
        if summary.is_some() {
            batch(move || {
                let _ = sqlite_parity_summary.try_set(summary);
                parity_check_running.set(false);
            });
        } else {
            let fetched_summary = crate::data::fetch_sqlite_parity_summary_report().await;
            batch(move || {
                let _ = sqlite_parity_summary.try_set(fetched_summary);
                parity_check_running.set(false);
            });
        }
    });
}

#[cfg(feature = "hydrate")]
fn parity_summary_from_report(
    parity: Option<&crate::data::SqliteParityReport>,
) -> Option<crate::data::SqliteParitySummaryReport> {
    parity.map(|report| {
        let expected = dmb_core::sqlite_parity_tables().count();
        let missing_tables = report.missing_tables.clone();
        let present = if report.available {
            expected.saturating_sub(missing_tables.len())
        } else {
            0
        };

        crate::data::SqliteParitySummaryReport {
            available: report.available,
            sqlite_tables_present: present,
            sqlite_tables_expected: expected,
            missing_tables,
        }
    })
}

#[cfg(feature = "hydrate")]
async fn fetch_parity_diagnostics_bundle() -> (
    Option<crate::data::SqliteParityReport>,
    Option<crate::data::IntegrityReport>,
) {
    futures::future::join(
        crate::data::fetch_sqlite_parity_report(),
        crate::data::fetch_integrity_report(),
    )
    .await
}

#[cfg(feature = "hydrate")]
fn spawn_ai_diagnostics_parity_summary_refresh(state: AiDiagnosticsState) {
    let sqlite_parity_summary = state.sqlite_parity_summary;
    spawn_local(async move {
        let _ =
            sqlite_parity_summary.try_set(crate::data::fetch_sqlite_parity_summary_report().await);
    });
}

#[cfg(feature = "hydrate")]
fn update_parity_diagnostics_signals(
    sqlite_parity: RwSignal<Option<crate::data::SqliteParityReport>>,
    integrity_report: RwSignal<Option<crate::data::IntegrityReport>>,
    parity: Option<crate::data::SqliteParityReport>,
    integrity: Option<crate::data::IntegrityReport>,
) {
    batch(move || {
        let _ = sqlite_parity.try_set(parity);
        let _ = integrity_report.try_set(integrity);
    });
}

#[cfg(feature = "hydrate")]
fn parity_diagnostics_retryable(
    parity: Option<&crate::data::SqliteParityReport>,
    integrity: Option<&crate::data::IntegrityReport>,
) -> bool {
    parity.is_none()
        || integrity.is_none()
        || parity.is_some_and(|report| report.available && !report.idb_count_failures.is_empty())
}

pub(crate) fn initialize_ai_diagnostics_state(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        request_animation_frame(move || {
            apply_runtime_snapshot_values(state);
            refresh_ai_config_meta_mismatch(state);
            spawn_ai_diagnostics_background_loads(state);
            spawn_ai_diagnostics_parity_summary_refresh(state);
        });
    });
}

pub(crate) fn action_run_parity_refresh(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        if state.parity_check_running.get_untracked() {
            return;
        }
        crate::data::clear_parity_diagnostics_cache();
        batch(move || {
            state.sqlite_parity_summary.set(None);
            state.sqlite_parity.set(None);
            state.integrity_report.set(None);
        });
        spawn_ai_diagnostics_parity_refresh(state);
    });
}
