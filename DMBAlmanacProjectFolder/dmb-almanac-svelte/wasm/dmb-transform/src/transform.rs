//! Data transformation functions.
//!
//! Converts server types (snake_case) to Dexie types (camelCase),
//! handling type coercion, denormalization, and computed field generation.
//!
//! # Performance Optimizations
//! - Zero-copy string operations where possible
//! - Pre-allocated output vectors
//! - Efficient boolean parsing (SQLite uses 0/1)
//! - Inline functions for hot paths

use crate::types::*;
use wasm_bindgen::JsError;

// ==================== UTILITY FUNCTIONS ====================

/// Generate searchText field for a song.
///
/// Concatenates title and original artist (if cover) into lowercase string.
#[inline]
pub fn generate_song_search_text(title: &str, original_artist: Option<&str>) -> String {
    match original_artist {
        Some(artist) if !artist.is_empty() => {
            let mut result = String::with_capacity(title.len() + artist.len() + 1);
            result.push_str(title);
            result.push(' ');
            result.push_str(artist);
            result.to_lowercase()
        }
        _ => title.to_lowercase(),
    }
}

/// Generate searchText field for a venue.
///
/// Concatenates name, city, state, country into lowercase string.
#[inline]
pub fn generate_venue_search_text(
    name: &str,
    city: &str,
    state: Option<&str>,
    country: &str,
) -> String {
    let capacity = name.len() + city.len() + country.len() + state.map_or(0, |s| s.len()) + 3;
    let mut result = String::with_capacity(capacity);

    result.push_str(name);
    result.push(' ');
    result.push_str(city);

    if let Some(s) = state {
        if !s.is_empty() {
            result.push(' ');
            result.push_str(s);
        }
    }

    result.push(' ');
    result.push_str(country);

    result.to_lowercase()
}

/// Generate searchText field for a guest.
///
/// Concatenates name and instruments into lowercase string.
#[inline]
pub fn generate_guest_search_text(name: &str, instruments: Option<&[String]>) -> String {
    match instruments {
        Some(instr) if !instr.is_empty() => {
            let instr_str = instr.join(" ");
            let mut result = String::with_capacity(name.len() + instr_str.len() + 1);
            result.push_str(name);
            result.push(' ');
            result.push_str(&instr_str);
            result.to_lowercase()
        }
        _ => name.to_lowercase(),
    }
}

/// Extract year from ISO date string (YYYY-MM-DD).
///
/// Returns None if date is invalid or too short.
#[inline]
pub fn extract_year_from_date(date: &str) -> Option<u16> {
    if date.len() >= 4 {
        date[..4].parse().ok()
    } else {
        None
    }
}

/// Categorize slot type based on position in set.
///
/// - Position 1 = opener
/// - Position = total_in_set = closer
/// - Otherwise = standard
#[inline]
pub fn categorize_slot(position: u32, total_in_set: u32, _set_name: &str) -> SlotType {
    if position == 1 {
        SlotType::Opener
    } else if position == total_in_set {
        SlotType::Closer
    } else {
        SlotType::Standard
    }
}

/// Parse JSON array string into Vec<String>.
///
/// Returns None if parsing fails or string is empty/null.
#[inline]
fn parse_json_string_array(json: Option<&str>) -> Option<Vec<String>> {
    json.and_then(|s| {
        if s.is_empty() || s == "null" {
            None
        } else {
            serde_json::from_str(s).ok()
        }
    })
}

/// Convert SQLite boolean (0/1) to Rust bool.
#[inline(always)]
const fn sqlite_bool(value: i64) -> bool {
    value != 0
}

// ==================== TRANSFORMATION FUNCTIONS ====================

/// Transform server venue to Dexie venue.
#[inline]
pub fn transform_venue(server: ServerVenue) -> DexieVenue {
    let search_text = generate_venue_search_text(
        &server.name,
        &server.city,
        server.state.as_deref(),
        &server.country,
    );

    DexieVenue {
        id: server.id,
        name: server.name,
        city: server.city,
        state: server.state,
        country: server.country,
        country_code: server.country_code,
        venue_type: server.venue_type.as_deref().and_then(VenueType::from_str),
        capacity: server.capacity,
        latitude: server.latitude,
        longitude: server.longitude,
        total_shows: server.total_shows,
        first_show_date: server.first_show_date,
        last_show_date: server.last_show_date,
        notes: server.notes,
        search_text,
    }
}

