#![allow(clippy::clone_on_copy)]

pub mod ai;
pub mod browser;
pub mod components;
pub mod data;
pub mod pages;
pub mod server;

pub const RUST_ROUTES: &[&str] = &[
    "/",
    "/about",
    "/contact",
    "/faq",
    "/shows",
    "/shows/:showId",
    "/songs",
    "/songs/:slug",
    "/venues",
    "/venues/:venueId",
    "/guests",
    "/guests/:slug",
    "/tours",
    "/tours/:year",
    "/releases",
    "/releases/:slug",
    "/discography",
    "/search",
    "/stats",
    "/liberation",
    "/lists",
    "/lists/:listId",
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
    "/*",
];

use leptos::hydration::HydrationScripts;
#[cfg(feature = "hydrate")]
use leptos::mount::hydrate_body;
use leptos::prelude::*;
use leptos_config::LeptosOptions;
use leptos_router::components::{Route, Router, Routes};
use leptos_router::path;

#[component]
#[allow(clippy::must_use_candidate)]
#[must_use]
pub fn App() -> impl IntoView {
    view! {
        <a class="skip-link" href="#main-content">"Skip to content"</a>
        <Router>
            <div class="app-shell">
                <components::Header />
                <main id="main-content" tabindex="-1" class="main">
                    <Routes fallback=|| pages::not_found_page().into_view()>
                        <Route path=path!("") view=pages::home_page />
                        <Route path=path!("/about") view=pages::about_page />
                        <Route path=path!("/contact") view=pages::contact_page />
                        <Route path=path!("/faq") view=pages::faq_page />
                        <Route path=path!("/shows") view=pages::shows_page />
                        <Route path=path!("/shows/:showId") view=pages::show_detail_page />
                        <Route path=path!("/songs") view=pages::songs_page />
                        <Route path=path!("/songs/:slug") view=pages::song_detail_page />
                        <Route path=path!("/venues") view=pages::venues_page />
                        <Route path=path!("/venues/:venueId") view=pages::venue_detail_page />
                        <Route path=path!("/guests") view=pages::guests_page />
                        <Route path=path!("/guests/:slug") view=pages::guest_detail_page />
                        <Route path=path!("/tours") view=pages::tours_page />
                        <Route path=path!("/tours/:year") view=pages::tour_year_page />
                        <Route path=path!("/releases") view=pages::releases_page />
                        <Route path=path!("/releases/:slug") view=pages::release_detail_page />
                        <Route path=path!("/discography") view=pages::discography_page />
                        <Route path=path!("/search") view=pages::search_page />
                        <Route path=path!("/stats") view=pages::stats_page />
                        <Route path=path!("/liberation") view=pages::liberation_page />
                        <Route path=path!("/lists") view=pages::curated_lists_page />
                        <Route path=path!("/lists/:listId") view=pages::curated_list_detail_page />
                        <Route path=path!("/my-shows") view=pages::my_shows_page />
                        <Route path=path!("/open-file") view=pages::open_file_page />
                        <Route path=path!("/protocol") view=pages::protocol_page />
                        <Route path=path!("/test-wasm") view=pages::test_wasm_page />
                        <Route path=path!("/assistant") view=pages::assistant_page />
                        <Route path=path!("/ai-diagnostics") view=pages::ai_diagnostics_page />
                        <Route path=path!("/ai-benchmark") view=pages::ai_benchmark_page />
                        <Route path=path!("/ai-warmup") view=pages::ai_warmup_page />
                        <Route path=path!("/ai-smoke") view=pages::ai_smoke_page />
                        <Route path=path!("/visualizations") view=pages::visualizations_page />
                        <Route path=path!("/offline") view=pages::offline_page />
                    </Routes>
                </main>
                <components::Footer />
            </div>
        </Router>
        <components::PwaStatus />
    }
}

#[must_use]
#[allow(clippy::needless_pass_by_value)]
pub fn shell(options: LeptosOptions) -> impl IntoView {
    view! {
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <title>"DMB Almanac (Rust)"</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta
                    name="description"
                    content="Rust-first, offline-first Dave Matthews Band concert database and analytics PWA."
                />
                <meta name="application-name" content="DMB Almanac" />
                <meta name="theme-color" content="#111827" />
                <meta name="color-scheme" content="dark light" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="icon" href="/icons/icon-192.png" />
                <link rel="preload" href="/app.css" r#as="style" />
                <link rel="stylesheet" href="/app.css" />
                <HydrationScripts options=options.clone() />
            </head>
            <body>
                <App />
                <noscript>"DMB Almanac works best with JavaScript enabled."</noscript>
            </body>
        </html>
    }
}

#[cfg(feature = "hydrate")]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn hydrate() {
    console_error_panic_hook::set_once();
    tracing_wasm::set_as_global_default();

    // Hydrate the SSR markup instead of mounting a second copy of the app.
    hydrate_body(App);
    let _ = browser::service_worker::register_default_sw();
    ai::preload_webgpu_runtime();

    // Lightweight signal for E2E and diagnostics tooling that hydration ran.
    let _ = browser::runtime::set_window_bool("__DMB_HYDRATED", true);
}
