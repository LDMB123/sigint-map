#![cfg(feature = "ssr")]

use any_spawner::Executor;
use dmb_app::pages;
use leptos::prelude::*;
use leptos_meta::provide_meta_context;

fn render_view<T: IntoView>(view_fn: impl FnOnce() -> T) -> String {
    let _ = Executor::init_futures_executor();
    let owner = Owner::new();
    owner.with(|| {
        provide_meta_context();
        view_fn().into_view().to_html()
    })
}

#[test]
fn ssr_routes_render_headings() {
    let cases: Vec<(&str, String)> = vec![
        ("/", render_view(pages::home_page)),
        ("/about", render_view(pages::about_page)),
        ("/contact", render_view(pages::contact_page)),
        ("/faq", render_view(pages::faq_page)),
        ("/shows", render_view(pages::shows_page)),
        ("/songs", render_view(pages::songs_page)),
        ("/venues", render_view(pages::venues_page)),
        ("/tours", render_view(pages::tours_page)),
        ("/guests", render_view(pages::guests_page)),
        ("/releases", render_view(pages::releases_page)),
        ("/discography", render_view(pages::discography_page)),
        ("/search", render_view(pages::search_page)),
        ("/stats", render_view(pages::stats_page)),
        ("/liberation", render_view(pages::liberation_page)),
        ("/lists", render_view(pages::curated_lists_page)),
        ("/my-shows", render_view(pages::my_shows_page)),
        ("/open-file", render_view(pages::open_file_page)),
        ("/protocol", render_view(pages::protocol_page)),
        ("/test-wasm", render_view(pages::test_wasm_page)),
        ("/assistant", render_view(pages::assistant_page)),
        ("/ai-diagnostics", render_view(pages::ai_diagnostics_page)),
        ("/ai-benchmark", render_view(pages::ai_benchmark_page)),
        ("/ai-warmup", render_view(pages::ai_warmup_page)),
        ("/ai-smoke", render_view(pages::ai_smoke_page)),
        ("/visualizations", render_view(pages::visualizations_page)),
        ("/offline", render_view(pages::offline_page)),
        ("/*", render_view(pages::not_found_page)),
    ];

    for (route, html) in cases {
        assert!(html.contains("<h1"), "route {route} missing heading");
        assert!(
            html.contains("class=\"page\""),
            "route {route} missing page wrapper"
        );
    }
}
