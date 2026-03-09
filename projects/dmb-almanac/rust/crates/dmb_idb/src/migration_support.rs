#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct MigrationRecord {
    id: String,
    migrated_at: String,
    store_counts: Vec<(String, u32)>,
    verified: bool,
    #[serde(default)]
    mismatches: Vec<(String, u32, u32)>,
}

#[cfg(target_arch = "wasm32")]
const PREVIOUS_MIGRATION_KEY: &str = "previous_migration_v1";

#[cfg(target_arch = "wasm32")]
type MigrationStoreCounts = Vec<(String, u32)>;
#[cfg(target_arch = "wasm32")]
type MigrationCountMismatches = Vec<(String, u32, u32)>;
#[cfg(target_arch = "wasm32")]
type PreviousMigrationOutcome = (MigrationStoreCounts, MigrationCountMismatches);

#[cfg(target_arch = "wasm32")]
#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseSummary {
    #[serde(default)]
    name: Option<String>,
}

#[cfg(target_arch = "wasm32")]
fn parse_database_summaries(value: JsValue) -> Vec<DatabaseSummary> {
    js_sys::Array::from(&value)
        .iter()
        .filter_map(|entry| serde_wasm_bindgen::from_value::<DatabaseSummary>(entry).ok())
        .collect()
}

#[cfg(target_arch = "wasm32")]
async fn previous_db_exists() -> Result<bool> {
    let indexed_db: JsValue = idb::Factory::new()
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?
        .into();
    let databases_fn = js_sys::Reflect::get(&indexed_db, &JsValue::from_str("databases"))
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    if !databases_fn.is_function() {
        return Ok(false);
    }

    let databases_fn = databases_fn
        .dyn_into::<js_sys::Function>()
        .map_err(|_| JsValue::from_str("indexedDB.databases not callable"))?;
    let promise = databases_fn
        .call0(&indexed_db)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let promise = promise
        .dyn_into::<js_sys::Promise>()
        .map_err(|_| JsValue::from_str("indexedDB.databases did not return a Promise"))?;
    let list = wasm_bindgen_futures::JsFuture::from(promise)
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let databases = parse_database_summaries(list);
    for database in databases {
        if database.name.as_deref() == Some(crate::PREVIOUS_DB_NAME) {
            return Ok(true);
        }
    }

    Ok(false)
}

#[cfg(target_arch = "wasm32")]
async fn migration_marker_exists(db: &idb::Database) -> Result<bool> {
    let tx = db
        .transaction(&[crate::TABLE_SYNC_META], idb::TransactionMode::ReadOnly)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let store = tx
        .object_store(crate::TABLE_SYNC_META)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let value: Option<JsValue> = store
        .get(JsValue::from_str(PREVIOUS_MIGRATION_KEY))
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    tx.await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    Ok(value.is_some())
}

#[cfg(target_arch = "wasm32")]
async fn write_migration_marker(
    db: &idb::Database,
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
    crate::put_serialized_in_store_with_db(db, crate::TABLE_SYNC_META, &record).await
}

#[cfg(target_arch = "wasm32")]
async fn copy_store(
    source_db: &idb::Database,
    target_db: &idb::Database,
    store_name: &str,
) -> Result<u32> {
    const MIGRATION_BATCH_SIZE: usize = 500;
    let tx_read = source_db
        .transaction(&[store_name], idb::TransactionMode::ReadOnly)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let store_read = tx_read
        .object_store(store_name)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let mut request = store_read
        .open_cursor(None, Some(idb::CursorDirection::Next))
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let mut cursor_opt = request
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let mut batch: Vec<JsValue> = Vec::with_capacity(MIGRATION_BATCH_SIZE);
    let mut total: u32 = 0;

    while let Some(cursor) = cursor_opt {
        let value = cursor
            .value()
            .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
        batch.push(value);
        total += 1;
        if batch.len() >= MIGRATION_BATCH_SIZE {
            crate::bulk_write::write_batch(target_db, store_name, &batch).await?;
            batch.clear();
        }
        request = cursor
            .next(None)
            .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
        cursor_opt = request
            .await
            .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    }
    tx_read
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;

    if !batch.is_empty() {
        crate::bulk_write::write_batch(target_db, store_name, &batch).await?;
    }

    Ok(total)
}

#[cfg(target_arch = "wasm32")]
pub async fn migrate_previous_db() -> Result<bool> {
    let factory = idb::Factory::new().map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    if !previous_db_exists().await? {
        return Ok(false);
    }

    let new_db = crate::open_db().await?;
    if migration_marker_exists(&new_db).await? {
        return Ok(false);
    }

    let previous_db = factory
        .open(crate::PREVIOUS_DB_NAME, None)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let migration_result: Result<PreviousMigrationOutcome> = async {
        let previous_store_names: std::collections::HashSet<String> =
            previous_db.store_names().iter().cloned().collect();
        let mut counts: MigrationStoreCounts = Vec::new();
        let mut mismatches: MigrationCountMismatches = Vec::new();

        for (store, _) in crate::SCHEMA_V12_REFERENCE.iter() {
            if !previous_store_names.contains(*store) {
                continue;
            }
            let count = copy_store(&previous_db, &new_db, store).await?;
            counts.push((store.to_string(), count));
            let new_count = match crate::db_admin::count_store_in_db(&new_db, store).await {
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

        Ok((counts, mismatches))
    }
    .await;
    previous_db.close();
    let (counts, mismatches) = migration_result?;

    if !mismatches.is_empty() {
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "[IDB] previous-version migration count mismatch: {mismatches:?}"
        )));
        write_migration_marker(&new_db, counts, false, mismatches).await?;
        return Ok(false);
    }

    write_migration_marker(&new_db, counts, true, Vec::new()).await?;
    if let Ok(request) = factory.delete(crate::PREVIOUS_DB_NAME) {
        if let Err(err) = request.await {
            web_sys::console::warn_1(&JsValue::from_str(&format!(
                "[IDB] failed to delete previous-version database `{}`: {err:?}",
                crate::PREVIOUS_DB_NAME
            )));
        }
    } else {
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "[IDB] deleteDatabase request could not start for `{}`",
            crate::PREVIOUS_DB_NAME
        )));
    }
    Ok(true)
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn migrate_previous_db() -> Result<bool, JsValue> {
    crate::idb_fallback::idb_unavailable()
}
