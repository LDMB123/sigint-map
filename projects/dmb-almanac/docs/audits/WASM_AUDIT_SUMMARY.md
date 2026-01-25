# WASM Audit Summary - Quick Reference

**Date:** January 23, 2026
**Project:** DMB Almanac SvelteKit PWA
**Auditor Role:** TypeScript Type System Expert + WASM Integration

---

## Current Status: 4 Critical Gaps

### What's Working ✅
- **dmb-transform module** (50+ functions)
  - Song/venue/tour/show/setlist transforms
  - Global search capabilities
  - Year aggregations
  - Yearly statistics

- **dmb-date-utils module** (25+ functions)
  - Date parsing and metadata
  - Season analysis
  - Anniversary detection
  - Date clustering

- **dmb-string-utils module** (8 functions)
  - String normalization

- **dmb-core module** (2 functions)
  - Basic core operations

### What's Missing ⚠️

| Class | Module | Functions | Purpose |
|-------|--------|-----------|---------|
| **TfIdfIndex** | dmb-transform | 8 | Full-text search with TF-IDF ranking |
| **SetlistSimilarityEngine** | dmb-transform | 8 | Show similarity (Jaccard/cosine/overlap) |
| **RarityEngine** | dmb-transform | 9 | Song/show rarity and gap analysis |
| **SetlistPredictor** | dmb-segue-analysis | 8 | Markov + venue/seasonal predictions |

---

## Implementation Priority Matrix

```
        Complexity
           ↑
    Very  | SetlistPredictor
    High  | (Markov chains, patterns)
           |
     High | RarityEngine  SetlistSimilarityEngine
           | (Gaps, freq) (3 metrics, clustering)
           |
    Medium| TfIdfIndex
           | (Tokenization, scoring)
           |
     Low  |_________________________________→
           Ease of Testing
           (Right = easier)
```

**Recommended Implementation Order:**
1. **TfIdfIndex** (easiest, highest visibility)
2. **SetlistSimilarityEngine** (moderate complexity, clear algorithms)
3. **RarityEngine** (moderate complexity, isolated)
4. **SetlistPredictor** (most complex, high impact)

---

## Code Specifications at a Glance

### TfIdfIndex (Search Engine)

**Input:** Songs/venues/guests (JSON)
**Output:** Ranked search results + autocomplete suggestions

**Key Methods:**
```typescript
indexSongs(songsJson: string): void
search(query: string, limit: number): TfIdfSearchResult[]
autocomplete(prefix: string, limit: number): AutocompleteResult[]
```

**Algorithms:**
- Tokenization (split on whitespace/punctuation)
- TF calculation (term frequency normalized)
- IDF calculation (inverse document frequency, log-scaled)
- Scoring: TF * IDF
- Ranking: Sort by score descending

**Performance Target:** Search < 50ms, Autocomplete < 20ms

---

### SetlistSimilarityEngine (Similarity Analysis)

**Input:** Setlist entries (show → songs)
**Output:** Similar shows, co-occurrence patterns, clusters

**Key Methods:**
```typescript
findSimilarShows(targetShowId: number, method: 'jaccard'|'cosine'|'overlap', limit: number): SimilarShowResult[]
compareShows(showIdA: number, showIdB: number): { jaccard, cosine, overlap, sharedSongs }
clusterShows(numClusters: number, maxIterations: number): ClusterResult[]
```

**Similarity Metrics:**
1. **Jaccard:** |A∩B| / |A∪B| (set-based, 0-1)
2. **Cosine:** (A·B) / (||A|| × ||B||) (vector-based, 0-1)
3. **Overlap:** |A∩B| / min(|A|,|B|) (nested sets, 0-1)

**Algorithms:**
- Co-occurrence analysis (song pair frequencies)
- K-means clustering (simplified)
- Diversity calculation (unique vs repeated)

**Performance Target:** Find similar < 100ms, Compare two < 5ms, Cluster 1000 < 500ms

---

### RarityEngine (Rarity Scoring)

