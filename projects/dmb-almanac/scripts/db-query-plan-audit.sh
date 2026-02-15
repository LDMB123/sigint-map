#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${1:-rust/.tmp/dmb-runtime.db}"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "error: sqlite3 is required for query-plan audit" >&2
  exit 1
fi

if [[ ! -f "${DB_PATH}" ]]; then
  echo "error: runtime sqlite not found at ${DB_PATH}" >&2
  exit 1
fi

run_sql() {
  sqlite3 "${DB_PATH}" "$1"
}

assert_equals() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "error: ${label} expected '${expected}', got '${actual}'" >&2
    exit 1
  fi
  echo "ok: ${label}=${expected}"
}

assert_zero() {
  local label="$1"
  local sql="$2"
  local value
  value="$(run_sql "${sql}")"
  if [[ "${value}" != "0" ]]; then
    echo "error: ${label} expected 0, got ${value}" >&2
    exit 1
  fi
  echo "ok: ${label}=0"
}

assert_plan_uses_index() {
  local label="$1"
  local sql="$2"
  local expected_index="$3"
  local plan
  plan="$(run_sql "EXPLAIN QUERY PLAN ${sql};")"

  if [[ "${plan}" != *"${expected_index}"* ]]; then
    echo "error: ${label} does not use expected index ${expected_index}" >&2
    echo "${plan}" >&2
    exit 1
  fi

  if [[ "${plan}" == *"AUTOMATIC"* ]]; then
    echo "error: ${label} used an automatic index (missing explicit index coverage)" >&2
    echo "${plan}" >&2
    exit 1
  fi

  if [[ "${plan}" == *"USE TEMP B-TREE"* ]]; then
    echo "error: ${label} uses temp sort b-tree" >&2
    echo "${plan}" >&2
    exit 1
  fi

  echo "ok: ${label} (${expected_index})"
}

integrity="$(run_sql "PRAGMA integrity_check;")"
if [[ "${integrity}" != "ok" ]]; then
  echo "error: PRAGMA integrity_check failed: ${integrity}" >&2
  exit 1
fi
echo "ok: integrity_check"

fk_violations="$(run_sql "PRAGMA foreign_key_check;")"
if [[ -n "${fk_violations}" ]]; then
  echo "error: PRAGMA foreign_key_check returned violations:" >&2
  echo "${fk_violations}" >&2
  exit 1
fi
echo "ok: foreign_key_check"

journal_mode="$(run_sql "PRAGMA journal_mode;")"
assert_equals "journal_mode" "delete" "${journal_mode,,}"

stat1_table_count="$(run_sql "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_stat1'")"
assert_equals "sqlite_stat1 table count" "1" "${stat1_table_count}"

stat1_rows="$(run_sql "SELECT COUNT(*) FROM sqlite_stat1")"
if [[ "${stat1_rows}" == "0" ]]; then
  echo "error: sqlite_stat1 is empty (ANALYZE not persisted)" >&2
  exit 1
fi
echo "ok: sqlite_stat1 rows=${stat1_rows}"

for table in songs venues tours shows setlist_entries releases release_tracks curated_lists curated_list_items liberation_list; do
  table_rows="$(run_sql "SELECT COUNT(*) FROM sqlite_stat1 WHERE tbl = '${table}'")"
  if [[ "${table_rows}" == "0" ]]; then
    echo "error: sqlite_stat1 missing stats for table ${table}" >&2
    exit 1
  fi
  echo "ok: sqlite_stat1 has stats for ${table}"
done

assert_zero "songs.slug duplicate groups" \
  "SELECT COUNT(*) FROM (SELECT slug FROM songs GROUP BY slug HAVING COUNT(*) > 1)"
assert_zero "guests.slug duplicate groups" \
  "SELECT COUNT(*) FROM (SELECT slug FROM guests GROUP BY slug HAVING COUNT(*) > 1)"
assert_zero "releases.slug duplicate groups" \
  "SELECT COUNT(*) FROM (SELECT slug FROM releases GROUP BY slug HAVING COUNT(*) > 1)"
assert_zero "curated_lists.slug duplicate groups" \
  "SELECT COUNT(*) FROM (SELECT slug FROM curated_lists GROUP BY slug HAVING COUNT(*) > 1)"

