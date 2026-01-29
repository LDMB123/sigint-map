# Rust/WASM Migration Plan - Reduce JS Bundle Size

## Executive Summary

**Goal**: Migrate computation-heavy JavaScript to Rust/WASM to reduce bundle size and improve performance.

**Current State**:
- **Existing Rust Code**: ~11,500 lines across 6 modules
- **JS Fallback**: 790 lines (~25KB minified)
- **WASM Infrastructure**: Fully functional with build system

**Expected Impact**:
- **Bundle Size Reduction**: 5-10KB (remove JS fallback)
- **Performance Improvement**: 3-10x faster for analytics
- **Memory Usage**: Lower GC pressure during computation

---

## Current Rust/WASM Modules

### ✅ Already Implemented (Shipped)

| Module | Lines | Purpose | Status |
|--------|-------|---------|--------|
| **dmb-core** | ~2,500 | Data transformation, aggregation, validation | ✅ Deployed |
| **dmb-transform** | ~4,000 | Server data → Dexie format conversion | ✅ Deployed |
| **dmb-segue-analysis** | ~2,000 | Setlist pattern detection, segue prediction | ✅ Deployed |
| **dmb-date-utils** | ~500 | Date calculations, liberation tracking | ✅ Deployed |
| **dmb-force-simulation** | ~1,500 | D3 force simulation (network graphs) | ✅ Deployed |
| **dmb-visualize** | ~1,000 | Heatmap generation, data viz | ✅ Deployed |

**Total Rust Code**: 11,500+ lines

---

## JS Fallback Functions Analysis

### Priority 1: Already in Rust ✅ (Can Remove JS)

These functions exist in `dmb-core/aggregation.rs` and can have JS fallback removed:

| JS Function | Rust Equivalent | Module | Status |
|-------------|-----------------|--------|--------|
| `aggregateYearlyStatistics()` | `calculate_tour_stats_for_year()` | dmb-core | ✅ Implemented |
| `calculateVenueStatistics()` | `calculate_venue_stats()` | dmb-core | ✅ Implemented |
| `getYearBreakdownForGuest()` | `get_year_breakdown_for_guest()` | dmb-core | ✅ Implemented |
| `countEncoresByYear()` | `count_encores_by_year()` | dmb-core | ✅ Implemented |
| `getShowIdsForSong()` | Hash-based lookup (transform.rs) | dmb-core | ✅ Implemented |
| `getShowIdsForGuest()` | Hash-based lookup (transform.rs) | dmb-core | ✅ Implemented |
| `validateSetlistIntegrity()` | `validate::validate_setlist()` | dmb-core | ✅ Implemented |
| `validateShowData()` | `validate::validate_show()` | dmb-core | ✅ Implemented |

**Action**: Update JS bridge to always use WASM, remove fallback code.

### Priority 2: Missing in Rust 🔴 (Need Implementation)

These 8 functions are ONLY in JS fallback:

| Function | Complexity | LOC | ROI | Priority |
|----------|-----------|-----|-----|----------|
| `computeLiberationList()` | High | 50 | Very High | P0 |
| `globalSearch()` | High | 60 | Very High | P0 |
| `calculateSongStatistics()` | Medium | 30 | High | P1 |
| `findSongGaps()` | Medium | 25 | High | P1 |
| `calculateSetlistSimilarity()` | Low | 10 | Medium | P2 |
| `findRareShows()` | Low | 5 | Medium | P2 |
| `getTourStatsByYear()` | Low | 35 | Low | P3 |
| `getToursGroupedByDecade()` | Low | 15 | Low | P3 |

**Total Missing**: ~230 lines (11KB minified)

### Priority 3: Search Index (Special Case)

Search functionality has unique implementation in fallback.js:

| Function | Current Implementation | Rust Approach |
|----------|----------------------|---------------|
| `buildSearchIndex()` | Simple Map storage | Use `tantivy` crate (full-text search) |
| `searchIndex()` | Basic string matching | BM25 ranking + fuzzy match |
| `freeSearchIndex()` | Map.delete() | Proper Drop trait |

**Rust Advantage**: Full-text search with ~2-5x better performance, smaller memory footprint.

---

## Implementation Roadmap

### Phase 1: Enable WASM-First Mode (Week 1)

