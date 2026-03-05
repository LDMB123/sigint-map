use js_sys::Array;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
#[cfg(feature = "hydrate")]
use wasm_bindgen_futures::JsFuture;

#[cfg(feature = "hydrate")]
pub async fn fetch_response(url: &str) -> Result<web_sys::Response, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("window missing"))?;
    let resp_value = JsFuture::from(window.fetch_with_str(url)).await?;
    resp_value
        .dyn_into::<web_sys::Response>()
        .map_err(|_| JsValue::from_str("bad response"))
}

#[cfg(not(feature = "hydrate"))]
pub async fn fetch_response(_url: &str) -> Result<web_sys::Response, JsValue> {
    Err(JsValue::from_str("hydrate feature disabled"))
}

#[cfg(feature = "hydrate")]
pub async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Option<T> {
    let resp = fetch_response(url).await.ok()?;
    if !resp.ok() {
        return None;
    }
    let json = JsFuture::from(resp.json().ok()?).await.ok()?;
    serde_wasm_bindgen::from_value(json).ok()
}

#[cfg(not(feature = "hydrate"))]
pub async fn fetch_json<T: serde::de::DeserializeOwned>(_url: &str) -> Option<T> {
    None
}

#[cfg(feature = "hydrate")]
pub async fn fetch_json_array(url: &str) -> Result<Array, JsValue> {
    let resp = fetch_response(url).await?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "fetch failed: {}",
            resp.status()
        )));
    }
    let json = JsFuture::from(resp.json()?).await?;
    Ok(Array::from(&json))
}

#[cfg(not(feature = "hydrate"))]
pub async fn fetch_json_array(_url: &str) -> Result<Array, JsValue> {
    Err(JsValue::from_str("hydrate feature disabled"))
}

#[cfg(feature = "hydrate")]
pub async fn fetch_array_buffer(url: &str) -> Result<js_sys::ArrayBuffer, JsValue> {
    let resp = fetch_response(url).await?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!(
            "fetch failed: {}",
            resp.status()
        )));
    }
    let buffer = JsFuture::from(resp.array_buffer()?).await?;
    buffer
        .dyn_into::<js_sys::ArrayBuffer>()
        .map_err(|_| JsValue::from_str("bad array buffer"))
}

#[cfg(not(feature = "hydrate"))]
pub async fn fetch_array_buffer(_url: &str) -> Result<js_sys::ArrayBuffer, JsValue> {
    Err(JsValue::from_str("hydrate feature disabled"))
}

#[cfg(test)]
mod tests {
    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn http_apis_fail_without_hydrate() {
        // Keep non-hydrate behavior explicit.
        let _ = super::fetch_response;
        let _ = super::fetch_json::<serde_json::Value>;
        let _ = super::fetch_json_array;
        let _ = super::fetch_array_buffer;
    }
}
