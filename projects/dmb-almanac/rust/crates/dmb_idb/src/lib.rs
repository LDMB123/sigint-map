use serde::{de::DeserializeOwned, Serialize};
use wasm_bindgen::prelude::*;

use dmb_core::{
    AnnIndexMeta, CuratedList, CuratedListItem, EmbeddingChunk, EmbeddingManifest, Guest,
    LiberationEntry, Release, ReleaseTrack, SearchResult, SetlistEntry, Show, Song, Tour,
    UserAttendedShow, Venue,
};

#[cfg(target_arch = "wasm32")]
use dmb_core::prefix_score;

mod schema;

pub use schema::*;

#[derive(Debug, Clone, Copy)]
pub struct BulkPutOptions {
    pub tx_batch_size: usize,
}

impl Default for BulkPutOptions {
    fn default() -> Self {
        Self {
            tx_batch_size: 2_000,
        }
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct BulkPutStats {
    pub inserted: u32,
    pub transaction_count: u32,
    pub max_tx_ms: f64,
}

cfg_if::cfg_if! {
    if #[cfg(target_arch = "wasm32")] {
        use idb::{
            CursorDirection, Database, DatabaseEvent, Factory, IndexParams, KeyPath, KeyRange,
            ObjectStoreParams, Query, TransactionMode,
        };
        use js_sys::{Array, Date, Function, Reflect};
        use std::cmp::Ordering;
        use wasm_bindgen::{JsCast, JsValue};
        use wasm_bindgen_futures::JsFuture;

        type Result<T> = std::result::Result<T, JsValue>;

        fn js_error(message: impl std::fmt::Display) -> JsValue {
            JsValue::from_str(&message.to_string())
        }

        trait JsResultExt<T> {
            fn js(self) -> Result<T>;
        }

        impl<T, E: std::fmt::Debug> JsResultExt<T> for std::result::Result<T, E> {
            fn js(self) -> Result<T> {
                self.map_err(|e| js_error(format!("{e:?}")))
            }
        }

        #[derive(Debug, Clone)]
        struct IndexSpec {
            name: String,
            key_path: KeyPath,
            unique: bool,
            multi_entry: bool,
        }

        #[derive(Debug, Clone)]
        struct StoreSpec {
            name: &'static str,
            key_path: KeyPath,
            auto_increment: bool,
            indexes: Vec<IndexSpec>,
        }

        fn parse_schema(name: &'static str, schema: &'static str) -> StoreSpec {
            let mut tokens = schema.split(',').map(|t| t.trim()).filter(|t| !t.is_empty());
            let primary = tokens.next().unwrap_or("id");

            let (key_path, auto_increment) = if let Some(stripped) = primary.strip_prefix("++") {
                (KeyPath::new_single(stripped), true)
            } else if let Some(stripped) = primary.strip_prefix('&') {
                (KeyPath::new_single(stripped), false)
            } else {
                (KeyPath::new_single(primary), false)
            };

            let mut indexes = Vec::new();
            for token in tokens {
                let mut unique = false;
                let mut multi_entry = false;
                let mut name_token = token;

                while let Some(stripped) = name_token.strip_prefix('&') {
                    unique = true;
                    name_token = stripped;
                }

                while let Some(stripped) = name_token.strip_prefix('*') {
                    multi_entry = true;
                    name_token = stripped;
                }

                if name_token.starts_with('[') && name_token.ends_with(']') {
                    let inner = &name_token[1..name_token.len() - 1];
                    let fields: Vec<&str> = inner.split('+').map(|s| s.trim()).collect();
                    indexes.push(IndexSpec {
                        name: inner.to_string(),
                        key_path: KeyPath::new_array(fields),
                        unique,
                        multi_entry,
                    });
                } else {
                    indexes.push(IndexSpec {
                        name: name_token.to_string(),
                        key_path: KeyPath::new_single(name_token),
                        unique,
                        multi_entry,
                    });
                }
            }

            StoreSpec {
                name,
                key_path,
                auto_increment,
                indexes,
            }
        }

        fn store_specs() -> Vec<StoreSpec> {
            SCHEMA_V12_REFERENCE
                .iter()
                .map(|(name, schema)| parse_schema(name, schema))
                .collect()
        }

        fn create_store(db: &Database, spec: &StoreSpec) -> Result<()> {
            let mut params = ObjectStoreParams::new();
            params.auto_increment(spec.auto_increment);
            params.key_path(Some(spec.key_path.clone()));

            let store = db.create_object_store(spec.name, params).js()?;
            for index in &spec.indexes {
                if matches!(index.key_path, KeyPath::Single(ref key) if key == "id") {
                    continue;
                }
                let mut params = IndexParams::new();
                params.unique(index.unique);
                params.multi_entry(index.multi_entry);
                store
                    .create_index(&index.name, index.key_path.clone(), Some(params))
                    .js()?;
            }
            Ok(())
        }

        const IDB_OPEN_BLOCKED_COUNT_KEY: &str = "dmb-idb-open-blocked-count";
        const IDB_OPEN_BLOCKED_LAST_KEY: &str = "dmb-idb-open-blocked-last";
        const IDB_VERSIONCHANGE_COUNT_KEY: &str = "dmb-idb-versionchange-count";
        const IDB_VERSIONCHANGE_LAST_KEY: &str = "dmb-idb-versionchange-last";

        fn with_local_storage(mut f: impl FnMut(&web_sys::Storage)) {
            let Some(window) = web_sys::window() else {
                return;
            };
            let Ok(Some(storage)) = window.local_storage() else {
                return;
            };
            f(&storage);
        }

        fn read_storage_u64(key: &str) -> u64 {
            let mut current = 0;
            with_local_storage(|storage| {
                current = storage
                    .get_item(key)
                    .ok()
                    .flatten()
                    .and_then(|raw| raw.parse::<u64>().ok())
                    .unwrap_or(0);
            });
            current
        }

        fn write_storage_value(key: &str, value: &str) {
            with_local_storage(|storage| {
                let _ = storage.set_item(key, value);
            });
        }

        fn bump_storage_counter(key: &str) {
            let next = read_storage_u64(key).saturating_add(1);
            write_storage_value(key, &next.to_string());
        }

        pub async fn open_db() -> Result<Database> {
            let factory = Factory::new().js()?;
            let mut request = factory.open(DB_NAME, Some(DB_VERSION)).js()?;

            request.on_blocked(|event| {
                bump_storage_counter(IDB_OPEN_BLOCKED_COUNT_KEY);
                write_storage_value(IDB_OPEN_BLOCKED_LAST_KEY, &Date::now().to_string());
                web_sys::console::warn_1(&JsValue::from_str(&format!(
                    "[IDB] open blocked for `{}`: old_version={:?} new_version={:?}. Close other tabs using the app.",
                    DB_NAME,
                    event.old_version().ok(),
                    event.new_version().ok().flatten()
                )));
            });

            request.on_upgrade_needed(|event| {
                let db = match event.database() {
                    Ok(db) => db,
                    Err(err) => {
                        web_sys::console::error_1(&JsValue::from_str(&format!(
                            "[IDB] upgrade event database() failed: {err:?}"
                        )));
                        return;
                    }
                };
                for spec in store_specs() {
                    if db.store_names().iter().any(|name| name == spec.name) {
                        continue;
                    }
                    if let Err(err) = create_store(&db, &spec) {
                        web_sys::console::error_1(&JsValue::from_str(&format!(
                            "[IDB] store create failed: {:?}",
                            err
                        )));
                    }
                }
            });

            let mut db = request.await.js()?;
            db.on_version_change(|event| {
                bump_storage_counter(IDB_VERSIONCHANGE_COUNT_KEY);
                write_storage_value(IDB_VERSIONCHANGE_LAST_KEY, &Date::now().to_string());
                if let Ok(database) = event.database() {
                    database.close();
                }
                web_sys::console::warn_1(&JsValue::from_str(&format!(
                    "[IDB] versionchange received for `{}`. Closed stale connection; refresh if needed.",
                    DB_NAME
                )));
            });
            Ok(db)
        }

        async fn get_by_key<T: serde::de::DeserializeOwned>(
            store_name: &str,
            key: JsValue,
        ) -> Result<Option<T>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let value: Option<JsValue> = store.get(key).js()?.await.js()?;
            tx.await.js()?;

            value
                .map(|v| serde_wasm_bindgen::from_value(v))
                .transpose()
                .js()
        }

        pub async fn count_store(store_name: &str) -> Result<u32> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let count = store.count(None).js()?.await.js()?;
            tx.await.js()?;
            Ok(count as u32)
        }