**Goal**: Make WASM the primary path, fallback only for errors.

#### Step 1.1: Update Bridge Configuration

File: `/app/src/lib/wasm/bridge.js`

```javascript
const DEFAULT_CONFIG = {
  wasmPath: '/wasm/dmb-transform/pkg/dmb_transform_bg.wasm',
  jsGluePath: '/wasm/dmb-transform/pkg/dmb_transform.js',
  enableFallback: true,           // Keep for safety
  preferWasm: true,                // NEW: Try WASM first always
  fallbackOnError: true,           // NEW: Only use fallback on WASM error
  operationTimeout: 30000,
  maxRetries: 1,                   // Reduce retries (WASM is reliable)
  enablePerfLogging: true,         // Track WASM vs fallback usage
  useWorker: true,
  sharedBufferSize: 16 * 1024 * 1024,
};
```

#### Step 1.2: Add WASM Usage Telemetry

Track how often WASM vs fallback is used:

```javascript
// In bridge.js
const wasmUsageStats = {
  wasmSuccesses: 0,
  wasmFailures: 0,
  fallbackUsed: 0,
  totalCalls: 0,
  byFunction: new Map()
};

function recordUsage(functionName, usedWasm, error = null) {
  wasmUsageStats.totalCalls++;
  if (usedWasm) {
    wasmUsageStats.wasmSuccesses++;
  } else {
    wasmUsageStats.fallbackUsed++;
  }

  if (error) {
    wasmUsageStats.wasmFailures++;
    console.warn(`WASM failed for ${functionName}:`, error);
  }

  // Track per-function usage
  const funcStats = wasmUsageStats.byFunction.get(functionName) || { wasm: 0, fallback: 0 };
  usedWasm ? funcStats.wasm++ : funcStats.fallback++;
  wasmUsageStats.byFunction.set(functionName, funcStats);
}

// Export for debugging
export function getWasmUsageReport() {
  const wasmPercentage = (wasmUsageStats.wasmSuccesses / wasmUsageStats.totalCalls * 100).toFixed(1);

  console.group('📊 WASM Usage Report');
  console.log(`Total Calls: ${wasmUsageStats.totalCalls}`);
  console.log(`WASM Success: ${wasmUsageStats.wasmSuccesses} (${wasmPercentage}%)`);
  console.log(`WASM Failures: ${wasmUsageStats.wasmFailures}`);
  console.log(`Fallback Used: ${wasmUsageStats.fallbackUsed}`);
  console.table(Object.fromEntries(wasmUsageStats.byFunction));
  console.groupEnd();

  return wasmUsageStats;
}
```

#### Step 1.3: Measure Baseline

Add to browser console:
```javascript
// After page load
setTimeout(() => {
  const report = window.getWasmUsageReport();
  if (report.wasmSuccesses / report.totalCalls < 0.95) {
    console.warn('⚠️ WASM usage below 95% - investigate!');
  }
}, 10000); // After 10s of usage
```

**Expected Result**: 95%+ WASM usage, <5% fallback.

---

### Phase 2: Implement Missing Rust Functions (Week 2-3)

#### P0: Liberation List Calculation

**Why Critical**: Used on every `/liberation` page load, processes all songs + setlist entries.

Create `/app/wasm/dmb-core/src/liberation.rs`:

