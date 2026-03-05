use std::path::Path;

use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct DataManifest {
    files: Vec<ManifestFile>,
}

#[derive(Debug, Deserialize)]
struct ManifestFile {
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AnnIndexMeta {
    method: String,
    index_file: Option<String>,
}

#[test]
fn manifest_includes_ann_index_bin() {
    let manifest_path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../static/data/manifest.json");
    let require_static_data = std::env::var("DMB_STATIC_DATA_REQUIRED")
        .ok()
        .is_some_and(|v| matches!(v.as_str(), "1" | "true" | "TRUE"));
    if !manifest_path.exists() && !require_static_data {
        // `xtask verify` runs in environments where `rust/static/data` may not be generated yet.
        // We validate this in the cutover rehearsal after seeding from the static data bundle.
        return;
    }
    let payload = std::fs::read_to_string(&manifest_path)
        .unwrap_or_else(|err| panic!("read {}: {err}", manifest_path.display()));
    let manifest: DataManifest = serde_json::from_str(&payload)
        .unwrap_or_else(|err| panic!("parse {}: {err}", manifest_path.display()));

    let names: Vec<_> = manifest.files.iter().map(|f| f.name.as_str()).collect();
    // ANN index assets are only required when we ship embedding data.
    // (Today the app supports running with semantic search disabled.)
    let has_embeddings = names.contains(&"embedding-manifest.json");
    if !has_embeddings {
        return;
    }

    assert!(names.contains(&"ann-index.bin"));

    let ann_meta_path =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../static/data/ann-index.json");
    let ann_payload = std::fs::read_to_string(&ann_meta_path)
        .unwrap_or_else(|err| panic!("read {}: {err}", ann_meta_path.display()));
    let ann_meta: AnnIndexMeta = serde_json::from_str(&ann_payload)
        .unwrap_or_else(|err| panic!("parse {}: {err}", ann_meta_path.display()));
    if ann_meta.method == "ivf-flat" {
        let file = ann_meta
            .index_file
            .unwrap_or_else(|| "ann-index.ivf.json".to_string());
        assert!(names.contains(&file.as_str()));
    }
}
