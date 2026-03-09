use super::*;

#[tokio::test]
async fn ssr_renders_core_pages() {
    let app = build_test_ssr_app();

    for path in ["/", "/search", "/ai-diagnostics"] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(path)
                    .body(Body::empty())
                    .unwrap_or_else(|err| panic!("request body: {}", err)),
            )
            .await
            .unwrap_or_else(|err| panic!("response: {}", err));
        assert_eq!(response.status(), StatusCode::OK, "path {path}");

        let body = to_bytes(response.into_body(), 2 * 1024 * 1024)
            .await
            .unwrap_or_else(|err| panic!("read body: {}", err));
        let text = String::from_utf8_lossy(&body);
        assert!(
            text.contains("Skip to content"),
            "missing app shell for {path}"
        );
        if path == "/search" {
            assert!(text.contains("Search"), "missing search content");
        }
        if path == "/ai-diagnostics" {
            assert!(
                text.contains("AI Diagnostics"),
                "missing ai diagnostics content"
            );
        }
    }
}
