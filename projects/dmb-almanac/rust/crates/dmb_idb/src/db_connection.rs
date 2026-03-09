#[cfg(target_arch = "wasm32")]
use idb::{
    Database, DatabaseEvent as _, Event as _, Factory, IndexParams, KeyPath, ObjectStore,
    ObjectStoreParams, Request as _,
};
#[cfg(target_arch = "wasm32")]
use std::{cell::RefCell, collections::HashSet, rc::Rc};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
fn js_error(message: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&message.to_string())
}

#[cfg(target_arch = "wasm32")]
pub(crate) trait JsResultExt<T> {
    fn js(self) -> Result<T>;
}

#[cfg(target_arch = "wasm32")]
impl<T, E: std::fmt::Debug> JsResultExt<T> for std::result::Result<T, E> {
    fn js(self) -> Result<T> {
        self.map_err(|e| js_error(format!("{e:?}")))
    }
}

#[cfg(target_arch = "wasm32")]
#[derive(Debug, Clone)]
struct IndexSpec {
    name: String,
    key_path: KeyPath,
    unique: bool,
    multi_entry: bool,
}

#[cfg(target_arch = "wasm32")]
#[derive(Debug, Clone)]
struct StoreSpec {
    name: &'static str,
    key_path: KeyPath,
    auto_increment: bool,
    indexes: Vec<IndexSpec>,
}

#[cfg(target_arch = "wasm32")]
fn parse_schema(name: &'static str, schema: &'static str) -> StoreSpec {
    let mut tokens = schema
        .split(',')
        .map(|t| t.trim())
        .filter(|t| !t.is_empty());
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

#[cfg(target_arch = "wasm32")]
fn store_specs() -> Vec<StoreSpec> {
    crate::SCHEMA_V12_REFERENCE
        .iter()
        .map(|(name, schema)| parse_schema(name, schema))
        .collect()
}

#[cfg(target_arch = "wasm32")]
fn create_store(db: &Database, spec: &StoreSpec) -> Result<()> {
    let mut params = ObjectStoreParams::new();
    params.auto_increment(spec.auto_increment);
    params.key_path(Some(spec.key_path.clone()));

    let store = db.create_object_store(spec.name, params).js()?;
    migrate_store_indexes(&store, spec)?;
    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn is_primary_key_index(index: &IndexSpec) -> bool {
    matches!(index.key_path, KeyPath::Single(ref key) if key == "id")
}

#[cfg(target_arch = "wasm32")]
fn create_index(store: &ObjectStore, index: &IndexSpec) -> Result<()> {
    let mut params = IndexParams::new();
    params.unique(index.unique);
    params.multi_entry(index.multi_entry);
    store
        .create_index(&index.name, index.key_path.clone(), Some(params))
        .js()?;
    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn migrate_store_indexes(store: &ObjectStore, spec: &StoreSpec) -> Result<()> {
    let existing_index_names: HashSet<String> = store.index_names().into_iter().collect();
    for index in &spec.indexes {
        if is_primary_key_index(index) {
            continue;
        }

        let should_create = if existing_index_names.contains(&index.name) {
            let existing_index = store.index(&index.name).js()?;
            let key_path_matches = existing_index.key_path().js()? == Some(index.key_path.clone());
            let unique_matches = existing_index.unique() == index.unique;
            let multi_entry_matches = existing_index.multi_entry() == index.multi_entry;
            if key_path_matches && unique_matches && multi_entry_matches {
                false
            } else {
                store.delete_index(&index.name).js()?;
                true
            }
        } else {
            true
        };

        if should_create {
            create_index(store, index)?;
        }
    }
    Ok(())
}

#[cfg(target_arch = "wasm32")]
thread_local! {
    static DB_CACHE: RefCell<Option<Rc<Database>>> = const { RefCell::new(None) };
}

#[cfg(target_arch = "wasm32")]
fn cached_db() -> Option<Rc<Database>> {
    DB_CACHE.with(|cache| cache.borrow().as_ref().cloned())
}

#[cfg(target_arch = "wasm32")]
fn store_cached_db(db: Rc<Database>) {
    DB_CACHE.with(|cache| *cache.borrow_mut() = Some(db));
}

#[cfg(target_arch = "wasm32")]
fn clear_cached_db() {
    DB_CACHE.with(|cache| *cache.borrow_mut() = None);
}

#[cfg(target_arch = "wasm32")]
pub(crate) fn close_cached_db() {
    if let Some(db) = cached_db() {
        db.close();
        clear_cached_db();
    }
}

#[cfg(target_arch = "wasm32")]
pub async fn open_db() -> Result<Rc<Database>> {
    if let Some(db) = cached_db() {
        return Ok(db);
    }

    let factory = Factory::new().js()?;
    let mut request = factory.open(crate::DB_NAME, Some(crate::DB_VERSION)).js()?;

    request.on_blocked(|event| {
        crate::runtime_metrics::record_open_blocked();
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "[IDB] open blocked for `{}`: old_version={:?} new_version={:?}. Close other tabs using the app.",
            crate::DB_NAME,
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

        let upgrade_tx = match event.target() {
            Ok(request) => match request.transaction() {
                Some(tx) => tx,
                None => {
                    web_sys::console::error_1(&JsValue::from_str(
                        "[IDB] upgrade transaction unavailable during on_upgrade_needed",
                    ));
                    return;
                }
            },
            Err(err) => {
                web_sys::console::error_1(&JsValue::from_str(&format!(
                    "[IDB] upgrade event target() failed: {err:?}"
                )));
                return;
            }
        };

        let existing_store_names: HashSet<String> = db.store_names().into_iter().collect();
        for spec in store_specs() {
            let migration_result = if existing_store_names.contains(spec.name) {
                upgrade_tx
                    .object_store(spec.name)
                    .js()
                    .and_then(|store| migrate_store_indexes(&store, &spec))
            } else {
                create_store(&db, &spec)
            };

            if let Err(err) = migration_result {
                web_sys::console::error_1(&JsValue::from_str(&format!(
                    "[IDB] store/index migration failed: store={} error={:?}",
                    spec.name, err
                )));
            }
        }
    });

    let mut db = request.await.js()?;
    db.on_close(|_| {
        clear_cached_db();
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "[IDB] close received for `{}`. Cleared cached connection handle.",
            crate::DB_NAME
        )));
    });
    db.on_version_change(|event| {
        crate::runtime_metrics::record_version_change();
        clear_cached_db();
        if let Ok(database) = event.database() {
            database.close();
        }
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "[IDB] versionchange received for `{}`. Closed stale connection; refresh if needed.",
            crate::DB_NAME
        )));
    });
    let db = Rc::new(db);
    store_cached_db(Rc::clone(&db));
    Ok(db)
}
