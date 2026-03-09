use super::*;

#[cfg(feature = "hydrate")]
use super::fetch::fetch_f32_array_with_cap;
#[cfg(feature = "hydrate")]
use super::policy::CapPolicy;
#[cfg(feature = "hydrate")]
use dmb_core::AnnIndexMeta;

#[cfg(feature = "hydrate")]
fn load_sample_embedding_index_from_entries(
    entries: Vec<EmbeddingSampleEntry>,
) -> Option<Arc<EmbeddingIndex>> {
    if entries.is_empty() {
        return None;
    }
    let dim = EMBEDDING_DIM;
    let mut records = Vec::with_capacity(entries.len());
    let mut matrix = Vec::with_capacity(entries.len() * dim);
    for entry in entries {
        let EmbeddingSampleEntry {
            id,
            kind,
            slug,
            label,
            text,
            vector,
        } = entry;
        let vector =
            vector.unwrap_or_else(|| hashed_embedding(text.as_deref().unwrap_or_default(), dim));
        let mut normalized_label = label.or(text).filter(|value| !value.is_empty());
        if normalized_label.is_none() {
            normalized_label = Some(format!("{kind} {id}"));
        }
        matrix.extend_from_slice(&vector);
        records.push(EmbeddingRecord {
            id,
            kind,
            slug,
            label: normalized_label,
            vector: Vec::new(),
        });
    }
    let diagnostics = AnnCapDiagnostics {
        cap_bytes: (matrix.len() as u64).saturating_mul(4),
        cap_override_mb: None,
        matrix_bytes_before: (matrix.len() as u64).saturating_mul(4),
        matrix_bytes_after: (matrix.len() as u64).saturating_mul(4),
        ivf_bytes: None,
        ivf_cap_bytes: None,
        vectors_before: records.len(),
        vectors_after: records.len(),
        dim,
        ivf_dropped: false,
        used_ann: false,
        capped: false,
        device_memory_gb: None,
        policy_tier: "sample".to_string(),
        chunks_loaded: Some(1),
        records_loaded: Some(records.len()),
        budget_capped: false,
    };
    let _ = ANN_CAP_DIAGNOSTICS.set(diagnostics.clone());
    store_ai_telemetry_snapshot(Some(&diagnostics));
    let sample_index = Arc::new(EmbeddingIndex {
        dim,
        records,
        matrix,
        ivf: None,
    });
    let _ = EMBEDDING_INDEX.set(sample_index.clone());
    Some(sample_index)
}

#[cfg(feature = "hydrate")]
async fn load_sample_embedding_index() -> Option<Arc<EmbeddingIndex>> {
    let entries = fetch_json::<Vec<EmbeddingSampleEntry>>("/data/embedding-sample.json").await?;
    load_sample_embedding_index_from_entries(entries)
}

#[cfg(feature = "hydrate")]
async fn load_or_fetch_embedding_manifest() -> Option<EmbeddingManifest> {
    if let Some(manifest) = dmb_idb::get_embedding_manifest(CORE_SCHEMA_VERSION)
        .await
        .ok()
        .flatten()
    {
        return Some(manifest);
    }

    let fetched = match fetch_json::<EmbeddingManifest>("/data/embedding-manifest.json").await {
        Some(payload) => payload,
        None => {
            record_ai_warning("embedding_manifest_fetch_failed", None);
            return None;
        }
    };
    dmb_idb::store_embedding_manifest(&fetched).await.ok()?;
    for chunk in &fetched.chunks {
        if dmb_idb::get_embedding_chunk(chunk.chunk_id)
            .await
            .ok()
            .flatten()
            .is_some()
        {
            continue;
        }
        let url = format!("/data/{}", chunk.file);
        if let Some(payload) = fetch_json::<EmbeddingChunk>(&url).await {
            let _ = dmb_idb::store_embedding_chunk(&payload).await;
        } else {
            record_ai_warning("embedding_chunk_fetch_failed", Some(chunk.file.clone()));
        }
    }
    dmb_idb::get_embedding_manifest(CORE_SCHEMA_VERSION)
        .await
        .ok()
        .flatten()
}