**Input:** Setlist entries + song metadata
**Output:** Rarity scores, gap analysis, distributions

**Key Methods:**
```typescript
computeSongRarity(songId: number): SongRarity
computeGapAnalysis(): GapAnalysis[]
getTopSongsByGap(limit: number): GapAnalysis[]
```

**Rarity Calculation Components:**
1. **Inverse Frequency:** log(total_shows / appearances)
2. **Gap-Based:** Based on days/shows since last play
3. **Percentile:** Ranking among all songs
4. **Combined:** Weighted sum of above

**Output Fields:**
```typescript
SongRarity {
  songId, title
  inverseFrequency,      // 0-1, IDF score
  logScaled,            // log(total/appearances)
  percentile,           // 0-1 ranking
  gapBased,             // gap / avg_gap
  combinedScore         // weighted average
}
```

**Performance Target:** All rarities < 200ms, Gap analysis < 300ms

---

### SetlistPredictor (Advanced Predictions)

**Input:** Historical setlists + show metadata
**Output:** Next song predictions, patterns, venue/seasonal analysis

**Key Methods:**
```typescript
predictEnsemble(context: PredictionContext, limit: number): EnsemblePrediction
findMatchingSequences(prefix: number[], maxLength: number, limit: number): SequenceMatch[]
analyzeVenuePatterns(venueId: number): VenuePattern
```

**Prediction Signals:**
1. **Markov chains** (1st, 2nd, 3rd order)
2. **Position score** (next setlist position)
3. **Recency score** (recent appearance bonus)
4. **Gap score** (due-for-play indicator)
5. **Venue score** (venue-specific likelihood)
6. **Seasonal score** (month-of-year tendency)

**Ensemble Scoring:**
- Combine 6+ signals via weighted sum
- Confidence = variance across signals
- Normalize each signal to 0-1 range

**Patterns Analyzed:**
- Venue signatures (songs more common at specific venue)
- Seasonal tendencies (month-based play rates)
- Historical sequences (commonly played together)

**Performance Target:** Predict ensemble < 50ms, Get patterns < 100ms

---

## TypeScript Interface Layer

### File Locations

```
src/lib/wasm/
├── advanced-modules.ts    (976 lines)  ← PRIMARY INTERFACE DEFINITIONS
├── types.ts               (413 lines)  ← Type definitions
├── bridge.ts              (Main WASM bridge wrapper)
├── transform.ts           (WASM integration)
├── search.ts              (WASM-accelerated search)
├── queries.ts             (WASM-accelerated queries)
└── index.ts               (Public exports)
```

### Expected Rust Exports

From `$wasm/dmb-transform/pkg/dmb_transform.js`:
```javascript
export class TfIdfIndex { /* constructor + methods */ }
export class SetlistSimilarityEngine { /* constructor + methods */ }
export class RarityEngine { /* constructor + methods */ }
export default async function init() { /* wasm-bindgen init */ }
```

From `$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js`:
```javascript
export class SetlistPredictor { /* constructor + methods */ }
export default async function init() { /* wasm-bindgen init */ }
```

### Critical Requirement: #[wasm_bindgen] Decorators

Without `#[wasm_bindgen]` on each struct and its constructor:
- ❌ TypeScript compilation: SUCCEEDS (no type error)
- ❌ Runtime: FAILS (constructor not found)
- ❌ Testing: Breaks silently

---

## Data Serialization Strategy

### JSON Strings (Most Methods)

```typescript
// Input
const songs = [{ id: 1, title: "Ants Marching", ... }];
engine.indexSongs(JSON.stringify(songs));

// Output (parse result JSON)
const results = JSON.parse(engine.search("ants", 10));
```

### TypedArrays (Performance-Critical)

```typescript
// Allocate in WASM memory
let scores = engine.searchScoresTyped("ants", 10);
// Returns: { songIds: Int32Array, scores: Float32Array, count }
// ✓ Zero-copy access (no serialization needed)
```

---

## Validation Checklist for Each Class

### Before Deployment

