#![cfg(target_arch = "wasm32")]

use dmb_idb::{get_sync_meta, migrate_previous_db, DB_NAME, PREVIOUS_DB_NAME, TABLE_SHOWS};
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
async fn migrates_previous_db_and_records_counts() {
    let factory = Factory::new().expect("indexeddb factory");
    if let Ok(request) = factory.delete(PREVIOUS_DB_NAME) {
        let _ = request.await;
    }
    if let Ok(request) = factory.delete(DB_NAME) {
        let _ = request.await;
    }

    let mut request = factory
        .open(PREVIOUS_DB_NAME, Some(1))
        .expect("open previous db");
    request.on_upgrade_needed(|event| {
        let db = event.database().expect("upgrade database missing");
        let mut params = ObjectStoreParams::new();
        params.key_path(Some(KeyPath::new_single("id")));
        let _ = db.create_object_store(TABLE_SHOWS, params);
    });
    let previous_db = request.await.expect("open previous db");

    let tx = previous_db
        .transaction(&[TABLE_SHOWS], TransactionMode::ReadWrite)
        .expect("create previous tx");
    let store = tx.object_store(TABLE_SHOWS).expect("previous store");
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
        .expect("put previous record")
        .await
        .expect("put previous record");
    tx.await.expect("previous tx");

    let migrated = migrate_previous_db().await.expect("migrate previous db");
    assert!(migrated);

    let marker = get_sync_meta::<MigrationRecord>("previous_migration_v1")
        .await
        .expect("read migration marker")
        .expect("missing migration marker");
    assert_eq!(marker.id, "previous_migration_v1");
    assert!(marker.verified);
    assert!(marker.mismatches.is_empty());
    let show_count = marker
        .store_counts
        .iter()
        .find(|(name, _)| name == TABLE_SHOWS)
        .map(|(_, count)| *count);
    assert_eq!(show_count, Some(1));
}
