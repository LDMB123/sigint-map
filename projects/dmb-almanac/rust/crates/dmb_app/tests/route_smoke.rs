#![cfg(feature = "ssr")]

use any_spawner::Executor;
use dmb_app::App;
use leptos::prelude::*;
use leptos_meta::provide_meta_context;
use leptos_router::location::RequestUrl;
use std::collections::BTreeSet;

fn render_app_at(path: &str) -> String {
    let _ = Executor::init_futures_executor();
    let owner = Owner::new();
    owner.with(|| {
        provide_meta_context();
        provide_context(RequestUrl::new(path));
        App().into_view().to_html()
    })
}

fn sample_path_for_route(route: &str) -> String {
    if route == "/*" {
        return "/route-not-found".to_string();
    }
    if route == "/" {
        return "/".to_string();
    }
    let mut path = String::new();
    for segment in route.split('/') {
        if segment.is_empty() {
            continue;
        }
        path.push('/');
        if let Some(param) = segment.strip_prefix(':') {
            let sample = match param {
                "showId" | "venueId" | "listId" => "1",
                "year" => "2024",
                "slug" => "sample-slug",
                _ => "1",
            };
            path.push_str(sample);
        } else {
            path.push_str(segment);
        }
    }
    if path.is_empty() {
        "/".to_string()
    } else {
        path
    }
}

#[test]
fn ssr_smoke_renders_all_route_paths() {
    let mut sampled_paths = BTreeSet::new();
    for route in dmb_app::RUST_ROUTES {
        let path = sample_path_for_route(route);
        assert!(
            sampled_paths.insert(path.clone()),
            "route {} mapped to duplicate sample path {}",
            route,
            path
        );
        let html = render_app_at(&path);
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
        assert!(html.contains("<h1"), "path {} missing heading", path);
    }
}