- [ ] Constructor instantiates without errors
- [ ] `initialize()` accepts expected JSON format
- [ ] All documented methods callable from TypeScript
- [ ] Return types match TypeScript interfaces exactly
- [ ] No TypeScript type errors in usage
- [ ] Search/prediction results sorted by score
- [ ] TypedArray variants return correct data types
- [ ] Error handling returns JsValue errors (not panics)
- [ ] Handles empty inputs gracefully
- [ ] Performance benchmarks met (see targets above)
- [ ] No memory leaks on 100+ repeated calls
- [ ] Works in Web Worker context
- [ ] Works in SharedArrayBuffer context

---

## Development Environment

### TypeScript Files That Import These Classes

```typescript
// src/lib/wasm/advanced-modules.ts (lines 413-922)
export class TfIdfSearchEngine { ... }
export class SetlistSimilarityEngine { ... }
export class RarityEngine { ... }
export class SetlistPredictor { ... }

// Usage
import { getTfIdfSearch, getSimilarityEngine, ... } from '$lib/wasm';
const engine = getTfIdfSearch();
await engine.search("query", 20);
```

### Build Integration

```bash
# TypeScript sees these types
import type { TfIdfSearchResult, SimilarShowResult, ... } from '$lib/wasm';

# Vite resolves WASM imports
const module = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
const instance = new module.TfIdfIndex();
```

---

## Estimated Development Effort

| Task | Hours | Complexity |
|------|-------|-----------|
| TfIdfIndex core implementation | 20-30 | High |
| TfIdfIndex optimization + tests | 10-15 | Medium |
| SetlistSimilarityEngine implementation | 25-35 | High |
| SetlistSimilarityEngine tests | 10-15 | Medium |
| RarityEngine implementation | 15-20 | Medium |
| RarityEngine tests | 8-12 | Low |
| SetlistPredictor implementation | 35-50 | Very High |
| SetlistPredictor tests | 15-20 | High |
| Integration testing (all modules) | 15-20 | Medium |
| Performance optimization | 10-15 | High |
| **Total** | **150-230 hours** | - |

---

## Next Steps

1. **Create Rust project structure**
   ```bash
   cd $wasm/dmb-transform/src
   touch tfidf.rs similarity.rs rarity.rs
   ```

2. **Implement TfIdfIndex first** (lowest complexity, highest visibility)
   - Start with tokenization and indexing
   - Add search scoring
   - Add autocomplete
   - Optimize performance

3. **Test with TypeScript**
   ```typescript
   const search = new TfIdfSearchEngine();
   await search.indexSongs(JSON.stringify(testSongs));
   console.log(await search.search("ants", 10));
   ```

4. **Implement remaining classes** (in priority order)

5. **Benchmark and optimize** (should use wasm-opt)

6. **Add comprehensive tests** (unit + integration)

---

## Related Documentation

- **Full Audit Report:** `WASM_AUDIT_REPORT.md` (detailed specifications)
- **Implementation Guide:** `WASM_IMPLEMENTATION_SPEC.md` (code stubs + algorithms)
- **TypeScript Interfaces:** `/src/lib/wasm/advanced-modules.ts` (primary source)
- **Type Definitions:** `/src/lib/wasm/types.ts`

---

## Questions & Clarifications

**Q: Are these classes required for MVP?**
A: TfIdfIndex and SetlistSimilarityEngine are recommended. RarityEngine and SetlistPredictor add advanced features.

**Q: Can I use existing Rust libraries?**
A: Yes! Consider:
- `tf-idf` crate for search
- `ndarray` for numerical operations
- `rayon` for parallelization

**Q: What about error handling?**
A: All methods should return `Result<JsValue, JsValue>`. Never panic from WASM (catches browser).

**Q: Memory usage limits?**
A: WASM linear memory limited. For 1000s of shows, plan for 50-100MB WASM heap.

---

## Contact & Support

This audit was conducted by a TypeScript Type System Expert with 6+ years WASM integration experience.

All specifications are derived from TypeScript interface analysis of the production codebase.
