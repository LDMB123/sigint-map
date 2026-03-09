use super::*;

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfigMeta {
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub generated_at: Option<String>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Default)]
struct TelemetryStorageSnapshot {
    ann_cap_override_mb: Option<u64>,
    worker_threshold: Option<usize>,
    worker_failure: WorkerFailureStatus,
    webgpu_policy: WebgpuPolicySnapshot,
    ai_config_version: Option<String>,
    ai_config_generated_at: Option<String>,
    ai_config_seeded: bool,
    embedding_sample_enabled: bool,
    webgpu_disabled: bool,
}

#[cfg(feature = "hydrate")]
fn telemetry_storage_snapshot(storage: &web_sys::Storage) -> TelemetryStorageSnapshot {
    TelemetryStorageSnapshot {
        ann_cap_override_mb: storage_item(storage, ANN_CAP_OVERRIDE_KEY)
            .and_then(|raw| raw.parse::<u64>().ok())
            .map(|mb| mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB)),
        worker_threshold: parse_worker_threshold(storage_item(storage, WORKER_THRESHOLD_KEY)),
        worker_failure: worker_failure_status_from_storage(storage),
        webgpu_policy: webgpu_policy_snapshot_from_storage(storage),
        ai_config_version: storage_item(storage, AI_CONFIG_VERSION_KEY),
        ai_config_generated_at: storage_item(storage, AI_CONFIG_GENERATED_AT_KEY),
        ai_config_seeded: storage_flag_enabled(storage, AI_CONFIG_SEEDED_KEY),
        embedding_sample_enabled: storage_flag_enabled(storage, EMBEDDING_SAMPLE_KEY),
        webgpu_disabled: parse_webgpu_disabled(storage_item(storage, WEBGPU_DISABLE_KEY)),
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn store_ai_telemetry_snapshot(ann_cap: Option<&AnnCapDiagnostics>) {
    ensure_default_worker_threshold();
    let local_state = with_local_storage(telemetry_storage_snapshot).unwrap_or_default();
    let caps = detect_ai_capabilities_with_webgpu_disabled(local_state.webgpu_disabled);
    let payload = serde_json::json!({
        "timestampMs": js_sys::Date::now(),
        "annCap": ann_cap,
        "annCapOverrideMb": local_state.ann_cap_override_mb,
        "workerThreshold": local_state.worker_threshold,
        "workerMaxFloats": read_worker_max_floats(),
        "workerFailureUntilMs": local_state.worker_failure.cooldown_until_ms,
        "workerFailureRemainingMs": local_state.worker_failure.cooldown_remaining_ms,
        "workerFailureReason": local_state.worker_failure.last_error,
        "webgpuPolicy": local_state.webgpu_policy,
        "webgpuAvailable": caps.webgpu_available,
        "webgpuEnabled": caps.webgpu_enabled,
        "webgpuWorker": caps.webgpu_worker,
        "webnn": caps.webnn,
        "threads": caps.threads,
        "aiConfigVersion": local_state.ai_config_version,
        "aiConfigGeneratedAt": local_state.ai_config_generated_at,
        "aiConfigSeeded": Some(local_state.ai_config_seeded),
        "embeddingSampleEnabled": Some(local_state.embedding_sample_enabled),
    });
    set_local_storage_json(AI_TELEMETRY_KEY, &payload);
}

#[cfg(feature = "hydrate")]
pub fn load_ai_telemetry_snapshot() -> Option<AiTelemetrySnapshot> {
    let payload = local_storage_item(AI_TELEMETRY_KEY)?;
    match serde_json::from_str::<AiTelemetrySnapshot>(&payload) {
        Ok(snapshot) => Some(snapshot),
        Err(err) => {
            web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
                "Failed to parse AI telemetry snapshot: {err}"
            )));
            None
        }
    }
}

#[cfg(feature = "hydrate")]
pub(crate) async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Option<T> {
    crate::browser::http::fetch_json(url).await
}

#[cfg(feature = "hydrate")]
pub async fn fetch_ai_config_meta() -> Option<AiConfigMeta> {
    fetch_json::<AiConfigMeta>(AI_CONFIG_URL).await
}

#[cfg(feature = "hydrate")]
fn normalize_ai_config_meta_field(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone)]
pub struct AiConfigMetaReconcile {
    pub remote_version: Option<String>,
    pub remote_generated_at: Option<String>,
    pub local_version: Option<String>,
    pub local_generated_at: Option<String>,
    pub mismatched: bool,
}

