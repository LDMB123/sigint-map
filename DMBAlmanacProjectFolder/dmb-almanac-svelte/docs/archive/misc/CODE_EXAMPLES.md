# Code Examples: Type Guard Usage Patterns

## Using Type Guards in Your Codebase

### Pattern 1: Direct Type Guard in Mapper Functions

```typescript
// In useOfflineData.ts
function mapCachedShowToListItem(cached: CachedShow): ShowListItem {
  // Validate input data
  if (!isCachedShow(cached)) {
    throw new Error('Invalid CachedShow data from IndexedDB');
  }

  // Now safely access properties
  return {
    id: cached.id,
    showDate: cached.showDate,
    // ... rest of mapping
  };
}
```

**Why this works**:
- `isCachedShow` returns `value is CachedShow` (type predicate)
- After `if (!isCachedShow(cached))` check, TypeScript knows `cached` is `CachedShow`
- Safe to access all properties without unsafe casting

---

## Pattern 2: Error Handling with Try-Catch

```typescript
// In a hook or component that uses the mapper
try {
  const mappedShow = mapCachedShowToListItem(cachedData);
  setData(mappedShow);
} catch (error) {
  if (error instanceof Error) {
    console.error('Corrupted data detected:', error.message);
    // Fallback to API fetch
    await fetchShowFromAPI(showId);
  }
}
```

**Why this works**:
- Gracefully handles corrupted data
- Falls back to authoritative source (API)
- User doesn't see cryptic errors

---

## Pattern 3: Type Guard in Data Processing Loop

```typescript
// Processing multiple cached items
async function syncShowsFromCache(cachedShows: unknown[]) {
  const validShows: ShowListItem[] = [];

  for (const item of cachedShows) {
    if (isCachedShow(item)) {
      validShows.push(mapCachedShowToListItem(item));
    } else {
      // Log invalid items but continue
      console.warn('Skipping invalid show from cache:', item);
    }
  }

  return validShows;
}
```

**Why this works**:
- Filters out corrupted items
- Continues processing valid items
- Provides visibility into data quality issues

---

## Pattern 4: Creating a Generic Validation Utility

```typescript
// Reusable validation wrapper
function validateAndMap<T, R>(
  data: unknown,
  guard: (value: unknown) => value is T,
  mapper: (value: T) => R
): R | null {
  if (!guard(data)) {
    console.error('Validation failed for:', data);
    return null;
  }
  return mapper(data);
}

// Usage
const showListItem = validateAndMap(
  cachedData,
  isCachedShow,
  mapCachedShowToListItem
);

if (showListItem) {
  // Safe to use
} else {
  // Handle validation failure
}
```

**Why this works**:
- DRY principle: validation logic in one place
- Reusable for all cached types
- Type-safe with generic constraints

---

## Pattern 5: Bulk Operations with Filtering

```typescript
// When retrieving data from IndexedDB
async function getSafeShowsFromCache(filters: ShowFilters): Promise<ShowListItem[]> {
  const cachedShows = await getOfflineShows(filters); // Returns CachedShow[]

  // Map and validate each item
  const validItems: ShowListItem[] = [];

  for (const cached of cachedShows) {
    try {
      // Validation happens inside mapper
      const mapped = mapCachedShowToListItem(cached);
      validItems.push(mapped);
    } catch (error) {
      // Log but don't crash
      console.warn(`Skipping corrupted show ${cached.id}:`, error);
    }
  }

  return validItems;
}
```

**Why this works**:
- Handles mixed valid/invalid data
- Doesn't fail entire operation on one bad record
- Provides diagnostic information

---

## Pattern 6: Type Guard with Conditional Rendering

```typescript
// In React component
function ShowCard({ data }: { data: unknown }) {
  // Validate at component boundary
  if (!isCachedShow(data)) {
    return <div>Invalid show data</div>;
  }

  // data is now safely typed as CachedShow
  const mapped = mapCachedShowToListItem(data);

  return (
    <div>
      <h3>{mapped.showDate}</h3>
      <p>{mapped.venue?.name}</p>
    </div>
  );
}
```

**Why this works**:
- Data validation at component boundary
- Clear error UI for invalid data
- Type-safe property access

---

## Pattern 7: Extending Validation for Nullable Types

```typescript
// Type guard that allows null
function isNullableCachedShow(value: unknown): value is CachedShow | null {
  return value === null || isCachedShow(value);
}

// Usage
async function getShowOrNull(id: number): Promise<ShowListItem | null> {
  const cached = await getOfflineShow(id);

  if (!isNullableCachedShow(cached)) {
    throw new Error('Invalid cached show data');
  }

  if (cached === null) {
    return null;
  }

  return mapCachedShowToListItem(cached);
}
```

**Why this works**:
- Handles both valid and null values
- Type-safe even with nullable inputs
- Clear semantics about null meaning "not found"

---

