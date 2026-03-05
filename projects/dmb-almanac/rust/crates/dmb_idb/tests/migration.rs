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
    let factory = match Factory::new() {
        Ok(factory) => factory,
        Err(err) => panic!("indexeddb factory: {:?}", err),
    };
    if let Ok(request) = factory.delete(PREVIOUS_DB_NAME) {
        let _ = request.await;
    }
    if let Ok(request) = factory.delete(DB_NAME) {
        let _ = request.await;
    }

    let mut request = factory
        .open(PREVIOUS_DB_NAME, Some(1))
        .unwrap_or_else(|err| panic!("open previous db: {:?}", err));
    request.on_upgrade_needed(|event| {
        let db = event
            .database()
            .unwrap_or_else(|| panic!("upgrade database missing"));
        let mut params = ObjectStoreParams::new();
        params.key_path(Some(KeyPath::new_single("id")));
        let _ = db.create_object_store(TABLE_SHOWS, params);
    });
    let previous_db = request
        .await
        .unwrap_or_else(|err| panic!("open previous db: {:?}", err));

    let tx = previous_db
        .transaction(&[TABLE_SHOWS], TransactionMode::ReadWrite)
        .unwrap_or_else(|err| panic!("create previous tx: {:?}", err));
    let store = tx
        .object_store(TABLE_SHOWS)
        .unwrap_or_else(|err| panic!("previous store: {:?}", err));
    let record = Object::new();
    Reflect::set(&record, &JsValue::from_str("id"), &JsValue::from_f64(1.0))
        .unwrap_or_else(|err| panic!("set id: {:?}", err));
    Reflect::set(
        &record,
        &JsValue::from_str("date"),
        &JsValue::from_str("2000-01-01"),
    )
    .unwrap_or_else(|err| panic!("set date: {:?}", err));
    store
        .put(&record, None)
        .unwrap_or_else(|err| panic!("put previous record: {:?}", err))
        .await
        .unwrap_or_else(|err| panic!("put previous record: {:?}", err));
    tx.await
        .unwrap_or_else(|err| panic!("previous tx: {:?}", err));

    let migrated = migrate_previous_db()
        .await
        .unwrap_or_else(|err| panic!("migrate previous db: {:?}", err));
    assert!(migrated);

    let marker = get_sync_meta::<MigrationRecord>("previous_migration_v1")
        .await
        .unwrap_or_else(|err| panic!("read migration marker: {:?}", err))
        .unwrap_or_else(|| panic!("missing migration marker"));
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
