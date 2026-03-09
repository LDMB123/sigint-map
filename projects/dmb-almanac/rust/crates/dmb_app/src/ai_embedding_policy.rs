use super::*;

#[derive(Debug, Clone)]
#[cfg_attr(not(feature = "hydrate"), allow(dead_code))]
pub(crate) struct CapPolicy {
    pub(crate) cap_bytes: u64,
    pub(crate) device_memory_gb: Option<f64>,
    pub(crate) tier: String,
    pub(crate) cap_override_mb: Option<u64>,
}

#[cfg(feature = "hydrate")]
fn cap_policy_from_device_memory(device_memory: Option<f64>) -> CapPolicy {
    let device_memory = device_memory.filter(|v| *v > 0.0);
    let (mut cap_bytes, mut tier) = match device_memory {
        Some(mem) if mem >= 16.0 => (HIGH_MEM_MAX_MATRIX_BYTES, "high-memory".to_string()),
        Some(mem) if mem >= 8.0 => (
            scale_u64_ratio(DEFAULT_MAX_MATRIX_BYTES, 3, 2),
            "mid-memory".to_string(),
        ),
        Some(_) => (DEFAULT_MAX_MATRIX_BYTES, "baseline".to_string()),
        None => (DEFAULT_MAX_MATRIX_BYTES, "unknown".to_string()),
    };

    let mut cap_override_mb = None;
    if let Some(override_mb) = read_ann_cap_override_mb() {
        cap_bytes = override_mb.saturating_mul(1024 * 1024);
        tier = "override".to_string();
        cap_override_mb = Some(override_mb);
    }

    CapPolicy {
        cap_bytes,
        device_memory_gb: device_memory,
        tier,
        cap_override_mb,
    }
}

pub(crate) fn cap_policy_from_navigator() -> CapPolicy {
    #[cfg(feature = "hydrate")]
    {
        if browser_runtime_supported() {
            cap_policy_from_device_memory(crate::browser::runtime::navigator_device_memory_gb())
        } else {
            CapPolicy {
                cap_bytes: DEFAULT_MAX_MATRIX_BYTES,
                device_memory_gb: None,
                tier: "host".to_string(),
                cap_override_mb: None,
            }
        }
    }
    #[cfg(not(feature = "hydrate"))]
    {
        CapPolicy {
            cap_bytes: DEFAULT_MAX_MATRIX_BYTES,
            device_memory_gb: None,
            tier: "ssr".to_string(),
            cap_override_mb: None,
        }
    }
}

pub(crate) fn webgpu_matrix_allowed(matrix_bytes: u64, policy_cap: u64) -> bool {
    matrix_bytes <= policy_cap.min(WEBGPU_MATRIX_CAP_BYTES)
}

#[cfg(any(feature = "hydrate", test))]
fn scale_u64_ratio(value: u64, numerator: u64, denominator: u64) -> u64 {
    if denominator == 0 {
        return value;
    }
    value.saturating_mul(numerator) / denominator
}

#[cfg(any(feature = "hydrate", test))]
pub(super) fn max_vectors_for_cap_bytes(cap_bytes: u64, dim: usize) -> usize {
    if dim == 0 {
        return 0;
    }
    let bytes_per_vector = u64::try_from(dim)
        .ok()
        .and_then(|value| value.checked_mul(4))
        .filter(|value| *value > 0)
        .unwrap_or(u64::MAX);
    let max_vectors = (cap_bytes / bytes_per_vector).max(1);
    usize::try_from(max_vectors).unwrap_or(usize::MAX)
}

#[cfg(any(feature = "hydrate", test))]
pub(super) fn ivf_cap_bytes_for_matrix(cap_bytes: u64) -> u64 {
    let scaled = scale_u64_ratio(
        cap_bytes,
        IVF_CAP_RATIO_NUMERATOR,
        IVF_CAP_RATIO_DENOMINATOR,
    );
    scaled.clamp(IVF_MIN_CAP_BYTES, IVF_MAX_CAP_BYTES)
}