        pub async fn count_stores_with_missing(
            store_names: &[&str],
        ) -> Result<(Vec<(String, u32)>, Vec<String>)> {
            if store_names.is_empty() {
                return Ok((Vec::new(), Vec::new()));
            }

            let db = open_db().await?;
            let known_stores = db.store_names();
            let mut existing: Vec<&str> = Vec::new();
            let mut missing: Vec<String> = Vec::new();
            for store in store_names {
                if known_stores.iter().any(|candidate| candidate == *store) {
                    existing.push(*store);
                } else {
                    missing.push((*store).to_string());
                }
            }

            if existing.is_empty() {
                return Ok((Vec::new(), missing));
            }

            let tx = db.transaction(&existing, TransactionMode::ReadOnly).js()?;
            let mut counts = Vec::with_capacity(existing.len());
            for store_name in existing {
                let store = tx.object_store(store_name).js()?;
                let count = store.count(None).js()?.await.js()?;
                counts.push((store_name.to_string(), count as u32));
            }
            tx.await.js()?;
            Ok((counts, missing))
        }

        pub async fn get_show(id: i32) -> Result<Option<Show>> {
            get_by_key(TABLE_SHOWS, JsValue::from_f64(id as f64)).await
        }

        pub async fn get_song(slug: &str) -> Result<Option<Song>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_SONGS], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(TABLE_SONGS).js()?;
            let index = store.index("slug").js()?;
            let value: Option<JsValue> = index
                .get(Query::Key(JsValue::from_str(slug)))
                .js()?
                .await
                .js()?;
            tx.await.js()?;
            value
                .map(|v| serde_wasm_bindgen::from_value(v))
                .transpose()
                .js()
        }

        pub async fn get_song_by_id(id: i32) -> Result<Option<Song>> {
            get_by_key(TABLE_SONGS, JsValue::from_f64(id as f64)).await
        }

        pub async fn get_venue(id: i32) -> Result<Option<Venue>> {
            get_by_key(TABLE_VENUES, JsValue::from_f64(id as f64)).await
        }

        pub async fn get_tour(year: i32) -> Result<Option<Tour>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_TOURS], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(TABLE_TOURS).js()?;
            let index = store.index("year").js()?;
            let value: Option<JsValue> = index
                .get(Query::Key(JsValue::from_f64(year as f64)))
                .js()?
                .await
                .js()?;
            tx.await.js()?;
            value
                .map(|v| serde_wasm_bindgen::from_value(v))
                .transpose()
                .js()
        }

        pub async fn get_tour_by_id(id: i32) -> Result<Option<Tour>> {
            get_by_key(TABLE_TOURS, JsValue::from_f64(id as f64)).await
        }

        pub async fn get_guest_by_slug(slug: &str) -> Result<Option<Guest>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_GUESTS], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(TABLE_GUESTS).js()?;
            let index = store.index("slug").js()?;
            let value: Option<JsValue> = index
                .get(Query::Key(JsValue::from_str(slug)))
                .js()?
                .await
                .js()?;
            tx.await.js()?;
            value
                .map(|v| serde_wasm_bindgen::from_value(v))
                .transpose()
                .js()
        }

        pub async fn get_release_by_slug(slug: &str) -> Result<Option<Release>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_RELEASES], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(TABLE_RELEASES).js()?;
            let index = store.index("slug").js()?;
            let value: Option<JsValue> = index
                .get(Query::Key(JsValue::from_str(slug)))
                .js()?
                .await
                .js()?;
            tx.await.js()?;
            value
                .map(|v| serde_wasm_bindgen::from_value(v))
                .transpose()
                .js()
        }

        pub async fn search_global(query: &str) -> Result<Vec<SearchResult>> {
            let query_norm = dmb_core::normalize_query(query);
            if query_norm.is_empty() {
                return Ok(vec![]);
            }

            let db = open_db().await?;
            let mut results: Vec<SearchResult> = Vec::new();

            async fn collect_search<T: serde::de::DeserializeOwned>(
                db: &Database,
                store_name: &str,
                index_name: &str,
                query_norm: &str,
                map_fn: impl Fn(T, f32) -> SearchResult,
            ) -> Result<Vec<SearchResult>> {
                let tx = db
                    .transaction(&[store_name], TransactionMode::ReadOnly)
                    .js()?;
                let store = tx.object_store(store_name).js()?;
                let index = store.index(index_name).js()?;
                let lower = JsValue::from_str(query_norm);
                let upper = JsValue::from_str(&format!("{}\u{FFFF}", query_norm));
                let range = KeyRange::bound(&lower, &upper, Some(false), Some(false)).js()?;
                let values: Vec<JsValue> = index
                    .get_all(Some(Query::KeyRange(range)), Some(50))
                    .js()?
                    .await
                    .js()?;
                tx.await.js()?;

                let mut out = Vec::new();
                for value in values {
                    let entity: T = serde_wasm_bindgen::from_value(value).js()?;
                    let score = 1.0;
                    out.push(map_fn(entity, score));
                }
                Ok(out)
            }

            results.extend(
                collect_search::<Song>(&db, TABLE_SONGS, "searchText", &query_norm, |song, _| {
                    let haystack = song.search_text.clone().unwrap_or_else(|| song.title.clone());
                    let score = prefix_score(&query_norm, &haystack);
                    SearchResult {
                        result_type: "song".to_string(),
                        id: song.id,
                        slug: Some(song.slug),
                        label: song.title,
                        score,
                    }
                })
                .await?
            );

            results.extend(
                collect_search::<Venue>(&db, TABLE_VENUES, "searchText", &query_norm, |venue, _| {
                    let haystack = venue.search_text.clone().unwrap_or_else(|| venue.name.clone());
                    let score = prefix_score(&query_norm, &haystack);
                    SearchResult {
                        result_type: "venue".to_string(),
                        id: venue.id,
                        slug: None,
                        label: venue.name,
                        score,
                    }
                })
                .await?
            );

            results.extend(
                collect_search::<Tour>(&db, TABLE_TOURS, "searchText", &query_norm, |tour, _| {
                    let haystack = tour.search_text.clone().unwrap_or_else(|| tour.name.clone());
                    let score = prefix_score(&query_norm, &haystack);
                    SearchResult {
                        result_type: "tour".to_string(),
                        id: tour.year,
                        slug: None,
                        label: tour.name,
                        score,
                    }
                })
                .await?
            );

            results.extend(
                collect_search::<Guest>(&db, TABLE_GUESTS, "searchText", &query_norm, |guest, _| {
                    let haystack = guest.search_text.clone().unwrap_or_else(|| guest.name.clone());
                    let score = prefix_score(&query_norm, &haystack);
                    SearchResult {
                        result_type: "guest".to_string(),
                        id: guest.id,
                        slug: Some(guest.slug),
                        label: guest.name,
                        score,
                    }
                })
                .await?
            );

            results.extend(
                collect_search::<Release>(&db, TABLE_RELEASES, "searchText", &query_norm, |release, _| {
                    let haystack = release
                        .search_text
                        .clone()
                        .unwrap_or_else(|| release.title.clone());
                    let score = prefix_score(&query_norm, &haystack);
                    SearchResult {
                        result_type: "release".to_string(),
                        id: release.id,
                        slug: Some(release.slug),
                        label: release.title,
                        score,
                    }
                })
                .await?
            );

            results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
            results.truncate(100);
            Ok(results)
        }

        async fn top_by_index<T: serde::de::DeserializeOwned>(
            store_name: &str,
            index_name: &str,
            limit: usize,
        ) -> Result<Vec<T>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let index = store.index(index_name).js()?;
            let mut out = Vec::new();
            let mut request = index
                .open_cursor(None, Some(CursorDirection::Prev))
                .js()?;
            let mut cursor_opt = request.await.js()?;
            while let Some(cursor) = cursor_opt {
                let value = cursor.value().js()?;
                let item: T = serde_wasm_bindgen::from_value(value).js()?;
                out.push(item);
                if out.len() >= limit {
                    break;
                }
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
            tx.await.js()?;
            Ok(out)
        }

        async fn list_by_index_key<T: serde::de::DeserializeOwned>(
            store_name: &str,
            index_name: &str,
            key: JsValue,
            limit: Option<usize>,
            direction: CursorDirection,
        ) -> Result<Vec<T>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let index = store.index(index_name).js()?;
            let mut out = Vec::new();
            let mut request = index
                .open_cursor(Some(Query::Key(key)), Some(direction))
                .js()?;
            let mut cursor_opt = request.await.js()?;
            while let Some(cursor) = cursor_opt {
                let value = cursor.value().js()?;
                let item: T = serde_wasm_bindgen::from_value(value).js()?;
                out.push(item);
                if let Some(max) = limit {
                    if out.len() >= max {
                        break;
                    }
                }
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
            tx.await.js()?;
            Ok(out)
        }

        async fn list_all_by_index<T: serde::de::DeserializeOwned>(
            store_name: &str,
            index_name: &str,
            direction: CursorDirection,
        ) -> Result<Vec<T>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let index = store.index(index_name).js()?;
            let mut out = Vec::new();
            let mut request = index.open_cursor(None, Some(direction)).js()?;
            let mut cursor_opt = request.await.js()?;
            while let Some(cursor) = cursor_opt {
                let value = cursor.value().js()?;
                let item: T = serde_wasm_bindgen::from_value(value).js()?;
                out.push(item);
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
            tx.await.js()?;
            Ok(out)
        }

        async fn list_by_index_range<T: serde::de::DeserializeOwned>(
            store_name: &str,
            index_name: &str,
            lower: JsValue,
            upper: JsValue,
            limit: Option<usize>,
        ) -> Result<Vec<T>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let index = store.index(index_name).js()?;
            let range = KeyRange::bound(&lower, &upper, Some(false), Some(false)).js()?;
            let mut out = Vec::new();
            let mut request = index
                .open_cursor(Some(Query::KeyRange(range)), Some(CursorDirection::Next))
                .js()?;
            let mut cursor_opt = request.await.js()?;
            while let Some(cursor) = cursor_opt {
                let value = cursor.value().js()?;
                let item: T = serde_wasm_bindgen::from_value(value).js()?;
                out.push(item);
                if let Some(max) = limit {
                    if out.len() >= max {
                        break;
                    }
                }
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
            tx.await.js()?;
            Ok(out)
        }

        pub async fn list_all<T: serde::de::DeserializeOwned>(store_name: &str) -> Result<Vec<T>> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let values: Vec<JsValue> = store.get_all(None, None).js()?.await.js()?;
            tx.await.js()?;
            values
                .into_iter()
                .map(|value| serde_wasm_bindgen::from_value(value))
                .collect::<std::result::Result<Vec<_>, _>>()
                .js()
        }

        pub async fn stats_top_songs(limit: usize) -> Result<Vec<Song>> {
            top_by_index(TABLE_SONGS, "totalPerformances", limit).await
        }

        pub async fn stats_top_openers(limit: usize) -> Result<Vec<Song>> {
            top_by_index(TABLE_SONGS, "openerCount", limit).await
        }

        pub async fn stats_top_closers(limit: usize) -> Result<Vec<Song>> {
            top_by_index(TABLE_SONGS, "closerCount", limit).await
        }

        pub async fn stats_top_encores(limit: usize) -> Result<Vec<Song>> {
            top_by_index(TABLE_SONGS, "encoreCount", limit).await
        }

        pub async fn list_recent_shows(limit: usize) -> Result<Vec<Show>> {
            top_by_index(TABLE_SHOWS, "date", limit).await
        }

        pub async fn list_top_venues(limit: usize) -> Result<Vec<Venue>> {
            top_by_index(TABLE_VENUES, "totalShows", limit).await
        }

        pub async fn list_top_guests(limit: usize) -> Result<Vec<Guest>> {
            top_by_index(TABLE_GUESTS, "totalAppearances", limit).await
        }

        pub async fn list_recent_tours(limit: usize) -> Result<Vec<Tour>> {
            top_by_index(TABLE_TOURS, "year", limit).await
        }

        pub async fn list_recent_releases(limit: usize) -> Result<Vec<Release>> {
            top_by_index(TABLE_RELEASES, "releaseDate", limit).await
        }

        pub async fn list_all_releases() -> Result<Vec<Release>> {
            list_all_by_index(TABLE_RELEASES, "releaseDate", CursorDirection::Prev).await
        }

        pub async fn list_setlist_entries(show_id: i32) -> Result<Vec<SetlistEntry>> {
            let lower = serde_wasm_bindgen::to_value(&vec![show_id, 0]).js()?;
            let upper = serde_wasm_bindgen::to_value(&vec![show_id, i32::MAX]).js()?;
            list_by_index_range(TABLE_SETLIST_ENTRIES, "showId+position", lower, upper, None).await
        }

        pub async fn list_release_tracks(release_id: i32) -> Result<Vec<ReleaseTrack>> {
            let mut tracks: Vec<ReleaseTrack> = list_by_index_key(
                TABLE_RELEASE_TRACKS,
                "releaseId",
                JsValue::from_f64(release_id as f64),
                None,
                CursorDirection::Next,
            )
            .await?;
            tracks.sort_by(|a, b| {
                let disc_a = a.disc_number.unwrap_or(1);
                let disc_b = b.disc_number.unwrap_or(1);
                let track_a = a.track_number.unwrap_or(0);
                let track_b = b.track_number.unwrap_or(0);
                (disc_a, track_a).cmp(&(disc_b, track_b))
            });
            Ok(tracks)
        }

        pub async fn list_liberation_entries(limit: usize) -> Result<Vec<LiberationEntry>> {
            let mut entries: Vec<LiberationEntry> = list_all(TABLE_LIBERATION_LIST).await?;
            entries.sort_by(|a, b| b.days_since.unwrap_or(0).cmp(&a.days_since.unwrap_or(0)));
            if entries.len() > limit {
                entries.truncate(limit);
            }
            Ok(entries)
        }

        pub async fn list_curated_lists() -> Result<Vec<CuratedList>> {
            list_all(TABLE_CURATED_LISTS).await
        }

        pub async fn list_curated_list_items(
            list_id: i32,
            limit: usize,
        ) -> Result<Vec<CuratedListItem>> {
            let mut items: Vec<CuratedListItem> = list_by_index_key(
                TABLE_CURATED_LIST_ITEMS,
                "listId",
                JsValue::from_f64(list_id as f64),
                Some(limit),
                CursorDirection::Next,
            )
            .await?;
            items.sort_by(|a, b| a.position.cmp(&b.position));
            Ok(items)
        }

        pub async fn list_user_attended_shows() -> Result<Vec<UserAttendedShow>> {
            let mut items: Vec<UserAttendedShow> = list_all(TABLE_USER_ATTENDED_SHOWS).await?;
            items.sort_by(|a, b| b.show_date.cmp(&a.show_date));
            Ok(items)
        }

        pub async fn add_user_attended_show(show_id: i32, show_date: Option<String>) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_USER_ATTENDED_SHOWS], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_USER_ATTENDED_SHOWS).js()?;
            let record = UserAttendedShow {
                id: 0,
                show_id,
                added_at: js_sys::Date::new_0().to_string().as_string(),
                show_date,
            };
            let value = serde_wasm_bindgen::to_value(&record).js()?;
            store.put(&value, None).js()?.await.js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn remove_user_attended_show(show_id: i32) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_USER_ATTENDED_SHOWS], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_USER_ATTENDED_SHOWS).js()?;
            let index = store.index("showId").js()?;
            let mut request = index
                .open_cursor(Some(Query::Key(JsValue::from_f64(show_id as f64))), None)
                .js()?;
            let mut cursor_opt = request.await.js()?;
            while let Some(cursor) = cursor_opt {
                cursor.delete().js()?.await.js()?;
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
            tx.await.js()?;
            Ok(())
        }

        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        struct MigrationRecord {
            id: String,
            migrated_at: String,
            store_counts: Vec<(String, u32)>,
            verified: bool,
            #[serde(default)]
            mismatches: Vec<(String, u32, u32)>,
        }

        const PREVIOUS_MIGRATION_KEY: &str = "previous_migration_v1";

        async fn previous_db_exists() -> Result<bool> {
            let window = web_sys::window().ok_or_else(|| js_error("window missing"))?;
            let indexed_db = Reflect::get(&window, &JsValue::from_str("indexedDB")).js()?;
            let databases_fn = Reflect::get(&indexed_db, &JsValue::from_str("databases")).js()?;
            if !databases_fn.is_function() {
                return Ok(false);
            }

            let promise = Function::from(databases_fn).call0(&indexed_db).js()?;
            let promise = promise
                .dyn_into::<js_sys::Promise>()
                .map_err(|_| js_error("indexedDB.databases did not return a Promise"))?;
            let list = JsFuture::from(promise).await.js()?;
            let arr = Array::from(&list);
            for entry in arr.iter() {
                if let Ok(name) = Reflect::get(&entry, &JsValue::from_str("name")) {
                    if name.as_string().as_deref() == Some(PREVIOUS_DB_NAME) {
                        return Ok(true);
                    }
                }
            }

            Ok(false)
        }

        async fn migration_marker_exists(db: &Database) -> Result<bool> {
            let tx = db
                .transaction(&[TABLE_SYNC_META], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(TABLE_SYNC_META).js()?;
            let value: Option<JsValue> = store
                .get(JsValue::from_str(PREVIOUS_MIGRATION_KEY))
                .js()?
                .await
                .js()?;
            tx.await.js()?;
            Ok(value.is_some())
        }

        async fn write_migration_marker(
            db: &Database,
            counts: Vec<(String, u32)>,
            verified: bool,
            mismatches: Vec<(String, u32, u32)>,
        ) -> Result<()> {
            let record = MigrationRecord {
                id: PREVIOUS_MIGRATION_KEY.to_string(),
                migrated_at: js_sys::Date::new_0()
                    .to_string()
                    .as_string()
                    .unwrap_or_default(),
                store_counts: counts,
                verified,
                mismatches,
            };
            let tx = db
                .transaction(&[TABLE_SYNC_META], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_SYNC_META).js()?;
            let value = serde_wasm_bindgen::to_value(&record).js()?;
            store.put(&value, None).js()?.await.js()?;
            tx.await.js()?;
            Ok(())
        }

        async fn copy_store(
            source_db: &Database,
            target_db: &Database,
            store_name: &str,
        ) -> Result<u32> {
            const MIGRATION_BATCH_SIZE: usize = 500;
            let tx_read = source_db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store_read = tx_read.object_store(store_name).js()?;
            let mut request = store_read
                .open_cursor(None, Some(CursorDirection::Next))
                .js()?;
            let mut cursor_opt = request.await.js()?;
            let mut batch: Vec<JsValue> = Vec::with_capacity(MIGRATION_BATCH_SIZE);
            let mut total: u32 = 0;

            while let Some(cursor) = cursor_opt {
                let value = cursor.value().js()?;
                batch.push(value);
                total += 1;
                if batch.len() >= MIGRATION_BATCH_SIZE {
                    write_batch(target_db, store_name, &batch).await?;
                    batch.clear();
                }
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
            tx_read.await.js()?;

            if !batch.is_empty() {
                write_batch(target_db, store_name, &batch).await?;
            }

            Ok(total)
        }

        async fn count_store_in_db(db: &Database, store_name: &str) -> Result<u32> {
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadOnly)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            let count = store.count(None).js()?.await.js()?;
            tx.await.js()?;
            Ok(count as u32)
        }

        pub async fn migrate_previous_db() -> Result<bool> {
            let factory = Factory::new().js()?;
            if !previous_db_exists().await? {
                return Ok(false);
            }

            let new_db = open_db().await?;
            if migration_marker_exists(&new_db).await? {
                return Ok(false);
            }

            let previous_db = factory
                .open(PREVIOUS_DB_NAME, None)
                .js()?
                .await
                .js()?;

            let store_names = previous_db.store_names();
            let mut counts: Vec<(String, u32)> = Vec::new();
            let mut mismatches: Vec<(String, u32, u32)> = Vec::new();

            for (store, _) in SCHEMA_V12_REFERENCE.iter() {
                if !store_names.iter().any(|name| name == store) {
                    continue;
                }
                let count = copy_store(&previous_db, &new_db, store).await?;
                counts.push((store.to_string(), count));
                let new_count = match count_store_in_db(&new_db, store).await {
                    Ok(value) => value,
                    Err(err) => {
                        web_sys::console::warn_1(&JsValue::from_str(&format!(
                            "[IDB] failed to count new store after copy: store={store} error={err:?}"
                        )));
                        0
                    }
                };
                if new_count != count {
                    mismatches.push((store.to_string(), count, new_count));
                }
            }

            if !mismatches.is_empty() {
                web_sys::console::warn_1(&JsValue::from_str(&format!(
                    "[IDB] previous-version migration count mismatch: {mismatches:?}"
                )));
                write_migration_marker(&new_db, counts, false, mismatches).await?;
                return Ok(false);
            }

            write_migration_marker(&new_db, counts, true, Vec::new()).await?;
            // Close the previous-version handle before delete to avoid a blocked deleteDatabase request.
            previous_db.close();
            if let Ok(request) = factory.delete(PREVIOUS_DB_NAME) {
                let _ = request.await;
            }
            Ok(true)
        }

        fn performance_now_ms() -> f64 {
            web_sys::window()
                .and_then(|window| window.performance())
                .map(|performance| performance.now())
                .unwrap_or_else(Date::now)
        }

        fn normalized_tx_batch_size(batch_size: usize) -> usize {
            batch_size.max(1)
        }

        pub async fn bulk_put(store_name: &str, values: &[JsValue]) -> Result<u32> {
            let stats = bulk_put_with_options(store_name, values, BulkPutOptions::default()).await?;
            Ok(stats.inserted)
        }

        pub async fn bulk_put_with_options(
            store_name: &str,
            values: &[JsValue],
            options: BulkPutOptions,
        ) -> Result<BulkPutStats> {
            if values.is_empty() {
                return Ok(BulkPutStats::default());
            }
            let tx_batch_size = normalized_tx_batch_size(options.tx_batch_size);
            let db = open_db().await?;
            let mut stats = BulkPutStats::default();
            for chunk in values.chunks(tx_batch_size) {
                let tx_started_at = performance_now_ms();
                let tx = db
                    .transaction(&[store_name], TransactionMode::ReadWrite)
                    .js()?;
                let store = tx.object_store(store_name).js()?;
                for value in chunk {
                    // Queue writes and rely on transaction commit to validate success.
                    store.put(value, None).js()?;
                }
                tx.await.js()?;
                let tx_elapsed_ms = (performance_now_ms() - tx_started_at).max(0.0);
                stats.max_tx_ms = stats.max_tx_ms.max(tx_elapsed_ms);
                stats.inserted = stats.inserted.saturating_add(chunk.len() as u32);
                stats.transaction_count = stats.transaction_count.saturating_add(1);
            }
            Ok(stats)
        }

        async fn write_batch(
            new_db: &Database,
            store_name: &str,
            values: &[JsValue],
        ) -> Result<()> {
            if values.is_empty() {
                return Ok(());
            }
            let tx_write = new_db
                .transaction(&[store_name], TransactionMode::ReadWrite)
                .js()?;
            let store_write = tx_write.object_store(store_name).js()?;
            for value in values {
                // Queue writes and rely on transaction commit to validate success.
                store_write.put(value, None).js()?;
            }
            tx_write.await.js()?;
            Ok(())
        }

        pub async fn put_sync_meta<T: Serialize>(value: &T) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_SYNC_META], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_SYNC_META).js()?;
            let payload = serde_wasm_bindgen::to_value(value).js()?;
            store.put(&payload, None).js()?.await.js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn get_sync_meta<T: DeserializeOwned>(id: &str) -> Result<Option<T>> {
            get_by_key(TABLE_SYNC_META, JsValue::from_str(id)).await
        }

        pub async fn delete_sync_meta(id: &str) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_SYNC_META], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_SYNC_META).js()?;
            store
                .delete(Query::Key(JsValue::from_str(id)))
                .js()?
                .await
                .js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn clear_store(store_name: &str) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[store_name], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(store_name).js()?;
            store.clear().js()?.await.js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn store_embedding_chunk(chunk: &EmbeddingChunk) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_EMBEDDING_CHUNKS], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_EMBEDDING_CHUNKS).js()?;
            let value = serde_wasm_bindgen::to_value(chunk).js()?;
            store.put(&value, None).js()?.await.js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn get_embedding_chunk(chunk_id: u32) -> Result<Option<EmbeddingChunk>> {
            get_by_key(TABLE_EMBEDDING_CHUNKS, JsValue::from_f64(chunk_id as f64)).await
        }

        pub async fn store_embedding_manifest(manifest: &EmbeddingManifest) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_EMBEDDING_META], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_EMBEDDING_META).js()?;
            let value = serde_wasm_bindgen::to_value(manifest).js()?;
            store.put(&value, None).js()?.await.js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn get_embedding_manifest(version: &str) -> Result<Option<EmbeddingManifest>> {
            get_by_key(TABLE_EMBEDDING_META, JsValue::from_str(version)).await
        }

        pub async fn store_ann_index(meta: &AnnIndexMeta) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_ANN_INDEX], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_ANN_INDEX).js()?;
            let value = serde_wasm_bindgen::to_value(meta).js()?;
            store.put(&value, None).js()?.await.js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn get_ann_index(id: &str) -> Result<Option<AnnIndexMeta>> {
            get_by_key(TABLE_ANN_INDEX, JsValue::from_str(id)).await
        }

        pub async fn delete_ann_index(id: &str) -> Result<()> {
            let db = open_db().await?;
            let tx = db
                .transaction(&[TABLE_ANN_INDEX], TransactionMode::ReadWrite)
                .js()?;
            let store = tx.object_store(TABLE_ANN_INDEX).js()?;
            store
                .delete(Query::Key(JsValue::from_str(id)))
                .js()?
                .await
                .js()?;
            tx.await.js()?;
            Ok(())
        }

        pub async fn delete_db() -> Result<()> {
            let factory = Factory::new().js()?;
            if let Ok(request) = factory.delete(DB_NAME) {
                let _ = request.await;
            }
            Ok(())
        }

        #[wasm_bindgen]
        pub async fn js_open_db() -> std::result::Result<(), JsValue> {
            open_db()
                .await
                .map(|_| ())
                .map_err(|e| JsValue::from_str(&format!("{e:?}")))
        }

        #[wasm_bindgen]
        pub async fn js_migrate_previous_db() -> std::result::Result<bool, JsValue> {
            migrate_previous_db()
                .await
                .map_err(|e| JsValue::from_str(&format!("{e:?}")))
        }

        #[wasm_bindgen]
        pub fn js_idb_runtime_metrics() -> std::result::Result<JsValue, JsValue> {
            let blocked_count = read_storage_u64(IDB_OPEN_BLOCKED_COUNT_KEY);
            let blocked_last = {
                let mut value = None;
                with_local_storage(|storage| {
                    value = storage.get_item(IDB_OPEN_BLOCKED_LAST_KEY).ok().flatten();
                });
                value
            };
            let versionchange_count = read_storage_u64(IDB_VERSIONCHANGE_COUNT_KEY);
            let versionchange_last = {
                let mut value = None;
                with_local_storage(|storage| {
                    value = storage.get_item(IDB_VERSIONCHANGE_LAST_KEY).ok().flatten();
                });
                value
            };

            let metrics = js_sys::Object::new();
            Reflect::set(
                &metrics,
                &JsValue::from_str("openBlockedCount"),
                &JsValue::from_f64(blocked_count as f64),
            )
            .js()?;
            Reflect::set(
                &metrics,
                &JsValue::from_str("openBlockedLastMs"),
                &blocked_last
                    .as_ref()
                    .and_then(|value| value.parse::<f64>().ok())
                    .map(JsValue::from_f64)
                    .unwrap_or(JsValue::NULL),
            )
            .js()?;
            Reflect::set(
                &metrics,
                &JsValue::from_str("versionChangeCount"),
                &JsValue::from_f64(versionchange_count as f64),
            )
            .js()?;
            Reflect::set(
                &metrics,
                &JsValue::from_str("versionChangeLastMs"),
                &versionchange_last
                    .as_ref()
                    .and_then(|value| value.parse::<f64>().ok())
                    .map(JsValue::from_f64)
                    .unwrap_or(JsValue::NULL),
            )
            .js()?;
            Ok(metrics.into())
        }
    } else {
        fn idb_unavailable<T>() -> Result<T, JsValue> {
            Err(JsValue::from_str("IndexedDB not available on server"))
        }

        macro_rules! idb_stub {
            ($name:ident ( $( $arg:ident : $arg_ty:ty ),* $(,)? ) -> $ret:ty) => {
                pub async fn $name( $( $arg : $arg_ty ),* ) -> Result<$ret, JsValue> {
                    idb_unavailable()
                }
            };
        }

        pub fn js_idb_runtime_metrics() -> std::result::Result<JsValue, JsValue> {
            Err(JsValue::from_str(
                "IndexedDB runtime metrics only available in wasm32",
            ))
        }

        idb_stub!(open_db() -> ());
        idb_stub!(get_show(_id: i32) -> Option<Show>);
        idb_stub!(get_song(_slug: &str) -> Option<Song>);
        idb_stub!(get_song_by_id(_id: i32) -> Option<Song>);
        idb_stub!(get_venue(_id: i32) -> Option<Venue>);
        idb_stub!(get_tour(_year: i32) -> Option<Tour>);
        idb_stub!(get_tour_by_id(_id: i32) -> Option<Tour>);
        idb_stub!(search_global(_query: &str) -> Vec<SearchResult>);
        idb_stub!(stats_top_songs(_limit: usize) -> Vec<Song>);
        idb_stub!(stats_top_openers(_limit: usize) -> Vec<Song>);
        idb_stub!(stats_top_closers(_limit: usize) -> Vec<Song>);
        idb_stub!(stats_top_encores(_limit: usize) -> Vec<Song>);
        idb_stub!(list_recent_shows(_limit: usize) -> Vec<Show>);
        idb_stub!(list_top_venues(_limit: usize) -> Vec<Venue>);
        idb_stub!(list_top_guests(_limit: usize) -> Vec<Guest>);
        idb_stub!(list_recent_tours(_limit: usize) -> Vec<Tour>);
        idb_stub!(list_recent_releases(_limit: usize) -> Vec<Release>);
        idb_stub!(list_all_releases() -> Vec<Release>);
        idb_stub!(list_setlist_entries(_show_id: i32) -> Vec<SetlistEntry>);
        idb_stub!(list_release_tracks(_release_id: i32) -> Vec<ReleaseTrack>);
        idb_stub!(list_liberation_entries(_limit: usize) -> Vec<LiberationEntry>);
        idb_stub!(list_curated_lists() -> Vec<CuratedList>);
        idb_stub!(list_curated_list_items(_list_id: i32, _limit: usize) -> Vec<CuratedListItem>);
        idb_stub!(list_user_attended_shows() -> Vec<UserAttendedShow>);
        idb_stub!(add_user_attended_show(_show_id: i32, _show_date: Option<String>) -> ());
        idb_stub!(remove_user_attended_show(_show_id: i32) -> ());
        idb_stub!(get_guest_by_slug(_slug: &str) -> Option<Guest>);
        idb_stub!(get_release_by_slug(_slug: &str) -> Option<Release>);
        idb_stub!(migrate_previous_db() -> bool);
        idb_stub!(bulk_put(_store_name: &str, _values: &[JsValue]) -> u32);
        idb_stub!(bulk_put_with_options(_store_name: &str, _values: &[JsValue], _options: BulkPutOptions) -> BulkPutStats);
        idb_stub!(delete_sync_meta(_id: &str) -> ());
        idb_stub!(clear_store(_store_name: &str) -> ());
        idb_stub!(store_embedding_chunk(_chunk: &EmbeddingChunk) -> ());
        idb_stub!(get_embedding_chunk(_chunk_id: u32) -> Option<EmbeddingChunk>);
        idb_stub!(store_embedding_manifest(_manifest: &EmbeddingManifest) -> ());
        idb_stub!(get_embedding_manifest(_version: &str) -> Option<EmbeddingManifest>);
        idb_stub!(store_ann_index(_meta: &AnnIndexMeta) -> ());
        idb_stub!(get_ann_index(_id: &str) -> Option<AnnIndexMeta>);
        idb_stub!(delete_ann_index(_id: &str) -> ());
        idb_stub!(count_store(_store_name: &str) -> u32);
        idb_stub!(count_stores_with_missing(_store_names: &[&str]) -> (Vec<(String, u32)>, Vec<String>));
        idb_stub!(delete_db() -> ());

        pub async fn put_sync_meta<T: Serialize>(_value: &T) -> Result<(), JsValue> {
            idb_unavailable()
        }

        pub async fn get_sync_meta<T: DeserializeOwned>(_id: &str) -> Result<Option<T>, JsValue> {
            idb_unavailable()
        }

        pub async fn list_all<T: serde::de::DeserializeOwned>(_store_name: &str) -> Result<Vec<T>, JsValue> {
            idb_unavailable()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{BulkPutOptions, BulkPutStats};

    #[test]
    fn bulk_put_options_default_is_non_zero() {
        assert!(BulkPutOptions::default().tx_batch_size > 0);
    }

    #[test]
    fn bulk_put_stats_default_zeroed() {
        let stats = BulkPutStats::default();
        assert_eq!(stats.inserted, 0);
        assert_eq!(stats.transaction_count, 0);
        assert_eq!(stats.max_tx_ms, 0.0);
    }
}
