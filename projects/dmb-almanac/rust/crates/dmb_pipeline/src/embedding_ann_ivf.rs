use anyhow::Result;
use rand::RngExt;

pub(crate) fn build_ivf_index(
    vectors: &[f32],
    dim: usize,
    cluster_count: usize,
    probe_count: u32,
    iterations: usize,
) -> Result<dmb_core::AnnIvfIndex> {
    #[inline]
    fn dot_product(a: &[f32], b: &[f32]) -> f32 {
        a.iter()
            .zip(b.iter())
            .map(|(left, right)| left * right)
            .sum()
    }

    if dim == 0 || vectors.is_empty() {
        anyhow::bail!("ivf index: empty vectors");
    }
    let count = vectors.len() / dim;
    if count == 0 || !vectors.len().is_multiple_of(dim) {
        anyhow::bail!("ivf index: vector length mismatch");
    }
    let cluster_count = cluster_count.clamp(1, count);
    let mut rng = rand::rng();
    let mut centroids_flat = vec![0.0f32; cluster_count.saturating_mul(dim)];
    for cluster_idx in 0..cluster_count {
        let idx = rng.random_range(0..count);
        let start = idx * dim;
        let end = start + dim;
        let centroid_offset = cluster_idx * dim;
        let Some(centroid) = centroids_flat.get_mut(centroid_offset..centroid_offset + dim) else {
            anyhow::bail!(
                "ivf index: centroid slice out of bounds at init (cluster={}, dim={}, len={})",
                cluster_idx,
                dim,
                centroids_flat.len()
            );
        };
        let Some(source) = vectors.get(start..end) else {
            anyhow::bail!(
                "ivf index: source vector slice out of bounds at init (start={}, end={}, len={})",
                start,
                end,
                vectors.len()
            );
        };
        centroid.copy_from_slice(source);
        dmb_core::l2_normalize(centroid);
    }

    let iteration_count = iterations.max(1);
    let mut assignments = vec![0usize; count];
    let mut sums = vec![0.0f32; cluster_count.saturating_mul(dim)];
    let mut counts = vec![0u32; cluster_count];
    for iter in 0..iteration_count {
        sums.fill(0.0);
        counts.fill(0);

        for (assignment, vector) in assignments.iter_mut().zip(vectors.chunks_exact(dim)) {
            let mut best = 0usize;
            let mut best_score = f32::MIN;
            for c_idx in 0..cluster_count {
                let centroid_offset = c_idx * dim;
                let Some(centroid) = centroids_flat.get(centroid_offset..centroid_offset + dim)
                else {
                    anyhow::bail!(
                        "ivf index: centroid slice out of bounds while assigning (cluster={}, dim={}, len={})",
                        c_idx,
                        dim,
                        centroids_flat.len()
                    );
                };
                let score = dot_product(centroid, vector);
                if score > best_score {
                    best_score = score;
                    best = c_idx;
                }
            }
            *assignment = best;
            let Some(cluster_size) = counts.get_mut(best) else {
                anyhow::bail!(
                    "ivf index: cluster assignment out of bounds (best={}, clusters={})",
                    best,
                    counts.len()
                );
            };
            *cluster_size += 1;
            let offset = best * dim;
            let Some(cluster_sums) = sums.get_mut(offset..offset + dim) else {
                anyhow::bail!(
                    "ivf index: sum slice out of bounds while assigning (offset={}, dim={}, len={})",
                    offset,
                    dim,
                    sums.len()
                );
            };
            for (sum, value) in cluster_sums.iter_mut().zip(vector.iter()) {
                *sum += *value;
            }
        }

        if iter + 1 != iteration_count {
            for (c_idx, &cluster_size) in counts.iter().enumerate().take(cluster_count) {
                let count = cluster_size.max(1) as f32;
                let offset = c_idx * dim;
                let Some(centroid) = centroids_flat.get_mut(offset..offset + dim) else {
                    anyhow::bail!(
                        "ivf index: centroid slice out of bounds while normalizing (cluster={}, dim={}, len={})",
                        c_idx,
                        dim,
                        centroids_flat.len()
                    );
                };
                let Some(cluster_sums) = sums.get(offset..offset + dim) else {
                    anyhow::bail!(
                        "ivf index: sum slice out of bounds while normalizing (cluster={}, dim={}, len={})",
                        c_idx,
                        dim,
                        sums.len()
                    );
                };
                for (dst, sum) in centroid.iter_mut().zip(cluster_sums.iter()) {
                    *dst = *sum / count;
                }
                dmb_core::l2_normalize(centroid);
            }
        }
    }

    let list_sizes: Vec<usize> = counts
        .iter()
        .map(|&cluster_size| {
            usize::try_from(cluster_size).map_err(|_| {
                anyhow::anyhow!(
                    "ivf index: cluster size {} does not fit usize on this platform",
                    cluster_size
                )
            })
        })
        .collect::<Result<Vec<_>>>()?;
    let mut lists: Vec<Vec<u32>> = list_sizes.into_iter().map(Vec::with_capacity).collect();
    for (idx, &cluster) in assignments.iter().enumerate() {
        let Some(list) = lists.get_mut(cluster) else {
            anyhow::bail!(
                "ivf index: list assignment out of bounds (cluster={}, clusters={})",
                cluster,
                lists.len()
            );
        };
        let idx_u32 = u32::try_from(idx).map_err(|_| {
            anyhow::anyhow!(
                "ivf index: assignment index {} exceeds u32 range for serialized lists",
                idx
            )
        })?;
        list.push(idx_u32);
    }
    let centroids = centroids_flat
        .chunks_exact(dim)
        .map(std::borrow::ToOwned::to_owned)
        .collect();

    let dim_u32 = u32::try_from(dim)
        .map_err(|_| anyhow::anyhow!("ivf index: dim {} exceeds u32 range", dim))?;
    let cluster_count_u32 = u32::try_from(cluster_count).map_err(|_| {
        anyhow::anyhow!(
            "ivf index: cluster_count {} exceeds u32 range",
            cluster_count
        )
    })?;

    Ok(dmb_core::AnnIvfIndex {
        method: "ivf-flat".to_string(),
        dim: dim_u32,
        cluster_count: cluster_count_u32,
        probe_count,
        centroids,
        lists,
    })
}