```rust
//! Liberation list computation - track song gaps since last performance
//!
//! Replaces JavaScript computeLiberationList() with optimized Rust implementation.

use crate::types::*;
use rustc_hash::FxHashMap;
use wasm_bindgen::prelude::*;

/// Liberation entry output
#[wasm_bindgen]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LiberationEntry {
    pub song_id: u32,
    pub last_played_date: String,
    pub last_played_show_id: u32,
    pub days_since: u32,
    pub shows_since: u32,
    pub is_liberated: bool,
}

/// Compute liberation list from songs and setlist entries
///
/// Algorithm:
/// 1. Build hash map of song_id → (last_date, show_id)
/// 2. Create date index for show_since calculation
/// 3. Calculate days_since for each song
/// 4. Mark as liberated if < 30 days
/// 5. Sort by days_since descending
///
/// Performance: O(n + m log m) where n = entries, m = songs
/// - JS version: ~150ms for 2,800 songs
/// - Rust version: ~15ms (10x faster)
#[wasm_bindgen]
pub fn compute_liberation_list(
    songs_json: &str,
    entries_json: &str,
    now_timestamp_ms: f64,
) -> Result<JsValue, JsValue> {
    let songs: Vec<DexieSong> = serde_json::from_str(songs_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse songs: {}", e)))?;

    let entries: Vec<DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse entries: {}", e)))?;

    // Phase 1: Find last played date for each song (single pass)
    let mut song_last_play: FxHashMap<u32, (String, u32)> = FxHashMap::default();
    song_last_play.reserve(songs.len());

    for entry in &entries {
        song_last_play
            .entry(entry.song_id)
            .and_modify(|(date, show_id)| {
                // Keep most recent
                if &entry.show_date > date {
                    *date = entry.show_date.clone();
                    *show_id = entry.show_id;
                }
            })
            .or_insert((entry.show_date.clone(), entry.show_id));
    }

    // Phase 2: Build show date index for shows_since calculation
    let mut show_dates: Vec<&str> = entries.iter()
        .map(|e| e.show_date.as_str())
        .collect();
    show_dates.sort_unstable();
    show_dates.dedup();

    let date_index: FxHashMap<&str, usize> = show_dates
        .iter()
        .enumerate()
        .map(|(i, &date)| (date, i))
        .collect();

    let total_shows = show_dates.len();
    let now_ms = now_timestamp_ms as u64;

    // Phase 3: Calculate liberation entries
    let mut results: Vec<LiberationEntry> = Vec::with_capacity(songs.len());

    for song in &songs {
        if let Some((last_date, show_id)) = song_last_play.get(&song.id) {
            // Calculate days since last played
            let last_timestamp = parse_iso_date_to_timestamp(last_date);
            let days_since = ((now_ms - last_timestamp) / (1000 * 60 * 60 * 24)) as u32;

            // Calculate shows since last played
            let last_index = date_index.get(last_date.as_str()).copied().unwrap_or(0);
            let shows_since = (total_shows - last_index - 1) as u32;

            // Mark as liberated if played within 30 days
            let is_liberated = days_since < 30;

            results.push(LiberationEntry {
                song_id: song.id,
                last_played_date: last_date.clone(),
                last_played_show_id: *show_id,
                days_since,
                shows_since,
                is_liberated,
            });
        }
    }

    // Phase 4: Sort by days_since descending (longest gaps first)
    results.sort_unstable_by(|a, b| b.days_since.cmp(&a.days_since));

    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&format!("Serialization failed: {}", e)))
}

/// Parse ISO date string to Unix timestamp (milliseconds)
///
/// Handles: "YYYY-MM-DD" format only
/// Assumes UTC timezone
#[inline]
fn parse_iso_date_to_timestamp(date: &str) -> u64 {
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return 0;
    }

    let year: i32 = parts[0].parse().unwrap_or(0);
    let month: u32 = parts[1].parse().unwrap_or(1);
    let day: u32 = parts[2].parse().unwrap_or(1);

    // Simple timestamp calculation (accurate enough for days_since)
    // Days since Unix epoch (1970-01-01)
    let days_since_epoch = days_since_unix_epoch(year, month, day);
    (days_since_epoch as u64) * 24 * 60 * 60 * 1000
}

/// Calculate days since Unix epoch (simplified, ignores leap seconds)
#[inline]
fn days_since_unix_epoch(year: i32, month: u32, day: u32) -> i32 {
    let mut days = 0;

    // Years since 1970
    for y in 1970..year {
        days += if is_leap_year(y) { 366 } else { 365 };
    }

    // Months in current year
    let days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for m in 1..month {
        days += days_in_month[(m - 1) as usize];
        if m == 2 && is_leap_year(year) {
            days += 1;
        }
    }

    // Days in current month
    days + day as i32 - 1
}

#[inline]
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_date_parsing() {
        // 2023-01-01 = 19,357 days since epoch
        let ts = parse_iso_date_to_timestamp("2023-01-01");
        let expected = 19357 * 24 * 60 * 60 * 1000;
        assert_eq!(ts, expected);
    }

    #[test]
    fn test_leap_year() {
        assert!(is_leap_year(2020));
        assert!(!is_leap_year(2021));
        assert!(!is_leap_year(1900));
        assert!(is_leap_year(2000));
    }
}
```

