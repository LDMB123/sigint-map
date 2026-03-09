use axum::{
    Router,
    body::Body,
    http::{HeaderName, HeaderValue, Request, header},
    middleware::Next,
    response::Response,
};
use tower_http::set_header::SetResponseHeaderLayer;

pub(crate) async fn cache_control_middleware(req: Request<Body>, next: Next) -> Response {
    let path = req.uri().path();
    let is_no_cache = path == "/sw.js"
        || path.starts_with("/pkg/")
        || path == "/app.css"
        || path == "/webgpu.js"
        || path == "/webgpu-worker.js"
        || path.starts_with("/data/")
        || path == "/manifest.json";
    let accepts_html = req
        .headers()
        .get(header::ACCEPT)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|value| value.contains("text/html"));

    let mut res = next.run(req).await;

    if is_no_cache {
        res.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-cache, must-revalidate"),
        );
    } else if accepts_html {
        res.headers_mut()
            .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
        res.headers_mut()
            .insert(header::VARY, HeaderValue::from_static("Accept"));
    }

    res
}

pub(crate) fn coop_coep_enabled_from_value(value: Option<&str>) -> bool {
    match value.map(str::trim) {
        Some("0") => false,
        Some(value) if value.eq_ignore_ascii_case("false") => false,
        _ => true,
    }
}

pub(crate) fn coop_coep_enabled() -> bool {
    coop_coep_enabled_from_value(std::env::var("DMB_COOP_COEP").ok().as_deref())
}

pub(crate) fn apply_baseline_security_headers(app: Router) -> Router {
    app.layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    ))
    .layer(SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static(
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
        ),
    ))
}

pub(crate) fn apply_coop_headers(app: Router, enabled: bool) -> Router {
    if enabled {
        app.layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("cross-origin-opener-policy"),
            HeaderValue::from_static("same-origin"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            HeaderName::from_static("cross-origin-embedder-policy"),
            HeaderValue::from_static("require-corp"),
        ))
    } else {
        app
    }
}
