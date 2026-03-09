#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;

#[cfg(feature = "hydrate")]
pub fn trigger_lazy_runtime_warmup() {
    use once_cell::sync::OnceCell;

    static WARMUP_ONCE: OnceCell<()> = OnceCell::new();
    if WARMUP_ONCE.set(()).is_ok() {
        crate::browser::perf::ensure_perf_observers_started();
        crate::ai::preload_webgpu_runtime();
        spawn_local(async {
            let _ = dmb_idb::open_db().await;
        });
    }
}

#[cfg(not(feature = "hydrate"))]
pub fn trigger_lazy_runtime_warmup() {}
