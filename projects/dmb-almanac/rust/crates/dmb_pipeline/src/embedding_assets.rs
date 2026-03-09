#[path = "embedding_ann.rs"]
mod embedding_ann;
#[path = "embedding_input_assets.rs"]
mod embedding_input_assets;

pub(crate) use self::embedding_ann::build_ann_index;
pub(crate) use self::embedding_input_assets::build_embedding_input;

#[cfg(test)]
mod tests {
    use super::embedding_ann::suggest_ivf_params;

    #[test]
    fn ivf_params_within_bounds() {
        for &records in &[10usize, 250, 1200, 6200, 25000] {
            let (clusters, probes) = suggest_ivf_params(records);
            assert!(clusters >= 1);
            assert!(clusters <= records.max(1));
            assert!(probes >= 2);
            let clusters_u32 = u32::try_from(clusters).unwrap_or(u32::MAX);
            assert!(probes <= clusters_u32);
        }
    }
}
