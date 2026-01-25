# Database Migrations

This directory contains SQL migration files for the DMB Almanac database.

## Migration Naming Convention

Migrations are named with a sequential number prefix followed by a descriptive name:
- `001_add_track_count_to_releases.sql`
- `002_add_some_other_feature.sql`

## Running Migrations

### Apply a single migration:
```bash
sqlite3 data/dmb-almanac.db < lib/db/migrations/001_add_track_count_to_releases.sql
```

### Apply all migrations (in order):
```bash
for f in lib/db/migrations/*.sql; do
  sqlite3 data/dmb-almanac.db < "$f"
done
```

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 001_add_track_count_to_releases.sql | 2026-01-15 | Adds track_count column to releases table |

## Notes

- Always backup the database before running migrations
- Migrations should be idempotent when possible (use IF NOT EXISTS, etc.)
- Test migrations on a copy of the database first
