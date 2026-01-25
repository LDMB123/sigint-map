//! Aggregation module for computing statistics across large datasets.
//!
//! These operations replace multiple JavaScript Map/Set operations with
//! single-pass Rust algorithms using FxHashMap for fast integer hashing.

use crate::types::*;
use rustc_hash::{FxHashMap, FxHashSet};

// ==================== SHOW AGGREGATIONS ====================

/// Aggregate shows by year
///
/// Returns a sorted list of (year, count) pairs.
pub fn aggregate_shows_by_year(shows: &[DexieShow]) -> Vec<YearCount> {
    let mut counts: FxHashMap<u16, u32> = FxHashMap::default();
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

/// Get shows grouped by year (returns show IDs per year)
pub fn group_shows_by_year(shows: &[DexieShow]) -> FxHashMap<u16, Vec<u32>> {
    let mut groups: FxHashMap<u16, Vec<u32>> = FxHashMap::default();

    for show in shows {
        groups.entry(show.year).or_default().push(show.id);
    }

    groups
}

// ==================== SETLIST AGGREGATIONS ====================

/// Count song performances (total plays per song)
pub fn count_song_performances(entries: &[DexieSetlistEntry]) -> FxHashMap<u32, u32> {
    let mut counts: FxHashMap<u32, u32> = FxHashMap::default();

    for entry in entries {
        *counts.entry(entry.song_id).or_insert(0) += 1;
    }

    counts
}

/// Get top N songs by performance count
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

/// Count openers by year
pub fn count_openers_by_year(
    entries: &[DexieSetlistEntry],
    year: u16,
) -> Vec<SongWithCount> {
    let mut counts: FxHashMap<u32, u32> = FxHashMap::default();

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

/// Count closers by year (excluding encores)
pub fn count_closers_by_year(
    entries: &[DexieSetlistEntry],
    year: u16,
) -> Vec<SongWithCount> {
    let mut counts: FxHashMap<u32, u32> = FxHashMap::default();

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

/// Count encore songs by year
pub fn count_encores_by_year(
    entries: &[DexieSetlistEntry],
    year: u16,
) -> Vec<SongWithCount> {
    let mut counts: FxHashMap<u32, u32> = FxHashMap::default();

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

/// Get year breakdown for a specific song
pub fn get_year_breakdown_for_song(
    entries: &[DexieSetlistEntry],
    song_id: u32,
) -> Vec<YearCount> {
    let mut counts: FxHashMap<u16, u32> = FxHashMap::default();

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

/// Calculate venue statistics
pub fn calculate_venue_stats(venues: &[DexieVenue]) -> VenueStats {
    let mut total_shows = 0u32;
    let mut states: FxHashSet<&str> = FxHashSet::default();
    let mut countries: FxHashSet<&str> = FxHashSet::default();

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
        total_venues: venues.len() as u32,
        total_shows,
        unique_states: states.len() as u32,
        unique_countries: countries.len() as u32,
    }
}

/// Get year breakdown for a venue (shows per year)
pub fn get_year_breakdown_for_venue(
    shows: &[DexieShow],
    venue_id: u32,
) -> Vec<YearCount> {
    let mut counts: FxHashMap<u16, u32> = FxHashMap::default();

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

/// Calculate tour statistics for a specific year
pub fn calculate_tour_stats_for_year(
    shows: &[DexieShow],
    entries: &[DexieSetlistEntry],
    year: u16,
) -> TourYearStats {
    // Filter shows for this year
    let year_shows: Vec<&DexieShow> = shows.iter().filter(|s| s.year == year).collect();

    // Collect unique venues and states
    let mut venue_ids: FxHashSet<u32> = FxHashSet::default();
    let mut states: FxHashSet<&str> = FxHashSet::default();

    for show in &year_shows {
        venue_ids.insert(show.venue_id);
        if let Some(ref state) = show.venue.state {
            if !state.is_empty() {
                states.insert(state);
            }
        }
    }

    // Get show IDs for this year
    let show_ids: FxHashSet<u32> = year_shows.iter().map(|s| s.id).collect();

    // Count unique songs
    let mut song_ids: FxHashSet<u32> = FxHashSet::default();
    for entry in entries {
        if show_ids.contains(&entry.show_id) {
            song_ids.insert(entry.song_id);
        }
    }

    TourYearStats {
        year,
        show_count: year_shows.len() as u32,
        unique_venues: venue_ids.len() as u32,
        unique_states: states.len() as u32,
        unique_songs: song_ids.len() as u32,
    }
}

// ==================== GUEST AGGREGATIONS ====================

/// Get year breakdown for a guest (unique shows per year)
pub fn get_year_breakdown_for_guest(
    appearances: &[DexieGuestAppearance],
    guest_id: u32,
) -> Vec<YearCount> {
    // Use Set to count unique shows per year (guest may appear multiple times in one show)
    let mut shows_by_year: FxHashMap<u16, FxHashSet<u32>> = FxHashMap::default();

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
            count: shows.len() as u32,
        })
        .collect();

    results.sort_by(|a, b| b.year.cmp(&a.year));
    results
}

// ==================== GLOBAL STATISTICS ====================

/// Comprehensive statistics for the entire database
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalStats {
    pub total_shows: u32,
    pub total_songs: u32,
    pub total_venues: u32,
    pub total_tours: u32,
    pub total_guests: u32,
    pub total_setlist_entries: u32,
    pub year_range: Option<(u16, u16)>,
    pub total_unique_songs_played: u32,
}

/// Calculate global statistics from all entities
pub fn calculate_global_stats(
    shows: &[DexieShow],
    songs: &[DexieSong],
    venues: &[DexieVenue],
    tours: &[DexieTour],
    guests: &[DexieGuest],
    entries: &[DexieSetlistEntry],
) -> GlobalStats {
    let mut min_year = u16::MAX;
    let mut max_year = u16::MIN;

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
    let unique_songs: FxHashSet<u32> = entries.iter().map(|e| e.song_id).collect();

    GlobalStats {
        total_shows: shows.len() as u32,
        total_songs: songs.len() as u32,
        total_venues: venues.len() as u32,
        total_tours: tours.len() as u32,
        total_guests: guests.len() as u32,
        total_setlist_entries: entries.len() as u32,
        year_range,
        total_unique_songs_played: unique_songs.len() as u32,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_show(id: u32, year: u16, venue_id: u32) -> DexieShow {
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

    fn make_test_entry(id: u32, show_id: u32, song_id: u32, year: u16, slot: SlotType) -> DexieSetlistEntry {
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
}