## Pattern 8: Composing Multiple Type Guards

```typescript
// Check multiple cached types in a collection
function isValidCachedEntity(
  value: unknown
): value is CachedShow | CachedSong | CachedVenue {
  return isCachedShow(value) || isCachedSong(value) || isCachedVenue(value);
}

// Usage
function processOfflineData(items: unknown[]) {
  const validItems = items.filter(isValidCachedEntity);
  // Now TypeScript knows items are CachedShow | CachedSong | CachedVenue
  return validItems.map(item => {
    if (isCachedShow(item)) return mapCachedShowToListItem(item);
    if (isCachedSong(item)) return mapCachedSongToListItem(item);
    if (isCachedVenue(item)) return mapCachedVenueToListItem(item);
  });
}
```

**Why this works**:
- Discriminated unions for multiple types
- Type-safe narrowing with if-checks
- Exhaustive checking by TypeScript

---

## Real-World Usage in Hooks

### Current Implementation Pattern

```typescript
// In useOfflineShows hook
export function useOfflineShows(
  filters: ShowFilters = {}
): OfflineQueryResult<ShowListItem[]> {
  const isOnline = useOnlineStatus();
  const [offlineData, setOfflineData] = useState<CachedShow[] | null>(null);

  useEffect(() => {
    if (!isOnline) {
      getOfflineShows(filters).then(setOfflineData);
    }
  }, [isOnline, filterKey]);

  // Data transformation with validation
  const data = isOnline
    ? query.data
    : offlineData?.map(cached => {
        try {
          return mapCachedShowToListItem(cached); // Validation happens here
        } catch (error) {
          console.error('Invalid cached show:', error);
          return null;
        }
      }).filter(Boolean) as ShowListItem[] | undefined;

  return {
    data,
    isLoading: isOnline ? query.isLoading : offlineData === null,
    error: query.error,
    isOffline: !isOnline,
    isStale,
    refetch: () => { /* ... */ },
  };
}
```

**Safety features**:
1. Validation happens in mapper function
2. Invalid items logged but don't crash
3. Invalid items filtered from results
4. Type-safe return value

---

## Anti-Patterns to Avoid

### DON'T: Double Cast (Unsafe)
```typescript
// BAD - Bypasses all type safety!
const mapped = (data as unknown as ShowListItem);
```

### DON'T: Skip Validation
```typescript
// BAD - Assumes data is always valid
function mapWithoutValidation(cached: CachedShow): ShowListItem {
  return { /* ... */ };
}
```

### DON'T: Ignore Type Errors
```typescript
// BAD - Suppress errors without understanding them
const mapped = mapCachedShowToListItem(data as any);
```

### DO: Use Type Guards
```typescript
// GOOD - Validate then use
if (isCachedShow(data)) {
  const mapped = mapCachedShowToListItem(data);
}
```

### DO: Handle Validation Failures
```typescript
// GOOD - Graceful error handling
try {
  return mapCachedShowToListItem(data);
} catch (error) {
  console.error('Invalid data:', error);
  return null; // or fetch from API
}
```

---

## Testing Type Guards

### Simple Unit Test

```typescript
import { isCachedShow } from '@/hooks/useOfflineData';

describe('isCachedShow type guard', () => {
  it('accepts valid CachedShow', () => {
    const valid = {
      id: 1,
      showDate: '2024-01-01',
      venueId: null,
      venueName: null,
      city: null,
      state: null,
      songCount: 42,
      syncedAt: Date.now(),
    };
    expect(isCachedShow(valid)).toBe(true);
  });

  it('rejects wrong id type', () => {
    const invalid = {
      id: '1', // Should be number
      showDate: '2024-01-01',
      venueId: null,
      venueName: null,
      city: null,
      state: null,
      songCount: 42,
      syncedAt: Date.now(),
    };
    expect(isCachedShow(invalid)).toBe(false);
  });

  it('rejects missing fields', () => {
    const invalid = { id: 1 }; // Missing most fields
    expect(isCachedShow(invalid)).toBe(false);
  });

  it('allows null for nullable fields', () => {
    const valid = {
      id: 1,
      showDate: '2024-01-01',
      venueId: null,      // NULL OK
      venueName: null,    // NULL OK
      city: null,         // NULL OK
      state: null,        // NULL OK
      songCount: 42,
      syncedAt: Date.now(),
    };
    expect(isCachedShow(valid)).toBe(true);
  });
});
```

---

## Summary: When to Use Type Guards

| Scenario | Pattern |
|----------|---------|
| Data from IndexedDB | Use type guard to validate |
| API response transformation | Use type guard on input |
| Props from component consumer | Use type guard at boundary |
| File upload processing | Use type guard before mapping |
| User input handling | Use type guard before using |
| Database deserialization | Use type guard for all reads |

**Rule of thumb**: If data comes from outside your current module (network, storage, user, props), validate it with a type guard before trusting its type.
