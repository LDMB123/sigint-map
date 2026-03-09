use super::*;

macro_rules! hydrate_maintenance_action {
    ($state:ident, $body:block) => {{
        #[cfg(feature = "hydrate")]
        $body
        #[cfg(not(feature = "hydrate"))]
        {
            let _ = $state;
        }
    }};
}

#[cfg(feature = "hydrate")]
pub(super) async fn refresh_data_diagnostics(state: PwaStatusState) {
    let (manifest_diff, integrity_report, sqlite_parity) = futures::join!(
        crate::data::fetch_manifest_diff(),
        crate::data::fetch_integrity_report(),
        crate::data::fetch_sqlite_parity_report(),
    );
    batch(move || {
        state.manifest_diff.set(manifest_diff);
        state.integrity_report.set(integrity_report);
        state.sqlite_parity.set(sqlite_parity);
    });
}

pub(super) fn action_export_parity(state: PwaStatusState) {
    hydrate_maintenance_action!(state, {
        spawn_local(async move {
            refresh_data_diagnostics(state).await;

            let current_status = state.status.get_untracked();
            let payload = serde_json::json!({
                "generatedAtMs": js_sys::Date::now(),
                "import": {
                    "message": current_status.message,
                    "progress": current_status.progress,
                    "done": current_status.done,
                    "error": current_status.error,
                    "tuning": current_status.tuning.as_ref().map(|tuning| serde_json::json!({
                        "chunkRecords": tuning.chunk_records,
                        "txBatchSize": tuning.tx_batch_size,
                        "lastChunkMs": tuning.last_chunk_ms,
                        "longTaskCount": tuning.long_task_count,
                    })),
                    "adaptiveEnabled": state.import_tuning_enabled.get_untracked(),
                },
                "inpMetrics": state.perf_metrics.get_untracked().map(|metrics| serde_json::json!({
                    "supported": metrics.supported,
                    "p75InteractionMs": metrics.p75_interaction_ms,
                    "longFrameCount": metrics.long_frame_count,
                    "interactionCount": metrics.interaction_count,
                })),
                "startupMetrics": crate::browser::perf::latest_startup_metrics_snapshot().map(|metrics| serde_json::json!({
                    "hydratedAtMs": metrics.hydrated_at_ms,
                    "importScheduledAtMs": metrics.import_scheduled_at_ms,
                    "importStartedAtMs": metrics.import_started_at_ms,
                    "offlineReadyAtMs": metrics.offline_ready_at_ms,
                    "swObserverAttachedAtMs": metrics.sw_observer_attached_at_ms,
                    "swControllerSeenAtMs": metrics.sw_controller_seen_at_ms,
                    "postImportMaintenanceStartedAtMs": metrics.post_import_maintenance_started_at_ms,
                })),
                "importRun": crate::data::latest_import_run_snapshot().map(|run| serde_json::json!({
                    "strategy": run.strategy,
                    "manifestVersion": run.manifest_version,
                    "completed": run.completed,
                    "preflightFailure": run.preflight_failure,
                    "failure": run.failure,
                    "totalImportMs": run.total_import_ms,
                    "totalWorkItems": run.total_work_items,
                    "chunkCount": run.chunk_count,
                    "checkpointCount": run.checkpoint_count,
                    "yieldCount": run.yield_count,
                    "fairnessYieldCount": run.fairness_yield_count,
                    "longFrameCount": run.long_frame_count,
                    "finalCacheEntryCount": run.final_cache_entry_count,
                    "files": run.files.iter().map(|file| serde_json::json!({
                        "label": file.label,
                        "totalRecords": file.total_records,
                        "chunkCount": file.chunk_count,
                        "elapsedMs": file.elapsed_ms,
                    })).collect::<Vec<_>>(),
                })),
                "sw": {
                    "version": state.sw_version.get_untracked(),
                    "activatedAtMs": state.sw_activated_at.get_untracked(),
                },
                "manifestDiff": state.manifest_diff.get_untracked().map(|diff| serde_json::json!({
                    "version": diff.version,
                    "totalChanged": diff.total_changed,
                    "changed": diff.changed.iter().map(|e| serde_json::json!({
                        "name": e.name,
                        "before": e.before,
                        "after": e.after,
                        "delta": e.delta,
                    })).collect::<Vec<_>>(),
                })),
                "integrityReport": state.integrity_report.get_untracked().map(|report| serde_json::json!({
                    "totalMismatches": report.total_mismatches,
                    "mismatches": report.mismatches.iter().map(|e| serde_json::json!({
                        "store": e.store,
                        "expected": e.expected,
                        "actual": e.actual,
                    })).collect::<Vec<_>>(),
                })),
                "sqliteParity": state.sqlite_parity.get_untracked().map(|report| serde_json::json!({
                    "available": report.available,
                    "totalMismatches": report.total_mismatches,
                    "missingTables": report.missing_tables,
                    "idbCountFailures": report.idb_count_failures,
                    "mismatches": report.mismatches.iter().map(|e| serde_json::json!({
                        "store": e.store,
                        "sqliteTable": e.sqlite_table,
                        "idbCount": e.idb_count,
                        "sqliteCount": e.sqlite_count,
                    })).collect::<Vec<_>>(),
                })),
            });

            let json_str =
                serde_json::to_string_pretty(&payload).unwrap_or_else(|_| "{}".to_string());
            let _ =
                crate::browser::download::download_text_file("dmb-parity-report.json", &json_str);
        });
    });
}

