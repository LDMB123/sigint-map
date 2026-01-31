---
name: dmb-almanac-typescript-fixes
version: 1.0.0
description: Copy-paste solutions for the highest-priority type safety improvements.
recommended_tier: sonnet
author: Claude Code
created: 2026-01-25
updated: 2026-01-25
category: scraping
complexity: advanced
tags:
  - scraping
  - chromium-143
  - apple-silicon
target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2
philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."
prerequisites: []
related_skills: []
see_also: []
minimum_example_count: 3
requires_testing: true
performance_critical: false
migrated_from: projects/dmb-almanac/app/docs/analysis/typescript/TYPESCRIPT_FIXES_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# TypeScript Quick Fix Reference - DMB Almanac

Copy-paste solutions for the highest-priority type safety improvements.

---


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## 1. WASM Advanced Modules - Replace `as any`

### Create New File: `src/lib/wasm/advanced-types.ts`

```typescript
/**
 * Type definitions for advanced WASM modules
 * Provides type safety for dynamically loaded WASM classes
 */

// Search Index Types
export interface TfIdfSearchResult {
  entityId: number;
  entityType: 'song' | 'venue' | 'guest';
  score: number;
  title: string;
  slug?: string;
}

export interface AutocompleteResult {
  id: number;
  title: string;
  type: 'song' | 'venue' | 'guest';
}

export interface TypedArrayResult {
  ids: Uint32Array;
  scores: Float32Array;
}

export interface TfIdfIndex {
  indexSongs(songsJson: string): void;
  indexVenues(venuesJson: string): void;
  indexGuests(guestsJson: string): void;
  search(query: string, limit: number): TfIdfSearchResult[];
  searchByType(query: string, entityType: string, limit: number): TfIdfSearchResult[];
  searchPhrase(phrase: string, limit: number): TfIdfSearchResult[];
  autocomplete(prefix: string, limit: number): AutocompleteResult[];
  searchScoresTyped(query: string, limit: number): TypedArrayResult;
}

// Setlist Similarity Types
export interface SetlistSimilarityResult {
  showId: number;
  similarityScore: number;
  sharedSongsCount: number;
}

export interface ShowCluster {
  clusterId: number;
  showIds: number[];
  centroid: number[];
}

export interface SongAssociation {
  songId: number;
  coOccurrenceScore: number;
}

export interface SetlistSimilarityEngine {
  initialize(setlistEntriesJson: string, totalSongs: number): void;
  findSimilarShows(
    targetShowId: number,
    method: string,
    limit: number
  ): SetlistSimilarityResult[];
  compareShows(showIdA: number, showIdB: number): number;
  getSharedSongs(showIdA: number, showIdB: number): number[];
  computeCoOccurrenceMatrix(minOccurrences: number): Record<number, Record<number, number>>;
  findAssociatedSongs(songId: number, limit: number): SongAssociation[];
  calculateDiversity(showId: number): number;
  clusterShows(numClusters: number, maxIterations: number): ShowCluster[];
  getSimilaritiesTyped(targetShowId: number, limit: number): TypedArrayResult;
}

// Rarity Engine Types
export interface RarityScore {
  entityId: number;
  rarityValue: number;
}

export interface GapAnalysis {
  songId: number;
  lastPlayDate: string;
  gapDays: number;
  gapShows: number;
}

export interface DistributionBucket {
  bucketId: number;
  lowerBound: number;
  upperBound: number;
  count: number;
}

export interface RarityEngine {
  initialize(setlistEntriesJson: string, songsJson: string): void;
  computeSongRarity(songId: number): number;
  computeAllSongRarities(): RarityScore[];
  computeShowRarity(showId: number): number;
  computeAllShowRarities(): RarityScore[];
  computeGapAnalysis(): GapAnalysis[];
  getTopSongsByGap(limit: number): GapAnalysis[];
  computeRarityDistribution(numBuckets: number): DistributionBucket[];
  getSongRaritiesTyped(): TypedArrayResult;
  getShowRaritiesTyped(): TypedArrayResult;
}

// Setlist Predictor Types
export interface PredictionResult {
  songId: number;
  probability: number;
  confidence: number;
}

export interface TransitionProb {
  fromSongId: number;
  toSongId: number;
  probability: number;
}

export interface SetlistPredictor {
  initialize(setlistEntriesJson: string, showsJson: string): void;
  predictNextSong(showId: number, position: number): PredictionResult;
  predictSetlist(tourId: number, length: number): PredictionResult[];
  getTransitionProbabilities(songId: number): TransitionProb[];
}

// Factory functions for safe instantiation
export function createTfIdfIndex(module: Record<string, any>): TfIdfIndex {
  if (!module || typeof module !== 'object') {
    throw new Error('Invalid module object');
  }
  if (typeof module.TfIdfIndex !== 'function') {
    throw new Error('TfIdfIndex constructor not found in module');
  }
  return new module.TfIdfIndex() as TfIdfIndex;
}

export function createSetlistSimilarityEngine(
  module: Record<string, any>
): SetlistSimilarityEngine {
  if (!module || typeof module !== 'object') {
    throw new Error('Invalid module object');
  }
  if (typeof module.SetlistSimilarityEngine !== 'function') {
    throw new Error('SetlistSimilarityEngine constructor not found in module');
  }
  return new module.SetlistSimilarityEngine() as SetlistSimilarityEngine;
}

export function createRarityEngine(module: Record<string, any>): RarityEngine {
  if (!module || typeof module !== 'object') {
    throw new Error('Invalid module object');
  }
  if (typeof module.RarityEngine !== 'function') {
    throw new Error('RarityEngine constructor not found in module');
  }
  return new module.RarityEngine() as RarityEngine;
}

export function createSetlistPredictor(module: Record<string, any>): SetlistPredictor {
  if (!module || typeof module !== 'object') {
    throw new Error('Invalid module object');
  }
  if (typeof module.SetlistPredictor !== 'function') {
    throw new Error('SetlistPredictor constructor not found in module');
  }
  return new module.SetlistPredictor() as SetlistPredictor;
}
```

