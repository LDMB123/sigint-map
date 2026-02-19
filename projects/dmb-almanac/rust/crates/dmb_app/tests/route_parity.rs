use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

fn load_previous_routes_fixture(manifest_dir: &Path) -> Option<BTreeSet<String>> {
    let fixture = manifest_dir.join("tests/fixtures/routes_fixture.json");
    let payload = fs::read_to_string(&fixture).ok()?;
    let routes: Vec<String> = serde_json::from_str(&payload).ok()?;
    Some(routes.into_iter().collect())
}

#[test]
fn rust_router_covers_previous_routes() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let Some(previous_routes) = load_previous_routes_fixture(&manifest_dir) else {
        return;
    };

    let rust_routes: BTreeSet<String> = dmb_app::RUST_ROUTES
        .iter()
        .map(std::string::ToString::to_string)
        .collect();

    let missing: Vec<String> = previous_routes
        .difference(&rust_routes)
        .filter(|route| !route.starts_with("/sitemap"))
        .cloned()
        .collect();

    assert!(missing.is_empty(), "Missing Rust routes: {missing:?}");
}
