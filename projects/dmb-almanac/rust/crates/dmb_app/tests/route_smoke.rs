#![cfg(feature = "ssr")]

use any_spawner::Executor;
use dmb_app::App;
use leptos::prelude::*;
use leptos_meta::provide_meta_context;
use leptos_router::location::RequestUrl;

fn render_app_at(path: &str) -> String {
    let _ = Executor::init_futures_executor();
    let owner = Owner::new();
    owner.with(|| {
        provide_meta_context();
        provide_context(RequestUrl::new(path));
        App().into_view().to_html()
    })
}

#[test]
fn ssr_smoke_renders_all_route_paths() {
    let cases = [
        "/",
        "/about",
        "/contact",
        "/faq",
        "/shows",
        "/shows/1",
        "/songs",
        "/songs/ants-marching",
        "/venues",
        "/venues/1",
        "/guests",
        "/guests/bela-fleck",
        "/tours",
        "/tours/2024",
        "/releases",
        "/releases/live-trax-vol-1",
        "/discography",
        "/search",
        "/stats",
        "/liberation",
        "/lists",
        "/lists/1",
        "/my-shows",
        "/open-file",
        "/protocol",
        "/test-wasm",
        "/assistant",
        "/ai-diagnostics",
        "/ai-benchmark",
        "/ai-warmup",
        "/ai-smoke",
        "/visualizations",
        "/offline",
        "/route-not-found",
    ];

    assert_eq!(
        cases.len(),
        dmb_app::RUST_ROUTES.len(),
        "smoke route list should stay aligned with RUST_ROUTES",
    );

    for path in cases {
        let html = render_app_at(path);
        assert!(
            html.contains("main-content"),
            "path {} missing app main content",
            path
        );
        assert!(
            html.contains("class=\"page\""),
            "path {} missing page wrapper",
            path
        );
    }
}
