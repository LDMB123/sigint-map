use super::*;
use leptos::prelude::RwSignal;
#[cfg(feature = "hydrate")]
use leptos::prelude::{GetUntracked, Set};

#[cfg(feature = "hydrate")]
use dmb_core::SETLIST_CHUNK_PREFIX;
#[cfg(feature = "hydrate")]
use dmb_idb::{
    TABLE_CURATED_LISTS, TABLE_CURATED_LIST_ITEMS, TABLE_GUESTS, TABLE_GUEST_APPEARANCES,
    TABLE_LIBERATION_LIST, TABLE_RELEASES, TABLE_RELEASE_TRACKS, TABLE_SETLIST_ENTRIES,
    TABLE_SHOWS, TABLE_SONGS, TABLE_SONG_STATS, TABLE_TOURS, TABLE_VENUES,
};

#[cfg(feature = "hydrate")]
pub(crate) const IMPORT_SPECS: &[ImportSpec] = &[
    ImportSpec {
        file: "venues.json",
        store: TABLE_VENUES,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "songs.json",
        store: TABLE_SONGS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "tours.json",
        store: TABLE_TOURS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "shows.json",
        store: TABLE_SHOWS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "setlist-entries.json",
        store: TABLE_SETLIST_ENTRIES,
        chunk_prefix: Some(SETLIST_CHUNK_PREFIX),
    },
    ImportSpec {
        file: "guests.json",
        store: TABLE_GUESTS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "guest-appearances.json",
        store: TABLE_GUEST_APPEARANCES,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "liberation-list.json",
        store: TABLE_LIBERATION_LIST,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "song-statistics.json",
        store: TABLE_SONG_STATS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "releases.json",
        store: TABLE_RELEASES,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "release-tracks.json",
        store: TABLE_RELEASE_TRACKS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "curated-lists.json",
        store: TABLE_CURATED_LISTS,
        chunk_prefix: None,
    },
    ImportSpec {
        file: "curated-list-items.json",
        store: TABLE_CURATED_LIST_ITEMS,
        chunk_prefix: None,
    },
];

#[cfg(feature = "hydrate")]
pub(crate) fn build_import_work_items(manifest: &DataManifest) -> Vec<ImportWorkItem> {
    let mut items = Vec::with_capacity(IMPORT_SPECS.len() + manifest.files.len());
    for spec in IMPORT_SPECS {
        if let Some(prefix) = spec.chunk_prefix {
            let chunk_files = manifest.chunk_files_with_prefix(prefix);
            if !chunk_files.is_empty() {
                for name in chunk_files {
                    let url = format!("/data/{name}");
                    items.push(ImportWorkItem {
                        label: name,
                        url,
                        store: spec.store,
                        prechunked: true,
                    });
                }
                continue;
            }
        }

        items.push(ImportWorkItem {
            label: spec.file.to_string(),
            url: format!("/data/{}", spec.file),
            store: spec.store,
            prechunked: false,
        });
    }
    items
}

#[cfg(feature = "hydrate")]
pub(crate) fn set_import_progress(
    status: RwSignal<ImportStatus>,
    message: impl Into<String>,
    progress: f32,
) {
    let tuning = status.get_untracked().tuning;
    status.set(ImportStatus {
        message: message.into(),
        progress: progress.clamp(0.0, 1.0),
        done: false,
        error: None,
        can_reset: false,
        tuning,
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn set_import_progress_with_tuning(
    status: RwSignal<ImportStatus>,
    message: impl Into<String>,
    progress: f32,
    tuning: Option<ImportTuningSnapshot>,
) {
    status.set(ImportStatus {
        message: message.into(),
        progress: progress.clamp(0.0, 1.0),
        done: false,
        error: None,
        can_reset: false,
        tuning,
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn import_error_status(message: String, progress: f32, error: String) -> ImportStatus {
    ImportStatus {
        message,
        progress: progress.clamp(0.0, 1.0),
        done: false,
        error: Some(error),
        can_reset: true,
        tuning: None,
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn set_import_ready(status: RwSignal<ImportStatus>) {
    status.set(ImportStatus {
        message: "Offline data ready".to_string(),
        progress: 1.0,
        done: true,
        error: None,
        can_reset: false,
        tuning: None,
    });
}