/// Transform server song to Dexie song.
#[inline]
pub fn transform_song(server: ServerSong) -> DexieSong {
    let search_text = generate_song_search_text(&server.title, server.original_artist.as_deref());

    DexieSong {
        id: server.id,
        title: server.title,
        slug: server.slug,
        sort_title: server.sort_title,
        original_artist: server.original_artist,
        is_cover: sqlite_bool(server.is_cover),
        is_original: sqlite_bool(server.is_original),
        first_played_date: server.first_played_date,
        last_played_date: server.last_played_date,
        total_performances: server.total_performances,
        opener_count: server.opener_count,
        closer_count: server.closer_count,
        encore_count: server.encore_count,
        lyrics: server.lyrics,
        notes: server.notes,
        is_liberated: sqlite_bool(server.is_liberated),
        days_since_last_played: server.days_since_last_played,
        shows_since_last_played: server.shows_since_last_played,
        search_text,
    }
}

/// Transform server tour to Dexie tour.
#[inline]
pub fn transform_tour(server: ServerTour) -> DexieTour {
    let search_text = server.name.to_lowercase();
    
    DexieTour {
        id: server.id,
        name: server.name,
        year: server.year,
        start_date: server.start_date,
        end_date: server.end_date,
        total_shows: server.total_shows,
        unique_songs_played: server.unique_songs_played,
        average_songs_per_show: server.average_songs_per_show,
        rarity_index: server.rarity_index,
        search_text,
    }
}

/// Transform server show to Dexie show with embedded venue/tour.
#[inline]
pub fn transform_show(server: ServerShow) -> DexieShow {
    let year = extract_year_from_date(&server.date).unwrap_or(0) as i64;

    let venue = EmbeddedVenue {
        id: server.venue_id,
        name: server.venue_name,
        city: server.venue_city,
        state: server.venue_state,
        country: server.venue_country,
        country_code: server.venue_country_code,
        venue_type: server.venue_type.as_deref().and_then(VenueType::from_str),
        capacity: server.venue_capacity,
        total_shows: server.venue_total_shows,
    };

    let tour = EmbeddedTour {
        id: server.tour_id,
        name: server.tour_name,
        year: server.tour_year,
        start_date: server.tour_start_date,
        end_date: server.tour_end_date,
        total_shows: server.tour_total_shows,
    };

    DexieShow {
        id: server.id,
        date: server.date,
        venue_id: server.venue_id,
        tour_id: server.tour_id,
        notes: server.notes,
        soundcheck: server.soundcheck,
        attendance_count: server.attendance_count,
        rarity_index: server.rarity_index,
        song_count: server.song_count,
        venue,
        tour,
        year,
    }
}

/// Transform server setlist entry to Dexie setlist entry.
#[inline]
pub fn transform_setlist_entry(server: ServerSetlistEntry) -> DexieSetlistEntry {
    let year = extract_year_from_date(&server.show_date).unwrap_or(0) as i64;

    let song = EmbeddedSong {
        id: server.song_id,
        title: server.song_title,
        slug: server.song_slug,
        is_cover: sqlite_bool(server.song_is_cover),
        total_performances: server.song_total_performances,
        opener_count: server.song_opener_count,
        closer_count: server.song_closer_count,
        encore_count: server.song_encore_count,
    };

    // Parse set_name and slot with fallbacks
    let set_name = SetType::from_str(&server.set_name).unwrap_or(SetType::Set1);
    let slot = SlotType::from_str(&server.slot).unwrap_or(SlotType::Standard);

    DexieSetlistEntry {
        id: server.id,
        show_id: server.show_id,
        song_id: server.song_id,
        position: server.position,
        set_name,
        slot,
        duration_seconds: server.duration_seconds,
        segue_into_song_id: server.segue_into_song_id,
        is_segue: sqlite_bool(server.is_segue),
        is_tease: sqlite_bool(server.is_tease),
        tease_of_song_id: server.tease_of_song_id,
        notes: server.notes,
        song,
        show_date: server.show_date,
        year,
    }
}

