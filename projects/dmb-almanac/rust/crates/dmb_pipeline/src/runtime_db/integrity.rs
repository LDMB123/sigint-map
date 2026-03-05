use anyhow::{Context, Result};
use rusqlite::Transaction;

fn expect_zero_violations(tx: &Transaction<'_>, label: &str, sql: &str) -> Result<()> {
    let count: i64 = tx
        .query_row(sql, [], |row| row.get(0))
        .with_context(|| format!("run integrity check {label}"))?;
    if count != 0 {
        anyhow::bail!("runtime sqlite integrity check failed ({label}): {count} violation(s)");
    }
    Ok(())
}

const RUNTIME_INTEGRITY_CHECKS: [(&str, &str); 9] = [
    (
        "shows.venue_id references venues.id",
        "SELECT COUNT(*)
         FROM shows s
         LEFT JOIN venues v ON v.id = s.venue_id
         WHERE v.id IS NULL",
    ),
    (
        "shows.tour_id references tours.id",
        "SELECT COUNT(*)
         FROM shows s
         LEFT JOIN tours t ON t.id = s.tour_id
         WHERE s.tour_id IS NOT NULL AND t.id IS NULL",
    ),
    (
        "setlist_entries.show_id references shows.id",
        "SELECT COUNT(*)
         FROM setlist_entries se
         LEFT JOIN shows s ON s.id = se.show_id
         WHERE s.id IS NULL",
    ),
    (
        "setlist_entries.song_id references songs.id",
        "SELECT COUNT(*)
         FROM setlist_entries se
         LEFT JOIN songs so ON so.id = se.song_id
         WHERE so.id IS NULL",
    ),
    (
        "guest_appearances.guest_id references guests.id",
        "SELECT COUNT(*)
         FROM guest_appearances ga
         LEFT JOIN guests g ON g.id = ga.guest_id
         WHERE g.id IS NULL",
    ),
    (
        "guest_appearances.show_id references shows.id",
        "SELECT COUNT(*)
         FROM guest_appearances ga
         LEFT JOIN shows s ON s.id = ga.show_id
         WHERE s.id IS NULL",
    ),
    (
        "release_tracks.release_id references releases.id",
        "SELECT COUNT(*)
         FROM release_tracks rt
         LEFT JOIN releases r ON r.id = rt.release_id
         WHERE r.id IS NULL",
    ),
    (
        "curated_list_items.list_id references curated_lists.id",
        "SELECT COUNT(*)
         FROM curated_list_items cli
         LEFT JOIN curated_lists cl ON cl.id = cli.list_id
         WHERE cl.id IS NULL",
    ),
    (
        "required textual fields are non-empty",
        "SELECT
            (SELECT COUNT(*) FROM shows WHERE date IS NULL OR TRIM(date) = '') +
            (SELECT COUNT(*) FROM songs WHERE title IS NULL OR TRIM(title) = '') +
            (SELECT COUNT(*) FROM venues WHERE name IS NULL OR TRIM(name) = '') +
            (SELECT COUNT(*) FROM tours WHERE name IS NULL OR TRIM(name) = '')",
    ),
];

pub(super) fn validate_runtime_integrity(tx: &Transaction<'_>) -> Result<()> {
    // Keep logical referential integrity checks explicit because bulk load runs with
    // foreign_keys disabled for throughput.
    for (label, sql) in RUNTIME_INTEGRITY_CHECKS {
        expect_zero_violations(tx, label, sql)?;
    }
    Ok(())
}
