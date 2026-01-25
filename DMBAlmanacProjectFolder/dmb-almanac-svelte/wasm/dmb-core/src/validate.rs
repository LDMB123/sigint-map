//! Foreign key validation module.
//!
//! Validates referential integrity across the database entities.
//! This is critical during data import to catch broken references.
//!
//! Performance: Uses FxHashSet for O(1) lookups on 150,000+ entries.

use crate::types::*;
use rustc_hash::FxHashSet;

/// Validate foreign key references across all entities
///
/// Returns a list of validation warnings for any broken references.
///
/// # Arguments
/// * `input` - Contains all ID sets and entities to validate
///
/// # Returns
/// Vector of ValidationWarning for each broken reference found
pub fn validate_foreign_keys(input: ValidationInput) -> Vec<ValidationWarning> {
    let mut warnings = Vec::new();

    // Build hash sets for O(1) lookup
    let venue_ids: FxHashSet<u32> = input.venue_ids.into_iter().collect();
    let tour_ids: FxHashSet<u32> = input.tour_ids.into_iter().collect();
    let song_ids: FxHashSet<u32> = input.song_ids.into_iter().collect();
    let show_ids: FxHashSet<u32> = input.show_ids.into_iter().collect();

    // Validate shows
    for show in &input.shows {
        if let Some(venue_id) = show.venue_id {
            if venue_id != 0 && !venue_ids.contains(&venue_id) {
                warnings.push(ValidationWarning {
                    entity_type: "show".to_string(),
                    entity_id: show.id,
                    field: "venueId".to_string(),
                    invalid_ref: venue_id,
                    message: format!(
                        "Show {} references non-existent venue {}",
                        show.id, venue_id
                    ),
                });
            }
        }

        if let Some(tour_id) = show.tour_id {
            if tour_id != 0 && !tour_ids.contains(&tour_id) {
                warnings.push(ValidationWarning {
                    entity_type: "show".to_string(),
                    entity_id: show.id,
                    field: "tourId".to_string(),
                    invalid_ref: tour_id,
                    message: format!(
                        "Show {} references non-existent tour {}",
                        show.id, tour_id
                    ),
                });
            }
        }
    }

    // Validate setlist entries
    for entry in &input.setlist_entries {
        if !show_ids.contains(&entry.show_id) {
            warnings.push(ValidationWarning {
                entity_type: "setlistEntry".to_string(),
                entity_id: entry.id,
                field: "showId".to_string(),
                invalid_ref: entry.show_id,
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
                invalid_ref: entry.song_id,
                message: format!(
                    "Setlist entry {} references non-existent song {}",
                    entry.id, entry.song_id
                ),
            });
        }
    }

    warnings
}

/// Quick validation that only counts broken references without details
///
/// Faster than full validation when you just need a pass/fail check.
pub fn count_broken_references(input: &ValidationInput) -> BrokenRefCount {
    let venue_ids: FxHashSet<u32> = input.venue_ids.iter().copied().collect();
    let tour_ids: FxHashSet<u32> = input.tour_ids.iter().copied().collect();
    let song_ids: FxHashSet<u32> = input.song_ids.iter().copied().collect();
    let show_ids: FxHashSet<u32> = input.show_ids.iter().copied().collect();

    let mut show_venue_broken = 0u32;
    let mut show_tour_broken = 0u32;
    let mut setlist_show_broken = 0u32;
    let mut setlist_song_broken = 0u32;

    for show in &input.shows {
        if let Some(venue_id) = show.venue_id {
            if venue_id != 0 && !venue_ids.contains(&venue_id) {
                show_venue_broken += 1;
            }
        }
        if let Some(tour_id) = show.tour_id {
            if tour_id != 0 && !tour_ids.contains(&tour_id) {
                show_tour_broken += 1;
            }
        }
    }

    for entry in &input.setlist_entries {
        if !show_ids.contains(&entry.show_id) {
            setlist_show_broken += 1;
        }
        if !song_ids.contains(&entry.song_id) {
            setlist_song_broken += 1;
        }
    }

    BrokenRefCount {
        show_venue_broken,
        show_tour_broken,
        setlist_show_broken,
        setlist_song_broken,
        total: show_venue_broken + show_tour_broken + setlist_show_broken + setlist_song_broken,
    }
}

/// Summary of broken reference counts
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrokenRefCount {
    pub show_venue_broken: u32,
    pub show_tour_broken: u32,
    pub setlist_show_broken: u32,
    pub setlist_song_broken: u32,
    pub total: u32,
}