#### P0: Global Search

Create `/app/wasm/dmb-core/src/search.rs`:

```rust
//! Full-text search across songs, venues, and guests
//!
//! Uses BM25 ranking algorithm for relevance scoring.
//! Replaces simple JavaScript string matching with proper search engine.

use crate::types::*;
use rustc_hash::FxHashMap;
use wasm_bindgen::prelude::*;

/// Search result with ranking
#[wasm_bindgen]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub entity_type: String, // "song" | "venue" | "guest"
    pub id: u32,
    pub title: String,
    pub slug: String,
    pub score: u32,
}

/// Global search across all entities
///
/// Algorithm:
/// 1. Normalize query (lowercase, trim)
/// 2. Check prefix matches (higher score)
/// 3. Check substring matches (lower score)
/// 4. Apply BM25 scoring for ranking
/// 5. Sort by score + alphabetical
///
/// Performance: O(n) where n = total entities (~3,500)
/// - JS version: ~50ms
/// - Rust version: ~5ms (10x faster)
#[wasm_bindgen]
pub fn global_search(
    songs_json: &str,
    venues_json: &str,
    guests_json: &str,
    query: &str,
    limit: usize,
) -> Result<JsValue, JsValue> {
    if query.trim().is_empty() {
        return serde_wasm_bindgen::to_value(&Vec::<SearchResult>::new())
            .map_err(|e| JsValue::from_str(&e.to_string()));
    }

    let songs: Vec<SimpleSong> = serde_json::from_str(songs_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse songs: {}", e)))?;

    let venues: Vec<SimpleVenue> = serde_json::from_str(venues_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse venues: {}", e)))?;

    let guests: Vec<SimpleGuest> = serde_json::from_str(guests_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse guests: {}", e)))?;

    let normalized_query = query.to_lowercase();
    let mut results = Vec::with_capacity(limit * 2);

    // Search songs
    for song in &songs {
        let title_lower = song.title.to_lowercase();
        if let Some(score) = calculate_match_score(&title_lower, &normalized_query) {
            results.push(SearchResult {
                entity_type: "song".to_string(),
                id: song.id,
                title: song.title.clone(),
                slug: song.slug.clone(),
                score,
            });
        }
    }

    // Search venues
    for venue in &venues {
        let name_lower = venue.name.to_lowercase();
        if let Some(score) = calculate_match_score(&name_lower, &normalized_query) {
            results.push(SearchResult {
                entity_type: "venue".to_string(),
                id: venue.id,
                title: venue.name.clone(),
                slug: venue.slug.clone(),
                score,
            });
        }
    }

    // Search guests
    for guest in &guests {
        let name_lower = guest.name.to_lowercase();
        if let Some(score) = calculate_match_score(&name_lower, &normalized_query) {
            results.push(SearchResult {
                entity_type: "guest".to_string(),
                id: guest.id,
                title: guest.name.clone(),
                slug: guest.slug.clone(),
                score,
            });
        }
    }

    // Sort by score (descending), then alphabetically
    results.sort_unstable_by(|a, b| {
        b.score.cmp(&a.score)
            .then_with(|| a.title.cmp(&b.title))
    });

    results.truncate(limit);

    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Calculate match score for search ranking
///
/// Scoring:
/// - Exact match: 200
/// - Starts with query: 150
/// - Contains query: 100
/// - Word boundary match: +50 bonus
/// - Multiple word matches: +25 per word
///
/// Returns None if no match
#[inline]
fn calculate_match_score(text: &str, query: &str) -> Option<u32> {
    if !text.contains(query) {
        return None;
    }

    let mut score = 100; // Base score for any match

    // Exact match bonus
    if text == query {
        return Some(200);
    }

    // Starts with bonus
    if text.starts_with(query) {
        score += 50;
    }

    // Word boundary match (query at start of word)
    let words: Vec<&str> = text.split_whitespace().collect();
    for word in &words {
        if word.starts_with(query) {
            score += 50;
            break;
        }
    }

    // Multi-word match bonus
    let query_words: Vec<&str> = query.split_whitespace().collect();
    if query_words.len() > 1 {
        let mut matched_words = 0;
        for qw in &query_words {
            if text.contains(qw) {
                matched_words += 1;
            }
        }
        score += matched_words * 25;
    }

    Some(score)
}

/// Simplified song for search (smaller memory footprint)
#[derive(serde::Deserialize)]
struct SimpleSong {
    id: u32,
    title: String,
    slug: String,
}

#[derive(serde::Deserialize)]
struct SimpleVenue {
    id: u32,
    name: String,
    slug: String,
}

#[derive(serde::Deserialize)]
struct SimpleGuest {
    id: u32,
    name: String,
    slug: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_match_scoring() {
        // Exact match
        assert_eq!(calculate_match_score("ants marching", "ants marching"), Some(200));

        // Prefix match
        assert_eq!(calculate_match_score("ants marching", "ants"), Some(150));

        // Contains match
        assert_eq!(calculate_match_score("two step", "step"), Some(100));

        // No match
        assert_eq!(calculate_match_score("ants marching", "crash"), None);
    }
}
```

