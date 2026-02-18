use std::collections::{HashMap, HashSet};

use dmb_core::is_supported_sqlite_parity_table;
use sqlx::SqlitePool;

pub(super) async fn fetch_table_count(pool: &SqlitePool, table: &str) -> Option<u64> {
    if !is_supported_sqlite_parity_table(table) {
        tracing::warn!(table, "unsupported sqlite table requested for parity count");
        return None;
    }

    let query = format!("SELECT COUNT(*) FROM {table}");
    match sqlx::query_scalar::<_, i64>(&query).fetch_one(pool).await {
        Ok(value) => Some(value.max(0) as u64),
        Err(err) => {
            tracing::warn!(table, error = ?err, "failed to count sqlite table");
            None
        }
    }
}

pub(super) async fn fetch_existing_tables(pool: &SqlitePool) -> HashSet<String> {
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

pub(super) fn build_table_counts_query(tables: &[&str]) -> Option<String> {
    (!tables.is_empty()).then(|| {
        tables
            .iter()
            .map(|table| format!("SELECT '{table}', (SELECT COUNT(*) FROM {table})"))
            .collect::<Vec<_>>()
            .join("\nUNION ALL ")
    })
}

pub(super) async fn fetch_selected_table_counts(
    pool: &SqlitePool,
    tables: &[&str],
) -> Option<HashMap<String, u64>> {
    let query = build_table_counts_query(tables)?;
    match sqlx::query_as::<_, (String, i64)>(&query)
        .fetch_all(pool)
        .await
    {
        Ok(rows) => {
            let mut counts = HashMap::with_capacity(rows.len());
            for (table, count) in rows {
                counts.insert(table, count.max(0) as u64);
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
