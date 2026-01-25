//! Aggregation module for computing statistics across large datasets.
//!
//! These operations replace multiple JavaScript Map/Set operations with
//! single-pass Rust algorithms using HashMap/HashSet.
//!
//! # Performance
//! - Year aggregations: < 5ms for 5,000 shows
//! - Song performance counts: < 20ms for 150,000 entries
//! - Tour statistics: < 10ms per year
//!
//! # Parallel Processing
//! When compiled with the `parallel` feature, functions use Rayon's parallel
//! iterators for improved performance on large datasets. This requires
//! SharedArrayBuffer support (COOP/COEP headers) in the browser.

use crate::types::*;
use serde::Serialize;
use std::collections::{BinaryHeap, HashMap, HashSet};
use std::cmp::Ordering;

#[cfg(feature = "parallel")]
use rayon::prelude::*;

// ==================== RESULT TYPES ====================

/// Year count for aggregations.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YearCount {
    pub year: i64,
    pub count: i64,
}

/// Song with count for top-N queries.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SongWithCount {
    pub song_id: i64,
    pub count: i64,
}

/// Venue statistics aggregation.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VenueStats {
    pub total_venues: i64,
    pub total_shows: i64,
    pub unique_states: i64,
    pub unique_countries: i64,
}

/// Tour statistics for a year.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TourYearStats {
    pub year: i64,
    pub show_count: i64,
    pub unique_venues: i64,
    pub unique_states: i64,
    pub unique_songs: i64,
}

/// Global statistics for the entire database.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalStats {
    pub total_shows: i64,
    pub total_songs: i64,
    pub total_venues: i64,
    pub total_tours: i64,
    pub total_guests: i64,
    pub total_setlist_entries: i64,
    pub year_range: Option<(i64, i64)>,
    pub total_unique_songs_played: i64,
}

// ==================== SHOW AGGREGATIONS ====================

/// Aggregate shows by year.
///
/// Returns a sorted list of (year, count) pairs.
///
/// When the `parallel` feature is enabled, uses parallel iterators for
/// improved performance on large datasets.
#[cfg(not(feature = "parallel"))]
#[inline]
pub fn aggregate_shows_by_year(shows: &[DexieShow]) -> Vec<YearCount> {
    let mut counts: HashMap<i64, i64> = HashMap::default();
    counts.reserve(40); // ~35 years of shows, with buffer

    for show in shows {
        *counts.entry(show.year).or_insert(0) += 1;
    }

    let mut result: Vec<YearCount> = counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();

    result.sort_by_key(|yc| yc.year);
    result
}

/// Aggregate shows by year (parallel version).
///
/// Uses Rayon parallel iterators to count shows across multiple threads.
#[cfg(feature = "parallel")]
pub fn aggregate_shows_by_year(shows: &[DexieShow]) -> Vec<YearCount> {
    use std::sync::atomic::{AtomicI64, Ordering};
    use std::collections::BTreeMap;

    // Use parallel fold + reduce pattern for thread-safe aggregation
    let counts: HashMap<i64, i64> = shows
        .par_iter()
        .fold(
            || HashMap::with_capacity(40),
            |mut acc, show| {
                *acc.entry(show.year).or_insert(0) += 1;
                acc
            },
        )
        .reduce(
            || HashMap::with_capacity(40),
            |mut a, b| {
                for (year, count) in b {
                    *a.entry(year).or_insert(0) += count;
                }
                a
            },
        );

    let mut result: Vec<YearCount> = counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();

    result.sort_by_key(|yc| yc.year);
    result
}

/// Get shows grouped by year (returns show IDs per year).
#[inline]
pub fn group_shows_by_year(shows: &[DexieShow]) -> HashMap<i64, Vec<i64>> {
    let mut groups: HashMap<i64, Vec<i64>> = HashMap::with_capacity(40); // ~40 years of touring

    for show in shows {
        groups.entry(show.year).or_default().push(show.id);
    }

    groups
}

// ==================== SONG AGGREGATIONS PER YEAR ====================

/// Aggregate total songs played per year (counting each setlist entry).
///
/// Returns a sorted list of (year, count) pairs where count is the total
/// number of songs performed that year (same song at multiple shows counts
/// multiple times).
///
/// # Example
/// If "Ants Marching" was played at 50 shows in 2023, it contributes 50 to the count.
#[inline]
pub fn aggregate_songs_per_year(entries: &[DexieSetlistEntry]) -> Vec<YearCount> {
    let mut counts: HashMap<i64, i64> = HashMap::with_capacity(40); // ~35 years of shows

    for entry in entries {
        *counts.entry(entry.year).or_insert(0) += 1;
    }

    let mut result: Vec<YearCount> = counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();

    result.sort_by_key(|yc| yc.year);
    result
}

/// Aggregate unique songs played per year (counting each unique song once per year).
///
/// Returns a sorted list of (year, count) pairs where count is the number
/// of distinct songs performed that year.
///
/// # Example
/// If "Ants Marching" was played at 50 shows in 2023, it contributes 1 to the count.
pub fn aggregate_unique_songs_per_year(entries: &[DexieSetlistEntry]) -> Vec<YearCount> {
    // Use HashSet per year to track unique songs
    let mut songs_by_year: HashMap<i64, HashSet<i64>> = HashMap::with_capacity(40);

    for entry in entries {
        songs_by_year
            .entry(entry.year)
            .or_default()
            .insert(entry.song_id);
    }

    let mut result: Vec<YearCount> = songs_by_year
        .into_iter()
        .map(|(year, songs)| YearCount {
            year,
            count: songs.len() as i64,
        })
        .collect();

    result.sort_by_key(|yc| yc.year);
    result
}

/// Comprehensive yearly statistics.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YearlyStatistics {
    pub year: i64,
    pub show_count: i64,
    pub total_songs: i64,         // Total performances (with repeats)
    pub unique_songs: i64,        // Distinct songs played
    pub unique_venues: i64,
    pub avg_songs_per_show: f64,
    pub opener_count: i64,        // Total openers across shows
    pub closer_count: i64,        // Total closers across shows
    pub encore_count: i64,        // Total encores across shows
}

/// Aggregate comprehensive yearly statistics in a single pass.
///
/// This function efficiently computes all key statistics for a year:
/// - Show count
/// - Total songs played (with repeats)
/// - Unique songs played
/// - Unique venues
/// - Average songs per show
/// - Opener/closer/encore counts
///
/// Designed to replace multiple JavaScript calls with one WASM call.
pub fn aggregate_yearly_statistics(
    shows: &[DexieShow],
    entries: &[DexieSetlistEntry],
    year: i64,
) -> YearlyStatistics {
    // Filter shows for the year
    let year_shows: Vec<&DexieShow> = shows.iter().filter(|s| s.year == year).collect();
    let show_ids: HashSet<i64> = year_shows.iter().map(|s| s.id).collect();

    // Collect unique venues
    let unique_venues: HashSet<i64> = year_shows.iter().map(|s| s.venue_id).collect();

    // Filter entries for year's shows and compute stats
    let mut unique_songs: HashSet<i64> = HashSet::with_capacity(200);
    let mut total_songs: i64 = 0;
    let mut opener_count: i64 = 0;
    let mut closer_count: i64 = 0;
    let mut encore_count: i64 = 0;

    for entry in entries {
        if !show_ids.contains(&entry.show_id) {
            continue;
        }

        total_songs += 1;
        unique_songs.insert(entry.song_id);

        match entry.slot {
            SlotType::Opener => opener_count += 1,
            SlotType::Closer => {
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => encore_count += 1,
                    _ => closer_count += 1,
                }
            }
            SlotType::Standard => {
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => encore_count += 1,
                    _ => {}
                }
            }
        }
    }

    let show_count = year_shows.len() as i64;
    let avg_songs_per_show = if show_count > 0 {
        total_songs as f64 / show_count as f64
    } else {
        0.0
    };

    YearlyStatistics {
        year,
        show_count,
        total_songs,
        unique_songs: unique_songs.len() as i64,
        unique_venues: unique_venues.len() as i64,
        avg_songs_per_show,
        opener_count,
        closer_count,
        encore_count,
    }
}

