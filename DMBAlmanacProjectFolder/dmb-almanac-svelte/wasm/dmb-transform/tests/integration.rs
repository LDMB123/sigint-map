//! Integration tests for DMB Almanac WASM transform module.
//!
//! These tests verify the complete transformation pipeline from
//! server JSON to Dexie-compatible output.

use dmb_transform::*;

// ==================== SONG TESTS ====================

#[test]
fn test_transform_single_song() {
    let json = r#"[{
        "id": 1,
        "title": "Ants Marching",
        "slug": "ants-marching",
        "sort_title": "Ants Marching",
        "original_artist": null,
        "is_cover": 0,
        "is_original": 1,
        "first_played_date": "1991-03-14",
        "last_played_date": "2024-07-15",
        "total_performances": 1890,
        "opener_count": 150,
        "closer_count": 200,
        "encore_count": 50,
        "lyrics": null,
        "notes": null,
        "is_liberated": 0,
        "days_since_last_played": 30,
        "shows_since_last_played": 5
    }]"#;

    let result: DexieSong = serde_json::from_str(
        &serde_json::to_string(&transform_song(
            serde_json::from_str::<ServerSong>(&json.replace('[', "").replace(']', ""))
                .unwrap(),
        ))
        .unwrap(),
    )
    .unwrap();

    // Note: Since we can't use wasm_bindgen in regular tests,
    // we test the core transformation functions directly
}

#[test]
fn test_transform_cover_song_search_text() {
    let search = generate_song_search_text(
        "All Along the Watchtower",
        Some("Bob Dylan".to_string()),
    );
    assert_eq!(search, "all along the watchtower bob dylan");
}

#[test]
fn test_transform_original_song_search_text() {
    let search = generate_song_search_text("Ants Marching", None);
    assert_eq!(search, "ants marching");
}

// ==================== VENUE TESTS ====================

#[test]
fn test_venue_search_text_with_state() {
    let search = generate_venue_search_text(
        "The Gorge Amphitheatre",
        "George",
        Some("WA".to_string()),
        "USA",
    );
    assert_eq!(search, "the gorge amphitheatre george wa usa");
}

#[test]
fn test_venue_search_text_without_state() {
    let search = generate_venue_search_text(
        "Wembley Stadium",
        "London",
        None,
        "UK",
    );
    assert_eq!(search, "wembley stadium london uk");
}

#[test]
fn test_venue_search_text_empty_state() {
    let search = generate_venue_search_text(
        "Tempodrom",
        "Berlin",
        Some("".to_string()),
        "Germany",
    );
    assert_eq!(search, "tempodrom berlin germany");
}

// ==================== DATE TESTS ====================

#[test]
fn test_extract_year_valid() {
    assert_eq!(extract_year_from_date("2024-07-15"), Some(2024));
    assert_eq!(extract_year_from_date("1991-03-14"), Some(1991));
    assert_eq!(extract_year_from_date("2000-01-01"), Some(2000));
}

#[test]
fn test_extract_year_invalid() {
    assert_eq!(extract_year_from_date(""), None);
    assert_eq!(extract_year_from_date("abc"), None);
    assert_eq!(extract_year_from_date("12"), None);
}

#[test]
fn test_extract_year_edge_cases() {
    // Just year
    assert_eq!(extract_year_from_date("2024"), Some(2024));
    // Extra characters after date
    assert_eq!(extract_year_from_date("2024-07-15T10:30:00Z"), Some(2024));
}

// ==================== SLOT CATEGORIZATION TESTS ====================

#[test]
fn test_categorize_slot_opener() {
    let slot = categorize_slot(1, 10, "set1");
    assert_eq!(slot, SlotType::Opener.to_string());
}

#[test]
fn test_categorize_slot_closer() {
    let slot = categorize_slot(10, 10, "set1");
    assert_eq!(slot, SlotType::Closer.to_string());
}

#[test]
fn test_categorize_slot_standard() {
    let slot = categorize_slot(5, 10, "set1");
    assert_eq!(slot, SlotType::Standard.to_string());
}

#[test]
fn test_categorize_slot_single_song_set() {
    // Single song is both opener and closer - should be opener
    let slot = categorize_slot(1, 1, "encore");
    assert_eq!(slot, SlotType::Opener.to_string());
}