#[cfg(feature = "hydrate")]
pub(super) fn spawn_seed_and_diagnostics_refresh(state: &PwaStatusState) {
    let status = state.status;
    spawn_local(async move {
        crate::browser::perf::mark_startup_metric("import_started_at_ms");
        crate::data::ensure_seed_data(status).await;
    });
}

#[cfg(feature = "hydrate")]
pub(super) fn spawn_storage_health_tasks(state: &PwaStatusState) {
    let storage = state.storage;
    let storage_warning = state.storage_warning;

    spawn_local(async move {
        let info = crate::data::estimate_storage().await;
        storage.set(info);
        let cleared = crate::data::handle_storage_pressure()
            .await
            .unwrap_or(false);
        if cleared {
            storage_warning.set(Some(STORAGE_PRESSURE_CLEARED_MESSAGE.to_string()));
        }
    });

    spawn_cache_entries_refresh(state.cache_entries);
}

#[cfg(all(feature = "hydrate", feature = "ai_diagnostics_full"))]
pub(super) fn spawn_ai_config_sync_task(state: &PwaStatusState) {
    let ai_config_status = state.ai_config_status;
    let ai_config_version = state.ai_config_version;
    let ai_config_generated_at = state.ai_config_generated_at;

    spawn_local(async move {
        if let Some(reconciled) = crate::ai::fetch_and_reconcile_ai_config_meta(
            ai_config_version.get_untracked(),
            ai_config_generated_at.get_untracked(),
        )
        .await
        {
            ai_config_version.set(reconciled.local_version.clone());
            ai_config_generated_at.set(reconciled.local_generated_at.clone());
            ai_config_status.set(crate::ai::ai_config_mismatch_status_message(
                &reconciled,
                "AI config mismatch: ",
                ".",
            ));
        }
    });
}

pub(super) fn initialize_pwa_status_state(state: PwaStatusState) {
    #[cfg(not(feature = "hydrate"))]
    let _ = state;

    #[cfg(feature = "hydrate")]
    {
        schedule_window_timeout(0, move || {
            state
                .update_snoozed
                .set(refresh_update_notice_state(&state));
            hydrate_local_snapshot(&state);
            #[cfg(feature = "ai_diagnostics_full")]
            {
                state.ann_cap_override.set(crate::ai::ann_cap_override_mb());
            }
            attach_sw_runtime_observers(&state);
            register_online_offline_listeners(&state);
            refresh_install_prompt_state(&state);
            let install_state = state.clone();
            let install_state_for_appinstalled = state.clone();
            let _ = crate::browser::pwa::register_install_prompt_callbacks(
                move |available| {
                    let mut next = crate::browser::pwa::install_prompt_state();
                    next.available = available;
                    install_state.install_prompt.set(next);
                },
                move || {
                    refresh_install_prompt_state(&install_state_for_appinstalled);
                    install_state_for_appinstalled.install_status.set(Some(
                        "App installed. Chromium should now reuse the installed client."
                            .to_string(),
                    ));
                },
            );

            schedule_window_timeout(deferred_status_tasks_delay_ms(), move || {
                crate::browser::perf::mark_startup_metric("import_scheduled_at_ms");
                state
                    .import_tuning_enabled
                    .set(crate::data::current_import_tuning_enabled());
                spawn_seed_and_diagnostics_refresh(&state);
                let maintenance_state = state.clone();
                schedule_window_timeout(POST_IMPORT_MAINTENANCE_WATCHDOG_MS, move || {
                    trigger_post_import_maintenance(maintenance_state.clone());
                });
            });
        });
    }
}

pub(super) fn setup_post_import_refresh(state: PwaStatusState) {
    #[cfg(not(feature = "hydrate"))]
    let _ = state;

    #[cfg(feature = "hydrate")]
    {
        let post_import_refreshed = RwSignal::new(false);
        let status = state.status;
        let state_for_refresh = state;

        Effect::new(move |_| {
            let current = status.get();
            if !current.done || current.error.is_some() {
                return;
            }
            if post_import_refreshed.get_untracked() {
                return;
            }
            post_import_refreshed.set(true);
            crate::browser::perf::mark_startup_metric("offline_ready_at_ms");
            trigger_post_import_maintenance(state_for_refresh.clone());
        });
    }
}

#[cfg(feature = "hydrate")]
pub(super) fn trigger_post_import_maintenance(state: PwaStatusState) {
    use once_cell::sync::OnceCell;

    static POST_IMPORT_MAINTENANCE_ONCE: OnceCell<()> = OnceCell::new();
    if POST_IMPORT_MAINTENANCE_ONCE.set(()).is_err() {
        return;
    }
    crate::browser::perf::mark_startup_metric("post_import_maintenance_started_at_ms");
    spawn_storage_health_tasks(&state);
    #[cfg(feature = "ai_diagnostics_full")]
    {
        spawn_ai_config_sync_task(&state);
    }
    spawn_sw_maintenance_task(&state);
    spawn_local(async move {
        refresh_data_diagnostics(state).await;
    });
}

#[cfg(not(feature = "hydrate"))]
#[allow(dead_code)]
pub(super) fn trigger_post_import_maintenance(_state: PwaStatusState) {}