/// Transform server guest to Dexie guest.
#[inline]
pub fn transform_guest(server: ServerGuest) -> DexieGuest {
    let instruments = parse_json_string_array(server.instruments.as_deref());
    let search_text = generate_guest_search_text(&server.name, instruments.as_deref());

    DexieGuest {
        id: server.id,
        name: server.name,
        slug: server.slug,
        instruments,
        total_appearances: server.total_appearances,
        first_appearance_date: server.first_appearance_date,
        last_appearance_date: server.last_appearance_date,
        notes: server.notes,
        search_text,
    }
}

/// Transform server guest appearance to Dexie guest appearance.
#[inline]
pub fn transform_guest_appearance(server: ServerGuestAppearance) -> DexieGuestAppearance {
    let year = extract_year_from_date(&server.show_date).unwrap_or(0) as i64;
    let instruments = parse_json_string_array(server.instruments.as_deref());

    DexieGuestAppearance {
        id: server.id,
        guest_id: server.guest_id,
        show_id: server.show_id,
        setlist_entry_id: server.setlist_entry_id,
        song_id: server.song_id,
        instruments,
        notes: server.notes,
        show_date: server.show_date,
        year,
    }
}

/// Transform server liberation entry to Dexie liberation entry.
#[inline]
pub fn transform_liberation_entry(server: ServerLiberationEntry) -> DexieLiberationEntry {
    let song = LiberationSong {
        id: server.song_id,
        title: server.song_title,
        slug: server.song_slug,
        is_cover: sqlite_bool(server.song_is_cover),
        total_performances: server.song_total_performances,
    };

    let last_show = LiberationLastShow {
        id: server.last_played_show_id,
        date: server.show_date, // Move instead of clone - only used here
        venue: LiberationVenue {
            name: server.venue_name,
            city: server.venue_city,
            state: server.venue_state,
        },
    };

    DexieLiberationEntry {
        id: server.id,
        song_id: server.song_id,
        last_played_date: server.last_played_date,
        last_played_show_id: server.last_played_show_id,
        days_since: server.days_since,
        shows_since: server.shows_since,
        notes: server.notes,
        configuration: server
            .configuration
            .as_deref()
            .and_then(LiberationConfiguration::from_str),
        is_liberated: sqlite_bool(server.is_liberated),
        liberated_date: server.liberated_date,
        liberated_show_id: server.liberated_show_id,
        song,
        last_show,
    }
}

/// Transform full sync data in a single pass.
///
/// More efficient than separate calls due to reduced memory allocation.
pub fn transform_full_sync_data(data: FullSyncData) -> Result<TransformedSyncData, JsError> {
    // Pre-allocate output vectors
    let venues: Vec<DexieVenue> = data
        .data
        .venues
        .into_iter()
        .map(transform_venue)
        .collect();

    let songs: Vec<DexieSong> = data.data.songs.into_iter().map(transform_song).collect();

    let tours: Vec<DexieTour> = data.data.tours.into_iter().map(transform_tour).collect();

    let shows: Vec<DexieShow> = data.data.shows.into_iter().map(transform_show).collect();

    let setlist_entries: Vec<DexieSetlistEntry> = data
        .data
        .setlist_entries
        .into_iter()
        .map(transform_setlist_entry)
        .collect();

    let guests: Vec<DexieGuest> = data.data.guests.into_iter().map(transform_guest).collect();

    let guest_appearances: Vec<DexieGuestAppearance> = data
        .data
        .guest_appearances
        .into_iter()
        .map(transform_guest_appearance)
        .collect();

    let liberation_list: Vec<DexieLiberationEntry> = data
        .data
        .liberation_list
        .into_iter()
        .map(transform_liberation_entry)
        .collect();

    Ok(TransformedSyncData {
        venues,
        songs,
        tours,
        shows,
        setlist_entries,
        guests,
        guest_appearances,
        liberation_list,
    })
}