/// Aggregate yearly statistics for all years at once.
///
/// More efficient than calling `aggregate_yearly_statistics` for each year
/// because it builds lookup structures once.
pub fn aggregate_all_yearly_statistics(
    shows: &[DexieShow],
    entries: &[DexieSetlistEntry],
) -> Vec<YearlyStatistics> {
    // Build show lookup by year
    let mut shows_by_year: HashMap<i64, Vec<&DexieShow>> = HashMap::with_capacity(40);
    for show in shows {
        shows_by_year.entry(show.year).or_default().push(show);
    }

    // Build entry lookup by show_id for efficient filtering
    let mut entries_by_show: HashMap<i64, Vec<&DexieSetlistEntry>> = HashMap::with_capacity(shows.len());
    for entry in entries {
        entries_by_show.entry(entry.show_id).or_default().push(entry);
    }

    // Compute stats for each year
    let mut results: Vec<YearlyStatistics> = Vec::with_capacity(shows_by_year.len());

    for (year, year_shows) in &shows_by_year {
        let mut unique_venues: HashSet<i64> = HashSet::with_capacity(100);
        let mut unique_songs: HashSet<i64> = HashSet::with_capacity(200);
        let mut total_songs: i64 = 0;
        let mut opener_count: i64 = 0;
        let mut closer_count: i64 = 0;
        let mut encore_count: i64 = 0;

        for show in year_shows {
            unique_venues.insert(show.venue_id);

            if let Some(show_entries) = entries_by_show.get(&show.id) {
                for entry in show_entries {
                    total_songs += 1;
                    unique_songs.insert(entry.song_id);

                    match entry.slot {
                        SlotType::Opener => opener_count += 1,
                        SlotType::Closer => {
                            match entry.set_name {
                                SetType::Encore | SetType::Encore2 => encore_count += 1,
                                _ => closer_count += 1,
                            }
                        }
                        SlotType::Standard => {
                            match entry.set_name {
                                SetType::Encore | SetType::Encore2 => encore_count += 1,
                                _ => {}
                            }
                        }
                    }
                }
            }
        }

        let show_count = year_shows.len() as i64;
        let avg_songs_per_show = if show_count > 0 {
            total_songs as f64 / show_count as f64
        } else {
            0.0
        };

        results.push(YearlyStatistics {
            year: *year,
            show_count,
            total_songs,
            unique_songs: unique_songs.len() as i64,
            unique_venues: unique_venues.len() as i64,
            avg_songs_per_show,
            opener_count,
            closer_count,
            encore_count,
        });
    }

    results.sort_by_key(|s| s.year);
    results
}

// ==================== SETLIST AGGREGATIONS ====================

/// Count song performances (total plays per song).
///
/// When the `parallel` feature is enabled, uses parallel iterators for
/// improved performance on large datasets.
#[cfg(not(feature = "parallel"))]
#[inline]
pub fn count_song_performances(entries: &[DexieSetlistEntry]) -> HashMap<i64, i64> {
    let mut counts: HashMap<i64, i64> = HashMap::with_capacity(1300); // ~1,300 unique songs

    for entry in entries {
        *counts.entry(entry.song_id).or_insert(0) += 1;
    }

    counts
}

/// Count song performances (parallel version).
///
/// Uses Rayon parallel iterators to count performances across multiple threads.
#[cfg(feature = "parallel")]
pub fn count_song_performances(entries: &[DexieSetlistEntry]) -> HashMap<i64, i64> {
    entries
        .par_iter()
        .fold(
            || HashMap::with_capacity(1300), // ~1,300 unique songs
            |mut acc, entry| {
                *acc.entry(entry.song_id).or_insert(0) += 1;
                acc
            },
        )
        .reduce(
            || HashMap::with_capacity(1300), // ~1,300 unique songs
            |mut a, b| {
                for (song_id, count) in b {
                    *a.entry(song_id).or_insert(0) += count;
                }
                a
            },
        )
}

/// Get top N songs by performance count.
///
/// When the `parallel` feature is enabled, uses parallel iterators for
/// improved performance on large datasets.
#[cfg(not(feature = "parallel"))]
pub fn get_top_songs_by_performances(
    entries: &[DexieSetlistEntry],
    limit: usize,
) -> Vec<SongWithCount> {
    let counts = count_song_performances(entries);

    let mut results: Vec<SongWithCount> = counts
        .into_iter()
        .map(|(song_id, count)| SongWithCount { song_id, count })
        .collect();

    // Sort by count descending
    results.sort_by(|a, b| b.count.cmp(&a.count));
    results.truncate(limit);
    results
}

/// Get top N songs by performance count (parallel version).
///
/// Uses Rayon parallel iterators for counting and parallel sorting.
#[cfg(feature = "parallel")]
pub fn get_top_songs_by_performances(
    entries: &[DexieSetlistEntry],
    limit: usize,
) -> Vec<SongWithCount> {
    let counts = count_song_performances(entries);

    let mut results: Vec<SongWithCount> = counts
        .into_par_iter()
        .map(|(song_id, count)| SongWithCount { song_id, count })
        .collect();

    // Use parallel sort for large result sets
    results.par_sort_by(|a, b| b.count.cmp(&a.count));
    results.truncate(limit);
    results
}

/// Count openers by year.
pub fn count_openers_by_year(
    entries: &[DexieSetlistEntry],
    year: i64,
) -> Vec<SongWithCount> {
    let mut counts: HashMap<i64, i64> = HashMap::with_capacity(50); // ~50 unique openers per year

    for entry in entries {
        if entry.year == year && entry.slot == SlotType::Opener {
            *counts.entry(entry.song_id).or_insert(0) += 1;
        }
    }

    let mut results: Vec<SongWithCount> = counts
        .into_iter()
        .map(|(song_id, count)| SongWithCount { song_id, count })
        .collect();

    results.sort_by(|a, b| b.count.cmp(&a.count));
    results
}

/// Count closers by year (excluding encores).
pub fn count_closers_by_year(
    entries: &[DexieSetlistEntry],
    year: i64,
) -> Vec<SongWithCount> {
    let mut counts: HashMap<i64, i64> = HashMap::with_capacity(50); // ~50 unique closers per year

    for entry in entries {
        if entry.year == year
            && entry.slot == SlotType::Closer
            && entry.set_name != SetType::Encore
            && entry.set_name != SetType::Encore2
        {
            *counts.entry(entry.song_id).or_insert(0) += 1;
        }
    }

    let mut results: Vec<SongWithCount> = counts
        .into_iter()
        .map(|(song_id, count)| SongWithCount { song_id, count })
        .collect();

    results.sort_by(|a, b| b.count.cmp(&a.count));
    results
}

/// Count encore songs by year.
pub fn count_encores_by_year(
    entries: &[DexieSetlistEntry],
    year: i64,
) -> Vec<SongWithCount> {
    let mut counts: HashMap<i64, i64> = HashMap::with_capacity(80); // ~80 unique encore songs per year

    for entry in entries {
        if entry.year == year
            && (entry.set_name == SetType::Encore || entry.set_name == SetType::Encore2)
        {
            *counts.entry(entry.song_id).or_insert(0) += 1;
        }
    }

    let mut results: Vec<SongWithCount> = counts
        .into_iter()
        .map(|(song_id, count)| SongWithCount { song_id, count })
        .collect();

    results.sort_by(|a, b| b.count.cmp(&a.count));
    results
}

