#[cfg(feature = "ssr")]
use super::*;

#[cfg(feature = "ssr")]
#[path = "server_sqlite_rows.rs"]
mod rows;

#[cfg(feature = "ssr")]
use sqlx::Row;

#[cfg(feature = "ssr")]
pub(crate) use rows::*;

#[cfg(feature = "ssr")]
pub(crate) fn to_server_error(err: &sqlx::Error) -> ServerFnError {
    ServerFnError::ServerError(err.to_string())
}

#[cfg(feature = "ssr")]
pub(crate) type SqliteQuery<'q> =
    sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments>;

#[cfg(feature = "ssr")]
pub(crate) async fn fetch_optional_row(
    query: SqliteQuery<'_>,
    pool: &sqlx::SqlitePool,
) -> Result<Option<sqlx::sqlite::SqliteRow>, ServerFnError> {
    query
        .fetch_optional(pool)
        .await
        .map_err(|err| to_server_error(&err))
}

#[cfg(feature = "ssr")]
pub(crate) async fn fetch_optional_mapped<T>(
    query: SqliteQuery<'_>,
    pool: &sqlx::SqlitePool,
    map: impl FnOnce(&sqlx::sqlite::SqliteRow) -> Result<T, ServerFnError>,
) -> Result<Option<T>, ServerFnError> {
    fetch_optional_row(query, pool)
        .await?
        .as_ref()
        .map(map)
        .transpose()
}

#[cfg(feature = "ssr")]
pub(crate) async fn fetch_rows(
    query: SqliteQuery<'_>,
    pool: &sqlx::SqlitePool,
) -> Result<Vec<sqlx::sqlite::SqliteRow>, ServerFnError> {
    query
        .fetch_all(pool)
        .await
        .map_err(|err| to_server_error(&err))
}

#[cfg(feature = "ssr")]
pub(crate) fn map_rows<T>(
    rows: Vec<sqlx::sqlite::SqliteRow>,
    map: impl FnMut(sqlx::sqlite::SqliteRow) -> Result<T, ServerFnError>,
) -> Result<Vec<T>, ServerFnError> {
    rows.into_iter().map(map).collect()
}

#[cfg(feature = "ssr")]
pub(crate) fn year_from_date(date: &str) -> i32 {
    date.get(0..4)
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or_default()
}

#[cfg(feature = "ssr")]
pub(crate) fn sanitize_i32_limit(limit: i32, max: i32) -> i32 {
    limit.clamp(0, max.max(0))
}

#[cfg(feature = "ssr")]
pub(crate) fn i64_to_i32(raw: i64, column: &str) -> Result<i32, ServerFnError> {
    i32::try_from(raw).map_err(|_| {
        ServerFnError::ServerError(format!("column `{column}` out of i32 range: {raw}"))
    })
}

#[cfg(feature = "ssr")]
pub(crate) fn opt_i64_to_i32(
    value: Option<i64>,
    column: &str,
) -> Result<Option<i32>, ServerFnError> {
    value.map(|raw| i64_to_i32(raw, column)).transpose()
}

#[cfg(feature = "ssr")]
pub(crate) fn usize_to_i64_limit(limit: usize) -> Result<i64, ServerFnError> {
    i64::try_from(limit)
        .map_err(|_| ServerFnError::ServerError(format!("limit out of i64 range: {limit}")))
}

#[cfg(feature = "ssr")]
pub(crate) fn row_get<T>(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<T, ServerFnError>
where
    for<'r> T: sqlx::Decode<'r, sqlx::Sqlite> + sqlx::Type<sqlx::Sqlite>,
{
    row.try_get::<T, _>(column)
        .map_err(|err| to_server_error(&err))
}

#[cfg(feature = "ssr")]
pub(crate) fn row_i32(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<i32, ServerFnError> {
    row_get::<i64>(row, column).and_then(|raw| i64_to_i32(raw, column))
}

#[cfg(feature = "ssr")]
pub(crate) fn row_string(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<String, ServerFnError> {
    row_get(row, column)
}

#[cfg(feature = "ssr")]
pub(crate) fn opt_i64_to_bool(value: Option<i64>) -> Option<bool> {
    value.map(|raw| raw != 0)
}

#[cfg(feature = "ssr")]
pub(crate) fn row_opt_i32(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<Option<i32>, ServerFnError> {
    row_get::<Option<i64>>(row, column).and_then(|value| opt_i64_to_i32(value, column))
}

#[cfg(feature = "ssr")]
pub(crate) fn row_opt_string(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<Option<String>, ServerFnError> {
    row_get(row, column)
}

#[cfg(feature = "ssr")]
pub(crate) fn row_opt_bool(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<Option<bool>, ServerFnError> {
    row_get::<Option<i64>>(row, column).map(opt_i64_to_bool)
}

#[cfg(feature = "ssr")]
pub(crate) fn row_opt_f32(
    row: &sqlx::sqlite::SqliteRow,
    column: &str,
) -> Result<Option<f32>, ServerFnError> {
    row_get(row, column)
}
