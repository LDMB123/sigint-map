use std::collections::{HashMap, HashSet};

use dmb_core::{is_supported_sqlite_parity_table, sqlite_parity_tables};
use sqlx::SqlitePool;

pub(crate) async fn fetch_table_count(pool: &SqlitePool, table: &str) -> Option<u64> {
    if !is_supported_sqlite_parity_table(table) {
        tracing::warn!(table, "unsupported sqlite table requested for parity count");
        return None;
    }

    let query = format!("SELECT COUNT(*) FROM {table}");
    match sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(query))
        .fetch_one(pool)
        .await
    {
        Ok(value) => Some(u64::try_from(value).unwrap_or_default()),
        Err(err) => {
            tracing::warn!(table, error = ?err, "failed to count sqlite table");
            None
        }
    }
}

pub(crate) async fn fetch_existing_tables(pool: &SqlitePool) -> HashSet<String> {
    match sqlx::query_scalar::<_, String>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .fetch_all(pool)
    .await
    {
        Ok(rows) => rows.into_iter().collect(),
        Err(err) => {
            tracing::warn!(error = ?err, "failed to enumerate sqlite tables");
            HashSet::new()
        }
    }
}

pub(crate) async fn fetch_all_table_counts(pool: &SqlitePool) -> Option<HashMap<String, u64>> {
    let tables: Vec<&str> = sqlite_parity_tables().collect();
    fetch_selected_table_counts(pool, &tables).await
}

pub(crate) fn build_table_counts_query(tables: &[&str]) -> Option<String> {
    if tables.is_empty() {
        return None;
    }

    let mut query = String::new();
    for (index, table) in tables.iter().enumerate() {
        if index > 0 {
            query.push_str("\nUNION ALL ");
        }
        query.push_str("SELECT '");
        query.push_str(table);
        query.push_str("', (SELECT COUNT(*) FROM ");
        query.push_str(table);
        query.push(')');
    }
    Some(query)
}

pub(crate) async fn fetch_selected_table_counts(
    pool: &SqlitePool,
    tables: &[&str],
) -> Option<HashMap<String, u64>> {
    let query = build_table_counts_query(tables)?;
    match sqlx::query_as::<_, (String, i64)>(sqlx::AssertSqlSafe(query))
        .fetch_all(pool)
        .await
    {
        Ok(rows) => {
            let mut counts = HashMap::with_capacity(rows.len());
            for (table, count) in rows {
                counts.insert(table, u64::try_from(count).unwrap_or_default());
            }
            Some(counts)
        }
        Err(err) => {
            tracing::warn!(
                error = ?err,
                "failed to fetch sqlite parity counts via selected aggregate query"
            );
            None
        }
    }
}
