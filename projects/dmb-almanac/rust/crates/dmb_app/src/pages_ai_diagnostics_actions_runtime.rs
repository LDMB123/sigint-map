use super::*;

pub(crate) fn action_refresh_runtime_metrics(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        refresh_runtime_metrics_signals(state);
    });
}

pub(crate) fn action_reset_runtime_metrics(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        crate::browser::webgpu_diagnostics::reset_runtime_telemetry();
        crate::ai::reset_webgpu_policy_telemetry();
        state
            .webgpu_runtime
            .set(crate::browser::webgpu_diagnostics::load_runtime_telemetry());
        state
            .telemetry_snapshot
            .set(crate::ai::load_ai_telemetry_snapshot());
        state.worker_failure.set(crate::ai::worker_failure_status());
    });
}

pub(crate) fn action_toggle_webgpu(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let next = !state.webgpu_disabled.get_untracked();
        state.webgpu_disabled.set(next);
        crate::ai::set_webgpu_disabled(next);
        state.caps.set(crate::ai::detect_ai_capabilities());
    });
}

pub(crate) fn action_apply_worker_threshold(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let parsed = parse_optional_signal_value(state.worker_threshold_input);
        apply_worker_threshold_override(state, parsed);
    });
}

pub(crate) fn action_clear_worker_threshold(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        apply_worker_threshold_override(state, None);
    });
}

pub(crate) fn action_apply_ann_cap_override(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let parsed = parse_optional_signal_value(state.ann_cap_override_input);
        apply_ann_cap_override(state, parsed);
    });
}

pub(crate) fn action_clear_ann_cap_override(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        apply_ann_cap_override(state, None);
    });
}

pub(crate) fn action_toggle_embedding_sample(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let next = !state.embedding_sample_enabled.get_untracked();
        state.embedding_sample_enabled.set(next);
        crate::ai::set_embedding_sample_enabled(next);
        state.ann_caps.set(crate::ai::ann_cap_diagnostics());
    });
}

pub(crate) fn action_clear_worker_cooldown(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        crate::ai::clear_worker_failure_status();
        state.worker_failure.set(crate::ai::worker_failure_status());
    });
}

pub(crate) fn action_refresh_ai_config(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        spawn_local(async move {
            if crate::ai::refresh_ai_config().await {
                refresh_ai_config_signals(state);
            }
        });
    });
}

pub(crate) fn action_export_diagnostics(state: AiDiagnosticsState) {
    #[cfg(not(feature = "hydrate"))]
    let _ = state;
    #[cfg(feature = "hydrate")]
    {
        let local_state = crate::ai::local_state_snapshot();
        let telemetry_snapshot = state
            .telemetry_snapshot
            .get_untracked()
            .or_else(crate::ai::load_ai_telemetry_snapshot);
        let history_snapshot = state.benchmark_history.get_untracked();
        let snapshot = serde_json::json!({
            "timestampMs": js_sys::Date::now(),
            "caps": state.caps.get_untracked(),
            "annMeta": state.ann_meta.get_untracked(),
            "annCap": state.ann_caps.get_untracked(),
            "embeddingManifest": state.embed_meta.get_untracked(),
            "benchmark": state.bench.get_untracked(),
            "workerBenchmark": state.worker_bench.get_untracked(),
            "tuning": state.tuning.get_untracked(),
            "tuningResult": state.tuning_result.get_untracked(),
            "benchmarkHistory": history_snapshot,
            "benchmarkDiff": benchmark_diff_json(&history_snapshot),
            "webgpuRuntimeTelemetry": state.webgpu_runtime.get_untracked(),
            "appleSiliconProfile": state.apple_silicon_profile.get_untracked(),
            "idbRuntimeMetrics": state.idb_runtime_metrics.get_untracked(),
            "crossOriginIsolated": state.cross_origin_isolated.get_untracked(),
            "workerThresholdOverride": local_state.worker_threshold_raw,
            "workerMaxFloats": crate::ai::worker_max_floats_value(),
            "aiTelemetry": telemetry_snapshot,
            "aiConfigVersion": local_state.ai_config_version,
            "aiConfigGeneratedAt": local_state.ai_config_generated_at,
            "aiConfigSeeded": local_state.ai_config_seeded,
            "embeddingSampleEnabled": local_state.embedding_sample_enabled,
            "aiWarnings": local_state.ai_warnings,
        });

        if let Ok(json) = serde_json::to_string_pretty(&snapshot) {
            let filename = format!("ai-diagnostics-{}.json", now_ms_i64());
            let _ = crate::browser::download::download_text_file(&filename, &json);
        }
    }
}