/// Get year breakdown for a specific song.
#[inline]
pub fn get_year_breakdown_for_song(
    entries: &[DexieSetlistEntry],
    song_id: i64,
) -> Vec<YearCount> {
    let mut counts: HashMap<i64, i64> = HashMap::with_capacity(40); // ~40 years of touring

    for entry in entries {
        if entry.song_id == song_id {
            *counts.entry(entry.year).or_insert(0) += 1;
        }
    }

    let mut results: Vec<YearCount> = counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();

    // Sort by year descending (most recent first)
    results.sort_by(|a, b| b.year.cmp(&a.year));
    results
}

// ==================== VENUE AGGREGATIONS ====================

/// Calculate venue statistics.
pub fn calculate_venue_stats(venues: &[DexieVenue]) -> VenueStats {
    let mut total_shows = 0i64;
    let mut states: HashSet<&str> = HashSet::with_capacity(60); // ~50 US states + provinces
    let mut countries: HashSet<&str> = HashSet::with_capacity(30); // ~20-30 countries

    for venue in venues {
        total_shows += venue.total_shows;
        if let Some(ref state) = venue.state {
            if !state.is_empty() {
                states.insert(state);
            }
        }
        countries.insert(&venue.country);
    }

    VenueStats {
        total_venues: venues.len() as i64,
        total_shows,
        unique_states: states.len() as i64,
        unique_countries: countries.len() as i64,
    }
}

/// Get year breakdown for a venue (shows per year).
#[inline]
pub fn get_year_breakdown_for_venue(
    shows: &[DexieShow],
    venue_id: i64,
) -> Vec<YearCount> {
    let mut counts: HashMap<i64, i64> = HashMap::with_capacity(40); // ~40 years of touring

    for show in shows {
        if show.venue_id == venue_id {
            *counts.entry(show.year).or_insert(0) += 1;
        }
    }

    let mut results: Vec<YearCount> = counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();

    results.sort_by(|a, b| b.year.cmp(&a.year));
    results
}

// ==================== TOUR AGGREGATIONS ====================

/// Get tour statistics for a specific year.
///
/// Filters shows by year and computes unique venues, states, and songs.
/// Uses HashSet for efficient deduplication.
pub fn get_tour_stats_by_year(
    shows: &[DexieShow],
    setlist_entries: &[DexieSetlistEntry],
    year: i64,
) -> TourYearStats {
    // Filter shows for this year
    let year_shows: Vec<&DexieShow> = shows.iter().filter(|s| s.year == year).collect();

    // Collect unique venues and states using HashSet
    let mut venue_ids: HashSet<i64> = HashSet::with_capacity(100); // ~100 unique venues per year
    let mut states: HashSet<&str> = HashSet::with_capacity(40); // ~40 states per year

    for show in &year_shows {
        venue_ids.insert(show.venue_id);
        if let Some(ref state) = show.venue.state {
            if !state.is_empty() {
                states.insert(state);
            }
        }
    }

    // Get show IDs for this year to filter setlist entries
    let show_ids: HashSet<i64> = year_shows.iter().map(|s| s.id).collect();

    // Count unique songs using HashSet
    let mut song_ids: HashSet<i64> = HashSet::with_capacity(200); // ~200 unique songs per year
    for entry in setlist_entries {
        if show_ids.contains(&entry.show_id) {
            song_ids.insert(entry.song_id);
        }
    }

    TourYearStats {
        year,
        show_count: year_shows.len() as i64,
        unique_venues: venue_ids.len() as i64,
        unique_states: states.len() as i64,
        unique_songs: song_ids.len() as i64,
    }
}

/// Group tours by decade.
///
/// Returns a HashMap where keys are decade start years (1990, 2000, 2010, 2020)
/// and values are vectors of tours from that decade.
///
/// # Performance
/// Takes ownership of input to avoid cloning each tour in the hot loop.
/// Callers should pass owned data; use `.clone()` at call site if borrowing is needed.
pub fn get_tours_grouped_by_decade(tours: Vec<DexieTour>) -> HashMap<i64, Vec<DexieTour>> {
    let mut groups: HashMap<i64, Vec<DexieTour>> = HashMap::with_capacity(5); // ~4-5 decades

    for tour in tours {
        // Calculate decade: 1991 -> 1990, 2005 -> 2000, etc.
        let decade = (tour.year / 10) * 10;
        groups.entry(decade).or_default().push(tour);
    }

    groups
}

/// Calculate tour statistics for a specific year.
///
/// Note: This is an alias for `get_tour_stats_by_year` for backwards compatibility.
pub fn calculate_tour_stats_for_year(
    shows: &[DexieShow],
    entries: &[DexieSetlistEntry],
    year: i64,
) -> TourYearStats {
    // Filter shows for this year
    let year_shows: Vec<&DexieShow> = shows.iter().filter(|s| s.year == year).collect();

    // Collect unique venues and states
    let mut venue_ids: HashSet<i64> = HashSet::with_capacity(100); // ~100 unique venues per year
    let mut states: HashSet<&str> = HashSet::with_capacity(40); // ~40 states per year

    for show in &year_shows {
        venue_ids.insert(show.venue_id);
        if let Some(ref state) = show.venue.state {
            if !state.is_empty() {
                states.insert(state);
            }
        }
    }

    // Get show IDs for this year
    let show_ids: HashSet<i64> = year_shows.iter().map(|s| s.id).collect();

    // Count unique songs
    let mut song_ids: HashSet<i64> = HashSet::with_capacity(200); // ~200 unique songs per year
    for entry in entries {
        if show_ids.contains(&entry.show_id) {
            song_ids.insert(entry.song_id);
        }
    }

    TourYearStats {
        year,
        show_count: year_shows.len() as i64,
        unique_venues: venue_ids.len() as i64,
        unique_states: states.len() as i64,
        unique_songs: song_ids.len() as i64,
    }
}

// ==================== GUEST AGGREGATIONS ====================

/// Get year breakdown for a guest (unique shows per year).
pub fn get_year_breakdown_for_guest(
    appearances: &[DexieGuestAppearance],
    guest_id: i64,
) -> Vec<YearCount> {
    // Use Set to count unique shows per year (guest may appear multiple times in one show)
    let mut shows_by_year: HashMap<i64, HashSet<i64>> = HashMap::with_capacity(40); // ~40 years of touring

    for app in appearances {
        if app.guest_id == guest_id {
            shows_by_year
                .entry(app.year)
                .or_default()
                .insert(app.show_id);
        }
    }

    let mut results: Vec<YearCount> = shows_by_year
        .into_iter()
        .map(|(year, shows)| YearCount {
            year,
            count: shows.len() as i64,
        })
        .collect();

    results.sort_by(|a, b| b.year.cmp(&a.year));
    results
}

// ==================== SHOW ID LOOKUPS ====================

/// Get unique show IDs for a specific song.
///
/// Filters setlist entries by song_id and returns deduplicated show IDs.
pub fn get_show_ids_for_song(entries: &[DexieSetlistEntry], song_id: i64) -> Vec<i64> {
    // Pre-allocate for ~500 shows (popular songs played at many shows)
    let mut show_ids: HashSet<i64> = HashSet::with_capacity(500);
    for entry in entries {
        if entry.song_id == song_id {
            show_ids.insert(entry.show_id);
        }
    }

    show_ids.into_iter().collect()
}

/// Get unique show IDs for a specific guest.
///
/// Filters guest appearances by guest_id and returns deduplicated show IDs.
pub fn get_show_ids_for_guest(appearances: &[DexieGuestAppearance], guest_id: i64) -> Vec<i64> {
    // Pre-allocate for ~200 shows (frequent guests)
    let mut show_ids: HashSet<i64> = HashSet::with_capacity(200);
    for app in appearances {
        if app.guest_id == guest_id {
            show_ids.insert(app.show_id);
        }
    }

    show_ids.into_iter().collect()
}

