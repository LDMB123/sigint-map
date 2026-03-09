use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;

use crate::data_utils::load_json_array;
use crate::pipeline_support::{
    json_i32_optional, json_i32_or_warn, json_i64_or_warn, EmbeddingInput,
};

pub(crate) fn build_embedding_input(source_dir: &Path, output: &Path) -> Result<()> {
    let songs = load_json_array(&source_dir.join("songs.json"))?;
    let venues = load_json_array(&source_dir.join("venues.json"))?;
    let guests = load_json_array(&source_dir.join("guests.json"))?;
    let tours = load_json_array(&source_dir.join("tours.json"))?;
    let releases = load_json_array(&source_dir.join("releases.json"))?;
    let shows = load_json_array(&source_dir.join("shows.json"))?;

    let venue_map = build_venue_label_map(&venues);
    let tour_map = build_tour_label_map(&tours);

    let mut items: Vec<EmbeddingInput> = Vec::new();
    items.extend(song_embedding_inputs(songs));
    items.extend(venue_embedding_inputs(venues));
    items.extend(guest_embedding_inputs(guests));
    items.extend(tour_embedding_inputs(tours));
    items.extend(release_embedding_inputs(releases));
    items.extend(show_embedding_inputs(shows, &venue_map, &tour_map));

    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("create output dir {}", parent.display()))?;
    }

    let file = File::create(output)
        .with_context(|| format!("write embedding input {}", output.display()))?;
    serde_json::to_writer_pretty(file, &items).context("serialize embedding input")?;
    Ok(())
}

fn build_venue_label_map(venues: &[serde_json::Value]) -> HashMap<i32, String> {
    let mut venue_map = HashMap::<i32, String>::new();
    for venue in venues {
        if let (Some(id), Some(name)) = (
            json_i32_optional(venue.get("id"), "embedding_input.venue", "id"),
            venue.get("name").and_then(|v| v.as_str()),
        ) {
            let city = venue.get("city").and_then(|v| v.as_str()).unwrap_or("");
            let state = venue.get("state").and_then(|v| v.as_str()).unwrap_or("");
            let country = venue.get("country").and_then(|v| v.as_str()).unwrap_or("");
            let mut location = String::new();
            if !city.is_empty() {
                location.push_str(city);
            }
            if !state.is_empty() {
                if !location.is_empty() {
                    location.push_str(", ");
                }
                location.push_str(state);
            }
            if !country.is_empty() {
                if !location.is_empty() {
                    location.push_str(", ");
                }
                location.push_str(country);
            }
            let label = if location.is_empty() {
                name.to_string()
            } else {
                format!("{name} ({location})")
            };
            venue_map.insert(id, label);
        }
    }
    venue_map
}

fn build_tour_label_map(tours: &[serde_json::Value]) -> HashMap<i32, String> {
    let mut tour_map = HashMap::<i32, String>::new();
    for tour in tours {
        if let (Some(id), Some(name)) = (
            json_i32_optional(tour.get("id"), "embedding_input.tour", "id"),
            tour.get("name").and_then(|v| v.as_str()),
        ) {
            let year = json_i64_or_warn(tour.get("year"), "embedding_input.tour", "year");
            let label = if year > 0 {
                format!("{year} {name}")
            } else {
                name.to_string()
            };
            tour_map.insert(id, label);
        }
    }
    tour_map
}

fn song_embedding_inputs(songs: Vec<serde_json::Value>) -> Vec<EmbeddingInput> {
    let mut items = Vec::new();
    for song in songs {
        let id = match json_i32_optional(song.get("id"), "embedding_input.song", "id") {
            Some(id) => id,
            None => continue,
        };
        let title = song
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if title.is_empty() {
            continue;
        }
        let slug = song
            .get("slug")
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        items.push(EmbeddingInput {
            id,
            kind: "song".to_string(),
            text: Some(format!("song {title}")),
            slug,
            label: Some(title.to_string()),
            vector: None,
        });
    }
    items
}

