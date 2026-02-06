#![cfg(feature = "ssr")]

use any_spawner::Executor;
use dmb_app::{shell, App};
use leptos::prelude::*;
use leptos_config::LeptosOptions;
use leptos_meta::provide_meta_context;
use leptos_router::location::RequestUrl;

#[test]
fn ssr_app_renders_shell_and_hydration() {
    let options = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();

    let _ = Executor::init_futures_executor();
    let owner = Owner::new();
    owner.with(|| {
        provide_meta_context();
        provide_context(RequestUrl::new("/"));
        let shell_html = shell(options.clone()).into_view().to_html();
        assert!(shell_html.contains("serviceWorker"));
        assert!(shell_html.contains("/manifest.json"));
        assert!(shell_html.contains("/app.css"));
        assert!(shell_html.contains("/webgpu.js"));

        let app_html = App().into_view().to_html();
        assert!(app_html.contains("main-content"));
    });
}