### Update: `src/lib/wasm/advanced-modules.ts`

Replace the problematic sections:

```typescript
// OLD (line ~303-307):
async indexSongs(songsJson: string): Promise<void> {
  const module = await loadTransformModule();
  this.index = new (module as any).TfIdfIndex();
  (this.index as any).indexSongs(songsJson);
  this.initialized = true;
}

// NEW:
async indexSongs(songsJson: string): Promise<void> {
  const module = await loadTransformModule();
  this.index = createTfIdfIndex(module); // ✅ Type-safe factory
  this.index.indexSongs(songsJson);     // ✅ Method validated
  this.initialized = true;
}

// OLD (line ~314-315):
async indexVenues(venuesJson: string): Promise<void> {
  if (!this.index) await this.ensureInitialized();
  (this.index as any).indexVenues(venuesJson);
}

// NEW:
async indexVenues(venuesJson: string): Promise<void> {
  if (!this.index) await this.ensureInitialized();
  this.index.indexVenues(venuesJson); // ✅ Fully typed
}

// Update class field:
private index: TfIdfIndex | null = null; // ✅ Proper type instead of any
```

---

## 2. Worker Message Validation - Type Guards

### Update: `src/lib/workers/force-simulation.worker.ts`

```typescript
// OLD (line 69):
function isValidMessage(message: any): { valid: boolean; error?: string } {
  // ... checks ...
  if (!ALLOWED_MESSAGE_TYPES.includes(message.type as any)) { // ❌ Still unsafe
    return { valid: false, error: `Invalid message type: ${message.type}` };
  }
  return { valid: true };
}

// NEW:
function isValidMessage(value: unknown): value is WorkerMessage {
  if (!value || typeof value !== 'object') return false;

  const msg = value as Record<string, unknown>;

  if (typeof msg.type !== 'string') return false;

  // Type narrowing ensures we only return true for valid messages
  const validTypes: WorkerMessageType[] = ['start', 'iterate', 'stop', 'drag', 'end'];
  return validTypes.includes(msg.type as WorkerMessageType);
}

// Usage:
self.onmessage = (event: MessageEvent<unknown>) => {
  if (isValidMessage(event.data)) {
    // event.data is now WorkerMessage type
    handleMessage(event.data); // ✅ Fully typed
  } else {
    console.error('Invalid message received');
  }
};
```

---

## 3. Data Transformation - Type-Safe Casting

### Update: `src/lib/wasm/transform.ts`

