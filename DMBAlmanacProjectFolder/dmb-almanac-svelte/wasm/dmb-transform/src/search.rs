//! Global search module for cross-entity search functionality.
//!
//! Provides unified search across songs, venues, guests, and tours with
//! relevance scoring based on entity-specific metrics.
//!
//! # Performance
//! - Search across all entities: < 10ms for typical query
//! - Results are pre-sorted by score for immediate use

use crate::types::*;
use serde::Serialize;

// ==================== RESULT TYPES ====================

/// Search result with entity metadata and relevance score.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    /// Type of entity: "song", "venue", "guest", or "tour"
    /// PERF: Use &'static str instead of String - avoids allocation for every result
    pub entity_type: &'static str,
    /// Entity ID for lookup
    pub id: i64,
    /// Display title/name
    pub title: String,
    /// URL-friendly slug
    pub slug: String,
    /// Relevance score (higher is more relevant)
    /// Songs: totalPerformances, Venues: totalShows, Guests: totalAppearances, Tours: totalShows
    pub score: i64,
}

// ==================== SEARCH FUNCTIONS ====================

/// Perform case-insensitive substring search on songs.
///
/// Searches the `search_text` field and scores by `total_performances`.
#[inline]
fn search_songs(songs: &[DexieSong], query: &str) -> Vec<SearchResult> {
    let query_lower = query.to_lowercase();

    songs
        .iter()
        .filter(|song| song.search_text.contains(&query_lower))
        .map(|song| SearchResult {
            entity_type: "song", // PERF: Static str instead of String allocation
            id: song.id,
            title: song.title.clone(),
            slug: song.slug.clone(),
            score: song.total_performances,
        })
        .collect()
}

/// Perform case-insensitive substring search on venues.
///
/// Searches the `search_text` field and scores by `total_shows`.
#[inline]
fn search_venues(venues: &[DexieVenue], query: &str) -> Vec<SearchResult> {
    let query_lower = query.to_lowercase();

    venues
        .iter()
        .filter(|venue| venue.search_text.contains(&query_lower))
        .map(|venue| SearchResult {
            entity_type: "venue", // PERF: Static str instead of String allocation
            id: venue.id,
            title: venue.name.clone(),
            slug: generate_venue_slug(venue),
            score: venue.total_shows,
        })
        .collect()
}

/// Perform case-insensitive substring search on guests.
///
/// Searches the `search_text` field and scores by `total_appearances`.
#[inline]
fn search_guests(guests: &[DexieGuest], query: &str) -> Vec<SearchResult> {
    let query_lower = query.to_lowercase();

    guests
        .iter()
        .filter(|guest| guest.search_text.contains(&query_lower))
        .map(|guest| SearchResult {
            entity_type: "guest", // PERF: Static str instead of String allocation
            id: guest.id,
            title: guest.name.clone(),
            slug: guest.slug.clone(),
            score: guest.total_appearances,
        })
        .collect()
}

/// Perform case-insensitive substring search on tours.
///
/// Searches the `search_text` field and scores by `total_shows`.
#[inline]
fn search_tours(tours: &[DexieTour], query: &str) -> Vec<SearchResult> {
    let query_lower = query.to_lowercase();

    tours
        .iter()
        .filter(|tour| tour.search_text.contains(&query_lower))
        .map(|tour| SearchResult {
            entity_type: "tour", // PERF: Static str instead of String allocation
            id: tour.id,
            title: tour.name.clone(),
            slug: generate_tour_slug(tour),
            score: tour.total_shows,
        })
        .collect()
}

/// Generate a URL-friendly slug for a venue.
///
/// Venues don't have a pre-computed slug, so we generate one from the ID.
fn generate_venue_slug(venue: &DexieVenue) -> String {
    venue.id.to_string()
}

/// Generate a URL-friendly slug for a tour.
///
/// Tours don't have a pre-computed slug, so we generate one from the ID.
fn generate_tour_slug(tour: &DexieTour) -> String {
    tour.id.to_string()
}

