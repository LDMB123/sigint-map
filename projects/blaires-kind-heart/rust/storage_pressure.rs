//! Storage pressure monitoring via StorageManager API.
//! Safari 17+ supports navigator.storage.estimate().
//! We check periodically and warn if quota is getting tight.

use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

use crate::dom;

/// Check storage quota and return (used_mb, quota_mb, percent).
pub async fn check_quota() -> Option<(f64, f64, u32)> {
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

/// Show a warning toast if storage is over 80%.
pub async fn warn_if_low() {
    if let Some((used, total, pct)) = check_quota().await {
        if pct > 80 {
            dom::toast(&format!(
                "Storage {pct}% full ({used:.0}MB / {total:.0}MB)"
            ));
        }
    }
}
