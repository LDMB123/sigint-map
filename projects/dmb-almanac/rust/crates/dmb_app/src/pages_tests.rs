use super::{
    curated_item_href, normalize_guests, normalize_releases, normalize_search_filter,
    normalize_show_summaries, normalize_songs, normalize_tours, normalize_venues,
    pages_detail_support::setlist_set_counts, release_track_disc_counts,
    release_track_matches_query, ShowSummary,
};
use dmb_core::{CuratedListItem, Guest, Release, ReleaseTrack, SetlistEntry, Song, Tour, Venue};

#[test]
fn normalize_show_summaries_sorts_by_date_desc_then_id() {
    let input = vec![
        ShowSummary {
            id: 2,
            date: "2024-07-10".to_string(),
            year: 2024,
            venue_id: 1,
            venue_name: "B".to_string(),
            venue_city: "x".to_string(),
            venue_state: None,
            tour_name: None,
            tour_year: None,
        },
        ShowSummary {
            id: 1,
            date: "2024-07-10".to_string(),
            year: 2024,
            venue_id: 2,
            venue_name: "A".to_string(),
            venue_city: "y".to_string(),
            venue_state: None,
            tour_name: None,
            tour_year: None,
        },
        ShowSummary {
            id: 3,
            date: "2023-08-01".to_string(),
            year: 2023,
            venue_id: 3,
            venue_name: "C".to_string(),
            venue_city: "z".to_string(),
            venue_state: None,
            tour_name: None,
            tour_year: None,
        },
    ];
    let out = normalize_show_summaries(input, 2);
    assert_eq!(out.len(), 2);
    assert_eq!(out[0].id, 2);
    assert_eq!(out[1].id, 1);
}

#[test]
fn normalize_songs_sorts_by_performances_desc() {
    let input = vec![
        Song {
            id: 1,
            slug: "a".to_string(),
            title: "A".to_string(),
            sort_title: None,
            total_performances: Some(10),
            last_played_date: None,
            is_liberated: None,
            opener_count: None,
            closer_count: None,
            encore_count: None,
            search_text: None,
        },
        Song {
            id: 2,
            slug: "b".to_string(),
            title: "B".to_string(),
            sort_title: None,
            total_performances: Some(25),
            last_played_date: None,
            is_liberated: None,
            opener_count: None,
            closer_count: None,
            encore_count: None,
            search_text: None,
        },
    ];
    let out = normalize_songs(input, 50);
    assert_eq!(out[0].id, 2);
    assert_eq!(out[1].id, 1);
}

#[test]
fn normalize_venues_and_guests_respect_limit() {
    let venues = vec![
        Venue {
            id: 1,
            name: "A".to_string(),
            city: "x".to_string(),
            state: None,
            country: "US".to_string(),
            country_code: None,
            venue_type: None,
            total_shows: Some(10),
            search_text: None,
        },
        Venue {
            id: 2,
            name: "B".to_string(),
            city: "x".to_string(),
            state: None,
            country: "US".to_string(),
            country_code: None,
            venue_type: None,
            total_shows: Some(20),
            search_text: None,
        },
    ];
    let guests = vec![
        Guest {
            id: 1,
            slug: "a".to_string(),
            name: "A".to_string(),
            total_appearances: Some(7),
            search_text: None,
        },
        Guest {
            id: 2,
            slug: "b".to_string(),
            name: "B".to_string(),
            total_appearances: Some(11),
            search_text: None,
        },
    ];
    let venues_out = normalize_venues(venues, 1);
    let guests_out = normalize_guests(guests, 1);
    assert_eq!(venues_out.len(), 1);
    assert_eq!(venues_out[0].id, 2);
    assert_eq!(guests_out.len(), 1);
    assert_eq!(guests_out[0].id, 2);
}

#[test]
fn normalize_tours_sorts_by_year_desc() {
    let input = vec![
        Tour {
            id: 1,
            year: 2023,
            name: "Tour 2023".to_string(),
            total_shows: Some(40),
            search_text: None,
        },
        Tour {
            id: 2,
            year: 2024,
            name: "Tour 2024".to_string(),
            total_shows: Some(20),
            search_text: None,
        },
    ];
    let out = normalize_tours(input, 10);
    assert_eq!(out[0].year, 2024);
    assert_eq!(out[1].year, 2023);
}