#[cfg(feature = "hydrate")]
async fn load_ann_matrix(
    manifest: &EmbeddingManifest,
    ann_meta: Option<&AnnIndexMeta>,
    policy: &CapPolicy,
) -> Vec<f32> {
    let Some(meta) = ann_meta else {
        return Vec::new();
    };
    let vectors = if meta.dim != manifest.dim {
        record_ai_warning(
            "ann_index_dim_mismatch",
            Some(format!(
                "meta_dim {} != expected {}",
                meta.dim, manifest.dim
            )),
        );
        None
    } else {
        let estimated_bytes = meta.record_count as u64 * meta.dim as u64 * 4;
        if estimated_bytes > policy.cap_bytes {
            web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
                "ANN index too large for device ({} MB > {:.1} MB cap).",
                estimated_bytes as f64 / 1_000_000.0,
                policy.cap_bytes as f64 / 1_000_000.0
            )));
            record_ai_warning(
                "ann_index_cap_exceeded",
                Some(format!(
                    "{estimated_bytes} bytes > {} bytes",
                    policy.cap_bytes
                )),
            );
            None
        } else {
            match fetch_f32_array_with_cap("/data/ann-index.bin", policy.cap_bytes).await {
                Some(vectors) => {
                    let expected_len = meta
                        .record_count
                        .checked_mul(meta.dim)
                        .map(|value| value as usize);
                    if let Some(expected_len) = expected_len {
                        if vectors.len() != expected_len {
                            web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(
                                "ann-index size mismatch; falling back to embedded vectors",
                            ));
                            record_ai_warning(
                                "ann_index_size_mismatch",
                                Some(format!("expected {expected_len}, got {}", vectors.len())),
                            );
                            None
                        } else {
                            Some(vectors)
                        }
                    } else {
                        None
                    }
                }
                None => None,
            }
        }
    };
    vectors.unwrap_or_default()
}

#[cfg(feature = "hydrate")]
async fn load_ann_ivf(
    ann_meta: Option<&AnnIndexMeta>,
    policy: &CapPolicy,
    use_ann: bool,
) -> Option<AnnIvfIndex> {
    if !use_ann {
        return None;
    }
    let meta = ann_meta?;
    if meta.method != "ivf-flat" {
        return None;
    }
    let file = meta.index_file.as_deref()?;
    let url = format!("/data/{file}");
    let clusters = meta.cluster_count.unwrap_or(0);
    let estimate = if clusters == 0 || meta.dim == 0 {
        None
    } else {
        let centroid_bytes = (clusters as u64)
            .saturating_mul(meta.dim as u64)
            .saturating_mul(4);
        let list_bytes = (meta.record_count as u64).saturating_mul(4);
        Some(centroid_bytes.saturating_add(list_bytes))
    };
    if let Some(estimate) = estimate {
        let cap = ivf_cap_bytes_for_matrix(policy.cap_bytes);
        if estimate > cap {
            record_ai_warning(
                "ivf_estimate_cap_exceeded",
                Some(format!("{estimate} bytes > {cap} bytes")),
            );
            return None;
        }
    }
    match fetch_json::<AnnIvfIndex>(&url).await {
        Some(ivf) if ivf.dim == meta.dim && ivf.cluster_count > 0 => Some(ivf),
        _ => None,
    }
}