#[cfg(any(feature = "hydrate", test))]
pub(crate) fn cap_embedding_index_with_policy(
    records: Vec<EmbeddingRecord>,
    matrix: Vec<f32>,
    dim: usize,
    mut ivf: Option<AnnIvfIndex>,
    use_ann: bool,
    policy: CapPolicy,
) -> (
    Vec<EmbeddingRecord>,
    Vec<f32>,
    Option<AnnIvfIndex>,
    AnnCapDiagnostics,
) {
    let cap_bytes = policy.cap_bytes;
    let matrix_bytes = matrix.len() as u64 * 4;
    let ivf_bytes = ivf.as_ref().map(|ivf| {
        let centroid_floats: usize = ivf.centroids.iter().map(std::vec::Vec::len).sum();
        let list_entries: usize = ivf.lists.iter().map(std::vec::Vec::len).sum();
        (centroid_floats as u64 * 4).saturating_add(list_entries as u64 * 4)
    });
    let ivf_cap_bytes = ivf_bytes.map(|_| ivf_cap_bytes_for_matrix(cap_bytes));
    let mut ivf_dropped = false;
    if let (Some(bytes), Some(cap)) = (ivf_bytes, ivf_cap_bytes)
        && bytes > cap
    {
        ivf = None;
        ivf_dropped = true;
        #[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
        record_ai_warning(
            "ivf_cap_exceeded",
            Some(format!("{bytes} bytes > {cap} bytes")),
        );
    }
    let vectors_before = if dim == 0 { 0 } else { matrix.len() / dim };
    let mut diagnostics = AnnCapDiagnostics {
        cap_bytes,
        cap_override_mb: policy.cap_override_mb,
        matrix_bytes_before: matrix_bytes,
        matrix_bytes_after: matrix_bytes,
        ivf_bytes,
        ivf_cap_bytes,
        vectors_before,
        vectors_after: vectors_before,
        dim,
        ivf_dropped,
        used_ann: use_ann,
        capped: false,
        device_memory_gb: policy.device_memory_gb,
        policy_tier: policy.tier.clone(),
        chunks_loaded: None,
        records_loaded: None,
        budget_capped: false,
    };
    if dim == 0 || matrix_bytes <= cap_bytes {
        return (records, matrix, ivf, diagnostics);
    }

    let max_vectors = max_vectors_for_cap_bytes(cap_bytes, dim);
    let target_vectors = max_vectors
        .max(MIN_SAMPLE_RECORDS)
        .min(records.len().max(1));

    let (new_records, new_matrix) = if use_ann {
        let mut records = records;
        let mut matrix = matrix;
        let keep = target_vectors.min(matrix.len() / dim);
        records.truncate(keep);
        matrix.truncate(keep * dim);
        (records, matrix)
    } else {
        let total = records.len().max(1);
        let step = total.div_ceil(target_vectors.max(1));
        let mut new_records = Vec::with_capacity(target_vectors);
        let mut new_matrix = Vec::with_capacity(target_vectors * dim);
        for (idx, record) in records.into_iter().enumerate() {
            if idx % step != 0 {
                continue;
            }
            let start = idx * dim;
            let end = start + dim;
            let Some(vector_slice) = matrix.get(start..end) else {
                break;
            };
            new_matrix.extend_from_slice(vector_slice);
            new_records.push(record);
            if new_records.len() >= target_vectors {
                break;
            }
        }
        (new_records, new_matrix)
    };

    if ivf.is_some() {
        ivf = None;
        ivf_dropped = true;
    }

    let vectors_after = if dim == 0 { 0 } else { new_matrix.len() / dim };
    #[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
    record_ai_warning(
        "ann_cap_exceeded",
        Some(format!("{matrix_bytes} bytes > {cap_bytes} bytes")),
    );
    diagnostics.matrix_bytes_after = new_matrix.len() as u64 * 4;
    diagnostics.vectors_after = vectors_after;
    diagnostics.ivf_dropped = ivf_dropped;
    diagnostics.capped = true;
    diagnostics.budget_capped = true;

    #[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
    web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
        "Embedding matrix capped to {} vectors ({:.1}MB).",
        new_records.len(),
        (new_matrix.len() as f64 * 4.0) / 1_000_000.0
    )));

    (new_records, new_matrix, ivf, diagnostics)
}