assert_plan_uses_index \
  "top songs ordering" \
  "SELECT id, slug, title FROM songs ORDER BY COALESCE(total_performances, 0) DESC, title ASC LIMIT 50" \
  "idx_songs_total_performances_title"

assert_plan_uses_index \
  "top venues ordering" \
  "SELECT id, name FROM venues ORDER BY COALESCE(total_shows, 0) DESC, name ASC LIMIT 50" \
  "idx_venues_total_shows_name"

assert_plan_uses_index \
  "top guests ordering" \
  "SELECT id, name FROM guests ORDER BY COALESCE(total_appearances, 0) DESC, name ASC LIMIT 50" \
  "idx_guests_total_appearances_name"

assert_plan_uses_index \
  "recent releases ordering" \
  "SELECT id, title, slug FROM releases ORDER BY release_date DESC, id DESC LIMIT 25" \
  "idx_releases_release_date_id"

assert_plan_uses_index \
  "recent tours ordering" \
  "SELECT id, year, name FROM tours ORDER BY year DESC, total_shows DESC, id DESC LIMIT 25" \
  "idx_tours_year_total_shows_id"

assert_plan_uses_index \
  "curated list items ordering" \
  "SELECT id, list_id, position FROM curated_list_items WHERE list_id = 1 ORDER BY position, id LIMIT 200" \
  "idx_curated_list_items_list_id"

assert_plan_uses_index \
  "liberation list ordering" \
  "SELECT id, song_id, days_since FROM liberation_list ORDER BY days_since DESC, id DESC LIMIT 50" \
  "idx_liberation_list_days_since_id"

assert_plan_uses_index \
  "release tracks ordering" \
  "SELECT id, release_id, track_number, disc_number FROM release_tracks WHERE release_id = 1 ORDER BY disc_number, track_number, id" \
  "idx_release_tracks_release_id"

assert_plan_uses_index \
  "recent shows ordering" \
  "SELECT id, date, year FROM shows ORDER BY date DESC LIMIT 30" \
  "idx_shows_date"

assert_plan_uses_index \
  "recent shows join ordering" \
  "SELECT s.id, s.date, s.year, s.venue_id, v.name, v.city, v.state, t.name, t.year FROM shows s JOIN venues v ON v.id = s.venue_id LEFT JOIN tours t ON t.id = s.tour_id ORDER BY s.date DESC LIMIT 30" \
  "idx_shows_date"

assert_plan_uses_index \
  "tour-by-year lookup" \
  "SELECT id, year, name FROM tours WHERE year = 2014 ORDER BY year DESC, total_shows DESC, id DESC LIMIT 1" \
  "idx_tours_year_total_shows_id"

assert_plan_uses_index \
  "song slug lookup" \
  "SELECT id, slug, title FROM songs WHERE slug = 'ants-marching'" \
  "idx_songs_slug"

assert_plan_uses_index \
  "guest slug lookup" \
  "SELECT id, slug, name FROM guests WHERE slug = 'bela-fleck'" \
  "idx_guests_slug"

assert_plan_uses_index \
  "release slug lookup" \
  "SELECT id, slug, title FROM releases WHERE slug = 'live-at-red-rocks-8-15-95'" \
  "idx_releases_slug"

assert_plan_uses_index \
  "setlist entries ordering" \
  "SELECT id, show_id, song_id, position FROM setlist_entries WHERE show_id = 1 ORDER BY position, id" \
  "idx_setlist_entries_show_position"

assert_plan_uses_index \
  "curated lists ordering" \
  "SELECT id, original_id, title, slug, category, description, item_count, is_featured, sort_order, created_at, updated_at FROM curated_lists ORDER BY sort_order, id" \
  "idx_curated_lists_sort_order_id"

assert_plan_uses_index \
  "liberation list join ordering" \
  "SELECT ll.id, ll.song_id, ll.last_played_date, ll.last_played_show_id, ll.days_since, ll.shows_since, ll.notes, ll.configuration, ll.is_liberated, ll.liberated_date, ll.liberated_show_id, s.slug, s.title, sh.date, v.name, v.city, v.state FROM liberation_list ll LEFT JOIN songs s ON ll.song_id = s.id LEFT JOIN shows sh ON ll.last_played_show_id = sh.id LEFT JOIN venues v ON sh.venue_id = v.id ORDER BY ll.days_since DESC, ll.id DESC LIMIT 50" \
  "idx_liberation_list_days_since_id"

echo "query-plan audit: ok"