```typescript
// Define server data types
interface ServerSongRaw {
  id: number;
  title: string;
  slug: string;
  sort_title?: string | null;
  original_artist?: string | null;
  is_cover: number;
  is_original?: number | null;
  first_played_date?: string | null;
  last_played_date?: string | null;
  total_performances: number;
  opener_count?: number;
  closer_count?: number;
  encore_count?: number;
  lyrics?: string | null;
  notes?: string | null;
  is_liberated?: number;
  days_since_last_played?: number | null;
  shows_since_last_played?: number | null;
}

// Type guard function
function isServerSongRaw(value: unknown): value is ServerSongRaw {
  if (typeof value !== 'object' || value === null) return false;

  const song = value as Record<string, unknown>;

  return (
    typeof song.id === 'number' &&
    typeof song.title === 'string' &&
    typeof song.slug === 'string' &&
    typeof song.is_cover === 'number' &&
    typeof song.total_performances === 'number'
  );
}

// OLD (line 160):
function transformSongsJS(serverSongs: unknown[]): DexieSong[] {
  return serverSongs.map((server: any) => ({
    id: server.id,
    // ... dangerous property access with no validation
  }));
}

// NEW:
function transformSongsJS(serverSongs: unknown[]): DexieSong[] {
  return serverSongs.map((song, index): DexieSong => {
    if (!isServerSongRaw(song)) {
      throw new Error(
        `Invalid song data at index ${index}: ` +
        `missing required fields`
      );
    }

    return {
      id: song.id,
      title: song.title,
      slug: song.slug,
      sortTitle: song.sort_title ?? undefined,
      originalArtist: song.original_artist ?? undefined,
      isCover: song.is_cover === 1,
      isOriginal: (song.is_original ?? 0) === 1,
      firstPlayedDate: song.first_played_date ?? undefined,
      lastPlayedDate: song.last_played_date ?? undefined,
      totalPerformances: song.total_performances,
      openerCount: song.opener_count,
      closerCount: song.closer_count,
      encoreCount: song.encore_count,
      lyrics: song.lyrics ?? undefined,
      notes: song.notes ?? undefined,
      isLiberated: (song.is_liberated ?? 0) === 1,
      daysSinceLastPlayed: song.days_since_last_played ?? null,
      showsSinceLastPlayed: song.shows_since_last_played ?? null,
      searchText: [song.title, song.original_artist]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });
}
```

---

## 4. Visualization Types - Replace `Record<string, any>`

### Update: `src/lib/types/visualizations.ts`

```typescript
// OLD (line 71):
export interface TopoJSONObject {
  type: 'FeatureCollection' | 'Feature' | 'Geometry';
  objects?: Record<string, unknown>;
  features?: Array<{
    properties?: Record<string, any>;    // ❌
    id?: string;
    [key: string]: any;                  // ❌
  }>;
  [key: string]: any;                    // ❌
}

// NEW:
export interface TopoJSONProperties {
  [key: string]: unknown; // ✅ unknown instead of any
}

export interface TopoJSONFeature {
  type: 'Feature';
  properties?: TopoJSONProperties;
  id?: string;
  geometry?: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

export interface TopoJSONObject {
  type: 'FeatureCollection' | 'Feature' | 'Geometry';
  objects?: Record<string, unknown>;
  features?: TopoJSONFeature[];
}

// OLD (line 147):
export interface D3Node extends Record<string, any> {  // ❌ Why extend?
  id?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

// NEW:
export interface D3Node {
  id?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

// If you need extensibility:
export interface D3NodeExtended extends D3Node {
  [key: string]: unknown; // ✅ Optional extended properties
}
```

---

## 5. tsconfig.json - Add Strictness Options

### Replace: `tsconfig.json`

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    // EXISTING (keep as-is)
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022",

    // ADD THESE for maximum type safety:
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "allowUnusedLabels": false,

    // Type checking:
    "declaration": true,
    "declarationMap": true,
    "maxNodeModuleJsDepth": 1
  },
  "include": ["src", "src/**/*.ts", "src/**/*.svelte"],
  "exclude": ["node_modules", ".svelte-kit", "build"]
}
```

---

## 6. Svelte Component Props - Standard Pattern

### Template for any Svelte component:

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLDivAttributes } from 'svelte/elements';

  type Props = HTMLDivAttributes & {
    variant?: 'default' | 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onSelect?: (value: string) => void;
    children?: Snippet;
  };

  let {
    variant = 'default',
    size = 'md',
    disabled = false,
    onSelect,
    children,
    ...rest
  }: Props = $props();
</script>

<div class="component {variant} {size}" {...rest}>
  {@render children?.()}
</div>
```