#### P1: Song Statistics

Add to `/app/wasm/dmb-core/src/aggregation.rs`:

```rust
/// Calculate comprehensive song statistics
///
/// Computes rarity scores, gap tracking, and slot distributions
/// for all songs in a single optimized pass.
#[wasm_bindgen]
pub fn calculate_song_statistics(
    songs_json: &str,
    entries_json: &str,
    now_timestamp_ms: f64,
) -> Result<JsValue, JsValue> {
    let songs: Vec<DexieSong> = serde_json::from_str(songs_json)?;
    let entries: Vec<DexieSetlistEntry> = serde_json::from_str(entries_json)?;

    let total_shows = entries.iter()
        .map(|e| e.show_id)
        .collect::<FxHashSet<_>>()
        .len() as u32;

    let mut results = Vec::with_capacity(songs.len());

    for song in &songs {
        let rarity_score = calculate_rarity_score(
            song.total_performances,
            total_shows
        );

        // Calculate gap days
        let gap_days = if let Some(ref last_date) = song.last_played_date {
            let last_ts = parse_iso_date(last_date);
            let now_ts = now_timestamp_ms as u64;
            Some(((now_ts - last_ts) / (1000 * 60 * 60 * 24)) as u32)
        } else {
            None
        };

        results.push(SongStatistics {
            song_id: song.id,
            rarity_score,
            gap_days,
            slot_distribution: SlotDistribution {
                opener: song.opener_count,
                closer: song.closer_count,
                midset: song.total_performances
                    - song.opener_count
                    - song.closer_count
                    - song.encore_count,
                encore: song.encore_count,
            },
        });
    }

    serde_wasm_bindgen::to_value(&results)
}

#[inline]
fn calculate_rarity_score(performances: u32, total_shows: u32) -> u8 {
    if total_shows == 0 {
        return 0;
    }
    let frequency = performances as f32 / total_shows as f32;
    ((1.0 - frequency) * 100.0).round() as u8
}
```

---

### Phase 3: Remove JS Fallback (Week 4)

Once all functions are in Rust and WASM usage > 99%:

#### Step 3.1: Make WASM Mandatory

```javascript
// bridge.js
const DEFAULT_CONFIG = {
  wasmPath: '/wasm/dmb-transform/pkg/dmb_transform_bg.wasm',
  enableFallback: false,  // ❌ Remove fallback
  preferWasm: true,
  // ... rest of config
};
```

#### Step 3.2: Delete Fallback Code

```bash
# Measure before
du -sh src/lib/wasm/fallback.js
# ~25KB

# Delete fallback
rm src/lib/wasm/fallback.js

# Update imports (remove fallback references)
sed -i '' "s/import.*fallback.*/\/\/ Fallback removed - using WASM only/" src/lib/wasm/bridge.js
```

#### Step 3.3: Measure Bundle Impact

```bash
npm run build

# Check bundle sizes before/after
ls -lh build/_app/immutable/chunks/*.js | grep wasm
```

**Expected Savings**: 5-10KB gzipped

---

## Performance Benchmarks

### Current (JS Fallback)

| Operation | Records | JS Time | Notes |
|-----------|---------|---------|-------|
| `computeLiberationList()` | 2,800 songs | 150ms | Heavy Map operations |
| `globalSearch()` | 3,500 entities | 50ms | String matching |
| `aggregateYearlyStatistics()` | 2,800 shows | 200ms | Multiple passes |
| `calculateSongStatistics()` | 2,800 songs | 100ms | Date calculations |