#[test]
fn normalize_releases_sorts_by_release_date_desc() {
    let input = vec![
        Release {
            id: 1,
            title: "Older".to_string(),
            slug: "older".to_string(),
            release_type: None,
            release_date: Some("2010-01-01".to_string()),
            search_text: None,
        },
        Release {
            id: 2,
            title: "Newer".to_string(),
            slug: "newer".to_string(),
            release_type: None,
            release_date: Some("2020-01-01".to_string()),
            search_text: None,
        },
    ];
    let out = normalize_releases(input, 10);
    assert_eq!(out[0].id, 2);
    assert_eq!(out[1].id, 1);
}

#[test]
fn normalize_helpers_handle_empty_input() {
    assert!(normalize_show_summaries(Vec::new(), 10).is_empty());
    assert!(normalize_songs(Vec::new(), 10).is_empty());
    assert!(normalize_venues(Vec::new(), 10).is_empty());
    assert!(normalize_guests(Vec::new(), 10).is_empty());
    assert!(normalize_tours(Vec::new(), 10).is_empty());
    assert!(normalize_releases(Vec::new(), 10).is_empty());
}

#[test]
fn curated_item_href_maps_legacy_release_and_show_links() {
    let release = CuratedListItem {
        id: 1,
        list_id: 1,
        position: 1,
        item_type: "release".to_string(),
        show_id: None,
        song_id: None,
        venue_id: None,
        guest_id: None,
        release_id: None,
        item_title: Some("Away From the World".to_string()),
        item_link: Some("https://www.dmbalmanac.com//ReleaseView.aspx?release=14".to_string()),
        notes: None,
        metadata: None,
        created_at: None,
    };
    assert_eq!(
        curated_item_href(&release).as_deref(),
        Some("/releases/away-from-the-world")
    );

    let unknown_release = CuratedListItem {
        id: 11,
        list_id: 22,
        position: 189,
        item_type: "release".to_string(),
        show_id: None,
        song_id: None,
        venue_id: None,
        guest_id: None,
        release_id: None,
        item_title: Some("Unknown".to_string()),
        item_link: Some("https://www.dmbalmanac.com//ReleaseView.aspx?release=14".to_string()),
        notes: None,
        metadata: None,
        created_at: None,
    };
    assert_eq!(
        curated_item_href(&unknown_release).as_deref(),
        Some("/releases/away-from-the-world")
    );

    let show = CuratedListItem {
        id: 2,
        list_id: 1,
        position: 2,
        item_type: "show".to_string(),
        show_id: None,
        song_id: None,
        venue_id: None,
        guest_id: None,
        release_id: None,
        item_title: Some("08.15.92".to_string()),
        item_link: Some("https://www.dmbalmanac.com//TourShowSet.aspx?id=453094313".to_string()),
        notes: None,
        metadata: None,
        created_at: None,
    };
    assert_eq!(
        curated_item_href(&show).as_deref(),
        Some("/search?q=1992-08-15")
    );

    let note_backed_show = CuratedListItem {
        id: 3,
        list_id: 3,
        position: 1,
        item_type: "show".to_string(),
        show_id: None,
        song_id: None,
        venue_id: None,
        guest_id: None,
        release_id: None,
        item_title: Some("13:16".to_string()),
        item_link: Some("https://www.dmbalmanac.com//TourShowSet.aspx?id=48318".to_string()),
        notes: Some(
            "1 | 8:08 | 09.04.11 | The Gorge Amphitheatre, George, WA | (lyrics)".to_string(),
        ),
        metadata: None,
        created_at: None,
    };
    assert_eq!(
        curated_item_href(&note_backed_show).as_deref(),
        Some("/search?q=2011-09-04")
    );

    let entry_backed_show = CuratedListItem {
        id: 4,
        list_id: 24,
        position: 3,
        item_type: "show".to_string(),
        show_id: None,
        song_id: None,
        venue_id: None,
        guest_id: None,
        release_id: None,
        item_title: Some("Over the Rainbow".to_string()),
        item_link: Some("https://www.dmbalmanac.com//TourShowSet.aspx?id=55684".to_string()),
        notes: Some("Boyd, Carter, Dave, LeRoi, Boyd".to_string()),
        metadata: None,
        created_at: None,
    };
    assert_eq!(
        curated_item_href(&entry_backed_show).as_deref(),
        Some("/search?q=1994-04-20")
    );
}