// ==================== GLOBAL STATISTICS ====================

/// Calculate global statistics from all entities.
pub fn calculate_global_stats(
    shows: &[DexieShow],
    songs: &[DexieSong],
    venues: &[DexieVenue],
    tours: &[DexieTour],
    guests: &[DexieGuest],
    entries: &[DexieSetlistEntry],
) -> GlobalStats {
    let mut min_year = i64::MAX;
    let mut max_year = i64::MIN;

    for show in shows {
        if show.year > 0 {
            min_year = min_year.min(show.year);
            max_year = max_year.max(show.year);
        }
    }

    let year_range = if min_year <= max_year {
        Some((min_year, max_year))
    } else {
        None
    };

    // Count unique songs actually played
    let mut unique_songs: HashSet<i64> = HashSet::with_capacity(1300); // ~1,300 unique songs
    for entry in entries {
        unique_songs.insert(entry.song_id);
    }

    GlobalStats {
        total_shows: shows.len() as i64,
        total_songs: songs.len() as i64,
        total_venues: venues.len() as i64,
        total_tours: tours.len() as i64,
        total_guests: guests.len() as i64,
        total_setlist_entries: entries.len() as i64,
        year_range,
        total_unique_songs_played: unique_songs.len() as i64,
    }
}

// ==================== BATCH AGGREGATION TYPES ====================

/// Batch statistics for a single year, computed in one WASM call.
/// Reduces JS/WASM boundary crossings by computing multiple statistics together.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct YearlyBatchStats {
    pub year: i64,
    pub show_count: usize,
    pub unique_songs: usize,
    pub unique_venues: usize,
    pub opener_counts: HashMap<String, usize>,
    pub closer_counts: HashMap<String, usize>,
    pub encore_counts: HashMap<String, usize>,
}

/// Batch statistics for a single song, computed in one WASM call.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SongBatchStats {
    pub song_id: i64,
    pub total_plays: usize,
    pub years_played: Vec<i64>,
    pub venues_played: usize,
    pub first_played: Option<String>,
    pub last_played: Option<String>,
    pub opener_count: usize,
    pub closer_count: usize,
    pub encore_count: usize,
}

// ==================== BATCH AGGREGATION FUNCTIONS ====================

/// Compute all yearly statistics in a single pass.
///
/// This function reduces JS/WASM boundary crossings by computing
/// show count, unique songs, unique venues, and opener/closer/encore
/// counts all at once.
///
/// # Arguments
/// * `shows` - Slice of DexieShow objects
/// * `entries` - Slice of DexieSetlistEntry objects
/// * `year` - The year to compute statistics for
///
/// # Returns
/// * `YearlyBatchStats` - All yearly statistics in one struct
pub fn compute_yearly_batch_stats(
    shows: &[DexieShow],
    entries: &[DexieSetlistEntry],
    year: i64,
) -> YearlyBatchStats {
    // Filter shows for the specified year
    let year_shows: Vec<&DexieShow> = shows.iter()
        .filter(|s| s.year == year)
        .collect();

    let show_ids: HashSet<i64> = year_shows.iter().map(|s| s.id).collect();

    // Filter entries for year's shows
    let year_entries: Vec<&DexieSetlistEntry> = entries.iter()
        .filter(|e| show_ids.contains(&e.show_id))
        .collect();

    // Compute all stats in single pass
    let mut unique_songs: HashSet<i64> = HashSet::with_capacity(200); // ~200 unique songs per year
    let mut unique_venues: HashSet<i64> = HashSet::with_capacity(100); // ~100 unique venues per year
    // Use &str references to avoid cloning song titles until final output
    let mut opener_counts_ref: HashMap<&str, usize> = HashMap::with_capacity(50); // ~50 unique openers
    let mut closer_counts_ref: HashMap<&str, usize> = HashMap::with_capacity(50); // ~50 unique closers
    let mut encore_counts_ref: HashMap<&str, usize> = HashMap::with_capacity(80); // ~80 unique encores

    // Collect unique venues from shows
    for show in &year_shows {
        unique_venues.insert(show.venue_id);
    }

    // Process all entries for song stats - use references to avoid cloning
    for entry in &year_entries {
        unique_songs.insert(entry.song_id);

        let song_title: &str = &entry.song.title;

        match entry.slot {
            SlotType::Opener => {
                *opener_counts_ref.entry(song_title).or_insert(0) += 1;
            }
            SlotType::Closer => {
                // Check if this is an encore set - encores go in encore_counts
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => {
                        *encore_counts_ref.entry(song_title).or_insert(0) += 1;
                    }
                    _ => {
                        *closer_counts_ref.entry(song_title).or_insert(0) += 1;
                    }
                }
            }
            SlotType::Standard => {
                // Standard slots in encore sets also count as encores
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => {
                        *encore_counts_ref.entry(song_title).or_insert(0) += 1;
                    }
                    _ => {}
                }
            }
        }
    }

    // Convert &str keys to owned String only at the end for JSON serialization
    let opener_counts: HashMap<String, usize> = opener_counts_ref.into_iter().map(|(k, v)| (k.to_string(), v)).collect();
    let closer_counts: HashMap<String, usize> = closer_counts_ref.into_iter().map(|(k, v)| (k.to_string(), v)).collect();
    let encore_counts: HashMap<String, usize> = encore_counts_ref.into_iter().map(|(k, v)| (k.to_string(), v)).collect();

    YearlyBatchStats {
        year,
        show_count: year_shows.len(),
        unique_songs: unique_songs.len(),
        unique_venues: unique_venues.len(),
        opener_counts,
        closer_counts,
        encore_counts,
    }
}

/// Compute all statistics for a single song in one pass.
///
/// This function reduces JS/WASM boundary crossings by computing
/// total plays, years played, venues, first/last played dates,
/// and opener/closer/encore counts all at once.
///
/// # Arguments
/// * `entries` - Slice of DexieSetlistEntry objects
/// * `shows` - Slice of DexieShow objects
/// * `song_id` - The song ID to compute statistics for
///
/// # Returns
/// * `SongBatchStats` - All song statistics in one struct
pub fn compute_song_batch_stats(
    entries: &[DexieSetlistEntry],
    shows: &[DexieShow],
    song_id: i64,
) -> SongBatchStats {
    // Build show lookup map
    let mut show_map: HashMap<i64, &DexieShow> = HashMap::with_capacity(shows.len());
    for show in shows {
        show_map.insert(show.id, show);
    }

    // Filter entries for this song
    let song_entries: Vec<&DexieSetlistEntry> = entries.iter()
        .filter(|e| e.song_id == song_id)
        .collect();

    let mut years: HashSet<i64> = HashSet::with_capacity(40); // ~40 years of touring
    let mut venues: HashSet<i64> = HashSet::with_capacity(200); // ~200 venues for popular songs
    // PERF: Track only min/max dates instead of collecting all dates and sorting
    // Avoids Vec allocation and O(n log n) sort for songs with 1000+ plays
    let mut first_date: Option<&str> = None;
    let mut last_date: Option<&str> = None;
    let mut opener_count: usize = 0;
    let mut closer_count: usize = 0;
    let mut encore_count: usize = 0;

    for entry in &song_entries {
        // Get show info for this entry
        if let Some(show) = show_map.get(&entry.show_id) {
            // PERF: Track min/max inline instead of collecting + sorting
            let date = show.date.as_str();
            if first_date.map_or(true, |d| date < d) {
                first_date = Some(date);
            }
            if last_date.map_or(true, |d| date > d) {
                last_date = Some(date);
            }
            years.insert(show.year);
            venues.insert(show.venue_id);
        }

        // Count slot types
        match entry.slot {
            SlotType::Opener => opener_count += 1,
            SlotType::Closer => {
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => encore_count += 1,
                    _ => closer_count += 1,
                }
            }
            SlotType::Standard => {
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => encore_count += 1,
                    _ => {}
                }
            }
        }
    }

    // PERF: Already tracked min/max dates inline - no sort needed
    let mut years_vec: Vec<i64> = years.into_iter().collect();
    years_vec.sort_unstable(); // PERF: unstable sort is faster for integers

    SongBatchStats {
        song_id,
        total_plays: song_entries.len(),
        years_played: years_vec,
        venues_played: venues.len(),
        first_played: first_date.map(|s| s.to_string()),
        last_played: last_date.map(|s| s.to_string()),
        opener_count,
        closer_count,
        encore_count,
    }
}

