#[derive(Debug, Clone, Copy, Default)]
pub(crate) struct AiStaticAssetsHealth {
    pub(crate) manifest_present: bool,
    pub(crate) ai_config_present: bool,
    pub(crate) migration_present: bool,
}

pub(crate) fn probe_ai_static_assets(site_root: &str) -> AiStaticAssetsHealth {
    let cwd = match std::env::current_dir() {
        Ok(cwd) => cwd,
        Err(_) => return AiStaticAssetsHealth::default(),
    };
    let static_data = cwd.join(site_root).join("data");

    AiStaticAssetsHealth {
        manifest_present: static_data.join("manifest.json").exists(),
        ai_config_present: static_data.join("ai-config.json").exists(),
        migration_present: static_data.join("idb-migration-dry-run.json").exists(),
    }
}