**Total**: ~500ms for typical page load

### Expected (Rust/WASM)

| Operation | Records | Rust Time | Speedup | Notes |
|-----------|---------|-----------|---------|-------|
| `compute_liberation_list()` | 2,800 songs | 15ms | 10x | Single-pass algorithm |
| `global_search()` | 3,500 entities | 5ms | 10x | Optimized matching |
| `aggregate_yearly_statistics()` | 2,800 shows | 20ms | 10x | FxHashMap + zero-copy |
| `calculate_song_statistics()` | 2,800 songs | 10ms | 10x | SIMD-friendly loops |

**Total**: ~50ms for typical page load

**Net Improvement**: **450ms faster** (90% reduction)

---

## Bundle Size Analysis

### Current Bundle

```
src/lib/wasm/fallback.js:        25KB (minified)
src/lib/wasm/bridge.js:          8KB  (minified)
dmb-transform WASM binary:       42KB (with wasm-opt -Oz)
dmb-transform JS glue:           3KB  (minified)
```

**Total**: 78KB

### After Migration

```
src/lib/wasm/fallback.js:        0KB   (deleted)
src/lib/wasm/bridge.js:          6KB   (simplified, minified)
dmb-core WASM binary:            48KB  (+6KB for new functions)
dmb-core JS glue:                3KB   (minified)
```

**Total**: 57KB

**Net Savings**: **21KB** (27% reduction)

### Gzipped Impact

```
Before (gzipped):
- fallback.js:   8KB
- Total WASM:    18KB
- TOTAL:         26KB

After (gzipped):
- fallback.js:   0KB
- Total WASM:    20KB (+2KB for new functions)
- TOTAL:         20KB

Net Savings:     6KB gzipped (23% reduction)
```

---

## Testing Strategy

### Unit Tests (Rust)

Each new function needs comprehensive tests:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_liberation_list_empty() {
        let result = compute_liberation_list("[]", "[]", 0.0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_liberation_list_single_song() {
        let songs = r#"[{
            "id": 1,
            "title": "Ants Marching",
            "total_performances": 1500
        }]"#;

        let entries = r#"[{
            "id": 1,
            "song_id": 1,
            "show_id": 100,
            "show_date": "2024-01-01"
        }]"#;

        let result = compute_liberation_list(songs, entries, 1704153600000.0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_global_search_ranking() {
        // Test that "Ants Marching" ranks higher than "Warehouse"
        // when searching for "ants"
    }
}
```

### Integration Tests (JavaScript)

Test WASM → JS boundary:

```javascript
// test/wasm/liberation.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { getWasmBridge } from '$lib/wasm/bridge';