// ==================== TOP-K OPTIMIZATION ====================

/// A wrapper for SongWithCount that implements Ord for min-heap behavior.
/// We want a min-heap because we're building a top-K structure where we
/// evict the smallest element when the heap exceeds K.
#[derive(Debug, Clone, Eq, PartialEq)]
struct MinHeapEntry {
    song_id: i64,
    count: i64,
}

impl Ord for MinHeapEntry {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse comparison for min-heap behavior (smallest count at top)
        other.count.cmp(&self.count)
    }
}

impl PartialOrd for MinHeapEntry {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// Get top K entries from a HashMap using a min-heap for O(n log k) complexity.
/// This is more efficient than sorting the entire HashMap when k << n.
fn top_k_from_counts(counts: HashMap<i64, i64>, k: usize) -> Vec<SongWithCount> {
    if k == 0 {
        return Vec::new();
    }

    let mut heap: BinaryHeap<MinHeapEntry> = BinaryHeap::with_capacity(k + 1);

    for (song_id, count) in counts {
        heap.push(MinHeapEntry { song_id, count });

        // If heap exceeds k, remove the smallest (which is at the top of our min-heap)
        if heap.len() > k {
            heap.pop();
        }
    }

    // Extract results and sort by count descending
    let mut results: Vec<SongWithCount> = heap
        .into_iter()
        .map(|e| SongWithCount {
            song_id: e.song_id,
            count: e.count,
        })
        .collect();

    results.sort_by(|a, b| b.count.cmp(&a.count));
    results
}

// ==================== COMBINED TOP SLOT SONGS ====================

/// Combined result for all three slot types (opener, closer, encore).
/// Fetching all three in a single pass reduces IndexedDB queries from 3 to 1.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TopSlotSongsCombined {
    pub top_openers: Vec<SongWithCount>,
    pub top_closers: Vec<SongWithCount>,
    pub top_encores: Vec<SongWithCount>,
}

/// Get top songs for all slot types in a single pass over the data.
///
/// This function reduces IndexedDB queries from 3 to 1 by computing
/// opener, closer, and encore counts simultaneously.
///
/// # Performance
/// - Single pass over entries: O(n)
/// - Top-K extraction using min-heap: O(n log k) per slot type
/// - Total: O(n + 3 * n log k) ≈ O(n) for small k
///
/// # Arguments
/// * `entries` - Slice of DexieSetlistEntry objects
/// * `limit` - Maximum number of songs to return per slot type
///
/// # Returns
/// * `TopSlotSongsCombined` - Top songs for each slot type
pub fn get_top_slot_songs_combined(
    entries: &[DexieSetlistEntry],
    limit: usize,
) -> TopSlotSongsCombined {
    // Pre-allocate hashmaps with expected capacities
    let mut opener_counts: HashMap<i64, i64> = HashMap::with_capacity(100);
    let mut closer_counts: HashMap<i64, i64> = HashMap::with_capacity(100);
    let mut encore_counts: HashMap<i64, i64> = HashMap::with_capacity(150);

    // Single pass over all entries
    for entry in entries {
        match entry.slot {
            SlotType::Opener => {
                *opener_counts.entry(entry.song_id).or_insert(0) += 1;
            }
            SlotType::Closer => {
                // Closers in encore sets count as encores, not closers
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => {
                        *encore_counts.entry(entry.song_id).or_insert(0) += 1;
                    }
                    _ => {
                        *closer_counts.entry(entry.song_id).or_insert(0) += 1;
                    }
                }
            }
            SlotType::Standard => {
                // Standard entries in encore sets count as encores
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => {
                        *encore_counts.entry(entry.song_id).or_insert(0) += 1;
                    }
                    _ => {}
                }
            }
        }
    }

    // Use top-K extraction with min-heap for O(n log k) instead of O(n log n)
    TopSlotSongsCombined {
        top_openers: top_k_from_counts(opener_counts, limit),
        top_closers: top_k_from_counts(closer_counts, limit),
        top_encores: top_k_from_counts(encore_counts, limit),
    }
}