#[cfg(feature = "hydrate")]
async fn load_embedding_records(
    manifest: &EmbeddingManifest,
    dim: usize,
    target_vectors: usize,
    use_ann: bool,
    matrix: Vec<f32>,
) -> (Vec<EmbeddingRecord>, Vec<f32>, usize, bool) {
    let estimated_records = manifest
        .chunks
        .iter()
        .map(|chunk| chunk.count as usize)
        .sum::<usize>();
    let record_capacity = if use_ann {
        estimated_records
    } else {
        estimated_records.min(target_vectors)
    };
    let mut records = Vec::with_capacity(record_capacity);
    let mut matrix = matrix;
    if !use_ann {
        let reserve_vectors = estimated_records.min(target_vectors);
        matrix.reserve(reserve_vectors.saturating_mul(dim));
    }
    let mut chunks_loaded = 0usize;
    let mut budget_capped = false;

    for meta in &manifest.chunks {
        if let Some(chunk) = dmb_idb::get_embedding_chunk(meta.chunk_id)
            .await
            .ok()
            .flatten()
        {
            for mut record in chunk.records {
                if record.label.is_none() {
                    record.label = Some(format!("{} {}", record.kind, record.id));
                }
                if !use_ann {
                    matrix.extend_from_slice(&record.vector);
                }
                record.vector = Vec::new();
                records.push(record);
                if !use_ann && records.len() >= target_vectors {
                    budget_capped = true;
                    break;
                }
            }
            chunks_loaded += 1;
            if budget_capped {
                break;
            }
        }
    }

    (records, matrix, chunks_loaded, budget_capped)
}

#[cfg(feature = "hydrate")]
fn spawn_index_runtime_warmup() {
    let caps = detect_ai_capabilities();
    if caps.webgpu_enabled && local_storage_item(WEBGPU_WORKER_BENCH_KEY).is_none() {
        spawn_local(async move {
            let _ = benchmark_worker_threshold().await;
            set_local_storage_item(WEBGPU_WORKER_BENCH_KEY, &js_sys::Date::now().to_string());
        });
    }
    if caps.webgpu_worker {
        spawn_local(async move {
            warm_webgpu_worker().await;
        });
    }
}

#[cfg(feature = "hydrate")]
pub async fn load_embedding_index() -> Option<Arc<EmbeddingIndex>> {
    if let Some(existing) = EMBEDDING_INDEX.get() {
        return Some(existing.clone());
    }
    if !ai_config_seeded() {
        let _ = ai_local_state::fetch_and_apply_ai_config_seed(false).await;
    }
    if embedding_sample_enabled()
        && let Some(sample_index) = load_sample_embedding_index().await
    {
        return Some(sample_index);
    }

    let manifest = load_or_fetch_embedding_manifest().await?;
    let policy = cap_policy_from_navigator();
    let max_vectors = max_vectors_for_cap_bytes(
        policy.cap_bytes,
        usize::try_from(manifest.dim).unwrap_or(usize::MAX),
    );
    let target_vectors = max_vectors.max(MIN_SAMPLE_RECORDS);
    let ann_meta = load_ann_meta().await;
    let matrix = load_ann_matrix(&manifest, ann_meta.as_ref(), &policy).await;
    let use_ann = !matrix.is_empty();
    let ivf = load_ann_ivf(ann_meta.as_ref(), &policy, use_ann).await;
    let dim = manifest.dim as usize;
    let (records, matrix, chunks_loaded, budget_capped) =
        load_embedding_records(&manifest, dim, target_vectors, use_ann, matrix).await;

    if budget_capped {
        record_ai_warning(
            "embedding_budget_capped",
            Some(format!(
                "records_loaded {} / target {}",
                records.len(),
                target_vectors
            )),
        );
    }
    if records.is_empty() {
        return None;
    }

    let (records, matrix, ivf, mut diagnostics) =
        cap_embedding_index_with_policy(records, matrix, dim, ivf, use_ann, policy);
    diagnostics.chunks_loaded = Some(chunks_loaded);
    diagnostics.records_loaded = Some(records.len());
    diagnostics.budget_capped = budget_capped;
    let _ = ANN_CAP_DIAGNOSTICS.set(diagnostics.clone());
    store_ai_telemetry_snapshot(Some(&diagnostics));
    let index = Arc::new(EmbeddingIndex {
        dim,
        records,
        matrix,
        ivf,
    });
    let _ = EMBEDDING_INDEX.set(index.clone());
    spawn_index_runtime_warmup();
    Some(index)
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn load_embedding_index() -> Option<Arc<EmbeddingIndex>> {
    None
}
