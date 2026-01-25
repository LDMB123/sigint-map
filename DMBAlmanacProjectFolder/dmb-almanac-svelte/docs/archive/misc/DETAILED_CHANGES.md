# Detailed Line-by-Line Changes

## File: useOfflineData.ts

### Change 1: Type Validation Utilities (NEW - Lines 295-352)

**Location**: Between cache utilities (line 294) and type mappers section

**What was added**:

```typescript
// ============================================
// TYPE VALIDATION UTILITIES
// ============================================

/**
 * Type guard to validate CachedShow data from IndexedDB
 * Ensures all required fields are present and correctly typed
 */
function isCachedShow(value: unknown): value is CachedShow {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.showDate === 'string' &&
    (typeof obj.venueId === 'number' || obj.venueId === null) &&
    (typeof obj.venueName === 'string' || obj.venueName === null) &&
    (typeof obj.city === 'string' || obj.city === null) &&
    (typeof obj.state === 'string' || obj.state === null) &&
    typeof obj.songCount === 'number' &&
    typeof obj.syncedAt === 'number'
  );
}

/**
 * Type guard to validate CachedSong data from IndexedDB
 */
function isCachedSong(value: unknown): value is CachedSong {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.title === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.isCover === 'boolean' &&
    typeof obj.timesPlayed === 'number' &&
    (typeof obj.firstPlayed === 'string' || obj.firstPlayed === null) &&
    (typeof obj.lastPlayed === 'string' || obj.lastPlayed === null) &&
    typeof obj.syncedAt === 'number'
  );
}

/**
 * Type guard to validate CachedVenue data from IndexedDB
 */
function isCachedVenue(value: unknown): value is CachedVenue {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.slug === 'string' &&
    (typeof obj.city === 'string' || obj.city === null) &&
    (typeof obj.state === 'string' || obj.state === null) &&
    typeof obj.country === 'string' &&
    typeof obj.totalShows === 'number' &&
    typeof obj.syncedAt === 'number'
  );
}
```

**Why**: Provides runtime validation of data from IndexedDB before mapping to API types

---

### Change 2: mapCachedShowToListItem Enhancement (Lines 362-385)

**Before**:
```typescript
function mapCachedShowToListItem(cached: CachedShow): ShowListItem {
  return {
    id: cached.id,
    showDate: cached.showDate,
    songCount: cached.songCount,
    rarityScore: null,
    venue: cached.venueId
      ? {
          id: cached.venueId,
          name: cached.venueName || 'Unknown Venue',
          slug: '',
          city: cached.city,
          state: cached.state,
          country: 'USA',
        }
      : null,
    tour: null,
  };
}
```

**After**:
```typescript
/**
 * Convert a cached show (flat) to ShowListItem format (nested venue/tour)
 * Uses type guard validation to ensure data integrity
 */
function mapCachedShowToListItem(cached: CachedShow): ShowListItem {
  // Validate input data
  if (!isCachedShow(cached)) {
    throw new Error('Invalid CachedShow data from IndexedDB');
  }

  return {
    id: cached.id,
    showDate: cached.showDate,
    songCount: cached.songCount,
    rarityScore: null,
    venue: cached.venueId
      ? {
          id: cached.venueId,
          name: cached.venueName || 'Unknown Venue',
          slug: '',
          city: cached.city,
          state: cached.state,
          country: 'USA',
        }
      : null,
    tour: null,
  };
}
```

**Changes**:
- Added JSDoc comment noting validation
- Added validation guard: `if (!isCachedShow(cached)) throw Error(...)`

**Impact**: Now throws immediately if IndexedDB data is malformed instead of failing mysteriously later

---

### Change 3: mapCachedShowToDetail Enhancement (Lines 392-403)

**Before**:
```typescript
function mapCachedShowToDetail(cached: CachedShow): ShowDetail {
  return {
    ...mapCachedShowToListItem(cached),
    notes: null,
    soundcheck: null,
    setlistEntries: [],
    guestAppearances: [],
    createdAt: '',
    updatedAt: '',
  };
}
```

**After**:
```typescript
/**
 * Convert a cached show to ShowDetail format
 * Note: Some fields like setlistEntries must be fetched separately
 * Uses validated mapper function to ensure data integrity
 */
function mapCachedShowToDetail(cached: CachedShow): ShowDetail {
  const listItem = mapCachedShowToListItem(cached);
  return {
    ...listItem,
    notes: null,
    soundcheck: null,
    setlistEntries: [],
    guestAppearances: [],
    createdAt: '',
    updatedAt: '',
  };
}
```

**Changes**:
- Updated JSDoc to mention validation
- Extracted `mapCachedShowToListItem(cached)` result to variable
- This ensures validation happens before spread

**Impact**: Inherits validation from mapCachedShowToListItem

---

### Change 4: mapCachedSongToListItem Enhancement (Lines 409-428)

**Before**:
```typescript
function mapCachedSongToListItem(cached: CachedSong): SongListItem {
  return {
    id: cached.id,
    title: cached.title,
    slug: cached.slug,
    originalArtist: null,
    isCover: cached.isCover,
    timesPlayed: cached.timesPlayed,
    firstPlayed: cached.firstPlayed,
    lastPlayed: cached.lastPlayed,
    openerCount: 0,
    closerCount: 0,
    encoreCount: 0,
  };
}
```