#[cfg(feature = "hydrate")]
pub async fn reconcile_ai_config_meta(
    remote: AiConfigMeta,
    local_version: Option<String>,
    local_generated_at: Option<String>,
) -> AiConfigMetaReconcile {
    let remote_version = normalize_ai_config_meta_field(remote.version);
    let remote_generated_at = normalize_ai_config_meta_field(remote.generated_at);
    let mut next_local_version = normalize_ai_config_meta_field(local_version);
    let mut next_local_generated_at = normalize_ai_config_meta_field(local_generated_at);
    let mut mismatched =
        remote_version != next_local_version || remote_generated_at != next_local_generated_at;

    if mismatched {
        if refresh_ai_config().await {
            next_local_version = normalize_ai_config_meta_field(ai_config_version());
            next_local_generated_at = normalize_ai_config_meta_field(ai_config_generated_at());
            mismatched = remote_version != next_local_version
                || remote_generated_at != next_local_generated_at;
        }

        if mismatched
            && sync_ai_config_meta(remote_version.as_deref(), remote_generated_at.as_deref())
        {
            next_local_version = remote_version.clone();
            next_local_generated_at = remote_generated_at.clone();
            mismatched = false;
        }
    }

    AiConfigMetaReconcile {
        remote_version,
        remote_generated_at,
        local_version: next_local_version,
        local_generated_at: next_local_generated_at,
        mismatched,
    }
}

#[cfg(feature = "hydrate")]
pub async fn fetch_and_reconcile_ai_config_meta(
    local_version: Option<String>,
    local_generated_at: Option<String>,
) -> Option<AiConfigMetaReconcile> {
    let remote = fetch_ai_config_meta().await?;
    Some(reconcile_ai_config_meta(remote, local_version, local_generated_at).await)
}

#[cfg(feature = "hydrate")]
pub fn ai_config_remote_meta_label(
    remote_version: Option<&str>,
    remote_generated_at: Option<&str>,
) -> String {
    format!(
        "{} @ {}",
        remote_version.unwrap_or("n/a"),
        remote_generated_at.unwrap_or("n/a")
    )
}

#[cfg(feature = "hydrate")]
pub fn ai_config_mismatch_status_message(
    reconciled: &AiConfigMetaReconcile,
    prefix: &str,
    suffix: &str,
) -> Option<String> {
    if !reconciled.mismatched {
        return None;
    }
    Some(format!(
        "{prefix}{}{suffix}",
        ai_config_remote_meta_label(
            reconciled.remote_version.as_deref(),
            reconciled.remote_generated_at.as_deref()
        )
    ))
}

#[cfg(feature = "hydrate")]
pub fn sync_ai_config_meta(version: Option<&str>, generated_at: Option<&str>) -> bool {
    with_local_storage(|storage| {
        if let Some(version) = version {
            set_storage_item(storage, AI_CONFIG_VERSION_KEY, version);
        }
        if let Some(generated_at) = generated_at {
            set_storage_item(storage, AI_CONFIG_GENERATED_AT_KEY, generated_at);
        }
        set_storage_item(storage, AI_CONFIG_SEEDED_KEY, "1");
    })
    .is_some()
}

#[cfg(feature = "hydrate")]
pub async fn load_ann_meta() -> Option<dmb_core::AnnIndexMeta> {
    let mut meta = dmb_idb::get_ann_index("default").await.ok().flatten();
    if meta.is_none() {
        let fetched = fetch_json::<dmb_core::AnnIndexMeta>("/data/ann-index.json").await?;
        let _ = dmb_idb::store_ann_index(&fetched).await;
        meta = Some(fetched);
    }
    meta
}

#[cfg(feature = "hydrate")]
pub fn load_ai_tuning() -> AiTuning {
    local_storage_json("dmb-ai-tuning").unwrap_or(AiTuning {
        probe_override: None,
        target_latency_ms: 12.0,
        last_latency_ms: None,
    })
}

#[cfg(feature = "hydrate")]
pub async fn load_embedding_manifest_meta() -> Option<EmbeddingManifest> {
    let version = CORE_SCHEMA_VERSION;
    if let Some(existing) = dmb_idb::get_embedding_manifest(version)
        .await
        .ok()
        .flatten()
    {
        return Some(existing);
    }
    let fetched = fetch_json::<EmbeddingManifest>("/data/embedding-manifest.json").await?;
    let _ = dmb_idb::store_embedding_manifest(&fetched).await;
    Some(fetched)
}
