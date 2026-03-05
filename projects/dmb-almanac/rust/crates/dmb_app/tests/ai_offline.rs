use dmb_app::ai::{semantic_search, EmbeddingIndex};
use dmb_core::{AnnIvfIndex, EmbeddingRecord};

#[test]
fn semantic_search_offline_returns_results() {
    let records = vec![
        EmbeddingRecord {
            id: 1,
            kind: "song".to_string(),
            slug: Some("alpha".to_string()),
            label: Some("Alpha".to_string()),
            vector: vec![0.9, 0.1],
        },
        EmbeddingRecord {
            id: 2,
            kind: "song".to_string(),
            slug: Some("beta".to_string()),
            label: Some("Beta".to_string()),
            vector: vec![0.1, 0.9],
        },
    ];

    let index = EmbeddingIndex {
        dim: 2,
        records: records.clone(),
        matrix: vec![0.9, 0.1, 0.1, 0.9],
        ivf: None,
    };

    let results = futures::executor::block_on(semantic_search("alpha", &index, 2));
    assert_eq!(results.len(), 2);
    assert!(results.iter().any(|r| r.id == 1));
}

#[test]
fn semantic_search_ivf_path_returns_results() {
    let records = vec![
        EmbeddingRecord {
            id: 1,
            kind: "song".to_string(),
            slug: Some("alpha".to_string()),
            label: Some("Alpha".to_string()),
            vector: vec![0.9, 0.1],
        },
        EmbeddingRecord {
            id: 2,
            kind: "song".to_string(),
            slug: Some("beta".to_string()),
            label: Some("Beta".to_string()),
            vector: vec![0.1, 0.9],
        },
    ];

    let ivf = AnnIvfIndex {
        method: "ivf-flat".to_string(),
        dim: 2,
        cluster_count: 2,
        probe_count: 1,
        centroids: vec![vec![1.0, 0.0], vec![0.0, 1.0]],
        lists: vec![vec![0], vec![1]],
    };

    let index = EmbeddingIndex {
        dim: 2,
        records: records.clone(),
        matrix: vec![0.9, 0.1, 0.1, 0.9],
        ivf: Some(ivf),
    };

    let results = futures::executor::block_on(semantic_search("beta", &index, 1));
    assert_eq!(results.len(), 1);
}
