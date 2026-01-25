//! Data transformation module for converting raw server data to Dexie format.
//!
//! This is the highest-ROI module - it processes 170,000+ records during initial
//! data load. Rust's zero-cost abstractions and SIMD-friendly string operations
//! provide significant speedup over JavaScript.

use crate::types::*;
use rustc_hash::FxHashMap;

// ==================== HELPER FUNCTIONS ====================

/// Parse year from ISO date string "YYYY-MM-DD" or "YYYY"
#[inline]
fn parse_year(date: &str) -> u16 {
    date.get(0..4)
        .and_then(|s| s.parse().ok())
        .unwrap_or(0)
}

/// Convert string to lowercase for search indexing
#[inline]
fn to_search_text(parts: &[Option<&str>]) -> String {
    parts
        .iter()
        .filter_map(|p| *p)
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

/// Parse venue type string to enum
#[inline]
fn parse_venue_type(s: &str) -> Option<VenueType> {
    match s.to_lowercase().as_str() {
        "amphitheater" => Some(VenueType::Amphitheater),
        "amphitheatre" => Some(VenueType::Amphitheatre),
        "arena" => Some(VenueType::Arena),
        "stadium" => Some(VenueType::Stadium),
        "theater" => Some(VenueType::Theater),
        "theatre" => Some(VenueType::Theatre),
        "club" => Some(VenueType::Club),
        "festival" => Some(VenueType::Festival),
        "outdoor" => Some(VenueType::Outdoor),
        "cruise" => Some(VenueType::Cruise),
        "pavilion" => Some(VenueType::Pavilion),
        "coliseum" => Some(VenueType::Coliseum),
        _ => Some(VenueType::Other),
    }
}

/// Parse set name string to enum
#[inline]
fn parse_set_type(s: &str) -> SetType {
    match s.to_lowercase().as_str() {
        "set1" | "set 1" => SetType::Set1,
        "set2" | "set 2" => SetType::Set2,
        "set3" | "set 3" => SetType::Set3,
        "encore" | "encore1" | "encore 1" => SetType::Encore,
        "encore2" | "encore 2" => SetType::Encore2,
        _ => SetType::Set1, // Default
    }
}

/// Parse slot type string to enum
#[inline]
fn parse_slot_type(s: &str) -> SlotType {
    match s.to_lowercase().as_str() {
        "opener" => SlotType::Opener,
        "closer" => SlotType::Closer,
        _ => SlotType::Standard,
    }
}

/// Parse liberation configuration
#[inline]
fn parse_liberation_config(s: &str) -> Option<LiberationConfiguration> {
    match s.to_lowercase().as_str() {
        "full_band" | "fullband" | "full band" => Some(LiberationConfiguration::FullBand),
        "dave_tim" | "davetim" | "dave tim" => Some(LiberationConfiguration::DaveTim),
        "dave_solo" | "davesolo" | "dave solo" => Some(LiberationConfiguration::DaveSolo),
        _ => None,
    }
}

// ==================== VENUE TRANSFORMATION ====================

/// Transform a single venue from raw server format to Dexie format
#[inline]
pub fn transform_venue(raw: RawVenue) -> DexieVenue {
    let search_text = to_search_text(&[
        Some(&raw.name),
        Some(&raw.city),
        raw.state.as_deref(),
        Some(&raw.country),
    ]);

    DexieVenue {
        id: raw.id,
        name: raw.name,
        city: raw.city,
        state: raw.state,
        country: raw.country,
        country_code: raw.country_code.unwrap_or_default(),
        venue_type: raw.venue_type.as_deref().and_then(parse_venue_type),
        capacity: raw.capacity,
        latitude: raw.latitude,
        longitude: raw.longitude,
        total_shows: raw.total_shows.unwrap_or(0),
        first_show_date: raw.first_show_date,
        last_show_date: raw.last_show_date,
        notes: raw.notes,
        search_text,
    }
}

/// Transform all venues - the main entry point for bulk transformation
pub fn transform_venues(raw_venues: Vec<RawVenue>) -> Vec<DexieVenue> {
    let mut result = Vec::with_capacity(raw_venues.len());
    for raw in raw_venues {
        result.push(transform_venue(raw));
    }
    result
}

// ==================== SONG TRANSFORMATION ====================

/// Transform a single song from raw server format to Dexie format
#[inline]
pub fn transform_song(raw: RawSong) -> DexieSong {
    let title = &raw.title;
    let original_artist = raw.original_artist.as_deref();
    let search_text = to_search_text(&[Some(title), original_artist]);

    // Sort title: strip leading "The ", "A ", "An " for alphabetical sorting
    let sort_title = raw.sort_title.unwrap_or_else(|| {
        let t = raw.title.trim();
        if t.to_lowercase().starts_with("the ") {
            t[4..].to_string()
        } else if t.to_lowercase().starts_with("a ") {
            t[2..].to_string()
        } else if t.to_lowercase().starts_with("an ") {
            t[3..].to_string()
        } else {
            t.to_string()
        }
    });

    DexieSong {
        id: raw.id,
        title: raw.title,
        slug: raw.slug,
        sort_title,
        original_artist: raw.original_artist,
        is_cover: raw.is_cover.unwrap_or(false),
        is_original: raw.is_original.unwrap_or(true),
        first_played_date: raw.first_played_date,
        last_played_date: raw.last_played_date,
        total_performances: raw.total_performances.unwrap_or(0),
        opener_count: raw.opener_count.unwrap_or(0),
        closer_count: raw.closer_count.unwrap_or(0),
        encore_count: raw.encore_count.unwrap_or(0),
        lyrics: raw.lyrics,
        notes: raw.notes,
        is_liberated: raw.is_liberated.unwrap_or(false),
        days_since_last_played: raw.days_since_last_played,
        shows_since_last_played: raw.shows_since_last_played,
        search_text,
    }
}

/// Transform all songs
pub fn transform_songs(raw_songs: Vec<RawSong>) -> Vec<DexieSong> {
    let mut result = Vec::with_capacity(raw_songs.len());
    for raw in raw_songs {
        result.push(transform_song(raw));
    }
    result
}

// ==================== TOUR TRANSFORMATION ====================

/// Transform a single tour
#[inline]
pub fn transform_tour(raw: RawTour) -> DexieTour {
    let year = raw.year.unwrap_or_else(|| {
        raw.start_date.as_deref().map(parse_year).unwrap_or(0)
    });

    DexieTour {
        id: raw.id,
        name: raw.name,
        year,
        start_date: raw.start_date,
        end_date: raw.end_date,
        total_shows: raw.total_shows.unwrap_or(0),
        unique_songs_played: raw.unique_songs_played,
        average_songs_per_show: raw.average_songs_per_show,
        rarity_index: raw.rarity_index,
    }
}

/// Transform all tours
pub fn transform_tours(raw_tours: Vec<RawTour>) -> Vec<DexieTour> {
    let mut result = Vec::with_capacity(raw_tours.len());
    for raw in raw_tours {
        result.push(transform_tour(raw));
    }
    result
}

// ==================== SHOW TRANSFORMATION ====================

/// Context for show transformation - contains lookup maps for embedding
pub struct ShowTransformContext {
    pub venues: FxHashMap<u32, DexieVenue>,
    pub tours: FxHashMap<u32, DexieTour>,
}

impl ShowTransformContext {
    /// Build context from transformed venues and tours
    pub fn new(venues: Vec<DexieVenue>, tours: Vec<DexieTour>) -> Self {
        let mut venue_map = FxHashMap::default();
        venue_map.reserve(venues.len());
        for v in venues {
            venue_map.insert(v.id, v);
        }

        let mut tour_map = FxHashMap::default();
        tour_map.reserve(tours.len());
        for t in tours {
            tour_map.insert(t.id, t);
        }

        Self {
            venues: venue_map,
            tours: tour_map,
        }
    }

    /// Get embedded venue for a show
    #[inline]
    fn get_embedded_venue(&self, venue_id: u32) -> EmbeddedVenue {
        if let Some(v) = self.venues.get(&venue_id) {
            EmbeddedVenue {
                id: v.id,
                name: v.name.clone(),
                city: v.city.clone(),
                state: v.state.clone(),
                country: v.country.clone(),
                country_code: Some(v.country_code.clone()),
                venue_type: v.venue_type.clone(),
                capacity: v.capacity,
                total_shows: v.total_shows,
            }
        } else {
            // Fallback for missing venue
            EmbeddedVenue {
                id: venue_id,
                name: "Unknown Venue".to_string(),
                city: "Unknown".to_string(),
                state: None,
                country: "Unknown".to_string(),
                country_code: None,
                venue_type: None,
                capacity: None,
                total_shows: 0,
            }
        }
    }

    /// Get embedded tour for a show
    #[inline]
    fn get_embedded_tour(&self, tour_id: u32) -> EmbeddedTour {
        if let Some(t) = self.tours.get(&tour_id) {
            EmbeddedTour {
                id: t.id,
                name: t.name.clone(),
                year: t.year,
                start_date: t.start_date.clone(),
                end_date: t.end_date.clone(),
                total_shows: t.total_shows,
            }
        } else {
            // Fallback for missing tour
            EmbeddedTour {
                id: tour_id,
                name: "Unknown Tour".to_string(),
                year: 0,
                start_date: None,
                end_date: None,
                total_shows: 0,
            }
        }
    }
}

/// Transform a single show with context for embedding
#[inline]
pub fn transform_show(raw: RawShow, ctx: &ShowTransformContext) -> DexieShow {
    let year = parse_year(&raw.date);
    let venue_id = raw.venue_id.unwrap_or(0);
    let tour_id = raw.tour_id.unwrap_or(0);

    // Use embedded venue from raw if present, otherwise lookup
    let venue = if let Some(ref rv) = raw.venue {
        EmbeddedVenue {
            id: rv.id,
            name: rv.name.clone(),
            city: rv.city.clone(),
            state: rv.state.clone(),
            country: rv.country.clone().unwrap_or_default(),
            country_code: rv.country_code.clone(),
            venue_type: rv.venue_type.as_deref().and_then(parse_venue_type),
            capacity: rv.capacity,
            total_shows: rv.total_shows.unwrap_or(0),
        }
    } else {
        ctx.get_embedded_venue(venue_id)
    };

    // Use embedded tour from raw if present, otherwise lookup
    let tour = if let Some(ref rt) = raw.tour {
        EmbeddedTour {
            id: rt.id,
            name: rt.name.clone(),
            year: rt.year.unwrap_or(year),
            start_date: rt.start_date.clone(),
            end_date: rt.end_date.clone(),
            total_shows: rt.total_shows.unwrap_or(0),
        }
    } else {
        ctx.get_embedded_tour(tour_id)
    };

    DexieShow {
        id: raw.id,
        date: raw.date,
        venue_id,
        tour_id,
        notes: raw.notes,
        soundcheck: raw.soundcheck,
        attendance_count: raw.attendance_count,
        rarity_index: raw.rarity_index,
        song_count: raw.song_count.unwrap_or(0),
        venue,
        tour,
        year,
    }
}

/// Transform all shows with context
pub fn transform_shows(
    raw_shows: Vec<RawShow>,
    ctx: &ShowTransformContext,
) -> Vec<DexieShow> {
    let mut result = Vec::with_capacity(raw_shows.len());
    for raw in raw_shows {
        result.push(transform_show(raw, ctx));
    }
    result
}

// ==================== SETLIST ENTRY TRANSFORMATION ====================

/// Context for setlist transformation
pub struct SetlistTransformContext {
    pub songs: FxHashMap<u32, DexieSong>,
    pub shows: FxHashMap<u32, DexieShow>,
}

impl SetlistTransformContext {
    pub fn new(songs: Vec<DexieSong>, shows: Vec<DexieShow>) -> Self {
        let mut song_map = FxHashMap::default();
        song_map.reserve(songs.len());
        for s in songs {
            song_map.insert(s.id, s);
        }

        let mut show_map = FxHashMap::default();
        show_map.reserve(shows.len());
        for s in shows {
            show_map.insert(s.id, s);
        }

        Self {
            songs: song_map,
            shows: show_map,
        }
    }

    /// Get embedded song for a setlist entry
    #[inline]
    fn get_embedded_song(&self, song_id: u32) -> EmbeddedSong {
        if let Some(s) = self.songs.get(&song_id) {
            EmbeddedSong {
                id: s.id,
                title: s.title.clone(),
                slug: s.slug.clone(),
                is_cover: s.is_cover,
                total_performances: s.total_performances,
                opener_count: s.opener_count,
                closer_count: s.closer_count,
                encore_count: s.encore_count,
            }
        } else {
            EmbeddedSong {
                id: song_id,
                title: "Unknown Song".to_string(),
                slug: "unknown".to_string(),
                is_cover: false,
                total_performances: 0,
                opener_count: 0,
                closer_count: 0,
                encore_count: 0,
            }
        }
    }

    /// Get show date and year for a setlist entry
    #[inline]
    fn get_show_info(&self, show_id: u32) -> (String, u16) {
        if let Some(s) = self.shows.get(&show_id) {
            (s.date.clone(), s.year)
        } else {
            ("1970-01-01".to_string(), 1970)
        }
    }
}

/// Transform a single setlist entry with context
#[inline]
pub fn transform_setlist_entry(
    raw: RawSetlistEntry,
    ctx: &SetlistTransformContext,
) -> DexieSetlistEntry {
    // Use embedded song from raw if present, otherwise lookup
    let song = if let Some(ref rs) = raw.song {
        EmbeddedSong {
            id: rs.id,
            title: rs.title.clone(),
            slug: rs.slug.clone(),
            is_cover: rs.is_cover.unwrap_or(false),
            total_performances: rs.total_performances.unwrap_or(0),
            opener_count: rs.opener_count.unwrap_or(0),
            closer_count: rs.closer_count.unwrap_or(0),
            encore_count: rs.encore_count.unwrap_or(0),
        }
    } else {
        ctx.get_embedded_song(raw.song_id)
    };

    // Get show date and year
    let (show_date, year) = if let Some(ref sd) = raw.show_date {
        (sd.clone(), parse_year(sd))
    } else {
        ctx.get_show_info(raw.show_id)
    };

    let set_name = raw.set_name.as_deref().map(parse_set_type).unwrap_or(SetType::Set1);
    let slot = raw.slot.as_deref().map(parse_slot_type).unwrap_or(SlotType::Standard);

    DexieSetlistEntry {
        id: raw.id,
        show_id: raw.show_id,
        song_id: raw.song_id,
        position: raw.position,
        set_name,
        slot,
        duration_seconds: raw.duration_seconds,
        segue_into_song_id: raw.segue_into_song_id,
        is_segue: raw.is_segue.unwrap_or(false),
        is_tease: raw.is_tease.unwrap_or(false),
        tease_of_song_id: raw.tease_of_song_id,
        notes: raw.notes,
        song,
        show_date,
        year,
    }
}

/// Transform all setlist entries with context
/// This is the largest dataset (~150,000 items) - critical for performance
pub fn transform_setlist_entries(
    raw_entries: Vec<RawSetlistEntry>,
    ctx: &SetlistTransformContext,
) -> Vec<DexieSetlistEntry> {
    let mut result = Vec::with_capacity(raw_entries.len());
    for raw in raw_entries {
        result.push(transform_setlist_entry(raw, ctx));
    }
    result
}

// ==================== GUEST TRANSFORMATION ====================

/// Transform a single guest
#[inline]
pub fn transform_guest(raw: RawGuest) -> DexieGuest {
    let instruments_str = raw.instruments.as_ref()
        .map(|i| i.join(" "))
        .unwrap_or_default();
    let search_text = format!("{} {}", raw.name, instruments_str).to_lowercase();

    DexieGuest {
        id: raw.id,
        name: raw.name,
        slug: raw.slug,
        instruments: raw.instruments,
        total_appearances: raw.total_appearances.unwrap_or(0),
        first_appearance_date: raw.first_appearance_date,
        last_appearance_date: raw.last_appearance_date,
        notes: raw.notes,
        search_text,
    }
}

/// Transform all guests
pub fn transform_guests(raw_guests: Vec<RawGuest>) -> Vec<DexieGuest> {
    let mut result = Vec::with_capacity(raw_guests.len());
    for raw in raw_guests {
        result.push(transform_guest(raw));
    }
    result
}

/// Transform a single guest appearance
#[inline]
pub fn transform_guest_appearance(
    raw: RawGuestAppearance,
    shows: &FxHashMap<u32, DexieShow>,
) -> DexieGuestAppearance {
    let (show_date, year) = if let Some(ref sd) = raw.show_date {
        (sd.clone(), parse_year(sd))
    } else if let Some(s) = shows.get(&raw.show_id) {
        (s.date.clone(), s.year)
    } else {
        ("1970-01-01".to_string(), 1970)
    };

    DexieGuestAppearance {
        id: raw.id,
        guest_id: raw.guest_id,
        show_id: raw.show_id,
        setlist_entry_id: raw.setlist_entry_id,
        song_id: raw.song_id,
        instruments: raw.instruments,
        notes: raw.notes,
        show_date,
        year,
    }
}

/// Transform all guest appearances
pub fn transform_guest_appearances(
    raw_appearances: Vec<RawGuestAppearance>,
    shows: &FxHashMap<u32, DexieShow>,
) -> Vec<DexieGuestAppearance> {
    let mut result = Vec::with_capacity(raw_appearances.len());
    for raw in raw_appearances {
        result.push(transform_guest_appearance(raw, shows));
    }
    result
}

// ==================== LIBERATION TRANSFORMATION ====================

/// Transform a single liberation entry
#[inline]
pub fn transform_liberation_entry(raw: RawLiberationEntry) -> DexieLiberationEntry {
    let song = if let Some(ref rs) = raw.song {
        LiberationSong {
            id: rs.id,
            title: rs.title.clone(),
            slug: rs.slug.clone(),
            is_cover: rs.is_cover.unwrap_or(false),
            total_performances: rs.total_performances.unwrap_or(0),
        }
    } else {
        LiberationSong {
            id: raw.song_id,
            title: "Unknown".to_string(),
            slug: "unknown".to_string(),
            is_cover: false,
            total_performances: 0,
        }
    };

    let last_show = if let Some(ref rl) = raw.last_show {
        let venue = if let Some(ref rv) = rl.venue {
            LiberationVenue {
                name: rv.name.clone(),
                city: rv.city.clone(),
                state: rv.state.clone(),
            }
        } else {
            LiberationVenue {
                name: "Unknown".to_string(),
                city: "Unknown".to_string(),
                state: None,
            }
        };
        LiberationShow {
            id: rl.id,
            date: rl.date.clone(),
            venue,
        }
    } else {
        LiberationShow {
            id: raw.last_played_show_id,
            date: raw.last_played_date.clone(),
            venue: LiberationVenue {
                name: "Unknown".to_string(),
                city: "Unknown".to_string(),
                state: None,
            },
        }
    };

    let configuration = raw.configuration.as_deref()
        .and_then(parse_liberation_config);

    DexieLiberationEntry {
        id: raw.id,
        song_id: raw.song_id,
        last_played_date: raw.last_played_date,
        last_played_show_id: raw.last_played_show_id,
        days_since: raw.days_since.unwrap_or(0),
        shows_since: raw.shows_since.unwrap_or(0),
        notes: raw.notes,
        configuration,
        is_liberated: raw.is_liberated.unwrap_or(false),
        liberated_date: raw.liberated_date,
        liberated_show_id: raw.liberated_show_id,
        song,
        last_show,
    }
}

/// Transform all liberation entries
pub fn transform_liberation_entries(
    raw_entries: Vec<RawLiberationEntry>,
) -> Vec<DexieLiberationEntry> {
    let mut result = Vec::with_capacity(raw_entries.len());
    for raw in raw_entries {
        result.push(transform_liberation_entry(raw));
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_year() {
        assert_eq!(parse_year("2023-07-04"), 2023);
        assert_eq!(parse_year("1991-03-14"), 1991);
        assert_eq!(parse_year("2000"), 2000);
        assert_eq!(parse_year(""), 0);
    }

    #[test]
    fn test_to_search_text() {
        let result = to_search_text(&[
            Some("Madison Square Garden"),
            Some("New York"),
            Some("NY"),
        ]);
        assert_eq!(result, "madison square garden new york ny");
    }

    #[test]
    fn test_parse_venue_type() {
        assert_eq!(parse_venue_type("arena"), Some(VenueType::Arena));
        assert_eq!(parse_venue_type("STADIUM"), Some(VenueType::Stadium));
        assert_eq!(parse_venue_type("unknown"), Some(VenueType::Other));
    }

    #[test]
    fn test_transform_song() {
        let raw = RawSong {
            id: 1,
            title: "The Ants Marching".to_string(),
            slug: "ants-marching".to_string(),
            sort_title: None,
            original_artist: None,
            is_cover: Some(false),
            is_original: Some(true),
            first_played_date: Some("1991-03-14".to_string()),
            last_played_date: Some("2023-09-10".to_string()),
            total_performances: Some(1500),
            opener_count: Some(100),
            closer_count: Some(50),
            encore_count: Some(200),
            lyrics: None,
            notes: None,
            is_liberated: Some(false),
            days_since_last_played: Some(30),
            shows_since_last_played: Some(5),
        };

        let result = transform_song(raw);
        assert_eq!(result.id, 1);
        assert_eq!(result.title, "The Ants Marching");
        assert_eq!(result.sort_title, "Ants Marching"); // "The " stripped
        assert_eq!(result.search_text, "the ants marching");
    }
}
