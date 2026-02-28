use crate::dom;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::LazyLock;
#[derive(Deserialize, Debug)]
struct AssetManifest {
    companions: HashMap<String, String>,
    gardens: HashMap<String, String>,
}
const MANIFEST_JSON: &str = include_str!("../public/asset-manifest.json");
static ASSET_MANIFEST: LazyLock<AssetManifest> =
    LazyLock::new(|| match serde_json::from_str(MANIFEST_JSON) {
        Ok(manifest) => manifest,
        Err(e) => {
            dom::warn(&format!("[assets] Failed to parse manifest: {e:?}"));
            AssetManifest {
                companions: HashMap::new(),
                gardens: HashMap::new(),
            }
        }
    });
pub fn get_companion_asset(skin: &str, expression: &str) -> Option<&'static str> {
    let key = format!("{skin}_{expression}");
    ASSET_MANIFEST.companions.get(&key).map(|s| s.as_str())
}
pub fn get_garden_asset(garden: &str, stage: u32) -> Option<&'static str> {
    let key = format!("{garden}_stage_{stage}");
    ASSET_MANIFEST.gardens.get(&key).map(|s| s.as_str())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_companion_asset_lookup() {
        let asset = get_companion_asset("unicorn", "happy");
        assert_eq!(asset, Some("companions/unicorn_happy.webp"));
    }
    #[test]
    fn test_garden_asset_lookup() {
        let asset = get_garden_asset("bunny", 3);
        assert_eq!(asset, Some("gardens/bunny_stage_3.webp"));
    }
    #[test]
    fn test_missing_companion() {
        let asset = get_companion_asset("nonexistent", "happy");
        assert_eq!(asset, None);
    }
    #[test]
    fn test_missing_garden() {
        let asset = get_garden_asset("nonexistent", 1);
        assert_eq!(asset, None);
    }
}