---

## 7. Server Data Loader - Generic with Validation

### Update: `src/lib/server/data-loader.ts`

```typescript
// Add at top of file:
type DataFileName = 'shows' | 'songs' | 'venues' | 'tours' | 'guests' | 'liberation-list';

interface DataFileSchema {
  shows: DexieShow[];
  songs: DexieSong[];
  venues: DexieVenue[];
  tours: DexieTour[];
  guests: DexieGuest[];
  'liberation-list': DexieLiberationEntry[];
}

// Replace generic function (line 78):
// OLD:
function loadJsonFile<T>(filename: string): T {
  const dataPath = getDataPath();
  const filePath = join(dataPath, filename);
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to load data file: ${filename}`);
  }
}

// NEW:
function loadJsonFile<K extends DataFileName>(filename: K): DataFileSchema[K] {
  const dataPath = getDataPath();
  const filePath = join(dataPath, `${filename}.json`);

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as unknown;

    // Validate before returning
    validateDataFile(filename, data);

    return data as DataFileSchema[K];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load data file ${filename}: ${error.message}`);
    }
    throw new Error(`Failed to load data file: ${filename}`);
  }
}

function validateDataFile(filename: DataFileName, data: unknown): void {
  if (!Array.isArray(data)) {
    throw new Error(`Data must be an array, got ${typeof data}`);
  }

  if (data.length === 0) {
    console.warn(`Data file ${filename} is empty`);
    return;
  }

  // Spot check first item for required fields
  const first = data[0];
  if (typeof first !== 'object' || first === null) {
    throw new Error(`First item in ${filename} is not an object`);
  }

  switch (filename) {
    case 'shows':
      if (!('id' in first) || !('date' in first)) {
        throw new Error('Show missing required fields: id, date');
      }
      break;
    case 'songs':
      if (!('id' in first) || !('title' in first)) {
        throw new Error('Song missing required fields: id, title');
      }
      break;
    // ... other cases
  }
}
```

---

## 8. Utilities - Replace Generic `any` with Typed Generics

### Update: `src/lib/utils/scheduler.ts`

```typescript
// OLD (line 241):
export type MetricCalculator<T> = (item: T) => any | Promise<any>;

// NEW:
export type MetricCalculator<T, R = number> = (item: T) => R | Promise<R>;

// USAGE:
type SongMetric = MetricCalculator<DexieSong, number>;
const calculateRarity: SongMetric = async (song) => {
  // song: DexieSong ✅
  return 42; // number ✅
};

type VenueMetric = MetricCalculator<DexieVenue, string>;
const getVenueName: VenueMetric = (venue) => {
  return venue.name; // string ✅
};
```

---

## Validation Checklist

After applying these fixes, verify:

- [ ] `npm run check` passes (svelte-check)
- [ ] `tsc --noEmit` passes (TypeScript check)
- [ ] No `any` type errors reported
- [ ] WASM module loading still works at runtime
- [ ] Worker messages validated correctly
- [ ] Component props typed consistently
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm test`

---

## Testing the Improvements

```bash
# Type check everything:
npx tsc --noEmit

# Run Svelte check:
npm run check

# Check for type coverage:
npm install --save-dev @type-coverage/cli
npx type-coverage --detail

# Lint with type rules:
npm run lint

# Full build test:
npm run build
```

---

## Related Files to Review

After these fixes, review:
- [ ] `/src/lib/db/dexie/cache.ts` - Generic type improvements
- [ ] `/src/lib/db/dexie/sync.ts` - Bulk operation typing
- [ ] `/src/lib/utils/fileHandler.ts` - File type safety
- [ ] `/src/lib/utils/compression-monitor.ts` - RUM types
- [ ] All `.svelte` files - Component prop typing consistency

---

**Total estimated time to implement all fixes: 4-6 hours**

**Expected improvement: 7.8/10 → 9.2/10 type safety**
