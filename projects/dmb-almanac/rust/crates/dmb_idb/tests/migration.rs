#![cfg(target_arch = "wasm32")]

use dmb_idb::{get_sync_meta, migrate_legacy_db, DB_NAME, LEGACY_DB_NAME, TABLE_SHOWS};
use idb::{Factory, KeyPath, ObjectStoreParams, TransactionMode};
use js_sys::{Object, Reflect};
use wasm_bindgen::JsValue;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[derive(serde::Deserialize)]
struct MigrationRecord {
    id: String,
    store_counts: Vec<(String, u32)>,
    verified: bool,
    #[serde(default)]
    mismatches: Vec<(String, u32, u32)>,
}

#[wasm_bindgen_test(async)]
async fn migrates_legacy_db_and_records_counts() {
    let factory = Factory::new().expect("indexeddb factory");
    if let Ok(request) = factory.delete(LEGACY_DB_NAME) {
        let _ = request.await;
    }
    if let Ok(request) = factory.delete(DB_NAME) {
        let _ = request.await;
    }

    let mut request = factory
        .open(LEGACY_DB_NAME, Some(1))
        .expect("open legacy db");
    request.on_upgrade_needed(|event| {
        let db = event.database().expect("upgrade database missing");
        let mut params = ObjectStoreParams::new();
        params.key_path(Some(KeyPath::new_single("id")));
        let _ = db.create_object_store(TABLE_SHOWS, params);
    });
    let legacy_db = request.await.expect("open legacy db");

    let tx = legacy_db
        .transaction(&[TABLE_SHOWS], TransactionMode::ReadWrite)
        .expect("create legacy tx");
    let store = tx.object_store(TABLE_SHOWS).expect("legacy store");
    let record = Object::new();
    Reflect::set(&record, &JsValue::from_str("id"), &JsValue::from_f64(1.0)).expect("set id");
    Reflect::set(
        &record,
        &JsValue::from_str("date"),
        &JsValue::from_str("2000-01-01"),
    )
    .expect("set date");
    store
        .put(&record, None)
        .expect("put legacy record")
        .await
        .expect("put legacy record");
    tx.await.expect("legacy tx");

    let migrated = migrate_legacy_db().await.expect("migrate legacy db");
    assert!(migrated);

    let marker = get_sync_meta::<MigrationRecord>("legacy_migration_v1")
        .await
        .expect("read migration marker")
        .expect("missing migration marker");
    assert_eq!(marker.id, "legacy_migration_v1");
    assert!(marker.verified);
    assert!(marker.mismatches.is_empty());
    let show_count = marker
        .store_counts
        .iter()
        .find(|(name, _)| name == TABLE_SHOWS)
        .map(|(_, count)| *count);
    assert_eq!(show_count, Some(1));
}