/// Global search across songs, venues, guests, and tours.
///
/// Performs case-insensitive substring search on the `search_text` field
/// of each entity type. Results are scored by entity-specific metrics:
/// - Songs: totalPerformances
/// - Venues: totalShows
/// - Guests: totalAppearances
/// - Tours: totalShows
///
/// # Arguments
/// * `songs` - Slice of DexieSong objects
/// * `venues` - Slice of DexieVenue objects
/// * `guests` - Slice of DexieGuest objects
/// * `tours` - Slice of DexieTour objects
/// * `query` - Search query string
///
/// # Returns
/// Vec of SearchResult sorted by score descending
pub fn global_search(
    songs: &[DexieSong],
    venues: &[DexieVenue],
    guests: &[DexieGuest],
    tours: &[DexieTour],
    query: &str,
) -> Vec<SearchResult> {
    // Skip empty queries
    if query.trim().is_empty() {
        return Vec::new();
    }

    // Search each entity type - pre-allocate for typical result set
    let mut results: Vec<SearchResult> = Vec::with_capacity(100); // ~100 results typical
    results.extend(search_songs(songs, query));
    results.extend(search_venues(venues, query));
    results.extend(search_guests(guests, query));
    results.extend(search_tours(tours, query));

    // Sort by score descending
    results.sort_by(|a, b| b.score.cmp(&a.score));

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_song(id: i64, title: &str, performances: i64) -> DexieSong {
        let search_text = title.to_lowercase();
        DexieSong {
            id,
            title: title.to_string(),
            slug: title.to_lowercase().replace(' ', "-"),
            sort_title: title.to_string(),
            original_artist: None,
            is_cover: false,
            is_original: true,
            first_played_date: None,
            last_played_date: None,
            total_performances: performances,
            opener_count: 0,
            closer_count: 0,
            encore_count: 0,
            lyrics: None,
            notes: None,
            is_liberated: false,
            days_since_last_played: None,
            shows_since_last_played: None,
            search_text,
        }
    }

    fn make_test_venue(id: i64, name: &str, city: &str, shows: i64) -> DexieVenue {
        let search_text = format!("{} {}", name, city).to_lowercase();
        DexieVenue {
            id,
            name: name.to_string(),
            city: city.to_string(),
            state: Some("WA".to_string()),
            country: "USA".to_string(),
            country_code: "US".to_string(),
            venue_type: None,
            capacity: None,
            latitude: None,
            longitude: None,
            total_shows: shows,
            first_show_date: None,
            last_show_date: None,
            notes: None,
            search_text,
        }
    }

    fn make_test_guest(id: i64, name: &str, appearances: i64) -> DexieGuest {
        let search_text = name.to_lowercase();
        DexieGuest {
            id,
            name: name.to_string(),
            slug: name.to_lowercase().replace(' ', "-"),
            instruments: None,
            total_appearances: appearances,
            first_appearance_date: None,
            last_appearance_date: None,
            notes: None,
            search_text,
        }
    }

    fn make_test_tour(id: i64, name: &str, shows: i64) -> DexieTour {
        let search_text = name.to_lowercase();
        DexieTour {
            id,
            name: name.to_string(),
            year: 2024,
            start_date: None,
            end_date: None,
            total_shows: shows,
            unique_songs_played: None,
            average_songs_per_show: None,
            rarity_index: None,
            search_text,
        }
    }

    #[test]
    fn test_global_search_songs() {
        let songs = vec![
            make_test_song(1, "Ants Marching", 500),
            make_test_song(2, "Crash Into Me", 300),
            make_test_song(3, "Satellite", 400),
        ];
        let venues: Vec<DexieVenue> = vec![];
        let guests: Vec<DexieGuest> = vec![];
        let tours: Vec<DexieTour> = vec![];

        let results = global_search(&songs, &venues, &guests, &tours, "ant");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Ants Marching");
        assert_eq!(results[0].entity_type, "song");
        assert_eq!(results[0].score, 500);
    }

    #[test]
    fn test_global_search_venues() {
        let songs: Vec<DexieSong> = vec![];
        let venues = vec![
            make_test_venue(1, "The Gorge Amphitheatre", "George", 100),
            make_test_venue(2, "Red Rocks Amphitheatre", "Morrison", 80),
        ];
        let guests: Vec<DexieGuest> = vec![];
        let tours: Vec<DexieTour> = vec![];

        let results = global_search(&songs, &venues, &guests, &tours, "gorge");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "The Gorge Amphitheatre");
        assert_eq!(results[0].entity_type, "venue");
    }

    #[test]
    fn test_global_search_guests() {
        let songs: Vec<DexieSong> = vec![];
        let venues: Vec<DexieVenue> = vec![];
        let guests = vec![
            make_test_guest(1, "Tim Reynolds", 200),
            make_test_guest(2, "Bela Fleck", 50),
        ];
        let tours: Vec<DexieTour> = vec![];

        let results = global_search(&songs, &venues, &guests, &tours, "tim");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Tim Reynolds");
        assert_eq!(results[0].entity_type, "guest");
    }

    #[test]
    fn test_global_search_tours() {
        let songs: Vec<DexieSong> = vec![];
        let venues: Vec<DexieVenue> = vec![];
        let guests: Vec<DexieGuest> = vec![];
        let tours = vec![
            make_test_tour(1, "Summer 2024 Tour", 60),
            make_test_tour(2, "Fall 2024 Tour", 40),
        ];

        let results = global_search(&songs, &venues, &guests, &tours, "summer");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Summer 2024 Tour");
        assert_eq!(results[0].entity_type, "tour");
        assert_eq!(results[0].score, 60);
    }

    #[test]
    fn test_global_search_mixed_results() {
        let songs = vec![make_test_song(1, "Grey Street", 400)];
        let venues = vec![make_test_venue(1, "Grey Arena", "Greytown", 50)];
        let guests = vec![make_test_guest(1, "Grey Williams", 10)];
        let tours = vec![make_test_tour(1, "Grey Tour", 30)];

        let results = global_search(&songs, &venues, &guests, &tours, "grey");
        assert_eq!(results.len(), 4);
        // Should be sorted by score descending
        assert_eq!(results[0].score, 400); // song
        assert_eq!(results[1].score, 50); // venue
        assert_eq!(results[2].score, 30); // tour
        assert_eq!(results[3].score, 10); // guest
    }

    #[test]
    fn test_global_search_case_insensitive() {
        let songs = vec![make_test_song(1, "Ants Marching", 500)];
        let venues: Vec<DexieVenue> = vec![];
        let guests: Vec<DexieGuest> = vec![];
        let tours: Vec<DexieTour> = vec![];

        // Uppercase query should match lowercase search_text
        let results = global_search(&songs, &venues, &guests, &tours, "ANTS");
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_global_search_empty_query() {
        let songs = vec![make_test_song(1, "Ants Marching", 500)];
        let venues: Vec<DexieVenue> = vec![];
        let guests: Vec<DexieGuest> = vec![];
        let tours: Vec<DexieTour> = vec![];

        let results = global_search(&songs, &venues, &guests, &tours, "");
        assert_eq!(results.len(), 0);

        let results = global_search(&songs, &venues, &guests, &tours, "   ");
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_global_search_no_matches() {
        let songs = vec![make_test_song(1, "Ants Marching", 500)];
        let venues: Vec<DexieVenue> = vec![];
        let guests: Vec<DexieGuest> = vec![];
        let tours: Vec<DexieTour> = vec![];

        let results = global_search(&songs, &venues, &guests, &tours, "xyz123");
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_search_tours_scoring() {
        let songs: Vec<DexieSong> = vec![];
        let venues: Vec<DexieVenue> = vec![];
        let guests: Vec<DexieGuest> = vec![];
        let tours = vec![
            make_test_tour(1, "2024 Tour", 60),
            make_test_tour(2, "2023 Tour", 80),
            make_test_tour(3, "2022 Tour", 70),
        ];

        let results = global_search(&songs, &venues, &guests, &tours, "tour");
        assert_eq!(results.len(), 3);
        // Should be sorted by total_shows descending
        assert_eq!(results[0].title, "2023 Tour");
        assert_eq!(results[0].score, 80);
        assert_eq!(results[1].title, "2022 Tour");
        assert_eq!(results[1].score, 70);
        assert_eq!(results[2].title, "2024 Tour");
        assert_eq!(results[2].score, 60);
    }
}
