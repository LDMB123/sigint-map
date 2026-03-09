#[cfg(feature = "ssr")]
use super::*;

#[cfg(feature = "ssr")]
const SSR_DB_CACHE_TTL: Duration = Duration::from_secs(10);
#[cfg(feature = "ssr")]
const SSR_DB_CACHE_MAX_ENTRIES: usize = 256;

#[cfg(feature = "ssr")]
#[derive(Clone)]
pub(super) struct TimedCacheValue<T> {
    pub(super) value: T,
    pub(super) cached_at: Instant,
}

#[cfg(feature = "ssr")]
pub(super) fn cache_entry_is_fresh<T>(entry: &TimedCacheValue<T>) -> bool {
    entry.cached_at.elapsed() <= SSR_DB_CACHE_TTL
}

#[cfg(feature = "ssr")]
pub(super) fn timed_cache_value<T: Clone>(value: &T) -> TimedCacheValue<T> {
    TimedCacheValue {
        value: value.clone(),
        cached_at: Instant::now(),
    }
}

#[cfg(feature = "ssr")]
pub(super) fn clone_if_fresh<T: Clone>(entry: &TimedCacheValue<T>) -> Option<T> {
    if cache_entry_is_fresh(entry) {
        Some(entry.value.clone())
    } else {
        None
    }
}

#[cfg(feature = "ssr")]
fn read_ttl_cache<T: Clone>(cache: &OnceLock<RwLock<Option<TimedCacheValue<T>>>>) -> Option<T> {
    let lock = cache.get_or_init(|| RwLock::new(None));
    {
        let guard = lock.read().ok()?;
        if let Some(cached) = guard.as_ref().and_then(clone_if_fresh) {
            return Some(cached);
        }
    }
    if let Ok(mut guard) = lock.write()
        && guard
            .as_ref()
            .map(cache_entry_is_fresh)
            .is_some_and(|is_fresh| !is_fresh)
    {
        *guard = None;
    }
    None
}

#[cfg(feature = "ssr")]
fn write_ttl_cache<T: Clone>(cache: &OnceLock<RwLock<Option<TimedCacheValue<T>>>>, value: &T) {
    if let Ok(mut guard) = cache.get_or_init(|| RwLock::new(None)).write() {
        *guard = Some(timed_cache_value(value));
    }
}

#[cfg(feature = "ssr")]
fn prune_keyed_cache<K, T>(cache: &mut HashMap<K, TimedCacheValue<T>>)
where
    K: Eq + Hash + Clone,
{
    cache.retain(|_, entry| cache_entry_is_fresh(entry));
    if cache.len() <= SSR_DB_CACHE_MAX_ENTRIES {
        return;
    }

    let overflow = cache.len() - SSR_DB_CACHE_MAX_ENTRIES;
    let mut oldest: Vec<(K, Instant)> = cache
        .iter()
        .map(|(key, entry)| (key.clone(), entry.cached_at))
        .collect();
    oldest.sort_unstable_by_key(|(_, cached_at)| *cached_at);

    for (key, _) in oldest.into_iter().take(overflow) {
        cache.remove(&key);
    }
}

#[cfg(feature = "ssr")]
fn read_ttl_keyed_cache<K, T>(
    cache: &OnceLock<RwLock<HashMap<K, TimedCacheValue<T>>>>,
    key: &K,
) -> Option<T>
where
    K: Eq + Hash,
    T: Clone,
{
    let lock = cache.get_or_init(|| RwLock::new(HashMap::new()));
    {
        let guard = lock.read().ok()?;
        if let Some(cached) = guard.get(key).and_then(clone_if_fresh) {
            return Some(cached);
        }
    }
    if let Ok(mut guard) = lock.write() {
        let stale = guard
            .get(key)
            .map(cache_entry_is_fresh)
            .is_some_and(|is_fresh| !is_fresh);
        if stale {
            guard.remove(key);
        }
    }
    None
}

#[cfg(feature = "ssr")]
fn write_ttl_keyed_cache<K, T>(
    cache: &OnceLock<RwLock<HashMap<K, TimedCacheValue<T>>>>,
    key: K,
    value: &T,
) where
    K: Eq + Hash + Clone,
    T: Clone,
{
    if let Ok(mut guard) = cache.get_or_init(|| RwLock::new(HashMap::new())).write() {
        guard.insert(key, timed_cache_value(value));
        if guard.len() > SSR_DB_CACHE_MAX_ENTRIES {
            prune_keyed_cache(&mut guard);
        }
    }
}

#[cfg(feature = "ssr")]
pub(super) async fn cached_value<T, F, Fut>(
    cache: &OnceLock<RwLock<Option<TimedCacheValue<T>>>>,
    load: F,
) -> Result<T, ServerFnError>
where
    T: Clone,
    F: FnOnce() -> Fut,
    Fut: Future<Output = Result<T, ServerFnError>>,
{
    if let Some(cached) = read_ttl_cache(cache) {
        return Ok(cached);
    }
    let value = load().await?;
    write_ttl_cache(cache, &value);
    Ok(value)
}

#[cfg(feature = "ssr")]
pub(super) async fn cached_keyed_value<K, T, F, Fut>(
    cache: &OnceLock<RwLock<HashMap<K, TimedCacheValue<T>>>>,
    key: K,
    load: F,
) -> Result<T, ServerFnError>
where
    K: Eq + Hash + Clone,
    T: Clone,
    F: FnOnce() -> Fut,
    Fut: Future<Output = Result<T, ServerFnError>>,
{
    if let Some(cached) = read_ttl_keyed_cache(cache, &key) {
        return Ok(cached);
    }
    let value = load().await?;
    write_ttl_keyed_cache(cache, key, &value);
    Ok(value)
}

#[cfg(feature = "ssr")]
pub(super) static HOME_STATS_CACHE: OnceLock<RwLock<Option<TimedCacheValue<HomeStats>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static RECENT_SHOWS_CACHE: OnceLock<
    RwLock<HashMap<usize, TimedCacheValue<Vec<ShowSummary>>>>,
> = OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static TOP_SONGS_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Song>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static TOP_VENUES_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Venue>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static TOP_GUESTS_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Guest>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static RECENT_TOURS_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Tour>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static RECENT_RELEASES_CACHE: OnceLock<
    RwLock<HashMap<usize, TimedCacheValue<Vec<Release>>>>,
> = OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static ALL_RELEASES_CACHE: OnceLock<RwLock<Option<TimedCacheValue<Vec<Release>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static RELEASE_TRACKS_CACHE: OnceLock<
    RwLock<HashMap<i32, TimedCacheValue<Vec<ReleaseTrack>>>>,
> = OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static SETLIST_ENTRIES_CACHE: OnceLock<
    RwLock<HashMap<i32, TimedCacheValue<Vec<SetlistEntry>>>>,
> = OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static LIBERATION_LIST_CACHE: OnceLock<
    RwLock<HashMap<i32, TimedCacheValue<Vec<LiberationEntry>>>>,
> = OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) static CURATED_LISTS_CACHE: OnceLock<RwLock<Option<TimedCacheValue<Vec<CuratedList>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
pub(super) type CuratedListItemsCacheMap =
    HashMap<(i32, i32), TimedCacheValue<Vec<CuratedListItem>>>;
#[cfg(feature = "ssr")]
pub(super) static CURATED_LIST_ITEMS_CACHE: OnceLock<RwLock<CuratedListItemsCacheMap>> =
    OnceLock::new();
