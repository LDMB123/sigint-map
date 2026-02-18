use super::*;

pub fn ai_diagnostics_page() -> impl IntoView {
    // Keep the initial render deterministic for hydration; client-only detection runs post-mount.
    let caps = RwSignal::new(crate::ai::AiCapabilities::default());
    let ann_meta = RwSignal::new(None::<AnnIndexMeta>);
    let ann_caps = RwSignal::new(None::<crate::ai::AnnCapDiagnostics>);
    let ann_caps_loading = RwSignal::new(false);
    let ann_caps_error = RwSignal::new(None::<String>);
    let embed_meta = RwSignal::new(None::<EmbeddingManifest>);
    let bench = RwSignal::new(None::<crate::ai::AiBenchmark>);
    let bench_running = RwSignal::new(false);
    let bench_progress = RwSignal::new(0.0_f32);
    let bench_stage = RwSignal::new("Idle".to_string());
    let bench_cancelled = RwSignal::new(false);
    let worker_bench = RwSignal::new(None::<crate::ai::AiWorkerBenchmark>);
    let tuning = RwSignal::new(None::<crate::ai::AiTuning>);
    let tuning_result = RwSignal::new(None::<crate::ai::ProbeTuningResult>);
    let benchmark_history = RwSignal::new(Vec::<crate::ai::AiBenchmarkSample>::new());
    let worker_threshold_input = RwSignal::new(String::new());
    let worker_threshold_current = RwSignal::new(None::<usize>);
    let worker_max_floats = RwSignal::new(None::<usize>);
    let ann_cap_override_input = RwSignal::new(String::new());
    let ann_cap_override_value = RwSignal::new(None::<u64>);
    let ai_config_seeded = RwSignal::new(false);
    let ai_config_version = RwSignal::new(None::<String>);
    let ai_config_generated_at = RwSignal::new(None::<String>);
    let ai_config_mismatch = RwSignal::new(None::<String>);
    let embedding_sample_enabled = RwSignal::new(false);
    let cross_origin_isolated = RwSignal::new(None::<bool>);
    let telemetry_snapshot = RwSignal::new(None::<crate::ai::AiTelemetrySnapshot>);
    let webgpu_disabled = RwSignal::new(false);
    let ai_warnings = RwSignal::new(Vec::<crate::ai::AiWarningEvent>::new());
    let worker_bench_timestamp = RwSignal::new(None::<f64>);
    let worker_failure = RwSignal::new(crate::ai::WorkerFailureStatus::default());
    let webgpu_probe = RwSignal::new(None::<bool>);
    let sqlite_parity = RwSignal::new(None::<crate::data::SqliteParityReport>);
    let integrity_report = RwSignal::new(None::<crate::data::IntegrityReport>);
    let webgpu_runtime = RwSignal::new(None::<WebgpuRuntimeTelemetry>);
    let apple_silicon_profile = RwSignal::new(None::<AppleSiliconProfile>);
    let idb_runtime_metrics = RwSignal::new(None::<IdbRuntimeMetrics>);

    #[cfg(feature = "hydrate")]
    {
        let ann_meta_signal = ann_meta.clone();
        let embed_signal = embed_meta.clone();
        let ann_caps_signal = ann_caps.clone();
        let tuning_signal = tuning.clone();
        let history_signal = benchmark_history.clone();
        let telemetry_signal = telemetry_snapshot.clone();
        let webgpu_probe_signal = webgpu_probe.clone();
        let sqlite_parity_signal = sqlite_parity.clone();
        let integrity_report_signal = integrity_report.clone();

        let caps_signal = caps.clone();
        let worker_threshold_current_signal = worker_threshold_current.clone();
        let worker_max_floats_signal = worker_max_floats.clone();
        let ann_cap_override_value_signal = ann_cap_override_value.clone();
        let ann_cap_override_input_signal = ann_cap_override_input.clone();
        let worker_failure_signal = worker_failure.clone();
        let ai_config_seeded_signal = ai_config_seeded.clone();
        let ai_config_version_signal = ai_config_version.clone();
        let ai_config_generated_at_signal = ai_config_generated_at.clone();
        let embedding_sample_enabled_signal = embedding_sample_enabled.clone();
        let ai_warnings_signal = ai_warnings.clone();
        let worker_bench_timestamp_signal = worker_bench_timestamp.clone();
        let cross_origin_isolated_signal = cross_origin_isolated.clone();
        let worker_threshold_input_signal = worker_threshold_input.clone();
        let webgpu_disabled_signal = webgpu_disabled.clone();
        let mismatch_signal = ai_config_mismatch.clone();
        let webgpu_runtime_signal = webgpu_runtime.clone();
        let apple_silicon_profile_signal = apple_silicon_profile.clone();
        let idb_runtime_metrics_signal = idb_runtime_metrics.clone();
        request_animation_frame(move || {
            let _ = caps_signal.try_set(crate::ai::detect_ai_capabilities());

            let _ = worker_threshold_current_signal.try_set(crate::ai::worker_threshold_value());
            let _ = worker_max_floats_signal.try_set(crate::ai::worker_max_floats_value());

            // If another page (eg. AI Warmup) already loaded embeddings, surface the cached cap
            // diagnostics without kicking off the heavy load here.
            let _ = ann_caps_signal.try_set(crate::ai::ann_cap_diagnostics());

            let override_mb = crate::ai::ann_cap_override_mb();
            let _ = ann_cap_override_value_signal.try_set(override_mb);
            let _ = ann_cap_override_input_signal
                .try_set(override_mb.map(|v| v.to_string()).unwrap_or_default());

            let _ = worker_failure_signal.try_set(crate::ai::worker_failure_status());
            let _ = ai_config_seeded_signal.try_set(crate::ai::ai_config_seeded());
            let _ = ai_config_version_signal.try_set(crate::ai::ai_config_version());
            let _ = ai_config_generated_at_signal.try_set(crate::ai::ai_config_generated_at());
            let _ = embedding_sample_enabled_signal.try_set(crate::ai::embedding_sample_enabled());
            let _ = ai_warnings_signal.try_set(crate::ai::load_ai_warning_events());
            let _ =
                worker_bench_timestamp_signal.try_set(crate::ai::webgpu_worker_bench_timestamp());
            let _ = webgpu_runtime_signal.try_set(load_webgpu_runtime_telemetry());
            let _ = apple_silicon_profile_signal.try_set(load_apple_silicon_profile());
            let _ = idb_runtime_metrics_signal.try_set(load_idb_runtime_metrics());

            if let Some(window) = web_sys::window() {
                let isolated = js_sys::Reflect::get(
                    window.as_ref(),
                    &JsValue::from_str("crossOriginIsolated"),
                )
                .ok()
                .and_then(|value| value.as_bool())
                .unwrap_or(false);
                let _ = cross_origin_isolated_signal.try_set(Some(isolated));
                if let Ok(Some(storage)) = window.local_storage() {
                    if let Ok(Some(value)) = storage.get_item("dmb-webgpu-worker-threshold") {
                        let _ = worker_threshold_input_signal.try_set(value);
                    }
                    if let Ok(Some(value)) = storage.get_item("dmb-webgpu-disabled") {
                        let _ = webgpu_disabled_signal
                            .try_set(value == "1" || value.eq_ignore_ascii_case("true"));
                    }
                }
            }

            // After local config is loaded, compare against remote AI config meta.
            let local_version = ai_config_version_signal.clone();
            let local_generated_at = ai_config_generated_at_signal.clone();
            spawn_local(async move {
                let remote = crate::ai::fetch_ai_config_meta().await;
                if let Some(remote) = remote {
                    let normalize = |value: Option<String>| {
                        value
                            .map(|item| item.trim().to_string())
                            .filter(|item| !item.is_empty())
                    };
                    let remote_version = normalize(remote.version.clone());
                    let remote_generated = normalize(remote.generated_at.clone());
                    let mut version = normalize(local_version.try_get_untracked().flatten());
                    let mut generated = normalize(local_generated_at.try_get_untracked().flatten());
                    if remote_version != version || remote_generated != generated {
                        // Attempt self-heal for stale local AI config metadata.
                        if crate::ai::refresh_ai_config().await {
                            version = normalize(crate::ai::ai_config_version());
                            generated = normalize(crate::ai::ai_config_generated_at());
                            let _ = local_version.try_set(version.clone());
                            let _ = local_generated_at.try_set(generated.clone());
                        }
                        if remote_version != version || remote_generated != generated {
                            // Fallback: sync metadata directly from remote response.
                            if crate::ai::sync_ai_config_meta(
                                remote_version.as_deref(),
                                remote_generated.as_deref(),
                            ) {
                                version = remote_version.clone();
                                generated = remote_generated.clone();
                                let _ = local_version.try_set(version.clone());
                                let _ = local_generated_at.try_set(generated.clone());
                            }
                        }
                        if remote_version != version || remote_generated != generated {
                            let msg = format!(
                                "Remote AI config differs (remote {} @ {}).",
                                remote_version.clone().unwrap_or_else(|| "n/a".to_string()),
                                remote_generated
                                    .clone()
                                    .unwrap_or_else(|| "n/a".to_string())
                            );
                            let _ = mismatch_signal.try_set(Some(msg));
                        } else {
                            let _ = mismatch_signal.try_set(None);
                        }
                    } else {
                        let _ = mismatch_signal.try_set(None);
                    }
                }
            });

            // Defer background work until after the first paint so E2E can assert initial UI
            // without racing long-running async tasks.
            let ann_meta_signal = ann_meta_signal.clone();
            spawn_local(async move {
                let _ = ann_meta_signal.try_set(crate::ai::load_ann_meta().await);
            });

            let embed_signal = embed_signal.clone();
            spawn_local(async move {
                let _ = embed_signal.try_set(crate::ai::load_embedding_manifest_meta().await);
            });

            let tuning_signal = tuning_signal.clone();
            spawn_local(async move {
                let _ = tuning_signal.try_set(Some(crate::ai::load_ai_tuning().await));
            });

            let history_signal = history_signal.clone();
            spawn_local(async move {
                let _ = history_signal.try_set(crate::ai::benchmark_history());
            });

            let telemetry_signal = telemetry_signal.clone();
            spawn_local(async move {
                let _ = telemetry_signal.try_set(crate::ai::load_ai_telemetry_snapshot());
            });

            let webgpu_probe_signal = webgpu_probe_signal.clone();
            spawn_local(async move {
                let _ = webgpu_probe_signal.try_set(crate::ai::probe_webgpu_device().await);
            });

            let sqlite_parity_signal = sqlite_parity_signal.clone();
            let integrity_report_signal = integrity_report_signal.clone();
            spawn_local(async move {
                let mut parity = crate::data::fetch_sqlite_parity_report().await;
                let mut integrity = crate::data::fetch_integrity_report().await;
                let mut parity_mismatches = parity
                    .as_ref()
                    .map(|report| report.total_mismatches)
                    .unwrap_or(0);
                let mut integrity_mismatches = integrity
                    .as_ref()
                    .map(|report| report.total_mismatches)
                    .unwrap_or(0);

                let _ = sqlite_parity_signal.try_set(parity.clone());
                let _ = integrity_report_signal.try_set(integrity.clone());

                if parity_mismatches == 0 && integrity_mismatches == 0 {
                    return;
                }

                // Seed import can still be in progress when diagnostics first render.
                for _ in 0..6 {
                    wait_ms(12_000).await;
                    parity = crate::data::fetch_sqlite_parity_report().await;
                    integrity = crate::data::fetch_integrity_report().await;
                    parity_mismatches = parity
                        .as_ref()
                        .map(|report| report.total_mismatches)
                        .unwrap_or(0);
                    integrity_mismatches = integrity
                        .as_ref()
                        .map(|report| report.total_mismatches)
                        .unwrap_or(0);

                    let _ = sqlite_parity_signal.try_set(parity.clone());
                    let _ = integrity_report_signal.try_set(integrity.clone());

                    if parity_mismatches == 0 && integrity_mismatches == 0 {
                        break;
                    }
                }
            });
        });

        // Remaining localStorage-derived values are loaded in request_animation_frame above to keep
        // the initial hydration render stable.
    }

    let load_ann_caps = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let ann_caps_signal = ann_caps.clone();
                let loading_signal = ann_caps_loading.clone();
                let error_signal = ann_caps_error.clone();
                spawn_local(async move {
                    if loading_signal.get_untracked() {
                        return;
                    }
                    loading_signal.set(true);
                    error_signal.set(None);

                    let loaded = crate::ai::load_embedding_index().await;
                    if loaded.is_none() {
                        error_signal.set(Some("Embedding index load failed.".to_string()));
                    }
                    ann_caps_signal.set(crate::ai::ann_cap_diagnostics());
                    loading_signal.set(false);
                });
            }
        }
    };

    let run_benchmark = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let bench_signal = bench.clone();
                let running_signal = bench_running.clone();
                let progress_signal = bench_progress.clone();
                let stage_signal = bench_stage.clone();
                let cancel_signal = bench_cancelled.clone();
                let history_signal = benchmark_history.clone();
                spawn_local(async move {
                    running_signal.set(true);
                    progress_signal.set(0.0);
                    stage_signal.set("Preparing".to_string());
                    cancel_signal.set(false);

                    let sample = crate::ai::prepare_benchmark_sample(4000).await;
                    if cancel_signal.get_untracked() {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    }
                    let Some(sample) = sample else {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    };
                    progress_signal.set(0.2);
                    stage_signal.set("CPU".to_string());
                    let cpu_ms = crate::ai::benchmark_cpu(&sample);
                    if cancel_signal.get_untracked() || cpu_ms.is_none() {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    }
                    progress_signal.set(0.6);
                    stage_signal.set("GPU".to_string());
                    let (gpu_ms, backend) = crate::ai::benchmark_gpu(&sample).await;
                    if cancel_signal.get_untracked() {
                        running_signal.set(false);
                        stage_signal.set("Cancelled".to_string());
                        return;
                    }
                    progress_signal.set(1.0);
                    stage_signal.set("Complete".to_string());
                    let result = crate::ai::AiBenchmark {
                        sample_count: sample.sample_count,
                        cpu_ms: cpu_ms.unwrap_or_default(),
                        gpu_ms,
                        backend,
                    };
                    bench_signal.set(Some(result.clone()));
                    crate::ai::store_benchmark_sample(Some(result), None, None);
                    history_signal.set(crate::ai::benchmark_history());
                    running_signal.set(false);
                });
            }
        }
    };

    let cancel_benchmark = {
        move |_| {
            bench_cancelled.set(true);
            bench_stage.set("Cancelling".to_string());
        }
    };

    let run_worker_benchmark = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let worker_signal = worker_bench.clone();
                let history_signal = benchmark_history.clone();
                let worker_threshold_current = worker_threshold_current.clone();
                let worker_threshold_input = worker_threshold_input.clone();
                let worker_failure = worker_failure.clone();
                let webgpu_runtime = webgpu_runtime.clone();
                spawn_local(async move {
                    let result = crate::ai::benchmark_worker_threshold().await;
                    worker_signal.set(result.clone());
                    crate::ai::store_benchmark_sample(None, None, result);
                    history_signal.set(crate::ai::benchmark_history());
                    let current = crate::ai::worker_threshold_value();
                    worker_threshold_current.set(current);
                    worker_threshold_input.set(current.map(|v| v.to_string()).unwrap_or_default());
                    worker_failure.set(crate::ai::worker_failure_status());
                    webgpu_runtime.set(load_webgpu_runtime_telemetry());
                });
            }
        }
    };

    let refresh_runtime_metrics = {
        #[cfg(feature = "hydrate")]
        {
            let webgpu_runtime = webgpu_runtime.clone();
            let apple_silicon_profile = apple_silicon_profile.clone();
            let idb_runtime_metrics = idb_runtime_metrics.clone();
            move |_| {
                webgpu_runtime.set(load_webgpu_runtime_telemetry());
                apple_silicon_profile.set(load_apple_silicon_profile());
                idb_runtime_metrics.set(load_idb_runtime_metrics());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };

    let reset_runtime_metrics = {
        #[cfg(feature = "hydrate")]
        {
            let webgpu_runtime = webgpu_runtime.clone();
            move |_| {
                reset_webgpu_runtime_telemetry();
                webgpu_runtime.set(load_webgpu_runtime_telemetry());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };

    let export_diagnostics = {
        #[cfg(feature = "hydrate")]
        let caps = caps.clone();
        #[cfg(feature = "hydrate")]
        let ann_meta = ann_meta.clone();
        #[cfg(feature = "hydrate")]
        let ann_caps = ann_caps.clone();
        #[cfg(feature = "hydrate")]
        let embed_meta = embed_meta.clone();
        #[cfg(feature = "hydrate")]
        let bench = bench.clone();
        #[cfg(feature = "hydrate")]
        let worker_bench = worker_bench.clone();
        #[cfg(feature = "hydrate")]
        let tuning = tuning.clone();
        #[cfg(feature = "hydrate")]
        let tuning_result = tuning_result.clone();
        #[cfg(feature = "hydrate")]
        let cross_origin_isolated = cross_origin_isolated.clone();
        #[cfg(feature = "hydrate")]
        let history = benchmark_history.clone();
        #[cfg(feature = "hydrate")]
        let webgpu_runtime = webgpu_runtime.clone();
        #[cfg(feature = "hydrate")]
        let apple_silicon_profile = apple_silicon_profile.clone();
        #[cfg(feature = "hydrate")]
        let idb_runtime_metrics = idb_runtime_metrics.clone();
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                if let Some(window) = web_sys::window() {
                    let history_snapshot = history.get_untracked();
                    let benchmark_diff = {
                        let mut full_samples: Vec<_> = history_snapshot
                            .iter()
                            .filter_map(|sample| sample.full.clone())
                            .collect();
                        if full_samples.len() >= 2 {
                            match (full_samples.pop(), full_samples.pop()) {
                                (Some(current), Some(previous)) => serde_json::json!({
                                    "cpuMsDelta": current.cpu_ms - previous.cpu_ms,
                                    "gpuMsDelta": current.gpu_ms.unwrap_or(0.0) - previous.gpu_ms.unwrap_or(0.0),
                                    "backend": current.backend
                                }),
                                _ => serde_json::json!(null),
                            }
                        } else {
                            serde_json::json!(null)
                        }
                    };
                    let snapshot = serde_json::json!({
                        "timestampMs": js_sys::Date::now(),
                        "caps": caps.get_untracked(),
                        "annMeta": ann_meta.get_untracked(),
                        "annCap": ann_caps.get_untracked(),
                        "embeddingManifest": embed_meta.get_untracked(),
                        "benchmark": bench.get_untracked(),
                        "workerBenchmark": worker_bench.get_untracked(),
                        "tuning": tuning.get_untracked(),
                        "tuningResult": tuning_result.get_untracked(),
                        "benchmarkHistory": history_snapshot,
                        "benchmarkDiff": benchmark_diff,
                        "webgpuRuntimeTelemetry": webgpu_runtime.get_untracked(),
                        "appleSiliconProfile": apple_silicon_profile.get_untracked(),
                        "idbRuntimeMetrics": idb_runtime_metrics.get_untracked(),
                        "crossOriginIsolated": cross_origin_isolated.get_untracked(),
                        "workerThresholdOverride": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-webgpu-worker-threshold").ok().flatten())),
                        "workerMaxFloats": crate::ai::worker_max_floats_value(),
                        "aiTelemetry": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-telemetry").ok().flatten())),
                        "aiConfigVersion": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-config-version").ok().flatten())),
                        "aiConfigGeneratedAt": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-config-generated-at").ok().flatten())),
                        "aiConfigSeeded": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-config-seeded").ok().flatten())),
                        "embeddingSampleEnabled": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-embedding-sample").ok().flatten())),
                        "aiWarnings": window.local_storage().ok().and_then(|s| s.and_then(|s| s.get_item("dmb-ai-warning-events").ok().flatten())),
                    });
                    if let Ok(json) = serde_json::to_string_pretty(&snapshot) {
                        let array = js_sys::Array::new();
                        array.push(&wasm_bindgen::JsValue::from_str(&json));
                        if let Ok(blob) = web_sys::Blob::new_with_str_sequence(&array) {
                            if let Ok(url) = web_sys::Url::create_object_url_with_blob(&blob) {
                                if let Some(document) = window.document() {
                                    if let Ok(el) = document.create_element("a") {
                                        if let Ok(anchor) =
                                            el.dyn_into::<web_sys::HtmlAnchorElement>()
                                        {
                                            anchor.set_href(&url);
                                            anchor.set_download(&format!(
                                                "ai-diagnostics-{}.json",
                                                js_sys::Date::now() as i64
                                            ));
                                            anchor.click();
                                            let _ = web_sys::Url::revoke_object_url(&url);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    let run_tuning = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let tuning_signal = tuning.clone();
                let result_signal = tuning_result.clone();
                spawn_local(async move {
                    if let Some(index) = crate::ai::load_embedding_index().await {
                        let result = crate::ai::tune_ivf_probe(&index, 20).await;
                        result_signal.set(result.clone());
                        tuning_signal.set(Some(crate::ai::load_ai_tuning().await));
                    }
                });
            }
        }
    };
    let toggle_webgpu = {
        #[cfg(feature = "hydrate")]
        {
            let webgpu_disabled = webgpu_disabled.clone();
            let caps_signal = caps.clone();
            move |_| {
                let next = !webgpu_disabled.get_untracked();
                webgpu_disabled.set(next);
                crate::ai::set_webgpu_disabled(next);
                caps_signal.set(crate::ai::detect_ai_capabilities());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let apply_worker_threshold = {
        #[cfg(feature = "hydrate")]
        {
            let worker_threshold_input = worker_threshold_input.clone();
            let worker_threshold_current = worker_threshold_current.clone();
            move |_| {
                let parsed = worker_threshold_input
                    .get_untracked()
                    .trim()
                    .parse::<usize>()
                    .ok();
                crate::ai::set_worker_threshold_override(parsed);
                let current = crate::ai::worker_threshold_value();
                worker_threshold_current.set(current);
                worker_threshold_input.set(current.map(|v| v.to_string()).unwrap_or_default());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let clear_worker_threshold = {
        #[cfg(feature = "hydrate")]
        {
            let worker_threshold_input = worker_threshold_input.clone();
            let worker_threshold_current = worker_threshold_current.clone();
            move |_| {
                crate::ai::set_worker_threshold_override(None);
                let current = crate::ai::worker_threshold_value();
                worker_threshold_current.set(current);
                worker_threshold_input.set(current.map(|v| v.to_string()).unwrap_or_default());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let apply_ann_cap_override = {
        #[cfg(feature = "hydrate")]
        {
            let ann_cap_override_input = ann_cap_override_input.clone();
            let ann_cap_override_value = ann_cap_override_value.clone();
            move |_| {
                let parsed = ann_cap_override_input
                    .get_untracked()
                    .trim()
                    .parse::<u64>()
                    .ok();
                crate::ai::set_ann_cap_override_mb(parsed);
                let current = crate::ai::ann_cap_override_mb();
                ann_cap_override_value.set(current);
                ann_cap_override_input.set(current.map(|v| v.to_string()).unwrap_or_default());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let clear_ann_cap_override = {
        #[cfg(feature = "hydrate")]
        {
            let ann_cap_override_input = ann_cap_override_input.clone();
            let ann_cap_override_value = ann_cap_override_value.clone();
            move |_| {
                crate::ai::set_ann_cap_override_mb(None);
                ann_cap_override_value.set(None);
                ann_cap_override_input.set(String::new());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };
    let toggle_embedding_sample = {
        #[cfg(feature = "hydrate")]
        {
            let embedding_sample_enabled = embedding_sample_enabled.clone();
            let ann_caps = ann_caps.clone();
            move |_| {
                let next = !embedding_sample_enabled.get_untracked();
                embedding_sample_enabled.set(next);
                crate::ai::set_embedding_sample_enabled(next);
                ann_caps.set(crate::ai::ann_cap_diagnostics());
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            move |_| {}
        }
    };

    view! {
        <section class="page">
            <h1>"AI Diagnostics"</h1>
            <p class="lead">"On-device AI status, index metadata, and performance checks."</p>
            <Show when=move || embedding_sample_enabled.get() fallback=|| () >
                <p class="muted">"Sample mode enabled: using reduced embeddings."</p>
            </Show>
            {move || ai_config_mismatch.get().map(|msg| view! {
                <p class="muted">{msg}</p>
            })}

            <div class="card-grid">
                <div class="card">
                    <h2>"Parity"</h2>
                    <ul class="list">
                        <li>{move || idb_integrity_status(integrity_report.get())}</li>
                        <li>{move || sqlite_parity_status(sqlite_parity.get())}</li>
                    </ul>
                    <p class="muted">"Detailed mismatches are shown in the PWA Status panel."</p>
                </div>
                <div class="card">
                    <h2>"Capabilities"</h2>
                    {move || {
                        view! { {ai_capabilities_list(AiCapabilitiesViewModel {
                            caps: caps.get(),
                            webgpu_probe: webgpu_probe.get(),
                            cross_origin_isolated: cross_origin_isolated.get(),
                            ai_config_seeded: ai_config_seeded.get(),
                            ai_config_version: ai_config_version.get(),
                            ai_config_generated_at: ai_config_generated_at.get(),
                            worker_bench_timestamp: worker_bench_timestamp.get(),
                            worker_max_floats: worker_max_floats.get(),
                            worker_failure: worker_failure.get(),
                        })} }
                    }}
                    <button type="button" class="pill pill--ghost" on:click=toggle_webgpu>
                        {move || if webgpu_disabled.get() { "Enable WebGPU" } else { "Disable WebGPU" }}
                    </button>
                    <Show when=move || worker_failure.get().cooldown_remaining_ms.is_some() fallback=|| () >
                        <button type="button" class="pill pill--ghost" on:click=move |_| {
                            #[cfg(feature = "hydrate")]
                            {
                                crate::ai::clear_worker_failure_status();
                                worker_failure.set(crate::ai::worker_failure_status());
                            }
                        }>"Clear worker cooldown"</button>
                    </Show>
                    <button type="button" class="pill pill--ghost" on:click=move |_| {
                        #[cfg(feature = "hydrate")]
                        {
                            let version = ai_config_version.clone();
                            let generated = ai_config_generated_at.clone();
                            let seeded = ai_config_seeded.clone();
                            spawn_local(async move {
                                if crate::ai::refresh_ai_config().await {
                                    version.set(crate::ai::ai_config_version());
                                    generated.set(crate::ai::ai_config_generated_at());
                                    seeded.set(crate::ai::ai_config_seeded());
                                }
                            });
                        }
                    }>"Refresh AI config"</button>
                    <Show
                        when=move || {
                            caps.get().threads && cross_origin_isolated.get() == Some(false)
                        }
                        fallback=|| ()
                    >
                        <p class="muted">
                            "Threads require COOP/COEP. Enable cross-origin isolation to unlock worker SIMD."
                        </p>
                    </Show>
                    <Show
                        when=move || caps.get().webnn && !caps.get().webgpu_enabled
                        fallback=|| ()
                    >
                        <p class="muted">
                            "WebNN detected (experimental). Current scoring uses WASM SIMD until WebNN is enabled."
                        </p>
                    </Show>
                </div>
                <div class="card">
                    <h2>"Embedding Sample"</h2>
                    <p class="muted">
                        "Use a small sample dataset for faster local tuning."
                    </p>
                    <div class="pill-row">
                        <button type="button" class="pill pill--ghost" on:click=toggle_embedding_sample>
                            {move || if embedding_sample_enabled.get() { "Disable Sample" } else { "Enable Sample" }}
                        </button>
                    </div>
                    <p class="muted">
                        {move || if embedding_sample_enabled.get() { "Sample mode is ON." } else { "Sample mode is OFF." }}
                    </p>
                    <p class="muted">"Reload to apply changes."</p>
                </div>
                <div class="card">
                    <h2>"AI Warnings"</h2>
                    {move || ai_warnings_list(ai_warnings.get())}
                </div>
                <div class="card">
                    <h2>"WebGPU Runtime"</h2>
                    {move || {
                        webgpu_runtime
                            .get()
                            .map(|telemetry| {
                                view! { {ai_webgpu_runtime_list(telemetry)} }.into_any()
                            })
                            .unwrap_or_else(|| {
                                view! { <p class="muted">"Runtime telemetry unavailable."</p> }
                                    .into_any()
                            })
                    }}
                    <div class="pill-row">
                        <button type="button" class="pill pill--ghost" on:click=refresh_runtime_metrics>
                            "Refresh Runtime Metrics"
                        </button>
                        <button type="button" class="pill pill--ghost" on:click=reset_runtime_metrics>
                            "Reset WebGPU Metrics"
                        </button>
                    </div>
                </div>
                <div class="card">
                    <h2>"Apple Silicon Profile"</h2>
                    {move || {
                        apple_silicon_profile
                            .get()
                            .map(|profile| {
                                view! { {ai_apple_silicon_profile_list(profile)} }.into_any()
                            })
                            .unwrap_or_else(|| {
                                view! { <p class="muted">"Profile unavailable."</p> }.into_any()
                            })
                    }}
                </div>
                <div class="card">
                    <h2>"IndexedDB Runtime"</h2>
                    {move || {
                        idb_runtime_metrics
                            .get()
                            .map(|metrics| {
                                view! { {ai_idb_runtime_metrics_list(metrics)} }.into_any()
                            })
                            .unwrap_or_else(|| {
                                view! { <p class="muted">"Runtime metrics unavailable."</p> }
                                    .into_any()
                            })
                    }}
                    <button type="button" class="pill pill--ghost" on:click=refresh_runtime_metrics>
                        "Refresh Runtime Metrics"
                    </button>
                </div>
                <div class="card">
                    <h2>"ANN Index"</h2>
                    {move || ann_meta.get().map(|meta| view! { {ai_ann_index_list(meta)} })}
                </div>
                <div class="card">
                    <h2>"ANN Cap"</h2>
                    <div class="pill-row">
                        <button type="button"
                            class="pill"
                            prop:disabled=move || ann_caps_loading.get()
                            on:click=load_ann_caps
                        >
                            {move || if ann_caps_loading.get() { "Loading embeddings…" } else { "Load embeddings" }}
                        </button>
                    </div>
                    {move || ann_caps_error.get().map(|msg| view! {
                        <p class="muted">{msg}</p>
                    })}
                    {move || ann_caps.get().map(|cap| view! { {ai_ann_cap_list(cap)} })}
                    <div class="stack">
                        <label class="stack">
                            <span class="muted">"Override cap (MB)"</span>
                            <input
                                class="input"
                                type="number"
                                min="128"
                                max="2048"
                                step="1"
                                prop:value=move || ann_cap_override_input.get()
                                on:input=move |ev| {
                                    ann_cap_override_input.set(event_target_value(&ev));
                                }
                            />
                        </label>
                        <div class="pill-row">
                            <button type="button" class="pill pill--ghost" on:click=apply_ann_cap_override>
                                "Apply Override"
                            </button>
                            <button type="button" class="pill pill--ghost" on:click=clear_ann_cap_override>
                                "Reset Auto"
                            </button>
                        </div>
                        {move || ann_cap_override_value.get().map(|value| view! {
                            <p class="muted">{format!("Current override: {value} MB")}</p>
                        })}
                    </div>
                </div>
                <div class="card">
                    <h2>"Telemetry Snapshot"</h2>
                    {move || telemetry_snapshot.get().map(|snapshot| {
                        view! { {ai_telemetry_snapshot_list(snapshot)} }
                    })}
                </div>
                <div class="card">
                    <h2>"Embedding Manifest"</h2>
                    {move || embed_meta.get().map(|meta| view! { {ai_embedding_manifest_list(meta)} })}
                </div>
                <div class="card">
                    <h2>"Benchmark"</h2>
                    <div class="stack">
                        <button type="button" class="pill" on:click=run_benchmark>"Run Benchmark"</button>
                        <Show when=move || bench_running.get() fallback=|| () >
                            <button type="button" class="pill pill--ghost" on:click=cancel_benchmark>"Cancel"</button>
                        </Show>
                        <Show when=move || bench_running.get() fallback=|| () >
                            <div class="muted">{move || bench_stage.get()}</div>
                            <div class="pwa-progress">
                                <div class="pwa-progress__bar" style:width=move || format!("{:.0}%", bench_progress.get() * 100.0)></div>
                            </div>
                        </Show>
                    </div>
                    {move || bench.get().map(|result| view! {
                        {benchmark_metrics_list(
                            "Sample Count",
                            result.sample_count,
                            "CPU (SIMD if enabled)",
                            result.cpu_ms,
                            result.gpu_ms,
                            &result.backend,
                        )}
                    })}
                </div>
                <div class="card">
                    <h2>"Benchmark History"</h2>
                    {move || ai_benchmark_history_list(benchmark_history.get())}
                </div>
                <div class="card">
                    <h2>"Export"</h2>
                    <p class="muted">"Download a JSON snapshot of AI diagnostics."</p>
                    <button type="button" class="pill" on:click=export_diagnostics>"Export Snapshot"</button>
                </div>
                <div class="card">
                    <h2>"Worker Threshold"</h2>
                    <div class="stack">
                        <button type="button" class="pill" on:click=run_worker_benchmark>"Run Worker Benchmark"</button>
                        {move || worker_threshold_current.get().map(|value| {
                            let dim = embed_meta.get().map(|meta| meta.dim as usize).unwrap_or(0);
                            view! {
                                <p class="muted">{worker_threshold_summary(value, dim)}</p>
                            }
                        })}
                        <label class="stack">
                            <span class="muted">"Override threshold (floats)"</span>
                            <input
                                class="input"
                                type="number"
                                min="0"
                                step="1"
                                prop:value=move || worker_threshold_input.get()
                                on:input=move |ev| {
                                    worker_threshold_input.set(event_target_value(&ev));
                                }
                            />
                        </label>
                        <div class="pill-row">
                            <button type="button" class="pill pill--ghost" on:click=apply_worker_threshold>
                                "Apply Override"
                            </button>
                            <button type="button" class="pill pill--ghost" on:click=clear_worker_threshold>
                                "Reset Auto"
                            </button>
                        </div>
                    </div>
                    {move || worker_bench.get().map(|result| view! { {ai_worker_benchmark_list(result)} })}
                </div>
                <div class="card">
                    <h2>"IVF Tuning"</h2>
                    <button type="button" class="pill" on:click=run_tuning>"Auto-Tune Probe"</button>
                    {move || tuning.get().map(|state| view! { {ai_tuning_state_list(state)} })}
                    {move || tuning_result.get().map(|result| view! {
                        {ai_tuning_result_summary_list(result)}
                    })}
                    {move || tuning_result.get().map(|result| view! {
                        {ai_tuning_result_metrics_list(result)}
                    })}
                </div>
            </div>
        </section>
    }
}

pub fn ai_benchmark_page() -> impl IntoView {
    let full_bench = RwSignal::new(None::<crate::ai::AiBenchmark>);
    let subset_bench = RwSignal::new(None::<crate::ai::AiSubsetBenchmark>);
    let running = RwSignal::new(false);
    let status = RwSignal::new("Idle".to_string());
    let error = RwSignal::new(None::<String>);

    let run_benchmarks = {
        move |_| {
            #[cfg(feature = "hydrate")]
            {
                let full_signal = full_bench.clone();
                let subset_signal = subset_bench.clone();
                let running_signal = running.clone();
                let status_signal = status.clone();
                let error_signal = error.clone();
                spawn_local(async move {
                    running_signal.set(true);
                    status_signal.set("Running benchmark suite...".to_string());
                    error_signal.set(None);
                    let full = crate::ai::benchmark_scoring(4000).await;
                    let subset = crate::ai::benchmark_subset_scoring(20).await;
                    full_signal.set(full.clone());
                    subset_signal.set(subset.clone());
                    crate::ai::store_benchmark_sample(full, subset, None);
                    if full_signal.get_untracked().is_none()
                        && subset_signal.get_untracked().is_none()
                    {
                        status_signal.set("Failed".to_string());
                        error_signal.set(Some(
                            "Benchmark data unavailable. Warm up embeddings and try again."
                                .to_string(),
                        ));
                    } else {
                        status_signal.set("Complete".to_string());
                    }
                    running_signal.set(false);
                });
            }
        }
    };

    view! {
        <section class="page">
            <h1>"AI Benchmark"</h1>
            <p class="lead">"Compare CPU vs GPU scoring (full matrix vs IVF subset)."</p>
            <button type="button" class="pill" disabled=move || running.get() on:click=run_benchmarks>
                {move || if running.get() { "Running..." } else { "Run Benchmarks" }}
            </button>
            <p class="muted">{move || status.get()}</p>
            {move || error.get().map(|message| view! { <p class="muted">{message}</p> })}
            <div class="card-grid">
                <div class="card">
                    <h2>"Full Matrix"</h2>
                    {move || {
                        if let Some(result) = full_bench.get() {
                            view! {
                                {benchmark_metrics_list(
                                    "Sample Count",
                                    result.sample_count,
                                    "CPU",
                                    result.cpu_ms,
                                    result.gpu_ms,
                                    &result.backend,
                                )}
                            }
                            .into_any()
                        } else {
                            view! { <p class="muted">"No benchmark run yet."</p> }.into_any()
                        }
                    }}
                </div>
                <div class="card">
                    <h2>"IVF Subset"</h2>
                    {move || {
                        if let Some(result) = subset_bench.get() {
                            view! {
                                {benchmark_metrics_list(
                                    "Candidates",
                                    result.candidate_count,
                                    "CPU",
                                    result.cpu_ms,
                                    result.gpu_ms,
                                    &result.backend,
                                )}
                            }
                            .into_any()
                        } else {
                            view! { <p class="muted">"No benchmark run yet."</p> }.into_any()
                        }
                    }}
                </div>
            </div>
        </section>
    }
}

pub fn ai_warmup_page() -> impl IntoView {
    let status = RwSignal::new("Ready".to_string());
    let ann_caps = RwSignal::new(None::<crate::ai::AnnCapDiagnostics>);
    let sample_enabled = RwSignal::new(false);
    let error = RwSignal::new(None::<String>);

    #[cfg(feature = "hydrate")]
    {
        let status_signal = status.clone();
        let ann_caps_signal = ann_caps.clone();
        let sample_enabled_signal = sample_enabled.clone();
        let error_signal = error.clone();
        request_animation_frame(move || {
            sample_enabled_signal.set(crate::ai::embedding_sample_enabled());
            spawn_local(async move {
                status_signal.set("Warming embedding index…".to_string());
                let loaded = crate::ai::load_embedding_index().await;
                if loaded.is_none() {
                    status_signal.set("Warmup failed".to_string());
                    error_signal.set(Some(
                        "Embedding index could not be loaded. Retry after data sync.".to_string(),
                    ));
                    ann_caps_signal.set(None);
                    return;
                }
                ann_caps_signal.set(crate::ai::ann_cap_diagnostics());
                error_signal.set(None);
                status_signal.set("Warmup complete".to_string());
            });
        });
    }

    view! {
        <section class="page">
            <h1>"AI Warmup"</h1>
            <p class="lead">"Preload embeddings for faster AI search."</p>
            <div class="card">
                <p>{move || status.get()}</p>
                <p class="muted">
                    {move || if sample_enabled.get() { "Sample mode: ON" } else { "Sample mode: OFF" }}
                </p>
                {move || error.get().map(|message| view! { <p class="muted">{message}</p> })}
                {move || ann_caps.get().map(|cap| view! {
                    <ul class="list">
                        <li>{format!("Vectors: {}", cap.vectors_after)}</li>
                        <li>{format!("Cap: {:.1} MB", cap.cap_bytes as f64 / 1_000_000.0)}</li>
                    </ul>
                })}
            </div>
        </section>
    }
}

pub fn ai_smoke_page() -> impl IntoView {
    let query = RwSignal::new("dave matthews".to_string());
    let status = RwSignal::new("Idle".to_string());
    let results = RwSignal::new(Vec::<SearchResult>::new());
    let backend = RwSignal::new("n/a".to_string());
    let elapsed_ms = RwSignal::new(None::<f64>);
    let running = RwSignal::new(false);
    let error = RwSignal::new(None::<String>);

    let run_smoke = move |_| {
        #[cfg(feature = "hydrate")]
        {
            let query_value = query.get_untracked().trim().to_string();
            if query_value.is_empty() {
                error.set(Some("Enter a query before running smoke test.".to_string()));
                return;
            }
            let status_signal = status.clone();
            let results_signal = results.clone();
            let backend_signal = backend.clone();
            let elapsed_signal = elapsed_ms.clone();
            let running_signal = running.clone();
            let error_signal = error.clone();
            spawn_local(async move {
                running_signal.set(true);
                error_signal.set(None);
                status_signal.set("Loading embeddings…".to_string());
                let Some(index) = crate::ai::load_embedding_index().await else {
                    status_signal.set("Embedding load failed.".to_string());
                    error_signal.set(Some(
                        "Embedding index unavailable. Run warmup and retry.".to_string(),
                    ));
                    running_signal.set(false);
                    return;
                };
                status_signal.set("Running semantic search…".to_string());
                let start = js_sys::Date::now();
                let output = crate::ai::semantic_search(&query_value, &index, 5).await;
                let end = js_sys::Date::now();
                results_signal.set(output);
                backend_signal.set(if crate::ai::detect_ai_capabilities().webgpu_enabled {
                    "WebGPU".to_string()
                } else {
                    "WASM SIMD".to_string()
                });
                elapsed_signal.set(Some(end - start));
                if results_signal.get_untracked().is_empty() {
                    status_signal.set("Complete (no matches)".to_string());
                } else {
                    status_signal.set("Complete".to_string());
                }
                running_signal.set(false);
            });
        }
    };

    view! {
        <section class="page">
            <h1>"AI Smoke Test"</h1>
            <p class="lead">"Quick semantic search check with latency reporting."</p>
            <div class="card">
                <label class="stack">
                    <span class="muted">"Query"</span>
                    <input
                        class="input"
                        type="text"
                        prop:value=move || query.get()
                        on:input=move |ev| {
                            query.set(event_target_value(&ev));
                        }
                    />
                </label>
                <div class="pill-row">
                    <button type="button" class="pill" disabled=move || running.get() on:click=run_smoke>
                        {move || if running.get() { "Running..." } else { "Run smoke test" }}
                    </button>
                </div>
                <p class="muted">{move || status.get()}</p>
                {move || error.get().map(|message| view! { <p class="muted">{message}</p> })}
                {move || elapsed_ms.get().map(|ms| view! {
                    <p class="muted">{format!("Latency: {:.2} ms ({})", ms, backend.get())}</p>
                })}
                {move || {
                    let items = results.get();
                    if items.is_empty() {
                        view! { <p class="muted">"No results yet."</p> }.into_any()
                    } else {
                        let rows = items.iter().map(|item| {
                            let label = item.label.clone();
                            view! { <li>{format!("{} ({:.3})", label, item.score)}</li> }
                        });
                        view! { <ul class="list">{rows.collect_view()}</ul> }.into_any()
                    }
                }}
            </div>
        </section>
    }
}
