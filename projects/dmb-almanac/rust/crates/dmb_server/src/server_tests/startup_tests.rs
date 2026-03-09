use super::*;

#[test]
fn default_sqlite_candidates_include_common_workspace_layouts() {
    assert_eq!(
        startup::default_sqlite_candidates(),
        &[
            "data/dmb-almanac.db",
            "../data/dmb-almanac.db",
            "../../data/dmb-almanac.db",
        ]
    );
}

#[test]
fn static_asset_guard_reports_missing_files() {
    let cwd = unique_temp_dir("missing_assets");
    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let missing = startup::missing_required_static_assets_from_cwd(&leptos, &cwd);
    let missing_paths: Vec<String> = missing
        .iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect();
    assert!(
        missing_paths
            .iter()
            .any(|path| path.ends_with("static/pkg/dmb_app.js")),
        "missing list should include dmb_app.js: {missing_paths:?}"
    );
    assert!(
        missing_paths
            .iter()
            .any(|path| path.ends_with("static/pkg/dmb_app_bg.wasm")),
        "missing list should include dmb_app_bg.wasm: {missing_paths:?}"
    );
    let _ = fs::remove_dir_all(cwd);
}

#[test]
fn static_asset_guard_passes_when_pkg_files_exist() {
    let cwd = unique_temp_dir("present_assets");
    let pkg_dir = cwd.join("static").join("pkg");
    if let Err(err) = fs::create_dir_all(&pkg_dir) {
        panic!("create pkg dir: {err}");
    }
    if let Err(err) = fs::write(pkg_dir.join("dmb_app.js"), b"// test") {
        panic!("write dmb_app.js: {err}");
    }
    if let Err(err) = fs::write(pkg_dir.join("dmb_app_bg.wasm"), b"\0asm") {
        panic!("write dmb_app_bg.wasm: {err}");
    }

    let leptos = LeptosOptions::builder()
        .output_name("dmb_app")
        .site_root("static")
        .site_pkg_dir("pkg")
        .build();
    let missing = startup::missing_required_static_assets_from_cwd(&leptos, &cwd);
    assert!(
        missing.is_empty(),
        "expected no missing assets: {missing:?}"
    );
    let _ = fs::remove_dir_all(cwd);
}

#[test]
fn static_asset_guard_help_mentions_hydrate_pkg_build() {
    assert!(
        MISSING_STATIC_ASSETS_HELP.contains("build-hydrate-pkg"),
        "startup remediation should mention build-hydrate-pkg command"
    );
}

#[tokio::test]
async fn ai_health_endpoint_smoke() {
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
        .route("/api/ai-health", get(api_ai_health))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/ai-health")
                .body(Body::empty())
                .unwrap_or_else(|err| panic!("request body: {}", err)),
        )
        .await
        .unwrap_or_else(|err| panic!("response: {}", err));
    assert_eq!(response.status(), StatusCode::OK);
}