/// Get top songs for all slot types, filtered by year.
///
/// Same as `get_top_slot_songs_combined` but filters by a specific year.
/// Pass year=0 to include all years.
pub fn get_top_slot_songs_combined_by_year(
    entries: &[DexieSetlistEntry],
    year: i64,
    limit: usize,
) -> TopSlotSongsCombined {
    // Pre-allocate hashmaps
    let mut opener_counts: HashMap<i64, i64> = HashMap::with_capacity(50);
    let mut closer_counts: HashMap<i64, i64> = HashMap::with_capacity(50);
    let mut encore_counts: HashMap<i64, i64> = HashMap::with_capacity(80);

    // Single pass over all entries, filtering by year
    for entry in entries {
        // Skip if year filter is set and doesn't match
        if year != 0 && entry.year != year {
            continue;
        }

        match entry.slot {
            SlotType::Opener => {
                *opener_counts.entry(entry.song_id).or_insert(0) += 1;
            }
            SlotType::Closer => {
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => {
                        *encore_counts.entry(entry.song_id).or_insert(0) += 1;
                    }
                    _ => {
                        *closer_counts.entry(entry.song_id).or_insert(0) += 1;
                    }
                }
            }
            SlotType::Standard => {
                match entry.set_name {
                    SetType::Encore | SetType::Encore2 => {
                        *encore_counts.entry(entry.song_id).or_insert(0) += 1;
                    }
                    _ => {}
                }
            }
        }
    }

    TopSlotSongsCombined {
        top_openers: top_k_from_counts(opener_counts, limit),
        top_closers: top_k_from_counts(closer_counts, limit),
        top_encores: top_k_from_counts(encore_counts, limit),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_show(id: i64, year: i64, venue_id: i64) -> DexieShow {
        DexieShow {
            id,
            date: format!("{}-07-04", year),
            venue_id,
            tour_id: 1,
            notes: None,
            soundcheck: None,
            attendance_count: None,
            rarity_index: None,
            song_count: 20,
            venue: EmbeddedVenue {
                id: venue_id,
                name: "Test Venue".to_string(),
                city: "Test City".to_string(),
                state: Some("NY".to_string()),
                country: "USA".to_string(),
                country_code: Some("US".to_string()),
                venue_type: None,
                capacity: None,
                total_shows: 10,
            },
            tour: EmbeddedTour {
                id: 1,
                name: "Test Tour".to_string(),
                year,
                start_date: None,
                end_date: None,
                total_shows: 50,
            },
            year,
        }
    }

    fn make_test_entry(id: i64, show_id: i64, song_id: i64, year: i64, slot: SlotType) -> DexieSetlistEntry {
        DexieSetlistEntry {
            id,
            show_id,
            song_id,
            position: 1,
            set_name: SetType::Set1,
            slot,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: false,
            is_tease: false,
            tease_of_song_id: None,
            notes: None,
            song: EmbeddedSong {
                id: song_id,
                title: "Test Song".to_string(),
                slug: "test-song".to_string(),
                is_cover: false,
                total_performances: 100,
                opener_count: 10,
                closer_count: 5,
                encore_count: 20,
            },
            show_date: format!("{}-07-04", year),
            year,
        }
    }

    #[test]
    fn test_aggregate_shows_by_year() {
        let shows = vec![
            make_test_show(1, 2022, 1),
            make_test_show(2, 2022, 2),
            make_test_show(3, 2023, 1),
        ];

        let result = aggregate_shows_by_year(&shows);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].year, 2022);
        assert_eq!(result[0].count, 2);
        assert_eq!(result[1].year, 2023);
        assert_eq!(result[1].count, 1);
    }

    #[test]
    fn test_count_openers_by_year() {
        let entries = vec![
            make_test_entry(1, 1, 100, 2023, SlotType::Opener),
            make_test_entry(2, 2, 100, 2023, SlotType::Opener),
            make_test_entry(3, 3, 200, 2023, SlotType::Opener),
            make_test_entry(4, 4, 100, 2022, SlotType::Opener), // Different year
        ];

        let result = count_openers_by_year(&entries, 2023);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].song_id, 100);
        assert_eq!(result[0].count, 2);
        assert_eq!(result[1].song_id, 200);
        assert_eq!(result[1].count, 1);
    }

    #[test]
    fn test_get_year_breakdown_for_song() {
        let entries = vec![
            make_test_entry(1, 1, 100, 2022, SlotType::Standard),
            make_test_entry(2, 2, 100, 2022, SlotType::Standard),
            make_test_entry(3, 3, 100, 2023, SlotType::Standard),
            make_test_entry(4, 4, 200, 2023, SlotType::Standard), // Different song
        ];

        let result = get_year_breakdown_for_song(&entries, 100);
        assert_eq!(result.len(), 2);
        // Sorted by year descending
        assert_eq!(result[0].year, 2023);
        assert_eq!(result[0].count, 1);
        assert_eq!(result[1].year, 2022);
        assert_eq!(result[1].count, 2);
    }

    fn make_test_show_with_state(id: i64, year: i64, venue_id: i64, state: &str) -> DexieShow {
        DexieShow {
            id,
            date: format!("{}-07-04", year),
            venue_id,
            tour_id: 1,
            notes: None,
            soundcheck: None,
            attendance_count: None,
            rarity_index: None,
            song_count: 20,
            venue: EmbeddedVenue {
                id: venue_id,
                name: "Test Venue".to_string(),
                city: "Test City".to_string(),
                state: Some(state.to_string()),
                country: "USA".to_string(),
                country_code: Some("US".to_string()),
                venue_type: None,
                capacity: None,
                total_shows: 10,
            },
            tour: EmbeddedTour {
                id: 1,
                name: "Test Tour".to_string(),
                year,
                start_date: None,
                end_date: None,
                total_shows: 50,
            },
            year,
        }
    }

    fn make_test_tour(id: i64, year: i64) -> DexieTour {
        DexieTour {
            id,
            name: format!("{} Tour", year),
            year,
            start_date: None,
            end_date: None,
            total_shows: 50,
            unique_songs_played: None,
            average_songs_per_show: None,
            rarity_index: None,
            search_text: format!("{} Tour", year).to_lowercase(),
        }
    }

    fn make_test_guest_appearance(id: i64, guest_id: i64, show_id: i64, year: i64) -> DexieGuestAppearance {
        DexieGuestAppearance {
            id,
            guest_id,
            show_id,
            setlist_entry_id: None,
            song_id: None,
            instruments: None,
            notes: None,
            show_date: format!("{}-07-04", year),
            year,
        }
    }

    #[test]
    fn test_get_tour_stats_by_year() {
        let shows = vec![
            make_test_show_with_state(1, 2023, 1, "NY"),
            make_test_show_with_state(2, 2023, 2, "CA"),
            make_test_show_with_state(3, 2023, 1, "NY"), // Same venue, same state
            make_test_show_with_state(4, 2022, 3, "TX"), // Different year
        ];

        let entries = vec![
            make_test_entry(1, 1, 100, 2023, SlotType::Standard),
            make_test_entry(2, 1, 200, 2023, SlotType::Standard),
            make_test_entry(3, 2, 100, 2023, SlotType::Standard), // Same song different show
            make_test_entry(4, 2, 300, 2023, SlotType::Standard),
            make_test_entry(5, 4, 400, 2022, SlotType::Standard), // Different year
        ];

        let result = get_tour_stats_by_year(&shows, &entries, 2023);

        assert_eq!(result.year, 2023);
        assert_eq!(result.show_count, 3);
        assert_eq!(result.unique_venues, 2); // Venues 1 and 2
        assert_eq!(result.unique_states, 2); // NY and CA
        assert_eq!(result.unique_songs, 3);  // Songs 100, 200, 300
    }

    #[test]
    fn test_get_tours_grouped_by_decade() {
        let tours = vec![
            make_test_tour(1, 1991),
            make_test_tour(2, 1995),
            make_test_tour(3, 2000),
            make_test_tour(4, 2005),
            make_test_tour(5, 2010),
            make_test_tour(6, 2023),
        ];

        // Function takes ownership to avoid cloning in hot loop
        let result = get_tours_grouped_by_decade(tours);

        assert_eq!(result.len(), 4); // 1990s, 2000s, 2010s, 2020s

        assert_eq!(result.get(&1990).unwrap().len(), 2); // 1991, 1995
        assert_eq!(result.get(&2000).unwrap().len(), 2); // 2000, 2005
        assert_eq!(result.get(&2010).unwrap().len(), 1); // 2010
        assert_eq!(result.get(&2020).unwrap().len(), 1); // 2023
    }

    #[test]
    fn test_get_year_breakdown_for_guest() {
        let appearances = vec![
            make_test_guest_appearance(1, 1, 100, 2022),
            make_test_guest_appearance(2, 1, 100, 2022), // Same show, should dedupe
            make_test_guest_appearance(3, 1, 101, 2022), // Different show, same year
            make_test_guest_appearance(4, 1, 200, 2023),
            make_test_guest_appearance(5, 2, 300, 2023), // Different guest
        ];

        let result = get_year_breakdown_for_guest(&appearances, 1);

        assert_eq!(result.len(), 2);
        // Sorted by year descending
        assert_eq!(result[0].year, 2023);
        assert_eq!(result[0].count, 1); // 1 unique show in 2023
        assert_eq!(result[1].year, 2022);
        assert_eq!(result[1].count, 2); // 2 unique shows in 2022 (show 100 deduplicated)
    }

    fn make_test_entry_with_set(
        id: i64,
        show_id: i64,
        song_id: i64,
        year: i64,
        slot: SlotType,
        set_name: SetType,
    ) -> DexieSetlistEntry {
        DexieSetlistEntry {
            id,
            show_id,
            song_id,
            position: 1,
            set_name,
            slot,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: false,
            is_tease: false,
            tease_of_song_id: None,
            notes: None,
            song: EmbeddedSong {
                id: song_id,
                title: "Test Song".to_string(),
                slug: "test-song".to_string(),
                is_cover: false,
                total_performances: 100,
                opener_count: 10,
                closer_count: 5,
                encore_count: 20,
            },
            show_date: format!("{}-07-04", year),
            year,
        }
    }

    #[test]
    fn test_count_encores_by_year() {
        let entries = vec![
            make_test_entry_with_set(1, 1, 100, 2023, SlotType::Standard, SetType::Encore),
            make_test_entry_with_set(2, 2, 100, 2023, SlotType::Standard, SetType::Encore),
            make_test_entry_with_set(3, 3, 200, 2023, SlotType::Standard, SetType::Encore2),
            make_test_entry_with_set(4, 4, 100, 2023, SlotType::Standard, SetType::Set1), // Not encore
            make_test_entry_with_set(5, 5, 300, 2022, SlotType::Standard, SetType::Encore), // Different year
        ];

        let result = count_encores_by_year(&entries, 2023);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].song_id, 100);
        assert_eq!(result[0].count, 2); // Song 100 in Encore twice
        assert_eq!(result[1].song_id, 200);
        assert_eq!(result[1].count, 1); // Song 200 in Encore2 once
    }

    #[test]
    fn test_get_show_ids_for_song() {
        let entries = vec![
            make_test_entry(1, 100, 1, 2023, SlotType::Standard),
            make_test_entry(2, 101, 1, 2023, SlotType::Standard),
            make_test_entry(3, 100, 1, 2023, SlotType::Standard), // Same show_id, should dedupe
            make_test_entry(4, 102, 2, 2023, SlotType::Standard), // Different song
        ];

        let result = get_show_ids_for_song(&entries, 1);
        assert_eq!(result.len(), 2); // Shows 100 and 101 (100 deduplicated)
        assert!(result.contains(&100));
        assert!(result.contains(&101));
    }

    #[test]
    fn test_get_show_ids_for_guest() {
        let appearances = vec![
            make_test_guest_appearance(1, 1, 100, 2022),
            make_test_guest_appearance(2, 1, 101, 2022),
            make_test_guest_appearance(3, 1, 100, 2022), // Same show, should dedupe
            make_test_guest_appearance(4, 2, 200, 2023), // Different guest
        ];

        let result = get_show_ids_for_guest(&appearances, 1);
        assert_eq!(result.len(), 2); // Shows 100 and 101 (100 deduplicated)
        assert!(result.contains(&100));
        assert!(result.contains(&101));
    }

    #[test]
    fn test_top_k_from_counts() {
        let mut counts: HashMap<i64, i64> = HashMap::new();
        counts.insert(1, 100);
        counts.insert(2, 50);
        counts.insert(3, 200);
        counts.insert(4, 75);
        counts.insert(5, 25);

        let result = top_k_from_counts(counts, 3);
        assert_eq!(result.len(), 3);
        assert_eq!(result[0].song_id, 3); // 200 - highest
        assert_eq!(result[0].count, 200);
        assert_eq!(result[1].song_id, 1); // 100 - second
        assert_eq!(result[1].count, 100);
        assert_eq!(result[2].song_id, 4); // 75 - third
        assert_eq!(result[2].count, 75);
    }

    #[test]
    fn test_top_k_with_limit_larger_than_data() {
        let mut counts: HashMap<i64, i64> = HashMap::new();
        counts.insert(1, 100);
        counts.insert(2, 50);

        let result = top_k_from_counts(counts, 10); // Limit > data size
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_top_k_empty() {
        let counts: HashMap<i64, i64> = HashMap::new();
        let result = top_k_from_counts(counts, 5);
        assert_eq!(result.len(), 0);
    }

    fn make_test_entry_with_song_title(
        id: i64,
        show_id: i64,
        song_id: i64,
        year: i64,
        slot: SlotType,
        set_name: SetType,
        title: &str,
    ) -> DexieSetlistEntry {
        DexieSetlistEntry {
            id,
            show_id,
            song_id,
            position: 1,
            set_name,
            slot,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: false,
            is_tease: false,
            tease_of_song_id: None,
            notes: None,
            song: EmbeddedSong {
                id: song_id,
                title: title.to_string(),
                slug: "test-song".to_string(),
                is_cover: false,
                total_performances: 100,
                opener_count: 10,
                closer_count: 5,
                encore_count: 20,
            },
            show_date: format!("{}-07-04", year),
            year,
        }
    }

    #[test]
    fn test_get_top_slot_songs_combined() {
        let entries = vec![
            // Openers
            make_test_entry_with_song_title(1, 1, 100, 2023, SlotType::Opener, SetType::Set1, "Opener Song A"),
            make_test_entry_with_song_title(2, 2, 100, 2023, SlotType::Opener, SetType::Set1, "Opener Song A"),
            make_test_entry_with_song_title(3, 3, 101, 2023, SlotType::Opener, SetType::Set1, "Opener Song B"),
            // Closers (not encores)
            make_test_entry_with_song_title(4, 1, 200, 2023, SlotType::Closer, SetType::Set1, "Closer Song A"),
            make_test_entry_with_song_title(5, 2, 200, 2023, SlotType::Closer, SetType::Set2, "Closer Song A"),
            // Encores (closers in encore set)
            make_test_entry_with_song_title(6, 1, 300, 2023, SlotType::Closer, SetType::Encore, "Encore Song A"),
            make_test_entry_with_song_title(7, 2, 300, 2023, SlotType::Closer, SetType::Encore, "Encore Song A"),
            make_test_entry_with_song_title(8, 3, 300, 2023, SlotType::Closer, SetType::Encore, "Encore Song A"),
            // Standard entry in encore set (also counts as encore)
            make_test_entry_with_song_title(9, 4, 301, 2023, SlotType::Standard, SetType::Encore2, "Encore Song B"),
        ];

        let result = get_top_slot_songs_combined(&entries, 5);

        // Check openers
        assert_eq!(result.top_openers.len(), 2);
        assert_eq!(result.top_openers[0].song_id, 100); // 2 plays
        assert_eq!(result.top_openers[0].count, 2);
        assert_eq!(result.top_openers[1].song_id, 101); // 1 play
        assert_eq!(result.top_openers[1].count, 1);

        // Check closers (excluding encores)
        assert_eq!(result.top_closers.len(), 1);
        assert_eq!(result.top_closers[0].song_id, 200); // 2 plays
        assert_eq!(result.top_closers[0].count, 2);

        // Check encores
        assert_eq!(result.top_encores.len(), 2);
        assert_eq!(result.top_encores[0].song_id, 300); // 3 plays
        assert_eq!(result.top_encores[0].count, 3);
        assert_eq!(result.top_encores[1].song_id, 301); // 1 play
        assert_eq!(result.top_encores[1].count, 1);
    }
}

