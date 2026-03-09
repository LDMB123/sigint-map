use super::*;

pub(crate) fn action_load_ann_caps(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        if state.ann_caps_loading.get_untracked() {
            return;
        }
        batch(move || {
            state.ann_caps_loading.set(true);
            state.ann_caps_error.set(None);
        });

        let ann_caps = state.ann_caps;
        let ann_caps_loading = state.ann_caps_loading;
        let ann_caps_error = state.ann_caps_error;
        spawn_local(async move {
            let loaded = crate::ai::load_embedding_index().await;
            if loaded.is_none() {
                ann_caps_error.set(Some("Embedding index load failed.".to_string()));
            }
            batch(move || {
                ann_caps.set(crate::ai::ann_cap_diagnostics());
                ann_caps_loading.set(false);
            });
        });
    });
}

pub(crate) fn action_run_benchmark(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let bench = state.bench;
        let bench_running = state.bench_running;
        let bench_progress = state.bench_progress;
        let bench_stage = state.bench_stage;
        let bench_cancelled = state.bench_cancelled;
        let benchmark_history = state.benchmark_history;
        spawn_local(async move {
            bench_running.set(true);
            bench_progress.set(0.0);
            bench_stage.set("Preparing".to_string());
            bench_cancelled.set(false);

            let sample = crate::ai::prepare_benchmark_sample(4000).await;
            if cancel_benchmark_if_requested(bench_cancelled, bench_running, bench_stage) {
                return;
            }
            let Some(sample) = sample else {
                set_benchmark_cancelled_state(bench_running, bench_stage);
                return;
            };

            bench_progress.set(0.2);
            bench_stage.set("CPU".to_string());
            let cpu_ms = crate::ai::benchmark_cpu(&sample);
            if cpu_ms.is_none() {
                set_benchmark_cancelled_state(bench_running, bench_stage);
                return;
            }
            if cancel_benchmark_if_requested(bench_cancelled, bench_running, bench_stage) {
                return;
            }

            bench_progress.set(0.6);
            bench_stage.set("GPU".to_string());
            let (gpu_ms, backend) = crate::ai::benchmark_gpu(&sample).await;
            if cancel_benchmark_if_requested(bench_cancelled, bench_running, bench_stage) {
                return;
            }

            bench_progress.set(1.0);
            bench_stage.set("Complete".to_string());
            let result = crate::ai::AiBenchmark {
                sample_count: sample.sample_count,
                cpu_ms: cpu_ms.unwrap_or_default(),
                gpu_ms,
                backend,
            };
            bench.set(Some(result.clone()));
            store_benchmark_sample_and_refresh_history(benchmark_history, Some(result), None, None);
            bench_running.set(false);
        });
    });
}

pub(crate) fn action_cancel_benchmark(state: AiDiagnosticsState) {
    state.bench_cancelled.set(true);
    state.bench_stage.set("Cancelling".to_string());
}

pub(crate) fn action_run_worker_benchmark(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let worker_bench = state.worker_bench;
        let benchmark_history = state.benchmark_history;
        let worker_failure = state.worker_failure;
        let webgpu_runtime = state.webgpu_runtime;
        spawn_local(async move {
            let result = crate::ai::benchmark_worker_threshold().await;
            worker_bench.set(result.clone());
            store_benchmark_sample_and_refresh_history(benchmark_history, None, None, result);
            refresh_worker_threshold_signals(state);
            worker_failure.set(crate::ai::worker_failure_status());
            webgpu_runtime.set(crate::browser::webgpu_diagnostics::load_runtime_telemetry());
        });
    });
}

pub(crate) fn action_run_tuning(state: AiDiagnosticsState) {
    hydrate_action!(state, {
        let tuning = state.tuning;
        let tuning_result = state.tuning_result;
        spawn_local(async move {
            if let Some(index) = crate::ai::load_embedding_index().await {
                let result = crate::ai::tune_ivf_probe(&index, 20).await;
                tuning_result.set(result.clone());
                tuning.set(Some(crate::ai::load_ai_tuning()));
            }
        });
    });
}
