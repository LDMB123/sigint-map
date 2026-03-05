#[cfg(feature = "hydrate")]
use wasm_bindgen::{JsCast, JsValue};

#[cfg(feature = "hydrate")]
pub fn download_text_file(filename: &str, content: &str) -> bool {
    let parts = js_sys::Array::new();
    parts.push(&JsValue::from_str(content));

    let Ok(blob) = web_sys::Blob::new_with_str_sequence(&parts) else {
        return false;
    };
    let Ok(url) = web_sys::Url::create_object_url_with_blob(&blob) else {
        return false;
    };

    let result = (|| {
        let window = web_sys::window()?;
        let document = window.document()?;
        let element = document.create_element("a").ok()?;
        let anchor = element.dyn_into::<web_sys::HtmlAnchorElement>().ok()?;
        anchor.set_href(&url);
        anchor.set_download(filename);
        anchor.click();
        Some(())
    })()
    .is_some();

    let _ = web_sys::Url::revoke_object_url(&url);
    result
}

#[cfg(not(feature = "hydrate"))]
pub fn download_text_file(_filename: &str, _content: &str) -> bool {
    false
}

#[cfg(test)]
mod tests {
    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn download_is_noop_without_hydrate() {
        assert!(!super::download_text_file("test.txt", "content"));
    }
}
