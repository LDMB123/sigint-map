#[cfg(target_arch = "wasm32")]
use idb::{Database, Query, TransactionMode};
#[cfg(target_arch = "wasm32")]
use serde::Serialize;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
use crate::{open_db, JsResultExt};

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub(crate) async fn get_by_key<T: serde::de::DeserializeOwned>(
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

    deserialize_optional_value(value)
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn get_by_index_key<T: serde::de::DeserializeOwned>(
    store_name: &str,
    index_name: &str,
    key: JsValue,
) -> Result<Option<T>> {
    let db = open_db().await?;
    let tx = db
        .transaction(&[store_name], TransactionMode::ReadOnly)
        .js()?;
    let store = tx.object_store(store_name).js()?;
    let index = store.index(index_name).js()?;
    let value: Option<JsValue> = index.get(Query::Key(key)).js()?.await.js()?;
    tx.await.js()?;
    deserialize_optional_value(value)
}

#[cfg(target_arch = "wasm32")]
pub(crate) fn deserialize_value<T: serde::de::DeserializeOwned>(value: JsValue) -> Result<T> {
    serde_wasm_bindgen::from_value(value).js()
}

#[cfg(target_arch = "wasm32")]
fn deserialize_optional_value<T: serde::de::DeserializeOwned>(
    value: Option<JsValue>,
) -> Result<Option<T>> {
    value.map(serde_wasm_bindgen::from_value).transpose().js()
}

#[cfg(target_arch = "wasm32")]
async fn put_value_in_store(db: &Database, store_name: &str, value: &JsValue) -> Result<()> {
    let tx = db
        .transaction(&[store_name], TransactionMode::ReadWrite)
        .js()?;
    let store = tx.object_store(store_name).js()?;
    store.put(value, None).js()?.await.js()?;
    tx.await.js()?;
    Ok(())
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn put_serialized_in_store_with_db<T: Serialize>(
    db: &Database,
    store_name: &str,
    value: &T,
) -> Result<()> {
    let payload = serde_wasm_bindgen::to_value(value).js()?;
    put_value_in_store(db, store_name, &payload).await
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn put_serialized_in_store<T: Serialize>(
    store_name: &str,
    value: &T,
) -> Result<()> {
    let db = open_db().await?;
    put_serialized_in_store_with_db(&db, store_name, value).await
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn delete_by_key(store_name: &str, key: JsValue) -> Result<()> {
    let db = open_db().await?;
    let tx = db
        .transaction(&[store_name], TransactionMode::ReadWrite)
        .js()?;
    let store = tx.object_store(store_name).js()?;
    store.delete(Query::Key(key)).js()?.await.js()?;
    tx.await.js()?;
    Ok(())
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn delete_unique_by_index_key(
    store_name: &str,
    index_name: &str,
    key: JsValue,
) -> Result<()> {
    let db = open_db().await?;
    let tx = db
        .transaction(&[store_name], TransactionMode::ReadWrite)
        .js()?;
    let store = tx.object_store(store_name).js()?;
    let index = store.index(index_name).js()?;
    let primary_key: Option<JsValue> = index.get_key(Query::Key(key)).js()?.await.js()?;
    if let Some(primary_key) = primary_key {
        store.delete(Query::Key(primary_key)).js()?.await.js()?;
    }
    tx.await.js()?;
    Ok(())
}
