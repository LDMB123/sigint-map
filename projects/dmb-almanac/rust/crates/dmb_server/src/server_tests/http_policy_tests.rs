use super::*;

#[tokio::test]
async fn coop_headers_enabled() {
    let app = apply_coop_headers(Router::new().route("/health", get(|| async { "ok" })), true);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);
    let headers = response.headers();
    assert_eq!(
        headers
            .get("cross-origin-opener-policy")
            .and_then(|v| v.to_str().ok()),
        Some("same-origin")
    );
    assert_eq!(
        headers
            .get("cross-origin-embedder-policy")
            .and_then(|v| v.to_str().ok()),
        Some("require-corp")
    );
}

#[tokio::test]
async fn baseline_security_headers_enabled() {
    let app =
        apply_baseline_security_headers(Router::new().route("/health", get(|| async { "ok" })));
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);
    let headers = response.headers();
    assert_eq!(
        headers
            .get("x-content-type-options")
            .and_then(|v| v.to_str().ok()),
        Some("nosniff")
    );
    assert_eq!(
        headers.get("x-frame-options").and_then(|v| v.to_str().ok()),
        Some("DENY")
    );
    assert_eq!(
        headers.get("referrer-policy").and_then(|v| v.to_str().ok()),
        Some("strict-origin-when-cross-origin")
    );
    assert_eq!(
        headers
            .get("permissions-policy")
            .and_then(|v| v.to_str().ok()),
        Some(
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        )
    );
}

#[tokio::test]
async fn coop_headers_disabled() {
    let app = apply_coop_headers(
        Router::new().route("/health", get(|| async { "ok" })),
        false,
    );
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);
    let headers = response.headers();
    assert!(headers.get("cross-origin-opener-policy").is_none());
    assert!(headers.get("cross-origin-embedder-policy").is_none());
}

#[test]
fn coop_coep_env_toggle() {
    with_env_var("DMB_COOP_COEP", "false", || {
        assert!(!coop_coep_enabled());
    });
    with_env_var("DMB_COOP_COEP", "0", || {
        assert!(!coop_coep_enabled());
    });
    with_env_var("DMB_COOP_COEP", "true", || {
        assert!(coop_coep_enabled());
    });
}

#[tokio::test]
async fn request_id_is_propagated() {
    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let state = AppState {
        leptos,
        db: None,
        data_parity_cache: new_data_parity_cache(),
    };

    let app = Router::new()
        .route("/api/health", get(api_health))
        .layer(PropagateRequestIdLayer::new(HeaderName::from_static(
            "x-request-id",
        )))
        .layer(SetRequestIdLayer::new(
            HeaderName::from_static("x-request-id"),
            MakeRequestUuid,
        ))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);
    assert!(
        response.headers().get("x-request-id").is_some(),
        "missing x-request-id"
    );
}
