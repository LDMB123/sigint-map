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
fn top_routes_include_accessibility_landmarks_and_heading_order() {
    let routes = [
        "/",
        "/shows",
        "/songs",
        "/venues",
        "/guests",
        "/tours",
        "/releases",
        "/stats",
        "/search",
        "/visualizations",
    ];

    for route in routes {
        let html = render_app_at(route);

        assert!(
            html.contains("class=\"skip-link\""),
            "route {} missing skip-link",
            route
        );
        assert!(
            html.contains("id=\"main-content\""),
            "route {} missing main landmark",
            route
        );
        assert!(
            html.contains("aria-label=\"Primary navigation\""),
            "route {} missing primary nav label",
            route
        );
        assert!(html.contains("<h1"), "route {} missing h1", route);

        if let Some(h2_pos) = html.find("<h2") {
            let h1_pos = html
                .find("<h1")
                .expect("h1 required before evaluating heading order");
            assert!(
                h1_pos < h2_pos,
                "route {} has h2 before h1 (invalid heading hierarchy)",
                route
            );
        }
    }
}
