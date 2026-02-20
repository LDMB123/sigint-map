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
fn read_ttl_cache<T: Clone>(cache: &OnceLock<RwLock<Option<TimedCacheValue<T>>>>) -> Option<T> {
    let lock = cache.get_or_init(|| RwLock::new(None));
    let guard = lock.read().ok()?;
    let entry = guard.as_ref()?;
    if entry.cached_at.elapsed() <= SSR_DB_CACHE_TTL {
        Some(entry.value.clone())
    } else {
        None
    }
}

#[cfg(feature = "ssr")]
fn write_ttl_cache<T: Clone>(cache: &OnceLock<RwLock<Option<TimedCacheValue<T>>>>, value: &T) {
    if let Ok(mut guard) = cache.get_or_init(|| RwLock::new(None)).write() {
        *guard = Some(TimedCacheValue {
            value: value.clone(),
            cached_at: Instant::now(),
        });
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
    let guard = lock.read().ok()?;
    let entry = guard.get(key)?;
    if entry.cached_at.elapsed() <= SSR_DB_CACHE_TTL {
        Some(entry.value.clone())
    } else {
        None
    }
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
        guard.insert(
            key,
            TimedCacheValue {
                value: value.clone(),
                cached_at: Instant::now(),
            },
        );
        if guard.len() > SSR_DB_CACHE_MAX_ENTRIES {
            guard.retain(|_, entry| entry.cached_at.elapsed() <= SSR_DB_CACHE_TTL);
            if guard.len() > SSR_DB_CACHE_MAX_ENTRIES {
                guard.clear();
            }
        }
    }
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
async fn pool() -> Result<sqlx::SqlitePool, ServerFnError> {
    use sqlx::SqlitePool;

    use_context::<SqlitePool>()
        .ok_or_else(|| ServerFnError::ServerError("DB pool unavailable".into()))
}

#[cfg(feature = "ssr")]
fn to_server_error(err: sqlx::Error) -> ServerFnError {
    ServerFnError::ServerError(err.to_string())
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
fn opt_i64_to_i32(value: Option<i64>) -> Option<i32> {
    value.map(|raw| raw as i32)
}

#[cfg(feature = "ssr")]
fn row_i32(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<i32, ServerFnError> {
    row.try_get::<i64, _>(column)
        .map(|raw| raw as i32)
        .map_err(to_server_error)
}

#[cfg(feature = "ssr")]
fn opt_i64_to_bool(value: Option<i64>) -> Option<bool> {
    value.map(|raw| raw != 0)
}

#[cfg(feature = "ssr")]
fn row_opt_i32(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<Option<i32>, ServerFnError> {
    row.try_get::<Option<i64>, _>(column)
        .map(opt_i64_to_i32)
        .map_err(to_server_error)
}

#[cfg(feature = "ssr")]
fn row_opt_bool(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<Option<bool>, ServerFnError> {
    row.try_get::<Option<i64>, _>(column)
        .map(opt_i64_to_bool)
        .map_err(to_server_error)
}

#[cfg(feature = "ssr")]
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
fn row_optional_song(
    row: &sqlx::sqlite::SqliteRow,
    columns: SongColumns<'_>,
) -> Result<Option<Song>, ServerFnError> {
    let slug = row
        .try_get::<Option<String>, _>(columns.slug)
        .map_err(to_server_error)?;
    let title = row
        .try_get::<Option<String>, _>(columns.title)
        .map_err(to_server_error)?;
    let (Some(slug), Some(title)) = (slug, title) else {
        return Ok(None);
    };

    Ok(Some(Song {
        id: row_i32(row, columns.id)?,
        slug,
        title,
        sort_title: row
            .try_get::<Option<String>, _>(columns.sort_title)
            .map_err(to_server_error)?,
        total_performances: row_opt_i32(row, columns.total_performances)?,
        last_played_date: row
            .try_get::<Option<String>, _>(columns.last_played_date)
            .map_err(to_server_error)?,
        is_liberated: None,
        opener_count: row_opt_i32(row, columns.opener_count)?,
        closer_count: row_opt_i32(row, columns.closer_count)?,
        encore_count: row_opt_i32(row, columns.encore_count)?,
        search_text: None,
    }))
}

#[server(GetHomeStats, "/api")]
pub async fn get_home_stats() -> Result<HomeStats, ServerFnError> {
    #[cfg(feature = "ssr")]
    {
        if let Some(cached) = read_ttl_cache(&HOME_STATS_CACHE) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let (shows, songs, venues): (i64, i64, i64) = sqlx::query_as(
            "SELECT
                (SELECT COUNT(*) FROM shows),
                (SELECT COUNT(*) FROM songs),
                (SELECT COUNT(*) FROM venues)",
        )
        .fetch_one(&pool)
        .await
        .map_err(to_server_error)?;
        let stats = HomeStats {
            shows,
            songs,
            venues,
        };
        write_ttl_cache(&HOME_STATS_CACHE, &stats);
        Ok(stats)
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
        let pool = pool().await?;
        let row = sqlx::query(
            "SELECT id, date, venue_id, tour_id, song_count, rarity_index FROM shows WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(to_server_error)?;

        if let Some(row) = row {
            let date: String = row.try_get::<String, _>("date").map_err(to_server_error)?;
            let show = Show {
                id: row_i32(&row, "id")?,
                date: date.clone(),
                venue_id: row_i32(&row, "venue_id")?,
                tour_id: row_opt_i32(&row, "tour_id")?,
                year: year_from_date(&date),
                song_count: row_opt_i32(&row, "song_count")?,
                rarity_index: row
                    .try_get::<Option<f64>, _>("rarity_index")
                    .map_err(to_server_error)?
                    .map(|v| v as f32),
            };
            return Ok(Some(show));
        }

        Ok(None)
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
        let pool = pool().await?;
        let row = sqlx::query(
            "SELECT id, slug, title, sort_title, total_performances, last_played_date, opener_count, closer_count, encore_count FROM songs WHERE slug = ?",
        )
        .bind(slug)
        .fetch_optional(&pool)
        .await
        .map_err(to_server_error)?;

        if let Some(row) = row {
            let song = Song {
                id: row_i32(&row, "id")?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                title: row.try_get::<String, _>("title").map_err(to_server_error)?,
                sort_title: row
                    .try_get::<Option<String>, _>("sort_title")
                    .map_err(to_server_error)?,
                total_performances: row_opt_i32(&row, "total_performances")?,
                last_played_date: row
                    .try_get::<Option<String>, _>("last_played_date")
                    .map_err(to_server_error)?,
                is_liberated: None,
                opener_count: row_opt_i32(&row, "opener_count")?,
                closer_count: row_opt_i32(&row, "closer_count")?,
                encore_count: row_opt_i32(&row, "encore_count")?,
                search_text: None,
            };
            return Ok(Some(song));
        }

        Ok(None)
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
        let pool = pool().await?;
        let row = sqlx::query(
            "SELECT id, name, city, state, country, country_code, venue_type, total_shows FROM venues WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(to_server_error)?;

        if let Some(row) = row {
            let venue = Venue {
                id: row_i32(&row, "id")?,
                name: row.try_get::<String, _>("name").map_err(to_server_error)?,
                city: row.try_get::<String, _>("city").map_err(to_server_error)?,
                state: row
                    .try_get::<Option<String>, _>("state")
                    .map_err(to_server_error)?,
                country: row
                    .try_get::<String, _>("country")
                    .map_err(to_server_error)?,
                country_code: row
                    .try_get::<Option<String>, _>("country_code")
                    .map_err(to_server_error)?,
                venue_type: row
                    .try_get::<Option<String>, _>("venue_type")
                    .map_err(to_server_error)?,
                total_shows: row_opt_i32(&row, "total_shows")?,
                search_text: None,
            };
            return Ok(Some(venue));
        }

        Ok(None)
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
        let pool = pool().await?;
        let row = sqlx::query(
            "SELECT id, year, name, total_shows
             FROM tours
             WHERE year = ?
             ORDER BY year DESC, total_shows DESC, id DESC
             LIMIT 1",
        )
        .bind(year)
        .fetch_optional(&pool)
        .await
        .map_err(to_server_error)?;

        if let Some(row) = row {
            let tour = Tour {
                id: row_i32(&row, "id")?,
                year: row_i32(&row, "year")?,
                name: row.try_get::<String, _>("name").map_err(to_server_error)?,
                total_shows: row_opt_i32(&row, "total_shows")?,
                search_text: None,
            };
            return Ok(Some(tour));
        }

        Ok(None)
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
        let pool = pool().await?;
        let row = sqlx::query("SELECT id, year, name, total_shows FROM tours WHERE id = ?")
            .bind(id)
            .fetch_optional(&pool)
            .await
            .map_err(to_server_error)?;

        if let Some(row) = row {
            let tour = Tour {
                id: row_i32(&row, "id")?,
                year: row_i32(&row, "year")?,
                name: row.try_get::<String, _>("name").map_err(to_server_error)?,
                total_shows: row_opt_i32(&row, "total_shows")?,
                search_text: None,
            };
            return Ok(Some(tour));
        }

        Ok(None)
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
        let pool = pool().await?;
        let row =
            sqlx::query("SELECT id, name, slug, total_appearances FROM guests WHERE slug = ?")
                .bind(slug)
                .fetch_optional(&pool)
                .await
                .map_err(to_server_error)?;

        if let Some(row) = row {
            let guest = Guest {
                id: row_i32(&row, "id")?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                name: row.try_get::<String, _>("name").map_err(to_server_error)?,
                total_appearances: row_opt_i32(&row, "total_appearances")?,
                search_text: None,
            };
            return Ok(Some(guest));
        }

        Ok(None)
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
        let pool = pool().await?;
        let row = sqlx::query(
            "SELECT id, title, slug, release_type, release_date FROM releases WHERE slug = ?",
        )
        .bind(slug)
        .fetch_optional(&pool)
        .await
        .map_err(to_server_error)?;

        if let Some(row) = row {
            let release = Release {
                id: row_i32(&row, "id")?,
                title: row.try_get::<String, _>("title").map_err(to_server_error)?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                release_type: row
                    .try_get::<Option<String>, _>("release_type")
                    .map_err(to_server_error)?,
                release_date: row
                    .try_get::<Option<String>, _>("release_date")
                    .map_err(to_server_error)?,
                search_text: None,
            };
            return Ok(Some(release));
        }

        Ok(None)
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
        if let Some(cached) = read_ttl_cache(&ALL_RELEASES_CACHE) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let rows = sqlx::query(
            "SELECT id, title, slug, release_type, release_date FROM releases ORDER BY release_date DESC, id DESC",
        )
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(Release {
                id: row_i32(&row, "id")?,
                title: row.try_get::<String, _>("title").map_err(to_server_error)?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                release_type: row
                    .try_get::<Option<String>, _>("release_type")
                    .map_err(to_server_error)?,
                release_date: row
                    .try_get::<Option<String>, _>("release_date")
                    .map_err(to_server_error)?,
                search_text: None,
            });
        }
        write_ttl_cache(&ALL_RELEASES_CACHE, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&RELEASE_TRACKS_CACHE, &release_id) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let rows = sqlx::query(
            "SELECT id, release_id, song_id, show_id, track_number, disc_number, duration_seconds, notes
             FROM release_tracks
             WHERE release_id = ?
             ORDER BY disc_number, track_number, id",
        )
        .bind(release_id)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(ReleaseTrack {
                id: row_i32(&row, "id")?,
                release_id: row_i32(&row, "release_id")?,
                song_id: row_opt_i32(&row, "song_id")?,
                show_id: row_opt_i32(&row, "show_id")?,
                track_number: row_opt_i32(&row, "track_number")?,
                disc_number: row_opt_i32(&row, "disc_number")?,
                duration_seconds: row_opt_i32(&row, "duration_seconds")?,
                notes: row
                    .try_get::<Option<String>, _>("notes")
                    .map_err(to_server_error)?,
            });
        }
        write_ttl_keyed_cache(&RELEASE_TRACKS_CACHE, release_id, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&SETLIST_ENTRIES_CACHE, &show_id) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let rows = sqlx::query(
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
        .bind(show_id)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            let show_date: Option<String> = row
                .try_get::<Option<String>, _>("show_date")
                .map_err(to_server_error)?;
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
            out.push(SetlistEntry {
                id: row_i32(&row, "id")?,
                show_id: row_i32(&row, "show_id")?,
                song_id: row_i32(&row, "song_id")?,
                position: row_i32(&row, "position")?,
                set_name: row
                    .try_get::<Option<String>, _>("set_name")
                    .map_err(to_server_error)?,
                slot: row
                    .try_get::<Option<String>, _>("slot")
                    .map_err(to_server_error)?,
                show_date,
                year,
                duration_seconds: row_opt_i32(&row, "duration_seconds")?,
                segue_into_song_id: row_opt_i32(&row, "segue_into_song_id")?,
                is_segue: row_opt_bool(&row, "is_segue")?,
                is_tease: row_opt_bool(&row, "is_tease")?,
                tease_of_song_id: row_opt_i32(&row, "tease_of_song_id")?,
                notes: row
                    .try_get::<Option<String>, _>("notes")
                    .map_err(to_server_error)?,
                song,
            });
        }
        write_ttl_keyed_cache(&SETLIST_ENTRIES_CACHE, show_id, &out);
        Ok(out)
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

        if let Some(cached) = read_ttl_keyed_cache(&LIBERATION_LIST_CACHE, &limit) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let rows = sqlx::query(
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
        .bind(limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
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
                    date: row
                        .try_get::<Option<String>, _>("show_date")
                        .map_err(to_server_error)?,
                    venue: Some(LiberationVenue {
                        name: row
                            .try_get::<Option<String>, _>("venue_name")
                            .map_err(to_server_error)?,
                        city: row
                            .try_get::<Option<String>, _>("venue_city")
                            .map_err(to_server_error)?,
                        state: row
                            .try_get::<Option<String>, _>("venue_state")
                            .map_err(to_server_error)?,
                    }),
                })
            } else {
                None
            };
            out.push(LiberationEntry {
                id: row_i32(&row, "id")?,
                song_id: row_i32(&row, "song_id")?,
                days_since: row_opt_i32(&row, "days_since")?,
                shows_since: row_opt_i32(&row, "shows_since")?,
                is_liberated: row_opt_bool(&row, "is_liberated")?,
                last_played_date: row
                    .try_get::<Option<String>, _>("last_played_date")
                    .map_err(to_server_error)?,
                last_played_show_id: row_opt_i32(&row, "last_played_show_id")?,
                notes: row
                    .try_get::<Option<String>, _>("notes")
                    .map_err(to_server_error)?,
                configuration: row
                    .try_get::<Option<String>, _>("configuration")
                    .map_err(to_server_error)?,
                liberated_date: row
                    .try_get::<Option<String>, _>("liberated_date")
                    .map_err(to_server_error)?,
                liberated_show_id: row_opt_i32(&row, "liberated_show_id")?,
                song,
                last_show,
            });
        }
        write_ttl_keyed_cache(&LIBERATION_LIST_CACHE, limit, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_cache(&CURATED_LISTS_CACHE) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let rows = sqlx::query(
            "SELECT id, original_id, title, slug, category, description, item_count, is_featured,
                    sort_order, created_at, updated_at
             FROM curated_lists
             ORDER BY sort_order, id",
        )
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(CuratedList {
                id: row_i32(&row, "id")?,
                original_id: row
                    .try_get::<Option<String>, _>("original_id")
                    .map_err(to_server_error)?,
                title: row.try_get::<String, _>("title").map_err(to_server_error)?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                category: row
                    .try_get::<String, _>("category")
                    .map_err(to_server_error)?,
                description: row
                    .try_get::<Option<String>, _>("description")
                    .map_err(to_server_error)?,
                item_count: row_opt_i32(&row, "item_count")?,
                is_featured: row_opt_bool(&row, "is_featured")?,
                sort_order: row_opt_i32(&row, "sort_order")?,
                created_at: row
                    .try_get::<Option<String>, _>("created_at")
                    .map_err(to_server_error)?,
                updated_at: row
                    .try_get::<Option<String>, _>("updated_at")
                    .map_err(to_server_error)?,
            });
        }
        write_ttl_cache(&CURATED_LISTS_CACHE, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&CURATED_LIST_ITEMS_CACHE, &cache_key) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let rows = sqlx::query(
            "SELECT id, list_id, position, item_type, show_id, song_id, venue_id, guest_id, release_id,
                    item_title, item_link, notes, metadata, created_at
             FROM curated_list_items
             WHERE list_id = ?
             ORDER BY position, id
             LIMIT ?",
        )
        .bind(list_id)
        .bind(limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            let metadata: Option<String> = row
                .try_get::<Option<String>, _>("metadata")
                .map_err(to_server_error)?;
            let metadata = metadata.and_then(|raw| serde_json::from_str(&raw).ok());
            out.push(CuratedListItem {
                id: row_i32(&row, "id")?,
                list_id: row_i32(&row, "list_id")?,
                position: row_i32(&row, "position")?,
                item_type: row
                    .try_get::<String, _>("item_type")
                    .map_err(to_server_error)?,
                show_id: row_opt_i32(&row, "show_id")?,
                song_id: row_opt_i32(&row, "song_id")?,
                venue_id: row_opt_i32(&row, "venue_id")?,
                guest_id: row_opt_i32(&row, "guest_id")?,
                release_id: row_opt_i32(&row, "release_id")?,
                item_title: row
                    .try_get::<Option<String>, _>("item_title")
                    .map_err(to_server_error)?,
                item_link: row
                    .try_get::<Option<String>, _>("item_link")
                    .map_err(to_server_error)?,
                notes: row
                    .try_get::<Option<String>, _>("notes")
                    .map_err(to_server_error)?,
                metadata,
                created_at: row
                    .try_get::<Option<String>, _>("created_at")
                    .map_err(to_server_error)?,
            });
        }
        write_ttl_keyed_cache(&CURATED_LIST_ITEMS_CACHE, cache_key, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&RECENT_SHOWS_CACHE, &limit) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let sql_limit = limit as i64;
        let rows = sqlx::query(
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
        .bind(sql_limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;

        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(ShowSummary {
                id: row_i32(&row, "id")?,
                date: row.try_get::<String, _>("date").map_err(to_server_error)?,
                year: row_i32(&row, "year")?,
                venue_id: row_i32(&row, "venue_id")?,
                venue_name: row
                    .try_get::<String, _>("venue_name")
                    .map_err(to_server_error)?,
                venue_city: row
                    .try_get::<String, _>("venue_city")
                    .map_err(to_server_error)?,
                venue_state: row
                    .try_get::<Option<String>, _>("venue_state")
                    .map_err(to_server_error)?,
                tour_name: row
                    .try_get::<Option<String>, _>("tour_name")
                    .map_err(to_server_error)?,
                tour_year: row_opt_i32(&row, "tour_year")?,
            });
        }
        write_ttl_keyed_cache(&RECENT_SHOWS_CACHE, limit, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&TOP_SONGS_CACHE, &limit) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let sql_limit = limit as i64;
        let rows = sqlx::query(
            r#"
            SELECT id, slug, title, sort_title, total_performances, last_played_date,
                   opener_count, closer_count, encore_count
            FROM songs
            ORDER BY COALESCE(total_performances, 0) DESC, title ASC
            LIMIT ?
            "#,
        )
        .bind(sql_limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;

        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(Song {
                id: row_i32(&row, "id")?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                title: row.try_get::<String, _>("title").map_err(to_server_error)?,
                sort_title: row
                    .try_get::<Option<String>, _>("sort_title")
                    .map_err(to_server_error)?,
                total_performances: row_opt_i32(&row, "total_performances")?,
                last_played_date: row
                    .try_get::<Option<String>, _>("last_played_date")
                    .map_err(to_server_error)?,
                is_liberated: None,
                opener_count: row_opt_i32(&row, "opener_count")?,
                closer_count: row_opt_i32(&row, "closer_count")?,
                encore_count: row_opt_i32(&row, "encore_count")?,
                search_text: None,
            });
        }
        write_ttl_keyed_cache(&TOP_SONGS_CACHE, limit, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&TOP_VENUES_CACHE, &limit) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let sql_limit = limit as i64;
        let rows = sqlx::query(
            r#"
            SELECT id, name, city, state, country, country_code, venue_type, total_shows
            FROM venues
            ORDER BY COALESCE(total_shows, 0) DESC, name ASC
            LIMIT ?
            "#,
        )
        .bind(sql_limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;

        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(Venue {
                id: row_i32(&row, "id")?,
                name: row.try_get::<String, _>("name").map_err(to_server_error)?,
                city: row.try_get::<String, _>("city").map_err(to_server_error)?,
                state: row
                    .try_get::<Option<String>, _>("state")
                    .map_err(to_server_error)?,
                country: row
                    .try_get::<String, _>("country")
                    .map_err(to_server_error)?,
                country_code: row
                    .try_get::<Option<String>, _>("country_code")
                    .map_err(to_server_error)?,
                venue_type: row
                    .try_get::<Option<String>, _>("venue_type")
                    .map_err(to_server_error)?,
                total_shows: row_opt_i32(&row, "total_shows")?,
                search_text: None,
            });
        }
        write_ttl_keyed_cache(&TOP_VENUES_CACHE, limit, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&TOP_GUESTS_CACHE, &limit) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let sql_limit = limit as i64;
        let rows = sqlx::query(
            r#"
            SELECT id, name, slug, total_appearances
            FROM guests
            ORDER BY COALESCE(total_appearances, 0) DESC, name ASC
            LIMIT ?
            "#,
        )
        .bind(sql_limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;

        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(Guest {
                id: row_i32(&row, "id")?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                name: row.try_get::<String, _>("name").map_err(to_server_error)?,
                total_appearances: row_opt_i32(&row, "total_appearances")?,
                search_text: None,
            });
        }
        write_ttl_keyed_cache(&TOP_GUESTS_CACHE, limit, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&RECENT_TOURS_CACHE, &limit) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let sql_limit = limit as i64;
        let rows = sqlx::query(
            r#"
            SELECT id, year, name, total_shows
            FROM tours
            ORDER BY year DESC, total_shows DESC, id DESC
            LIMIT ?
            "#,
        )
        .bind(sql_limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;

        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(Tour {
                id: row_i32(&row, "id")?,
                year: row_i32(&row, "year")?,
                name: row.try_get::<String, _>("name").map_err(to_server_error)?,
                total_shows: row_opt_i32(&row, "total_shows")?,
                search_text: None,
            });
        }
        write_ttl_keyed_cache(&RECENT_TOURS_CACHE, limit, &out);
        Ok(out)
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
        if let Some(cached) = read_ttl_keyed_cache(&RECENT_RELEASES_CACHE, &limit) {
            return Ok(cached);
        }

        let pool = pool().await?;
        let sql_limit = limit as i64;
        let rows = sqlx::query(
            r#"
            SELECT id, title, slug, release_type, release_date
            FROM releases
            ORDER BY release_date DESC, id DESC
            LIMIT ?
            "#,
        )
        .bind(sql_limit)
        .fetch_all(&pool)
        .await
        .map_err(to_server_error)?;

        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push(Release {
                id: row_i32(&row, "id")?,
                title: row.try_get::<String, _>("title").map_err(to_server_error)?,
                slug: row.try_get::<String, _>("slug").map_err(to_server_error)?,
                release_type: row
                    .try_get::<Option<String>, _>("release_type")
                    .map_err(to_server_error)?,
                release_date: row
                    .try_get::<Option<String>, _>("release_date")
                    .map_err(to_server_error)?,
                search_text: None,
            });
        }
        write_ttl_keyed_cache(&RECENT_RELEASES_CACHE, limit, &out);
        Ok(out)
    }

    #[cfg(not(feature = "ssr"))]
    {
        ssr_only()
    }
}
