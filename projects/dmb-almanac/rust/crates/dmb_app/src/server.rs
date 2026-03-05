use leptos::prelude::*;
use serde::{Deserialize, Serialize};

use dmb_core::{
    CuratedList, CuratedListItem, Guest, LiberationEntry, Release, ReleaseTrack, SetlistEntry,
    Show, Song, Tour, Venue,
};
#[cfg(feature = "ssr")]
use dmb_core::{LiberationLastShow, LiberationVenue};
#[cfg(feature = "ssr")]
use std::collections::HashMap;
#[cfg(feature = "ssr")]
use std::future::Future;
#[cfg(feature = "ssr")]
use std::hash::Hash;
#[cfg(feature = "ssr")]
use std::sync::{OnceLock, RwLock};
#[cfg(feature = "ssr")]
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomeStats {
    pub shows: i64,
    pub songs: i64,
    pub venues: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShowSummary {
    pub id: i32,
    pub date: String,
    pub year: i32,
    pub venue_id: i32,
    pub venue_name: String,
    pub venue_city: String,
    pub venue_state: Option<String>,
    pub tour_name: Option<String>,
    pub tour_year: Option<i32>,
}

#[cfg(feature = "ssr")]
use sqlx::Row;

#[cfg(feature = "ssr")]
const SSR_DB_CACHE_TTL: Duration = Duration::from_secs(10);
#[cfg(feature = "ssr")]
const SSR_DB_CACHE_MAX_ENTRIES: usize = 256;

#[cfg(feature = "ssr")]
#[derive(Clone)]
struct TimedCacheValue<T> {
    value: T,
    cached_at: Instant,
}

#[cfg(feature = "ssr")]
fn cache_entry_is_fresh<T>(entry: &TimedCacheValue<T>) -> bool {
    entry.cached_at.elapsed() <= SSR_DB_CACHE_TTL
}

#[cfg(feature = "ssr")]
fn timed_cache_value<T: Clone>(value: &T) -> TimedCacheValue<T> {
    TimedCacheValue {
        value: value.clone(),
        cached_at: Instant::now(),
    }
}

#[cfg(feature = "ssr")]
fn clone_if_fresh<T: Clone>(entry: &TimedCacheValue<T>) -> Option<T> {
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
    if let Ok(mut guard) = lock.write() {
        if guard
            .as_ref()
            .map(cache_entry_is_fresh)
            .is_some_and(|is_fresh| !is_fresh)
        {
            *guard = None;
        }
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
async fn cached_value<T, F, Fut>(
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
async fn cached_keyed_value<K, T, F, Fut>(
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
static HOME_STATS_CACHE: OnceLock<RwLock<Option<TimedCacheValue<HomeStats>>>> = OnceLock::new();
#[cfg(feature = "ssr")]
static RECENT_SHOWS_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<ShowSummary>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static TOP_SONGS_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Song>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static TOP_VENUES_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Venue>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static TOP_GUESTS_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Guest>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static RECENT_TOURS_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Tour>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static RECENT_RELEASES_CACHE: OnceLock<RwLock<HashMap<usize, TimedCacheValue<Vec<Release>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static ALL_RELEASES_CACHE: OnceLock<RwLock<Option<TimedCacheValue<Vec<Release>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static RELEASE_TRACKS_CACHE: OnceLock<RwLock<HashMap<i32, TimedCacheValue<Vec<ReleaseTrack>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static SETLIST_ENTRIES_CACHE: OnceLock<RwLock<HashMap<i32, TimedCacheValue<Vec<SetlistEntry>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
static LIBERATION_LIST_CACHE: OnceLock<
    RwLock<HashMap<i32, TimedCacheValue<Vec<LiberationEntry>>>>,
> = OnceLock::new();
#[cfg(feature = "ssr")]
static CURATED_LISTS_CACHE: OnceLock<RwLock<Option<TimedCacheValue<Vec<CuratedList>>>>> =
    OnceLock::new();
#[cfg(feature = "ssr")]
type CuratedListItemsCacheMap = HashMap<(i32, i32), TimedCacheValue<Vec<CuratedListItem>>>;
#[cfg(feature = "ssr")]
static CURATED_LIST_ITEMS_CACHE: OnceLock<RwLock<CuratedListItemsCacheMap>> = OnceLock::new();

#[cfg(feature = "ssr")]
fn pool() -> Result<sqlx::SqlitePool, ServerFnError> {
    use sqlx::SqlitePool;

    use_context::<SqlitePool>()
        .ok_or_else(|| ServerFnError::ServerError("DB pool unavailable".into()))
}

#[cfg(feature = "ssr")]
fn to_server_error(err: &sqlx::Error) -> ServerFnError {
    ServerFnError::ServerError(err.to_string())
}

#[cfg(feature = "ssr")]
type SqliteQuery<'q> = sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>;

#[cfg(feature = "ssr")]
async fn fetch_optional_row(
    query: SqliteQuery<'_>,
    pool: &sqlx::SqlitePool,
) -> Result<Option<sqlx::sqlite::SqliteRow>, ServerFnError> {
    query
        .fetch_optional(pool)
        .await
        .map_err(|err| to_server_error(&err))
}

#[cfg(feature = "ssr")]
async fn fetch_optional_mapped<T>(
    query: SqliteQuery<'_>,
    pool: &sqlx::SqlitePool,
    map: impl FnOnce(&sqlx::sqlite::SqliteRow) -> Result<T, ServerFnError>,
) -> Result<Option<T>, ServerFnError> {
    fetch_optional_row(query, pool)
        .await?
        .as_ref()
        .map(map)
        .transpose()
}

#[cfg(feature = "ssr")]
async fn fetch_rows(
    query: SqliteQuery<'_>,
    pool: &sqlx::SqlitePool,
) -> Result<Vec<sqlx::sqlite::SqliteRow>, ServerFnError> {
    query
        .fetch_all(pool)
        .await
        .map_err(|err| to_server_error(&err))
}

#[cfg(feature = "ssr")]
fn map_rows<T>(
    rows: Vec<sqlx::sqlite::SqliteRow>,
    map: impl FnMut(sqlx::sqlite::SqliteRow) -> Result<T, ServerFnError>,
) -> Result<Vec<T>, ServerFnError> {
    rows.into_iter().map(map).collect()
}

#[cfg(not(feature = "ssr"))]
#[allow(dead_code)]
fn ssr_only<T>() -> Result<T, ServerFnError> {
    Err(ServerFnError::ServerError("SSR only".into()))
}

#[cfg(feature = "ssr")]
fn year_from_date(date: &str) -> i32 {
    date.get(0..4)
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or_default()
}

#[cfg(feature = "ssr")]
fn sanitize_i32_limit(limit: i32, max: i32) -> i32 {
    limit.clamp(0, max.max(0))
}

#[cfg(feature = "ssr")]
fn i64_to_i32(raw: i64, column: &str) -> Result<i32, ServerFnError> {
    i32::try_from(raw).map_err(|_| {
        ServerFnError::ServerError(format!("column `{column}` out of i32 range: {raw}"))
    })
}

#[cfg(feature = "ssr")]
fn opt_i64_to_i32(value: Option<i64>, column: &str) -> Result<Option<i32>, ServerFnError> {
    value.map(|raw| i64_to_i32(raw, column)).transpose()
}

#[cfg(feature = "ssr")]
fn usize_to_i64_limit(limit: usize) -> Result<i64, ServerFnError> {
    i64::try_from(limit)
        .map_err(|_| ServerFnError::ServerError(format!("limit out of i64 range: {limit}")))
}

#[cfg(feature = "ssr")]
fn row_get<T>(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<T, ServerFnError>
where
    for<'r> T: sqlx::Decode<'r, sqlx::Sqlite> + sqlx::Type<sqlx::Sqlite>,
{
    row.try_get::<T, _>(column)
        .map_err(|err| to_server_error(&err))
}

#[cfg(feature = "ssr")]
fn row_i32(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<i32, ServerFnError> {
    row_get::<i64>(row, column).and_then(|raw| i64_to_i32(raw, column))
}

#[cfg(feature = "ssr")]
fn row_string(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<String, ServerFnError> {
    row_get(row, column)
}

#[cfg(feature = "ssr")]
fn opt_i64_to_bool(value: Option<i64>) -> Option<bool> {
    value.map(|raw| raw != 0)
}

#[cfg(feature = "ssr")]
fn row_opt_i32(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<Option<i32>, ServerFnError> {
    row_get::<Option<i64>>(row, column).and_then(|value| opt_i64_to_i32(value, column))
}

#[cfg(feature = "ssr")]
fn row_opt_string(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<Option<String>, ServerFnError> {
    row_get(row, column)
}

#[cfg(feature = "ssr")]
fn row_opt_bool(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<Option<bool>, ServerFnError> {
    row_get::<Option<i64>>(row, column).map(opt_i64_to_bool)
}

#[cfg(feature = "ssr")]
fn row_opt_f32(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<Option<f32>, ServerFnError> {
    row_get(row, column)
}

#[cfg(feature = "ssr")]
#[derive(Clone, Copy)]
struct SongColumns<'a> {
    id: &'a str,
    slug: &'a str,
    title: &'a str,
    sort_title: &'a str,
    total_performances: &'a str,
    last_played_date: &'a str,
    opener_count: &'a str,
    closer_count: &'a str,
    encore_count: &'a str,
}

#[cfg(feature = "ssr")]
const SONG_COLUMNS: SongColumns<'static> = SongColumns {
    id: "id",
    slug: "slug",
    title: "title",
    sort_title: "sort_title",
    total_performances: "total_performances",
    last_played_date: "last_played_date",
    opener_count: "opener_count",
    closer_count: "closer_count",
    encore_count: "encore_count",
};

#[cfg(feature = "ssr")]
fn row_song_with_identity(
    row: &sqlx::sqlite::SqliteRow,
    columns: SongColumns<'_>,
    slug: String,
    title: String,
) -> Result<Song, ServerFnError> {
    Ok(Song {
        id: row_i32(row, columns.id)?,
        slug,
        title,
        sort_title: row_opt_string(row, columns.sort_title)?,
        total_performances: row_opt_i32(row, columns.total_performances)?,
        last_played_date: row_opt_string(row, columns.last_played_date)?,
        is_liberated: None,
        opener_count: row_opt_i32(row, columns.opener_count)?,
        closer_count: row_opt_i32(row, columns.closer_count)?,
        encore_count: row_opt_i32(row, columns.encore_count)?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
fn row_song(row: &sqlx::sqlite::SqliteRow) -> Result<Song, ServerFnError> {
    row_song_with_identity(
        row,
        SONG_COLUMNS,
        row_string(row, SONG_COLUMNS.slug)?,
        row_string(row, SONG_COLUMNS.title)?,
    )
}

#[cfg(feature = "ssr")]
fn row_optional_song(
    row: &sqlx::sqlite::SqliteRow,
    columns: SongColumns<'_>,
) -> Result<Option<Song>, ServerFnError> {
    let slug = row_opt_string(row, columns.slug)?;
    let title = row_opt_string(row, columns.title)?;
    let (Some(slug), Some(title)) = (slug, title) else {
        return Ok(None);
    };

    row_song_with_identity(row, columns, slug, title).map(Some)
}

#[cfg(feature = "ssr")]
fn row_venue(row: &sqlx::sqlite::SqliteRow) -> Result<Venue, ServerFnError> {
    Ok(Venue {
        id: row_i32(row, "id")?,
        name: row_string(row, "name")?,
        city: row_string(row, "city")?,
        state: row_opt_string(row, "state")?,
        country: row_string(row, "country")?,
        country_code: row_opt_string(row, "country_code")?,
        venue_type: row_opt_string(row, "venue_type")?,
        total_shows: row_opt_i32(row, "total_shows")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
fn row_tour(row: &sqlx::sqlite::SqliteRow) -> Result<Tour, ServerFnError> {
    Ok(Tour {
        id: row_i32(row, "id")?,
        year: row_i32(row, "year")?,
        name: row_string(row, "name")?,
        total_shows: row_opt_i32(row, "total_shows")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
fn row_guest(row: &sqlx::sqlite::SqliteRow) -> Result<Guest, ServerFnError> {
    Ok(Guest {
        id: row_i32(row, "id")?,
        slug: row_string(row, "slug")?,
        name: row_string(row, "name")?,
        total_appearances: row_opt_i32(row, "total_appearances")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
fn row_release(row: &sqlx::sqlite::SqliteRow) -> Result<Release, ServerFnError> {
    Ok(Release {
        id: row_i32(row, "id")?,
        title: row_string(row, "title")?,
        slug: row_string(row, "slug")?,
        release_type: row_opt_string(row, "release_type")?,
        release_date: row_opt_string(row, "release_date")?,
        search_text: None,
    })
}

#[cfg(feature = "ssr")]
fn row_show_summary(row: &sqlx::sqlite::SqliteRow) -> Result<ShowSummary, ServerFnError> {
    Ok(ShowSummary {
        id: row_i32(row, "id")?,
        date: row_string(row, "date")?,
        year: row_i32(row, "year")?,
        venue_id: row_i32(row, "venue_id")?,
        venue_name: row_string(row, "venue_name")?,
        venue_city: row_string(row, "venue_city")?,
        venue_state: row_opt_string(row, "venue_state")?,
        tour_name: row_opt_string(row, "tour_name")?,
        tour_year: row_opt_i32(row, "tour_year")?,
    })
}

#[cfg(feature = "ssr")]
fn row_curated_list(row: &sqlx::sqlite::SqliteRow) -> Result<CuratedList, ServerFnError> {
    Ok(CuratedList {
        id: row_i32(row, "id")?,
        original_id: row_opt_string(row, "original_id")?,
        title: row_string(row, "title")?,
        slug: row_string(row, "slug")?,
        category: row_string(row, "category")?,
        description: row_opt_string(row, "description")?,
        item_count: row_opt_i32(row, "item_count")?,
        is_featured: row_opt_bool(row, "is_featured")?,
        sort_order: row_opt_i32(row, "sort_order")?,
        created_at: row_opt_string(row, "created_at")?,
        updated_at: row_opt_string(row, "updated_at")?,
    })
}

#[cfg(feature = "ssr")]
fn row_curated_list_item(row: &sqlx::sqlite::SqliteRow) -> Result<CuratedListItem, ServerFnError> {
    let metadata = row_opt_string(row, "metadata")?;
    let metadata = metadata.and_then(|raw| serde_json::from_str(&raw).ok());
    Ok(CuratedListItem {
        id: row_i32(row, "id")?,
        list_id: row_i32(row, "list_id")?,
        position: row_i32(row, "position")?,
        item_type: row_string(row, "item_type")?,
        show_id: row_opt_i32(row, "show_id")?,
        song_id: row_opt_i32(row, "song_id")?,
        venue_id: row_opt_i32(row, "venue_id")?,
        guest_id: row_opt_i32(row, "guest_id")?,
        release_id: row_opt_i32(row, "release_id")?,
        item_title: row_opt_string(row, "item_title")?,
        item_link: row_opt_string(row, "item_link")?,
        notes: row_opt_string(row, "notes")?,
        metadata,
        created_at: row_opt_string(row, "created_at")?,
    })
}

#[server(GetHomeStats, "/api")]
pub async fn get_home_stats() -> Result<HomeStats, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_value(&HOME_STATS_CACHE, || async {
            let pool = pool()?;
            let (shows, songs, venues): (i64, i64, i64) = sqlx::query_as(
                "SELECT
                    (SELECT COUNT(*) FROM shows),
                    (SELECT COUNT(*) FROM songs),
                    (SELECT COUNT(*) FROM venues)",
            )
            .fetch_one(&pool)
            .await
            .map_err(|err| to_server_error(&err))?;
            Ok(HomeStats {
                shows,
                songs,
                venues,
            })
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetShow, "/api")]
pub async fn get_show(id: i32) -> Result<Option<Show>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, date, venue_id, tour_id, song_count, rarity_index FROM shows WHERE id = ?",
            )
            .bind(id),
            &pool,
            |row| {
                let date: String = row_string(row, "date")?;
                let year = year_from_date(&date);
                Ok(Show {
                    id: row_i32(row, "id")?,
                    date,
                    venue_id: row_i32(row, "venue_id")?,
                    tour_id: row_opt_i32(row, "tour_id")?,
                    year,
                    song_count: row_opt_i32(row, "song_count")?,
                    rarity_index: row_opt_f32(row, "rarity_index")?,
                })
            },
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetSong, "/api")]
pub async fn get_song(slug: String) -> Result<Option<Song>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, slug, title, sort_title, total_performances, last_played_date, opener_count, closer_count, encore_count FROM songs WHERE slug = ?",
            )
            .bind(slug),
            &pool,
            row_song,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetVenue, "/api")]
pub async fn get_venue(id: i32) -> Result<Option<Venue>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, name, city, state, country, country_code, venue_type, total_shows FROM venues WHERE id = ?",
            )
            .bind(id),
            &pool,
            row_venue,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTour, "/api")]
pub async fn get_tour(year: i32) -> Result<Option<Tour>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, year, name, total_shows
                 FROM tours
                 WHERE year = ?
                 ORDER BY year DESC, total_shows DESC, id DESC
                 LIMIT 1",
            )
            .bind(year),
            &pool,
            row_tour,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTourById, "/api")]
pub async fn get_tour_by_id(id: i32) -> Result<Option<Tour>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query("SELECT id, year, name, total_shows FROM tours WHERE id = ?").bind(id),
            &pool,
            row_tour,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetGuest, "/api")]
pub async fn get_guest(slug: String) -> Result<Option<Guest>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query("SELECT id, name, slug, total_appearances FROM guests WHERE slug = ?")
                .bind(slug),
            &pool,
            row_guest,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetRelease, "/api")]
pub async fn get_release(slug: String) -> Result<Option<Release>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let pool = pool()?;
        fetch_optional_mapped(
            sqlx::query(
                "SELECT id, title, slug, release_type, release_date FROM releases WHERE slug = ?",
            )
            .bind(slug),
            &pool,
            row_release,
        )
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetAllReleases, "/api")]
pub async fn get_all_releases() -> Result<Vec<Release>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_value(&ALL_RELEASES_CACHE, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, title, slug, release_type, release_date FROM releases ORDER BY release_date DESC, id DESC",
                ),
                &pool,
            )
            .await?;
            map_rows(rows, |row| row_release(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetReleaseTracks, "/api")]
pub async fn get_release_tracks(release_id: i32) -> Result<Vec<ReleaseTrack>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_keyed_value(&RELEASE_TRACKS_CACHE, release_id, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, release_id, song_id, show_id, track_number, disc_number, duration_seconds, notes
                     FROM release_tracks
                     WHERE release_id = ?
                     ORDER BY disc_number, track_number, id",
                )
                .bind(release_id),
                &pool,
            )
            .await?;
            map_rows(rows, |row| {
                Ok(ReleaseTrack {
                    id: row_i32(&row, "id")?,
                    release_id: row_i32(&row, "release_id")?,
                    song_id: row_opt_i32(&row, "song_id")?,
                    show_id: row_opt_i32(&row, "show_id")?,
                    track_number: row_opt_i32(&row, "track_number")?,
                    disc_number: row_opt_i32(&row, "disc_number")?,
                    duration_seconds: row_opt_i32(&row, "duration_seconds")?,
                    notes: row_opt_string(&row, "notes")?,
                })
            })
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetSetlistEntries, "/api")]
pub async fn get_setlist_entries(show_id: i32) -> Result<Vec<SetlistEntry>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_keyed_value(&SETLIST_ENTRIES_CACHE, show_id, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT se.id, se.show_id, se.song_id, se.position, se.set_name, se.slot, se.duration_seconds,
                            se.segue_into_song_id, se.is_segue, se.is_tease, se.tease_of_song_id, se.notes,
                            sh.date as show_date,
                            s.slug as song_slug, s.title as song_title, s.sort_title as song_sort_title,
                            s.total_performances, s.last_played_date, s.opener_count, s.closer_count, s.encore_count
                     FROM setlist_entries se
                     LEFT JOIN shows sh ON sh.id = se.show_id
                     LEFT JOIN songs s ON s.id = se.song_id
                     WHERE se.show_id = ?
                     ORDER BY se.position, se.id",
                )
                .bind(show_id),
                &pool,
            )
            .await?;
            map_rows(rows, |row| {
                let show_date: Option<String> = row_opt_string(&row, "show_date")?;
                let year = show_date
                    .as_deref()
                    .and_then(|d| d.get(0..4))
                    .and_then(|s| s.parse::<i32>().ok());
                let song = row_optional_song(
                    &row,
                    SongColumns {
                        id: "song_id",
                        slug: "song_slug",
                        title: "song_title",
                        sort_title: "song_sort_title",
                        total_performances: "total_performances",
                        last_played_date: "last_played_date",
                        opener_count: "opener_count",
                        closer_count: "closer_count",
                        encore_count: "encore_count",
                    },
                )?;
                Ok(SetlistEntry {
                    id: row_i32(&row, "id")?,
                    show_id: row_i32(&row, "show_id")?,
                    song_id: row_i32(&row, "song_id")?,
                    position: row_i32(&row, "position")?,
                    set_name: row_opt_string(&row, "set_name")?,
                    slot: row_opt_string(&row, "slot")?,
                    show_date,
                    year,
                    duration_seconds: row_opt_i32(&row, "duration_seconds")?,
                    segue_into_song_id: row_opt_i32(&row, "segue_into_song_id")?,
                    is_segue: row_opt_bool(&row, "is_segue")?,
                    is_tease: row_opt_bool(&row, "is_tease")?,
                    tease_of_song_id: row_opt_i32(&row, "tease_of_song_id")?,
                    notes: row_opt_string(&row, "notes")?,
                    song,
                })
            })
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetLiberationList, "/api")]
pub async fn get_liberation_list(limit: i32) -> Result<Vec<LiberationEntry>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = sanitize_i32_limit(limit, 200);
        if limit == 0 {
            return Ok(Vec::new());
        }

        cached_keyed_value(&LIBERATION_LIST_CACHE, limit, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT ll.id, ll.song_id, ll.last_played_date, ll.last_played_show_id,
                            ll.days_since, ll.shows_since, ll.notes, ll.configuration, ll.is_liberated,
                            ll.liberated_date, ll.liberated_show_id,
                            s.slug as song_slug, s.title as song_title, s.sort_title as song_sort_title,
                            s.total_performances, s.last_played_date as song_last_played_date,
                            s.opener_count, s.closer_count, s.encore_count,
                            sh.date as show_date, v.name as venue_name, v.city as venue_city, v.state as venue_state
                     FROM liberation_list ll
                     LEFT JOIN songs s ON ll.song_id = s.id
                     LEFT JOIN shows sh ON ll.last_played_show_id = sh.id
                     LEFT JOIN venues v ON sh.venue_id = v.id
                     ORDER BY ll.days_since DESC, ll.id DESC
                     LIMIT ?",
                )
                .bind(limit),
                &pool,
            )
            .await?;
            map_rows(rows, |row| {
                let song = row_optional_song(
                    &row,
                    SongColumns {
                        id: "song_id",
                        slug: "song_slug",
                        title: "song_title",
                        sort_title: "song_sort_title",
                        total_performances: "total_performances",
                        last_played_date: "song_last_played_date",
                        opener_count: "opener_count",
                        closer_count: "closer_count",
                        encore_count: "encore_count",
                    },
                )?;
                let last_show_id = row_opt_i32(&row, "last_played_show_id")?;
                let last_show = if let Some(show_id) = last_show_id {
                    Some(LiberationLastShow {
                        id: show_id,
                        date: row_opt_string(&row, "show_date")?,
                        venue: Some(LiberationVenue {
                            name: row_opt_string(&row, "venue_name")?,
                            city: row_opt_string(&row, "venue_city")?,
                            state: row_opt_string(&row, "venue_state")?,
                        }),
                    })
                } else {
                    None
                };
                Ok(LiberationEntry {
                    id: row_i32(&row, "id")?,
                    song_id: row_i32(&row, "song_id")?,
                    days_since: row_opt_i32(&row, "days_since")?,
                    shows_since: row_opt_i32(&row, "shows_since")?,
                    is_liberated: row_opt_bool(&row, "is_liberated")?,
                    last_played_date: row_opt_string(&row, "last_played_date")?,
                    last_played_show_id: last_show_id,
                    notes: row_opt_string(&row, "notes")?,
                    configuration: row_opt_string(&row, "configuration")?,
                    liberated_date: row_opt_string(&row, "liberated_date")?,
                    liberated_show_id: row_opt_i32(&row, "liberated_show_id")?,
                    song,
                    last_show,
                })
            })
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetCuratedLists, "/api")]
pub async fn get_curated_lists() -> Result<Vec<CuratedList>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        cached_value(&CURATED_LISTS_CACHE, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, original_id, title, slug, category, description, item_count, is_featured,
                            sort_order, created_at, updated_at
                     FROM curated_lists
                     ORDER BY sort_order, id",
                ),
                &pool,
            )
            .await?;
            map_rows(rows, |row| row_curated_list(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetCuratedListItems, "/api")]
