use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

fn collect_svelte_routes(root: &Path) -> BTreeSet<String> {
    let mut routes = BTreeSet::new();
    routes.insert("/".to_string());

    let Ok(entries) = fs::read_dir(root) else {
        return routes;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => name,
            None => continue,
        };

        if name == "api" || name == "(isolated)" {
            continue;
        }

        if path.is_dir() {
            routes.insert(format!("/{name}"));
            if let Ok(child_entries) = fs::read_dir(&path) {
                for child in child_entries.flatten() {
                    let child_path = child.path();
                    let child_name = child_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    if child_name.starts_with('[') && child_name.ends_with(']') {
                        let param = child_name.trim_matches(&['[', ']'][..]);
                        routes.insert(format!("/{name}/:{param}"));
                    }
                }
            }
            continue;
        }

        if path.is_file() && name.starts_with("sitemap") && name.ends_with(".xml") {
            routes.insert(format!("/{name}"));
        }
    }

    routes
}

#[test]
fn rust_router_covers_svelte_routes() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let svelte_routes_dir = manifest_dir
        .join("../../../../app/src/routes")
        .canonicalize()
        .unwrap_or_else(|_| manifest_dir.clone());
    if !svelte_routes_dir.join("+page.svelte").exists() {
        return;
    }
    let svelte_routes = collect_svelte_routes(&svelte_routes_dir);

    let rust_routes: BTreeSet<String> =
        dmb_app::RUST_ROUTES.iter().map(|r| r.to_string()).collect();

    let missing: Vec<String> = svelte_routes
        .difference(&rust_routes)
        .filter(|route| !route.starts_with("/sitemap"))
        .cloned()
        .collect();

    assert!(missing.is_empty(), "Missing Rust routes: {missing:?}");
}