// ==================== TESTS ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_song_search_text() {
        assert_eq!(
            generate_song_search_text("Ants Marching", None),
            "ants marching"
        );
        assert_eq!(
            generate_song_search_text("All Along the Watchtower", Some("Bob Dylan")),
            "all along the watchtower bob dylan"
        );
        assert_eq!(
            generate_song_search_text("Test Song", Some("")),
            "test song"
        );
    }

    #[test]
    fn test_generate_venue_search_text() {
        assert_eq!(
            generate_venue_search_text("The Gorge", "George", Some("WA"), "USA"),
            "the gorge george wa usa"
        );
        assert_eq!(
            generate_venue_search_text("Wembley Stadium", "London", None, "UK"),
            "wembley stadium london uk"
        );
    }

    #[test]
    fn test_extract_year() {
        assert_eq!(extract_year_from_date("2024-07-15"), Some(2024));
        assert_eq!(extract_year_from_date("1991-03-14"), Some(1991));
        assert_eq!(extract_year_from_date("abc"), None);
        assert_eq!(extract_year_from_date(""), None);
    }

    #[test]
    fn test_sqlite_bool() {
        assert!(!sqlite_bool(0));
        assert!(sqlite_bool(1));
        assert!(sqlite_bool(42));
        assert!(sqlite_bool(-1));
    }

    #[test]
    fn test_categorize_slot() {
        assert_eq!(categorize_slot(1, 10, "set1"), SlotType::Opener);
        assert_eq!(categorize_slot(10, 10, "set1"), SlotType::Closer);
        assert_eq!(categorize_slot(5, 10, "set1"), SlotType::Standard);
    }

    #[test]
    fn test_transform_song() {
        let server = ServerSong {
            id: 1,
            title: "Ants Marching".to_string(),
            slug: "ants-marching".to_string(),
            sort_title: "Ants Marching".to_string(),
            original_artist: None,
            is_cover: 0,
            is_original: 1,
            first_played_date: Some("1991-03-14".to_string()),
            last_played_date: Some("2024-07-15".to_string()),
            total_performances: 1890,
            opener_count: 150,
            closer_count: 200,
            encore_count: 50,
            lyrics: None,
            notes: None,
            is_liberated: 0,
            days_since_last_played: Some(30),
            shows_since_last_played: Some(5),
        };

        let dexie = transform_song(server);

        assert_eq!(dexie.id, 1);
        assert_eq!(dexie.title, "Ants Marching");
        assert!(!dexie.is_cover);
        assert!(dexie.is_original);
        assert_eq!(dexie.search_text, "ants marching");
    }

    #[test]
    fn test_transform_venue() {
        let server = ServerVenue {
            id: 31,
            name: "The Gorge Amphitheatre".to_string(),
            city: "George".to_string(),
            state: Some("WA".to_string()),
            country: "USA".to_string(),
            country_code: "US".to_string(),
            venue_type: Some("amphitheatre".to_string()),
            capacity: Some(27500),
            latitude: Some(47.100),
            longitude: Some(-119.997),
            total_shows: 72,
            first_show_date: Some("1997-06-28".to_string()),
            last_show_date: Some("2024-07-15".to_string()),
            notes: None,
        };

        let dexie = transform_venue(server);

        assert_eq!(dexie.id, 31);
        assert_eq!(dexie.name, "The Gorge Amphitheatre");
        assert_eq!(dexie.venue_type, Some(VenueType::Amphitheatre));
        assert_eq!(
            dexie.search_text,
            "the gorge amphitheatre george wa usa"
        );
    }

    #[test]
    fn test_parse_json_string_array() {
        assert_eq!(
            parse_json_string_array(Some(r#"["guitar", "vocals"]"#)),
            Some(vec!["guitar".to_string(), "vocals".to_string()])
        );
        assert_eq!(parse_json_string_array(Some("")), None);
        assert_eq!(parse_json_string_array(Some("null")), None);
        assert_eq!(parse_json_string_array(None), None);
    }
}
