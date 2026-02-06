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
    let payload = std::fs::read_to_string(&manifest_path)
        .unwrap_or_else(|err| panic!("read {}: {err}", manifest_path.display()));
    let manifest: DataManifest = serde_json::from_str(&payload)
        .unwrap_or_else(|err| panic!("parse {}: {err}", manifest_path.display()));

    let names: Vec<_> = manifest.files.iter().map(|f| f.name.as_str()).collect();
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