fn rounded_isqrt_usize(value: usize) -> usize {
    if value <= 1 {
        return value;
    }

    let n = value as u128;
    let mut lo = 1_u128;
    let mut hi = n;
    let mut floor = 1_u128;

    while lo <= hi {
        let mid = (lo + hi) / 2;
        let square = mid.saturating_mul(mid);
        if square == n {
            floor = mid;
            break;
        }
        if square < n {
            floor = mid;
            lo = mid + 1;
        } else {
            hi = mid.saturating_sub(1);
        }
    }

    let floor_sq = floor.saturating_mul(floor);
    let ceil = floor.saturating_add(1);
    let ceil_sq = ceil.saturating_mul(ceil);
    let rounded = if ceil_sq.saturating_sub(n) < n.saturating_sub(floor_sq) {
        ceil
    } else {
        floor
    };

    usize::try_from(rounded).unwrap_or(value)
}

pub(crate) fn suggest_ivf_params(record_total: usize) -> (usize, u32) {
    let sqrt_k = rounded_isqrt_usize(record_total);
    let cluster_count = if record_total < 1000 {
        sqrt_k.clamp(8, 64)
    } else if record_total < 5000 {
        sqrt_k.clamp(32, 128)
    } else {
        sqrt_k.clamp(64, 256)
    }
    .min(record_total.max(1));

    let probe_count = cluster_count.div_ceil(8);
    let probe_count = probe_count.clamp(2, 16).min(cluster_count.max(1));
    let probe_count = u32::try_from(probe_count).unwrap_or(16);

    (cluster_count, probe_count)
}