pub async fn get_curated_list_items(
    list_id: i32,
    limit: i32,
) -> Result<Vec<CuratedListItem>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = sanitize_i32_limit(limit, 500);
        if limit == 0 {
            return Ok(Vec::new());
        }

        let cache_key = (list_id, limit);
        cached_keyed_value(&CURATED_LIST_ITEMS_CACHE, cache_key, || async {
            let pool = pool()?;
            let rows = fetch_rows(
                sqlx::query(
                    "SELECT id, list_id, position, item_type, show_id, song_id, venue_id, guest_id, release_id,
                            item_title, item_link, notes, metadata, created_at
                     FROM curated_list_items
                     WHERE list_id = ?
                     ORDER BY position, id
                     LIMIT ?",
                )
                .bind(list_id)
                .bind(limit),
                &pool,
            )
            .await?;
            map_rows(rows, |row| row_curated_list_item(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetRecentShows, "/api")]
pub async fn get_recent_shows(limit: usize) -> Result<Vec<ShowSummary>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&RECENT_SHOWS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT
                      s.id,
                      s.date,
                      s.year,
                      s.venue_id,
                      v.name AS venue_name,
                      v.city AS venue_city,
                      v.state AS venue_state,
                      t.name AS tour_name,
                      t.year AS tour_year
                    FROM shows s
                    JOIN venues v ON v.id = s.venue_id
                    LEFT JOIN tours t ON t.id = s.tour_id
                    ORDER BY s.date DESC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_show_summary(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTopSongs, "/api")]
pub async fn get_top_songs(limit: usize) -> Result<Vec<Song>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&TOP_SONGS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, slug, title, sort_title, total_performances, last_played_date,
                           opener_count, closer_count, encore_count
                    FROM songs
                    ORDER BY COALESCE(total_performances, 0) DESC, title ASC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_song(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTopVenues, "/api")]
