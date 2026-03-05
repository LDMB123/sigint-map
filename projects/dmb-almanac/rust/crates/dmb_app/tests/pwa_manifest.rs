use std::path::Path;

use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct WebManifest {
    id: Option<String>,
    start_url: String,
    scope: String,
    display: String,
    icons: Vec<WebManifestIcon>,
}

#[derive(Debug, Deserialize)]
struct WebManifestIcon {
    src: String,
    sizes: String,
    #[serde(default)]
    purpose: Option<String>,
}

#[test]
fn web_manifest_has_stable_identity_and_scope() {
    let manifest_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../static/manifest.json");
    let payload = std::fs::read_to_string(&manifest_path)
        .unwrap_or_else(|err| panic!("read {}: {err}", manifest_path.display()));
    let manifest: WebManifest = serde_json::from_str(&payload)
        .unwrap_or_else(|err| panic!("parse {}: {err}", manifest_path.display()));

    assert_eq!(manifest.id.as_deref(), Some("/"));
    assert_eq!(manifest.start_url, "/");
    assert_eq!(manifest.scope, "/");
    assert_eq!(manifest.display, "standalone");
}

#[test]
fn web_manifest_includes_maskable_icon() {
    let manifest_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../static/manifest.json");
    let payload = std::fs::read_to_string(&manifest_path)
        .unwrap_or_else(|err| panic!("read {}: {err}", manifest_path.display()));
    let manifest: WebManifest = serde_json::from_str(&payload)
        .unwrap_or_else(|err| panic!("parse {}: {err}", manifest_path.display()));

    let has_maskable = manifest.icons.iter().any(|icon| {
        icon.sizes == "512x512"
            && icon.src == "/icons/icon-512.png"
            && icon
                .purpose
                .as_deref()
                .is_some_and(|value| value.split_whitespace().any(|part| part == "maskable"))
    });
    assert!(has_maskable, "manifest missing 512x512 maskable icon entry");
}