#[test]
fn setlist_set_counts_groups_entries_by_set_name() {
    let entries = vec![
        SetlistEntry {
            id: 1,
            show_id: 1,
            song_id: 1,
            position: 1,
            set_name: Some("main set".to_string()),
            slot: None,
            show_date: None,
            year: None,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: None,
            is_tease: None,
            tease_of_song_id: None,
            notes: None,
            song: None,
        },
        SetlistEntry {
            id: 2,
            show_id: 1,
            song_id: 2,
            position: 2,
            set_name: None,
            slot: None,
            show_date: None,
            year: None,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: None,
            is_tease: None,
            tease_of_song_id: None,
            notes: None,
            song: None,
        },
        SetlistEntry {
            id: 3,
            show_id: 1,
            song_id: 3,
            position: 3,
            set_name: Some("encore".to_string()),
            slot: None,
            show_date: None,
            year: None,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: None,
            is_tease: None,
            tease_of_song_id: None,
            notes: None,
            song: None,
        },
        SetlistEntry {
            id: 4,
            show_id: 1,
            song_id: 4,
            position: 4,
            set_name: Some("main set".to_string()),
            slot: None,
            show_date: None,
            year: None,
            duration_seconds: None,
            segue_into_song_id: None,
            is_segue: None,
            is_tease: None,
            tease_of_song_id: None,
            notes: None,
            song: None,
        },
    ];

    let counts = setlist_set_counts(&entries);
    assert_eq!(
        counts,
        vec![
            ("main set".to_string(), 2),
            ("unspecified".to_string(), 1),
            ("encore".to_string(), 1),
        ]
    );
}

#[test]
fn release_track_disc_counts_returns_sorted_disc_counts() {
    let tracks = vec![
        ReleaseTrack {
            id: 1,
            release_id: 1,
            song_id: Some(1),
            show_id: None,
            track_number: Some(1),
            disc_number: Some(2),
            duration_seconds: None,
            notes: None,
        },
        ReleaseTrack {
            id: 2,
            release_id: 1,
            song_id: Some(2),
            show_id: None,
            track_number: Some(2),
            disc_number: Some(1),
            duration_seconds: None,
            notes: None,
        },
        ReleaseTrack {
            id: 3,
            release_id: 1,
            song_id: Some(3),
            show_id: None,
            track_number: Some(3),
            disc_number: Some(2),
            duration_seconds: None,
            notes: None,
        },
    ];

    let counts = release_track_disc_counts(&tracks);
    assert_eq!(
        counts,
        vec![("disc-1".to_string(), 1), ("disc-2".to_string(), 2),]
    );
}

#[test]
fn release_track_matches_query_supports_keywords_and_notes() {
    let live_track = ReleaseTrack {
        id: 1,
        release_id: 1,
        song_id: Some(10),
        show_id: Some(42),
        track_number: Some(7),
        disc_number: Some(1),
        duration_seconds: Some(320),
        notes: Some("Rare acoustic version".to_string()),
    };
    let studio_track = ReleaseTrack {
        id: 2,
        release_id: 1,
        song_id: Some(11),
        show_id: None,
        track_number: Some(8),
        disc_number: Some(1),
        duration_seconds: Some(280),
        notes: None,
    };

    assert!(release_track_matches_query(&live_track, "live"));
    assert!(release_track_matches_query(&live_track, "acoustic"));
    assert!(release_track_matches_query(&live_track, "42"));
    assert!(!release_track_matches_query(&live_track, "studio"));
    assert!(release_track_matches_query(&studio_track, "studio"));
}

#[test]
fn normalize_search_filter_accepts_known_values() {
    assert_eq!(normalize_search_filter("song"), "song");
    assert_eq!(normalize_search_filter("SHOW"), "show");
    assert_eq!(normalize_search_filter(" venue "), "venue");
    assert_eq!(normalize_search_filter("invalid"), "all");
    assert_eq!(normalize_search_filter(""), "all");
}