fn venue_embedding_inputs(venues: Vec<serde_json::Value>) -> Vec<EmbeddingInput> {
    let mut items = Vec::new();
    for venue in venues {
        let id = match json_i32_optional(venue.get("id"), "embedding_input.venue", "id") {
            Some(id) => id,
            None => continue,
        };
        let name = venue
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if name.is_empty() {
            continue;
        }
        let city = venue.get("city").and_then(|v| v.as_str()).unwrap_or("");
        let state = venue.get("state").and_then(|v| v.as_str()).unwrap_or("");
        let country = venue.get("country").and_then(|v| v.as_str()).unwrap_or("");
        let text = format!("venue {name} {city} {state} {country}");
        items.push(EmbeddingInput {
            id,
            kind: "venue".to_string(),
            text: Some(text),
            slug: None,
            label: Some(name.to_string()),
            vector: None,
        });
    }
    items
}

fn guest_embedding_inputs(guests: Vec<serde_json::Value>) -> Vec<EmbeddingInput> {
    let mut items = Vec::new();
    for guest in guests {
        let id = match json_i32_optional(guest.get("id"), "embedding_input.guest", "id") {
            Some(id) => id,
            None => continue,
        };
        let name = guest
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if name.is_empty() {
            continue;
        }
        let slug = guest
            .get("slug")
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        items.push(EmbeddingInput {
            id,
            kind: "guest".to_string(),
            text: Some(format!("guest {name}")),
            slug,
            label: Some(name.to_string()),
            vector: None,
        });
    }
    items
}

fn tour_embedding_inputs(tours: Vec<serde_json::Value>) -> Vec<EmbeddingInput> {
    let mut items = Vec::new();
    for tour in tours {
        let id = match json_i32_optional(tour.get("id"), "embedding_input.tour", "id") {
            Some(id) => id,
            None => continue,
        };
        let name = tour
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if name.is_empty() {
            continue;
        }
        let year = json_i64_or_warn(tour.get("year"), "embedding_input.tour", "year");
        let label = if year > 0 {
            format!("{year} {name}")
        } else {
            name.to_string()
        };
        items.push(EmbeddingInput {
            id,
            kind: "tour".to_string(),
            text: Some(format!("tour {label}")),
            slug: None,
            label: Some(label),
            vector: None,
        });
    }
    items
}

fn release_embedding_inputs(releases: Vec<serde_json::Value>) -> Vec<EmbeddingInput> {
    let mut items = Vec::new();
    for release in releases {
        let id = match json_i32_optional(release.get("id"), "embedding_input.release", "id") {
            Some(id) => id,
            None => continue,
        };
        let title = release
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if title.is_empty() {
            continue;
        }
        let slug = release
            .get("slug")
            .and_then(|v| v.as_str())
            .map(std::string::ToString::to_string);
        let release_type = release
            .get("releaseType")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        let text = if release_type.is_empty() {
            format!("release {title}")
        } else {
            format!("release {title} {release_type}")
        };
        items.push(EmbeddingInput {
            id,
            kind: "release".to_string(),
            text: Some(text),
            slug,
            label: Some(title.to_string()),
            vector: None,
        });
    }
    items
}

fn show_embedding_inputs(
    shows: Vec<serde_json::Value>,
    venue_map: &HashMap<i32, String>,
    tour_map: &HashMap<i32, String>,
) -> Vec<EmbeddingInput> {
    let mut items = Vec::new();
    for show in shows {
        let id = match json_i32_optional(show.get("id"), "embedding_input.show", "id") {
            Some(id) => id,
            None => continue,
        };
        let date = show
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim();
        if date.is_empty() {
            continue;
        }
        let venue_id = json_i32_or_warn(show.get("venueId"), "embedding_input.show", "venueId");
        let venue_label = venue_map
            .get(&venue_id)
            .cloned()
            .unwrap_or_else(|| "Unknown venue".to_string());
        let tour_id = json_i32_or_warn(show.get("tourId"), "embedding_input.show", "tourId");
        let tour_label = tour_map.get(&tour_id).cloned().unwrap_or_default();
        let label = if tour_label.is_empty() {
            format!("{date} • {venue_label}")
        } else {
            format!("{date} • {venue_label} • {tour_label}")
        };
        let text = format!("show {date} at {venue_label} {tour_label}");
        items.push(EmbeddingInput {
            id,
            kind: "show".to_string(),
            text: Some(text),
            slug: None,
            label: Some(label),
            vector: None,
        });
    }
    items
}
