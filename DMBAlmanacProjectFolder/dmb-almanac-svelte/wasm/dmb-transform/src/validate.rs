//! Foreign key validation for DMB Almanac data.
//!
//! Validates referential integrity across all entities using efficient
//! HashSet lookups. This catches data inconsistencies before they cause
//! runtime errors in the application.
//!
//! # Performance
//! - Single-pass validation per entity type
//! - Pre-allocated HashSets based on expected sizes

use std::collections::HashSet;
use crate::types::*;
use wasm_bindgen::JsError;

/// Build a HashSet of valid IDs from a JSON array.
fn build_id_set<T: serde::de::DeserializeOwned>(json: &str, extractor: fn(&T) -> i64) -> Result<HashSet<i64>, JsError> {
    let items: Vec<T> = serde_json::from_str(json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let mut set = HashSet::with_capacity(items.len());
    for item in items {
        set.insert(extractor(&item));
    }
    Ok(set)
}

/// Validate all foreign key relationships.
///
/// # Arguments
/// * `songs_json` - JSON string of DexieSong array
/// * `venues_json` - JSON string of DexieVenue array
/// * `tours_json` - JSON string of DexieTour array
/// * `shows_json` - JSON string of DexieShow array
/// * `setlist_entries_json` - JSON string of DexieSetlistEntry array
///
/// # Returns
/// Vector of validation warnings for any invalid references.
pub fn validate_all_foreign_keys(
    songs_json: &str,
    venues_json: &str,
    tours_json: &str,
    shows_json: &str,
    setlist_entries_json: &str,
) -> Result<Vec<ValidationWarning>, JsError> {
    let mut warnings = Vec::new();

    // Build ID sets for reference validation
    let song_ids = build_id_set::<DexieSong>(songs_json, |s| s.id)?;
    let venue_ids = build_id_set::<DexieVenue>(venues_json, |v| v.id)?;
    let tour_ids = build_id_set::<DexieTour>(tours_json, |t| t.id)?;
    let show_ids = build_id_set::<DexieShow>(shows_json, |s| s.id)?;

    // Validate shows -> venues, tours
    let shows: Vec<DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    for show in &shows {
        if !venue_ids.contains(&show.venue_id) {
            warnings.push(ValidationWarning {
                entity_type: "show".to_string(),
                entity_id: show.id,
                field: "venueId".to_string(),
                invalid_reference: show.venue_id,
                message: format!(
                    "Show {} references non-existent venue {}",
                    show.id, show.venue_id
                ),
            });
        }

        if !tour_ids.contains(&show.tour_id) {
            warnings.push(ValidationWarning {
                entity_type: "show".to_string(),
                entity_id: show.id,
                field: "tourId".to_string(),
                invalid_reference: show.tour_id,
                message: format!(
                    "Show {} references non-existent tour {}",
                    show.id, show.tour_id
                ),
            });
        }

        // Validate embedded venue ID matches
        if show.venue.id != show.venue_id {
            warnings.push(ValidationWarning {
                entity_type: "show".to_string(),
                entity_id: show.id,
                field: "venue.id".to_string(),
                invalid_reference: show.venue.id,
                message: format!(
                    "Show {} embedded venue ID {} doesn't match venueId {}",
                    show.id, show.venue.id, show.venue_id
                ),
            });
        }

        // Validate embedded tour ID matches
        if show.tour.id != show.tour_id {
            warnings.push(ValidationWarning {
                entity_type: "show".to_string(),
                entity_id: show.id,
                field: "tour.id".to_string(),
                invalid_reference: show.tour.id,
                message: format!(
                    "Show {} embedded tour ID {} doesn't match tourId {}",
                    show.id, show.tour.id, show.tour_id
                ),
            });
        }
    }

    // Validate setlist entries -> shows, songs
    let setlist_entries: Vec<DexieSetlistEntry> = serde_json::from_str(setlist_entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    for entry in &setlist_entries {
        if !show_ids.contains(&entry.show_id) {
            warnings.push(ValidationWarning {
                entity_type: "setlistEntry".to_string(),
                entity_id: entry.id,
                field: "showId".to_string(),
                invalid_reference: entry.show_id,
                message: format!(
                    "Setlist entry {} references non-existent show {}",
                    entry.id, entry.show_id
                ),
            });
        }

        if !song_ids.contains(&entry.song_id) {
            warnings.push(ValidationWarning {
                entity_type: "setlistEntry".to_string(),
                entity_id: entry.id,
                field: "songId".to_string(),
                invalid_reference: entry.song_id,
                message: format!(
                    "Setlist entry {} references non-existent song {}",
                    entry.id, entry.song_id
                ),
            });
        }

        // Validate embedded song ID matches
        if entry.song.id != entry.song_id {
            warnings.push(ValidationWarning {
                entity_type: "setlistEntry".to_string(),
                entity_id: entry.id,
                field: "song.id".to_string(),
                invalid_reference: entry.song.id,
                message: format!(
                    "Setlist entry {} embedded song ID {} doesn't match songId {}",
                    entry.id, entry.song.id, entry.song_id
                ),
            });
        }

        // Validate segue references
        if let Some(segue_id) = entry.segue_into_song_id {
            if !song_ids.contains(&segue_id) {
                warnings.push(ValidationWarning {
                    entity_type: "setlistEntry".to_string(),
                    entity_id: entry.id,
                    field: "segueIntoSongId".to_string(),
                    invalid_reference: segue_id,
                    message: format!(
                        "Setlist entry {} segue references non-existent song {}",
                        entry.id, segue_id
                    ),
                });
            }
        }

        // Validate tease references
        if let Some(tease_id) = entry.tease_of_song_id {
            if !song_ids.contains(&tease_id) {
                warnings.push(ValidationWarning {
                    entity_type: "setlistEntry".to_string(),
                    entity_id: entry.id,
                    field: "teaseOfSongId".to_string(),
                    invalid_reference: tease_id,
                    message: format!(
                        "Setlist entry {} tease references non-existent song {}",
                        entry.id, tease_id
                    ),
                });
            }
        }
    }

    Ok(warnings)
}

/// Validate guest appearances against shows, songs, and guests.
pub fn validate_guest_appearances(
    appearances_json: &str,
    guests_json: &str,
    shows_json: &str,
    songs_json: &str,
) -> Result<Vec<ValidationWarning>, JsError> {
    let mut warnings = Vec::new();

    let guest_ids = build_id_set::<DexieGuest>(guests_json, |g| g.id)?;
    let show_ids = build_id_set::<DexieShow>(shows_json, |s| s.id)?;
    let song_ids = build_id_set::<DexieSong>(songs_json, |s| s.id)?;

    let appearances: Vec<DexieGuestAppearance> = serde_json::from_str(appearances_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    for appearance in &appearances {
        if !guest_ids.contains(&appearance.guest_id) {
            warnings.push(ValidationWarning {
                entity_type: "guestAppearance".to_string(),
                entity_id: appearance.id,
                field: "guestId".to_string(),
                invalid_reference: appearance.guest_id,
                message: format!(
                    "Guest appearance {} references non-existent guest {}",
                    appearance.id, appearance.guest_id
                ),
            });
        }

        if !show_ids.contains(&appearance.show_id) {
            warnings.push(ValidationWarning {
                entity_type: "guestAppearance".to_string(),
                entity_id: appearance.id,
                field: "showId".to_string(),
                invalid_reference: appearance.show_id,
                message: format!(
                    "Guest appearance {} references non-existent show {}",
                    appearance.id, appearance.show_id
                ),
            });
        }

        if let Some(song_id) = appearance.song_id {
            if !song_ids.contains(&song_id) {
                warnings.push(ValidationWarning {
                    entity_type: "guestAppearance".to_string(),
                    entity_id: appearance.id,
                    field: "songId".to_string(),
                    invalid_reference: song_id,
                    message: format!(
                        "Guest appearance {} references non-existent song {}",
                        appearance.id, song_id
                    ),
                });
            }
        }
    }

    Ok(warnings)
}

/// Validate liberation list against songs and shows.
pub fn validate_liberation_list(
    liberation_json: &str,
    songs_json: &str,
    shows_json: &str,
) -> Result<Vec<ValidationWarning>, JsError> {
    let mut warnings = Vec::new();

    let song_ids = build_id_set::<DexieSong>(songs_json, |s| s.id)?;
    let show_ids = build_id_set::<DexieShow>(shows_json, |s| s.id)?;

    let entries: Vec<DexieLiberationEntry> = serde_json::from_str(liberation_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    for entry in &entries {
        if !song_ids.contains(&entry.song_id) {
            warnings.push(ValidationWarning {
                entity_type: "liberationEntry".to_string(),
                entity_id: entry.id,
                field: "songId".to_string(),
                invalid_reference: entry.song_id,
                message: format!(
                    "Liberation entry {} references non-existent song {}",
                    entry.id, entry.song_id
                ),
            });
        }

        if !show_ids.contains(&entry.last_played_show_id) {
            warnings.push(ValidationWarning {
                entity_type: "liberationEntry".to_string(),
                entity_id: entry.id,
                field: "lastPlayedShowId".to_string(),
                invalid_reference: entry.last_played_show_id,
                message: format!(
                    "Liberation entry {} references non-existent show {}",
                    entry.id, entry.last_played_show_id
                ),
            });
        }

        if let Some(liberated_show_id) = entry.liberated_show_id {
            if !show_ids.contains(&liberated_show_id) {
                warnings.push(ValidationWarning {
                    entity_type: "liberationEntry".to_string(),
                    entity_id: entry.id,
                    field: "liberatedShowId".to_string(),
                    invalid_reference: liberated_show_id,
                    message: format!(
                        "Liberation entry {} references non-existent liberated show {}",
                        entry.id, liberated_show_id
                    ),
                });
            }
        }

        // Validate embedded song ID matches
        if entry.song.id != entry.song_id {
            warnings.push(ValidationWarning {
                entity_type: "liberationEntry".to_string(),
                entity_id: entry.id,
                field: "song.id".to_string(),
                invalid_reference: entry.song.id,
                message: format!(
                    "Liberation entry {} embedded song ID {} doesn't match songId {}",
                    entry.id, entry.song.id, entry.song_id
                ),
            });
        }
    }

    Ok(warnings)
}

/// Count unique IDs in a JSON array of entities.
///
/// Useful for statistics and debugging.
pub fn count_unique_ids<T: serde::de::DeserializeOwned>(json: &str, extractor: fn(&T) -> i64) -> Result<usize, JsError> {
    let set = build_id_set::<T>(json, extractor)?;
    Ok(set.len())
}

/// Check for duplicate IDs in a JSON array.
///
/// Returns list of duplicate IDs found.
pub fn find_duplicate_ids<T: serde::de::DeserializeOwned>(json: &str, extractor: fn(&T) -> i64) -> Result<Vec<i64>, JsError> {
    let items: Vec<T> = serde_json::from_str(json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let mut seen = HashSet::with_capacity(items.len());
    let mut duplicates = Vec::new();

    for item in items {
        let id = extractor(&item);
        if !seen.insert(id) {
            duplicates.push(id);
        }
    }

    Ok(duplicates)
}

// ==================== TESTS ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_id_set() {
        let json = r#"[{"id": 1, "title": "Song 1"}, {"id": 2, "title": "Song 2"}]"#;

        #[derive(serde::Deserialize)]
        struct TestItem { id: i64 }

        let set = build_id_set::<TestItem>(json, |item| item.id).unwrap();

        assert_eq!(set.len(), 2);
        assert!(set.contains(&1));
        assert!(set.contains(&2));
        assert!(!set.contains(&3));
    }

    #[test]
    fn test_find_duplicate_ids() {
        let json = r#"[{"id": 1}, {"id": 2}, {"id": 1}, {"id": 3}]"#;

        #[derive(serde::Deserialize)]
        struct TestItem { id: i64 }

        let duplicates = find_duplicate_ids::<TestItem>(json, |item| item.id).unwrap();

        assert_eq!(duplicates.len(), 1);
        assert_eq!(duplicates[0], 1);
    }
}
