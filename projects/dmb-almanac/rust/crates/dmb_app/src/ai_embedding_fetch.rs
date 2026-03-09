#[cfg(feature = "hydrate")]
use super::*;

#[cfg(feature = "hydrate")]
pub(crate) async fn webgpu_probe_ok() -> bool {
    if let Some(value) = WEBGPU_PROBE_CACHE.get() {
        return *value;
    }
    let probed = matches!(probe_webgpu_device().await, Some(true));
    let _ = WEBGPU_PROBE_CACHE.set(probed);
    if !probed {
        record_ai_warning("webgpu_probe_failed", None);
    }
    probed
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub(crate) async fn webgpu_probe_ok() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub(super) async fn fetch_f32_array_with_cap(url: &str, cap_bytes: u64) -> Option<Vec<f32>> {
    use wasm_bindgen_futures::JsFuture;

    let resp = crate::browser::http::fetch_response(url).await.ok()?;
    if !resp.ok() {
        record_ai_warning(
            "ann_index_fetch_failed",
            Some(format!("{url} status {}", resp.status())),
        );
        return None;
    }
    if cap_bytes > 0
        && let Ok(Some(value)) = resp.headers().get("Content-Length")
        && let Ok(len) = value.parse::<u64>()
        && len > cap_bytes
    {
        web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
            "ANN index fetch skipped ({} MB > cap).",
            len as f64 / 1_000_000.0
        )));
        record_ai_warning(
            "ann_index_fetch_skipped_over_cap",
            Some(format!("{len} bytes > {cap_bytes} bytes")),
        );
        return None;
    }
    let buffer = JsFuture::from(resp.array_buffer().ok()?).await.ok()?;
    let array = js_sys::Float32Array::new(&buffer);
    let array_bytes = array.length() as u64 * 4;
    if cap_bytes > 0 && array_bytes > cap_bytes {
        web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
            "ANN index over cap after download ({} MB > cap).",
            array_bytes as f64 / 1_000_000.0
        )));
        record_ai_warning(
            "ann_index_over_cap_after_download",
            Some(format!("{array_bytes} bytes > {cap_bytes} bytes")),
        );
        return None;
    }
    let mut out = vec![0.0f32; array.length() as usize];
    array.copy_to(&mut out);
    Some(out)
}