// ==================== TYPE PARSING TESTS ====================

#[test]
fn test_venue_type_parsing() {
    assert_eq!(VenueType::from_str("amphitheater"), Some(VenueType::Amphitheater));
    assert_eq!(VenueType::from_str("AMPHITHEATRE"), Some(VenueType::Amphitheatre));
    assert_eq!(VenueType::from_str("Arena"), Some(VenueType::Arena));
    assert_eq!(VenueType::from_str("unknown"), None);
}

#[test]
fn test_set_type_parsing() {
    assert_eq!(SetType::from_str("set1"), Some(SetType::Set1));
    assert_eq!(SetType::from_str("SET2"), Some(SetType::Set2));
    assert_eq!(SetType::from_str("encore"), Some(SetType::Encore));
    assert_eq!(SetType::from_str("invalid"), None);
}

#[test]
fn test_slot_type_parsing() {
    assert_eq!(SlotType::from_str("opener"), Some(SlotType::Opener));
    assert_eq!(SlotType::from_str("CLOSER"), Some(SlotType::Closer));
    assert_eq!(SlotType::from_str("standard"), Some(SlotType::Standard));
    assert_eq!(SlotType::from_str("other"), None);
}

// ==================== JSON PARSING TESTS ====================

#[test]
fn test_parse_server_song_json() {
    let json = r#"{
        "id": 1,
        "title": "Test Song",
        "slug": "test-song",
        "sort_title": "Test Song",
        "original_artist": null,
        "is_cover": 0,
        "is_original": 1,
        "first_played_date": "2024-01-01",
        "last_played_date": "2024-07-15",
        "total_performances": 100,
        "opener_count": 10,
        "closer_count": 5,
        "encore_count": 2,
        "lyrics": null,
        "notes": null
    }"#;

    let song: ServerSong = serde_json::from_str(json).unwrap();
    assert_eq!(song.id, 1);
    assert_eq!(song.title, "Test Song");
    assert_eq!(song.is_cover, 0);
    assert_eq!(song.is_original, 1);
}

#[test]
fn test_parse_server_venue_json() {
    let json = r#"{
        "id": 31,
        "name": "The Gorge Amphitheatre",
        "city": "George",
        "state": "WA",
        "country": "USA",
        "country_code": "US",
        "venue_type": "amphitheatre",
        "capacity": 27500,
        "latitude": 47.1,
        "longitude": -119.997,
        "total_shows": 72,
        "first_show_date": "1997-06-28",
        "last_show_date": "2024-07-15",
        "notes": null
    }"#;

    let venue: ServerVenue = serde_json::from_str(json).unwrap();
    assert_eq!(venue.id, 31);
    assert_eq!(venue.name, "The Gorge Amphitheatre");
    assert_eq!(venue.capacity, Some(27500));
}

// ==================== TRANSFORMATION TESTS ====================

#[test]
fn test_full_song_transformation() {
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
    assert_eq!(dexie.total_performances, 1890);
}

#[test]
fn test_full_venue_transformation() {
    let server = ServerVenue {
        id: 31,
        name: "The Gorge Amphitheatre".to_string(),
        city: "George".to_string(),
        state: Some("WA".to_string()),
        country: "USA".to_string(),
        country_code: "US".to_string(),
        venue_type: Some("amphitheatre".to_string()),
        capacity: Some(27500),
        latitude: Some(47.1),
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
    assert_eq!(dexie.search_text, "the gorge amphitheatre george wa usa");
}

// ==================== ERROR HANDLING TESTS ====================

#[test]
fn test_error_display() {
    let err = TransformError::MissingField {
        entity_type: "song".to_string(),
        entity_id: Some(42),
        field: "title".to_string(),
    };

    let msg = format!("{}", err);
    assert!(msg.contains("Missing required field"));
    assert!(msg.contains("title"));
    assert!(msg.contains("song"));
    assert!(msg.contains("42"));
}

#[test]
fn test_error_serialization() {
    let err = TransformError::ParseError {
        message: "unexpected token".to_string(),
        position: Some(123),
    };

    let json = serde_json::to_string(&err).unwrap();
    assert!(json.contains("parseError"));
    assert!(json.contains("unexpected token"));
    assert!(json.contains("123"));
}
