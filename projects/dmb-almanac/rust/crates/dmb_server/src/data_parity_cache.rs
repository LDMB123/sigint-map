use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::data_parity::DataParityResponse;

pub(crate) type DataParityCache = Arc<tokio::sync::RwLock<Option<DataParityCacheEntry>>>;

pub(crate) const DATA_PARITY_CACHE_TTL: Duration = Duration::from_secs(10);

#[derive(Clone)]
pub(crate) struct DataParityCacheEntry {
    pub(crate) generated_at: Instant,
    pub(crate) response: DataParityResponse,
}

pub(crate) fn new_data_parity_cache() -> DataParityCache {
    Arc::new(tokio::sync::RwLock::new(None))
}

pub(crate) async fn read_fresh_response(cache: &DataParityCache) -> Option<DataParityResponse> {
    let cache_entry = cache.read().await.as_ref().cloned();
    match cache_entry {
        Some(cache_entry) if cache_entry.generated_at.elapsed() <= DATA_PARITY_CACHE_TTL => {
            Some(cache_entry.response)
        }
        _ => None,
    }
}

pub(crate) async fn store_response(cache: &DataParityCache, response: &DataParityResponse) {
    let mut cache = cache.write().await;
    *cache = Some(DataParityCacheEntry {
        generated_at: Instant::now(),
        response: response.clone(),
    });
}
