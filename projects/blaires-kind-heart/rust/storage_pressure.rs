use crate::dom;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
async fn check_quota() -> Option<(f64, f64, u32)> {
    let navigator = dom::window().navigator();
    let storage = navigator.storage();
    let promise = storage.estimate().ok()?;
    let estimate_val = JsFuture::from(promise).await.ok()?;
    let estimate: web_sys::StorageEstimate = estimate_val.dyn_into().ok()?;
    let usage = estimate.get_usage().unwrap_or(0.0);
    let quota = estimate.get_quota().unwrap_or(1.0);
    let used_mb = usage / 1_048_576.0;
    let quota_mb = quota / 1_048_576.0;
    let pct = (usage / quota * 100.0) as u32;
    Some((used_mb, quota_mb, pct))
}
pub async fn warn_if_low() {
    if let Some((_used, _total, pct)) = check_quota().await {
        if pct > 90 {
            dom::toast("Storage almost full! Cleaning up...");
            run_cleanup().await;
        } else if pct > 80 {
            dom::warn(&format!(
                "[storage] Quota at {pct}% — running proactive cleanup"
            ));
            run_cleanup().await;
        }
    }
}
async fn run_cleanup() {
    if let Err(e) = crate::errors::clear_old_errors().await {
        dom::warn(&format!("[storage] Error cleanup failed: {e}"));
    }
    if let Err(e) = crate::offline_queue::flush_queue().await {
        dom::warn(&format!("[storage] Queue flush failed: {e:?}"));
    }
    let cutoff = crate::utils::day_key_n_days_ago(30);
    let _ =
        crate::db_client::exec("DELETE FROM game_scores WHERE day_key < ?1", vec![cutoff]).await;
    dom::warn("[storage] Cleanup complete");
}