**After**:
```typescript
/**
 * Convert a cached song to SongListItem format
 * Uses type guard validation to ensure data integrity
 */
function mapCachedSongToListItem(cached: CachedSong): SongListItem {
  // Validate input data
  if (!isCachedSong(cached)) {
    throw new Error('Invalid CachedSong data from IndexedDB');
  }

  return {
    id: cached.id,
    title: cached.title,
    slug: cached.slug,
    originalArtist: null,
    isCover: cached.isCover,
    timesPlayed: cached.timesPlayed,
    firstPlayed: cached.firstPlayed,
    lastPlayed: cached.lastPlayed,
    openerCount: 0,
    closerCount: 0,
    encoreCount: 0,
  };
}
```

**Changes**:
- Added JSDoc comment noting validation
- Added validation guard: `if (!isCachedSong(cached)) throw Error(...)`

---

### Change 5: mapCachedSongToDetail Enhancement (Lines 434-444)

**Before**:
```typescript
function mapCachedSongToDetail(cached: CachedSong): SongDetail {
  return {
    ...mapCachedSongToListItem(cached),
    isOriginal: !cached.isCover,
    lyrics: null,
    avgGapDays: null,
    createdAt: '',
    updatedAt: '',
  };
}
```

**After**:
```typescript
/**
 * Convert a cached song to SongDetail format
 * Uses validated mapper function to ensure data integrity
 */
function mapCachedSongToDetail(cached: CachedSong): SongDetail {
  const listItem = mapCachedSongToListItem(cached);
  return {
    ...listItem,
    isOriginal: !cached.isCover,
    lyrics: null,
    avgGapDays: null,
    createdAt: '',
    updatedAt: '',
  };
}
```

**Changes**:
- Updated JSDoc
- Extracted `mapCachedSongToListItem(cached)` result to variable

**Impact**: Inherits validation from mapCachedSongToListItem

---

### Change 6: mapCachedVenueToListItem Enhancement (Lines 450-465)

**Before**:
```typescript
function mapCachedVenueToListItem(cached: CachedVenue): VenueListItem {
  return {
    id: cached.id,
    name: cached.name,
    slug: cached.slug,
    city: cached.city,
    state: cached.state,
    country: cached.country,
    totalShows: cached.totalShows,
  };
}
```

**After**:
```typescript
/**
 * Convert a cached venue to VenueListItem format
 * Uses type guard validation to ensure data integrity
 */
function mapCachedVenueToListItem(cached: CachedVenue): VenueListItem {
  // Validate input data
  if (!isCachedVenue(cached)) {
    throw new Error('Invalid CachedVenue data from IndexedDB');
  }

  return {
    id: cached.id,
    name: cached.name,
    slug: cached.slug,
    city: cached.city,
    state: cached.state,
    country: cached.country,
    totalShows: cached.totalShows,
  };
}
```

**Changes**:
- Added JSDoc comment noting validation
- Added validation guard: `if (!isCachedVenue(cached)) throw Error(...)`

---

## Summary of Type Safety Improvements

| Function | Type | Change |
|----------|------|--------|
| `isCachedShow` | NEW | Type guard for CachedShow validation |
| `isCachedSong` | NEW | Type guard for CachedSong validation |
| `isCachedVenue` | NEW | Type guard for CachedVenue validation |
| `mapCachedShowToListItem` | ENHANCED | Added validation guard and better docs |
| `mapCachedShowToDetail` | ENHANCED | Updated docs and refactored for clarity |
| `mapCachedSongToListItem` | ENHANCED | Added validation guard and better docs |
| `mapCachedSongToDetail` | ENHANCED | Updated docs and refactored for clarity |
| `mapCachedVenueToListItem` | ENHANCED | Added validation guard and better docs |

## How Type Validation Works

### Type Guard Pattern (TypeScript Feature)

```typescript
function isCachedShow(value: unknown): value is CachedShow {
  // Check shape at runtime
}

// Usage
if (isCachedShow(data)) {
  // TypeScript now knows data is CachedShow
  // Safe to access all properties
  data.id    // OK
  data.showDate  // OK
}
```

### Safe Single Cast (Not Double Cast)

```typescript
// Safe: Bridge to intermediate type, then validate
const obj = value as Record<string, unknown>;
// Now we can access obj.field and know it's 'unknown'

// NOT using: as unknown as CachedShow (double cast bypasses all safety)
// INSTEAD: Validate each property individually
typeof obj.id === 'number'  // Safe runtime check
```

## No Double Casts

The improvements eliminate the unsafe pattern:
```typescript
// BAD - Unsafe double cast
(data as unknown as CachedShow)

// GOOD - Type guard with validation
if (isCachedShow(data)) {
  // data is now safely narrowed to CachedShow
}
```

## Testing the Changes

To verify the validation works:

```typescript
// This will work
const validShow = {
  id: 1,
  showDate: '2024-01-01',
  venueId: null,
  venueName: null,
  city: null,
  state: null,
  songCount: 42,
  syncedAt: Date.now(),
};
mapCachedShowToListItem(validShow); // OK

// This will throw
const invalidShow = {
  id: '1', // Wrong type!
  showDate: '2024-01-01',
  // ... other fields
};
mapCachedShowToListItem(invalidShow as any); // Throws: Invalid CachedShow data
```