pub async fn get_top_venues(limit: usize) -> Result<Vec<Venue>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&TOP_VENUES_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, name, city, state, country, country_code, venue_type, total_shows
                    FROM venues
                    ORDER BY COALESCE(total_shows, 0) DESC, name ASC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_venue(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetTopGuests, "/api")]
pub async fn get_top_guests(limit: usize) -> Result<Vec<Guest>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&TOP_GUESTS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, name, slug, total_appearances
                    FROM guests
                    ORDER BY COALESCE(total_appearances, 0) DESC, name ASC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_guest(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetRecentTours, "/api")]
pub async fn get_recent_tours(limit: usize) -> Result<Vec<Tour>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&RECENT_TOURS_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, year, name, total_shows
                    FROM tours
                    ORDER BY year DESC, total_shows DESC, id DESC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_tour(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}

#[server(GetRecentReleases, "/api")]
pub async fn get_recent_releases(limit: usize) -> Result<Vec<Release>, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        let limit = limit.min(200);
        cached_keyed_value(&RECENT_RELEASES_CACHE, limit, || async {
            let pool = pool()?;
            let sql_limit = usize_to_i64_limit(limit)?;
            let rows = fetch_rows(
                sqlx::query(
                    r#"
                    SELECT id, title, slug, release_type, release_date
                    FROM releases
                    ORDER BY release_date DESC, id DESC
                    LIMIT ?
                    "#,
                )
                .bind(sql_limit),
                &pool,
            )
            .await?;

            map_rows(rows, |row| row_release(&row))
        })
        .await
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}