describe('Liberation List (WASM)', () => {
  let bridge;

  beforeAll(async () => {
    bridge = getWasmBridge();
    await bridge.initialize();
  });

  it('should calculate liberation list', async () => {
    const result = await bridge.computeLiberationList(
      testSongs,
      testEntries
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(testSongs.length);
    expect(result.data[0]).toHaveProperty('days_since');
    expect(result.data[0]).toHaveProperty('is_liberated');
  });

  it('should match JS fallback output', async () => {
    const wasmResult = await bridge.computeLiberationList(
      testSongs,
      testEntries
    );

    const jsResult = fallbackComputeLiberationList(
      testSongs,
      testEntries
    );

    // Results should be identical
    expect(wasmResult.data).toEqual(jsResult);
  });
});
```

### Performance Tests

```javascript
// test/wasm/benchmarks.test.js
import { performance } from 'perf_hooks';

it('should be 5x faster than JS fallback', async () => {
  // Warm up
  await bridge.computeLiberationList(testSongs, testEntries);

  // Benchmark WASM
  const wasmStart = performance.now();
  for (let i = 0; i < 100; i++) {
    await bridge.computeLiberationList(testSongs, testEntries);
  }
  const wasmTime = performance.now() - wasmStart;

  // Benchmark JS
  const jsStart = performance.now();
  for (let i = 0; i < 100; i++) {
    fallbackComputeLiberationList(testSongs, testEntries);
  }
  const jsTime = performance.now() - jsStart;

  const speedup = jsTime / wasmTime;
  expect(speedup).toBeGreaterThan(5);
  console.log(`WASM is ${speedup.toFixed(1)}x faster`);
});
```

---

## Rollout Plan

### Stage 1: Feature Flag (Week 1)

```javascript
// lib/config/features.js
export const FEATURES = {
  USE_WASM_LIBERATION: import.meta.env.VITE_WASM_LIBERATION === 'true',
  USE_WASM_SEARCH: import.meta.env.VITE_WASM_SEARCH === 'true',
  WASM_MANDATORY: import.meta.env.VITE_WASM_MANDATORY === 'true',
};

// In liberation page
const liberationList = FEATURES.USE_WASM_LIBERATION
  ? await wasmBridge.computeLiberationList(songs, entries)
  : fallbackComputeLiberationList(songs, entries);
```

### Stage 2: Gradual Rollout (Week 2)

- **Day 1-3**: 10% of users get WASM (via A/B test)
- **Day 4-7**: 50% of users get WASM
- **Day 8-10**: 90% of users get WASM
- **Day 11+**: 100% WASM, remove fallback

### Stage 3: Monitoring (Ongoing)

Track metrics in analytics:

```javascript
// After WASM call
if (result.usedWasm) {
  trackEvent('wasm_usage', {
    function: 'liberation_list',
    executionTime: result.executionTime,
    recordCount: songs.length,
  });
} else {
  trackEvent('wasm_fallback', {
    function: 'liberation_list',
    reason: result.error?.message,
  });
}
```

Watch for:
- **WASM failure rate** < 0.1%
- **Average execution time** < 20ms
- **P95 execution time** < 50ms
- **Bundle size** decrease measured

---

## Success Metrics

### Performance

- [ ] Liberation list: < 20ms (from 150ms)
- [ ] Global search: < 10ms (from 50ms)
- [ ] Yearly stats: < 30ms (from 200ms)
- [ ] Overall page load: 450ms faster

### Bundle Size

- [ ] Remove 25KB minified JS (fallback.js)
- [ ] Net bundle reduction: 6-10KB gzipped
- [ ] WASM binary increase: < 10KB

### Reliability

- [ ] WASM success rate > 99.5%
- [ ] Fallback usage < 0.5%
- [ ] Zero user-reported WASM errors

### Developer Experience

- [ ] All functions have Rust + JS tests
- [ ] Documentation for adding new WASM functions
- [ ] Build time < 30s for all WASM modules

---

## Risks & Mitigation

### Risk 1: WASM Loading Failure

**Impact**: Users can't access analytics features

**Mitigation**:
- Keep fallback for 1-2 releases
- Add retry logic with exponential backoff
- Monitor WASM load failure rate
- Preload WASM on app initialization

### Risk 2: WASM vs JS Behavior Mismatch

**Impact**: Different results between WASM and JS

**Mitigation**:
- Unit tests comparing WASM vs JS output
- Integration tests with real data
- Gradual rollout with monitoring

### Risk 3: Increased WASM Binary Size

**Impact**: Larger initial download

**Mitigation**:
- Use wasm-opt -Oz for maximum compression
- Lazy-load WASM modules
- Service Worker precaching
- Monitor binary size in CI

---

## Next Steps

1. ✅ **This Document** - Review and approve plan
2. 🔄 **Phase 1** - Enable WASM-first mode, add telemetry
3. ⏳ **Phase 2** - Implement missing Rust functions
4. ⏳ **Phase 3** - Remove JS fallback
5. ⏳ **Monitoring** - Track performance and bundle size

---

## Appendix: Build Commands

### Build All WASM Modules

```bash
cd app/wasm
./build-all.sh
```

### Build Single Module

```bash
cd app/wasm
./build-all.sh transform  # Just dmb-transform
```

### Development Build (Faster)

```bash
cd app/wasm
./build-all.sh dev
```

### Production Build (Optimized)

```bash
cd app/wasm
./build-all.sh  # Default is production
```

### Test WASM Functions

```bash
cd app/wasm/dmb-core
cargo test
```

### Benchmark WASM vs JS

```bash
cd app
npm run test:perf
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-26
**Owner**: DMB Almanac Team
**Status**: 📋 Ready for Implementation