/// Validate that IDs are unique within each entity type
pub fn validate_unique_ids(
    venue_ids: &[u32],
    tour_ids: &[u32],
    song_ids: &[u32],
    show_ids: &[u32],
) -> Vec<DuplicateIdWarning> {
    let mut warnings = Vec::new();

    fn find_duplicates(ids: &[u32], entity_type: &str) -> Vec<DuplicateIdWarning> {
        let mut seen = FxHashSet::default();
        let mut duplicates = Vec::new();

        for &id in ids {
            if !seen.insert(id) {
                duplicates.push(DuplicateIdWarning {
                    entity_type: entity_type.to_string(),
                    duplicate_id: id,
                });
            }
        }
        duplicates
    }

    warnings.extend(find_duplicates(venue_ids, "venue"));
    warnings.extend(find_duplicates(tour_ids, "tour"));
    warnings.extend(find_duplicates(song_ids, "song"));
    warnings.extend(find_duplicates(show_ids, "show"));

    warnings
}

/// Warning for duplicate IDs
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateIdWarning {
    pub entity_type: String,
    pub duplicate_id: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_foreign_keys_all_valid() {
        let input = ValidationInput {
            venue_ids: vec![1, 2, 3],
            tour_ids: vec![10, 20],
            song_ids: vec![100, 200, 300],
            show_ids: vec![1000, 2000],
            shows: vec![
                ShowForValidation {
                    id: 1000,
                    venue_id: Some(1),
                    tour_id: Some(10),
                },
                ShowForValidation {
                    id: 2000,
                    venue_id: Some(2),
                    tour_id: Some(20),
                },
            ],
            setlist_entries: vec![
                SetlistEntryForValidation {
                    id: 1,
                    show_id: 1000,
                    song_id: 100,
                },
                SetlistEntryForValidation {
                    id: 2,
                    show_id: 2000,
                    song_id: 200,
                },
            ],
        };

        let warnings = validate_foreign_keys(input);
        assert!(warnings.is_empty());
    }

    #[test]
    fn test_validate_foreign_keys_broken_refs() {
        let input = ValidationInput {
            venue_ids: vec![1, 2],
            tour_ids: vec![10],
            song_ids: vec![100],
            show_ids: vec![1000],
            shows: vec![ShowForValidation {
                id: 1000,
                venue_id: Some(999), // Invalid
                tour_id: Some(10),
            }],
            setlist_entries: vec![SetlistEntryForValidation {
                id: 1,
                show_id: 1000,
                song_id: 999, // Invalid
            }],
        };

        let warnings = validate_foreign_keys(input);
        assert_eq!(warnings.len(), 2);

        let venue_warning = warnings.iter().find(|w| w.field == "venueId");
        assert!(venue_warning.is_some());
        assert_eq!(venue_warning.unwrap().invalid_ref, 999);

        let song_warning = warnings.iter().find(|w| w.field == "songId");
        assert!(song_warning.is_some());
        assert_eq!(song_warning.unwrap().invalid_ref, 999);
    }

    #[test]
    fn test_count_broken_references() {
        let input = ValidationInput {
            venue_ids: vec![1],
            tour_ids: vec![10],
            song_ids: vec![100],
            show_ids: vec![1000],
            shows: vec![ShowForValidation {
                id: 1000,
                venue_id: Some(999), // Invalid
                tour_id: Some(999), // Invalid
            }],
            setlist_entries: vec![
                SetlistEntryForValidation {
                    id: 1,
                    show_id: 9999, // Invalid
                    song_id: 9999, // Invalid
                },
            ],
        };

        let counts = count_broken_references(&input);
        assert_eq!(counts.show_venue_broken, 1);
        assert_eq!(counts.show_tour_broken, 1);
        assert_eq!(counts.setlist_show_broken, 1);
        assert_eq!(counts.setlist_song_broken, 1);
        assert_eq!(counts.total, 4);
    }

    #[test]
    fn test_validate_unique_ids() {
        let warnings = validate_unique_ids(
            &[1, 2, 3, 2], // duplicate 2
            &[10, 20],
            &[100, 100, 200], // duplicate 100
            &[1000],
        );

        assert_eq!(warnings.len(), 2);
        assert!(warnings.iter().any(|w| w.entity_type == "venue" && w.duplicate_id == 2));
        assert!(warnings.iter().any(|w| w.entity_type == "song" && w.duplicate_id == 100));
    }
}