// ==================== BATCH AGGREGATION FUNCTIONS ====================

/// Batch result for multi-field aggregation.
///
/// Contains aggregations computed in a single pass over the data:
/// - Total songs per year
/// - Unique songs per year
/// - Song performance counts
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchAggregationResult {
    pub by_year: Vec<YearCount>,
    pub unique_songs_by_year: Vec<YearCount>,
    pub by_song: Vec<SongWithCount>,
}

/// Count song performances and return parallel vectors sorted by count descending.
///
/// Returns two vectors in parallel: song IDs and their counts, both sorted
/// by count in descending order. This format enables efficient zero-copy transfer
/// to JavaScript typed arrays (BigInt64Array for IDs, Int32Array for counts).
///
/// # Arguments
/// * `entries` - Slice of setlist entries
///
/// # Returns
/// * Tuple of (song_ids, counts) both sorted by count descending
///
/// # Performance
/// ~20ms for 150,000 entries on Apple Silicon
///
/// # Example
/// ```
/// let (song_ids, counts) = batch_count_songs_typed(&entries);
/// assert_eq!(song_ids.len(), counts.len());
/// assert!(counts[0] >= counts[1]); // Sorted descending
/// ```
pub fn batch_count_songs_typed(entries: &[DexieSetlistEntry]) -> (Vec<i64>, Vec<i32>) {
    let mut counts: HashMap<i64, i32> = HashMap::with_capacity(1300); // ~1,300 unique songs

    // Count performances per song
    for entry in entries {
        *counts.entry(entry.song_id).or_insert(0) += 1;
    }

    // Convert to Vec and sort by count descending
    let mut pairs: Vec<(i64, i32)> = counts.into_iter().collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1)); // Sort by count descending

    // Split into parallel vectors
    let (song_ids, play_counts): (Vec<i64>, Vec<i32>) = pairs.into_iter().unzip();

    (song_ids, play_counts)
}

