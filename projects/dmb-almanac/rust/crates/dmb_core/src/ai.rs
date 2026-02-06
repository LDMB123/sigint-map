use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

pub const EMBEDDING_DIM: usize = 96;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingRecord {
    pub id: i32,
    pub kind: String,
    pub slug: Option<String>,
    pub label: Option<String>,
    pub vector: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingChunk {
    pub chunk_id: u32,
    pub dim: u32,
    pub records: Vec<EmbeddingRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingChunkMeta {
    pub chunk_id: u32,
    pub file: String,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingManifest {
    pub version: String,
    pub dim: u32,
    pub chunk_count: u32,
    pub chunks: Vec<EmbeddingChunkMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AnnIndexMeta {
    pub id: String,
    pub method: String,
    pub dim: u32,
    pub record_count: u32,
    pub built_at: String,
    pub source_manifest: String,
    #[serde(default)]
    pub index_file: Option<String>,
    #[serde(default)]
    pub cluster_count: Option<u32>,
    #[serde(default)]
    pub probe_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AnnIvfIndex {
    pub method: String,
    pub dim: u32,
    pub cluster_count: u32,
    pub probe_count: u32,
    pub centroids: Vec<Vec<f32>>,
    pub lists: Vec<Vec<u32>>,
}

pub fn hashed_embedding(text: &str, dim: usize) -> Vec<f32> {
    let mut out = vec![0.0; dim.max(1)];
    for token in text
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| !t.is_empty())
    {
        let mut hasher = DefaultHasher::new();
        token.to_lowercase().hash(&mut hasher);
        let idx = (hasher.finish() as usize) % out.len();
        out[idx] += 1.0;
    }
    l2_normalize(&mut out);
    out
}

pub fn l2_normalize(vector: &mut [f32]) -> f32 {
    let norm = vector.iter().map(|v| v * v).sum::<f32>().sqrt();
    if norm > 0.0 {
        for v in vector.iter_mut() {
            *v /= norm;
        }
    }
    norm
}