/// Perform multiple aggregations in a single pass over the data.
///
/// Computes three aggregations simultaneously:
/// 1. Total songs performed per year
/// 2. Unique songs performed per year
/// 3. Total performances per song (sorted by count descending)
///
/// This is more efficient than calling separate aggregation functions,
/// as it only iterates over the entries once.
///
/// # Arguments
/// * `entries` - Slice of setlist entries
///
/// # Returns
/// * BatchAggregationResult containing all three aggregations
///
/// # Performance
/// ~25ms for 150,000 entries on Apple Silicon (vs ~60ms for 3 separate calls)
///
/// # Example
/// ```
/// let result = batch_aggregate_multi_field(&entries);
/// println!("Shows in 2023: {}", result.by_year.iter().find(|y| y.year == 2023).unwrap().count);
/// println!("Top song: {} with {} plays", result.by_song[0].song_id, result.by_song[0].count);
/// ```
pub fn batch_aggregate_multi_field(entries: &[DexieSetlistEntry]) -> BatchAggregationResult {
    // Initialize data structures
    let mut year_counts: HashMap<i64, i64> = HashMap::with_capacity(40); // ~35 years
    let mut song_counts: HashMap<i64, i64> = HashMap::with_capacity(1300); // ~1,300 songs
    let mut unique_songs_by_year: HashMap<i64, HashSet<i64>> = HashMap::with_capacity(40);

    // Single pass over all entries
    for entry in entries {
        // Count total songs per year
        *year_counts.entry(entry.year).or_insert(0) += 1;

        // Count performances per song
        *song_counts.entry(entry.song_id).or_insert(0) += 1;

        // Track unique songs per year
        unique_songs_by_year
            .entry(entry.year)
            .or_default()
            .insert(entry.song_id);
    }

    // Convert year counts to sorted vector
    let mut by_year: Vec<YearCount> = year_counts
        .into_iter()
        .map(|(year, count)| YearCount { year, count })
        .collect();
    by_year.sort_by_key(|yc| yc.year);

    // Convert unique songs by year to sorted vector
    let mut unique_songs: Vec<YearCount> = unique_songs_by_year
        .into_iter()
        .map(|(year, songs)| YearCount {
            year,
            count: songs.len() as i64,
        })
        .collect();
    unique_songs.sort_by_key(|yc| yc.year);

    // Convert song counts to sorted vector (by count descending)
    let mut by_song: Vec<SongWithCount> = song_counts
        .into_iter()
        .map(|(song_id, count)| SongWithCount { song_id, count })
        .collect();
    by_song.sort_by(|a, b| b.count.cmp(&a.count));

    BatchAggregationResult {
        by_year,
        unique_songs_by_year: unique_songs,
        by_song,
    }
}

#[cfg(test)]
mod batch_aggregation_tests {
    use super::*;

    fn make_test_entry(id: i64, show_id: i64, song_id: i64, year: i64) -> DexieSetlistEntry {
        DexieSetlistEntry {
            id,
            show_id,
            song_id,
            position: 1,
            set_name: SetType::Set1,
            slot: SlotType::Standard,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: false,
            is_tease: false,
            tease_of_song_id: None,
            notes: None,
            song: EmbeddedSong {
                id: song_id,
                title: "Test Song".to_string(),
                slug: "test-song".to_string(),
                is_cover: false,
                total_performances: 100,
                opener_count: 10,
                closer_count: 5,
                encore_count: 20,
            },
            show_date: format!("{}-07-04", year),
            year,
        }
    }

    #[test]
    fn test_batch_count_songs_typed() {
        let entries = vec![
            make_test_entry(1, 1, 100, 2023),
            make_test_entry(2, 1, 100, 2023),
            make_test_entry(3, 1, 100, 2023),
            make_test_entry(4, 2, 101, 2023),
            make_test_entry(5, 2, 101, 2023),
            make_test_entry(6, 3, 102, 2023),
        ];

        let (song_ids, counts) = batch_count_songs_typed(&entries);

        assert_eq!(song_ids.len(), 3);
        assert_eq!(counts.len(), 3);

        // Should be sorted by count descending
        assert_eq!(song_ids[0], 100); // 3 plays
        assert_eq!(counts[0], 3);
        assert_eq!(song_ids[1], 101); // 2 plays
        assert_eq!(counts[1], 2);
        assert_eq!(song_ids[2], 102); // 1 play
        assert_eq!(counts[2], 1);
    }

    #[test]
    fn test_batch_count_songs_typed_empty() {
        let entries: Vec<DexieSetlistEntry> = vec![];
        let (song_ids, counts) = batch_count_songs_typed(&entries);

        assert_eq!(song_ids.len(), 0);
        assert_eq!(counts.len(), 0);
    }

    #[test]
    fn test_batch_aggregate_multi_field() {
        let entries = vec![
            // 2023: 4 songs total, 2 unique (100, 101)
            make_test_entry(1, 1, 100, 2023),
            make_test_entry(2, 1, 100, 2023),
            make_test_entry(3, 1, 101, 2023),
            make_test_entry(4, 1, 101, 2023),
            // 2024: 3 songs total, 2 unique (100, 102)
            make_test_entry(5, 2, 100, 2024),
            make_test_entry(6, 2, 100, 2024),
            make_test_entry(7, 2, 102, 2024),
        ];

        let result = batch_aggregate_multi_field(&entries);

        // Check by_year
        assert_eq!(result.by_year.len(), 2);
        assert_eq!(result.by_year[0].year, 2023);
        assert_eq!(result.by_year[0].count, 4);
        assert_eq!(result.by_year[1].year, 2024);
        assert_eq!(result.by_year[1].count, 3);

        // Check unique_songs_by_year
        assert_eq!(result.unique_songs_by_year.len(), 2);
        assert_eq!(result.unique_songs_by_year[0].year, 2023);
        assert_eq!(result.unique_songs_by_year[0].count, 2); // songs 100, 101
        assert_eq!(result.unique_songs_by_year[1].year, 2024);
        assert_eq!(result.unique_songs_by_year[1].count, 2); // songs 100, 102

        // Check by_song (sorted by count descending)
        assert_eq!(result.by_song.len(), 3);
        assert_eq!(result.by_song[0].song_id, 100); // 4 plays (2 in 2023, 2 in 2024)
        assert_eq!(result.by_song[0].count, 4);
        assert_eq!(result.by_song[1].song_id, 101); // 2 plays
        assert_eq!(result.by_song[1].count, 2);
        assert_eq!(result.by_song[2].song_id, 102); // 1 play
        assert_eq!(result.by_song[2].count, 1);
    }

    #[test]
    fn test_batch_aggregate_multi_field_empty() {
        let entries: Vec<DexieSetlistEntry> = vec![];
        let result = batch_aggregate_multi_field(&entries);

        assert_eq!(result.by_year.len(), 0);
        assert_eq!(result.unique_songs_by_year.len(), 0);
        assert_eq!(result.by_song.len(), 0);
    }

    #[test]
    fn test_batch_aggregate_multi_field_single_year() {
        let entries = vec![
            make_test_entry(1, 1, 100, 2023),
            make_test_entry(2, 1, 101, 2023),
            make_test_entry(3, 1, 100, 2023),
        ];

        let result = batch_aggregate_multi_field(&entries);

        assert_eq!(result.by_year.len(), 1);
        assert_eq!(result.by_year[0].year, 2023);
        assert_eq!(result.by_year[0].count, 3);

        assert_eq!(result.unique_songs_by_year.len(), 1);
        assert_eq!(result.unique_songs_by_year[0].count, 2); // songs 100, 101

        assert_eq!(result.by_song.len(), 2);
        assert_eq!(result.by_song[0].count, 2); // song 100 with 2 plays
        assert_eq!(result.by_song[1].count, 1); // song 101 with 1 play
    }
}
