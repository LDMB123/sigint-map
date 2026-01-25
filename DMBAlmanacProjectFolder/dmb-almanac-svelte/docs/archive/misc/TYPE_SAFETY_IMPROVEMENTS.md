# Type Safety Improvements for useOfflineData.ts

## Overview

Enhanced `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/hooks/useOfflineData.ts` with runtime type validation and stricter typing to eliminate unsafe type assumptions when mapping Dexie/IndexedDB data to Prisma-generated API types.

## Problem Statement

The original code relied on TypeScript's compile-time type system without validating data retrieved from IndexedDB at runtime. Since IndexedDB data comes from an untrusted source (browser storage that could be corrupted or tampered with), unsafe assumptions about data shape could lead to runtime errors or incorrect behavior.

## Solution Architecture

Implemented a **Type Predicate Pattern** with runtime validation:

```typescript
// Before: Direct type assertion (unsafe)
const shows = await clientDb.shows.toArray();
// Assumed all items are CachedShow without validation

// After: Type guard with validation (safe)
if (!isCachedShow(cached)) {
  throw new Error('Invalid CachedShow data from IndexedDB');
}
// Now TypeScript knows cached is CachedShow, AND we've validated it at runtime
```

## Changes Made

### 1. Added Type Validation Functions (Lines 299-352)

Three new type guard functions validate data structure and types:

#### `isCachedShow` (Lines 303-316)
Validates all required fields of CachedShow:
- id: number
- showDate: string
- venueId: number | null
- venueName: string | null
- city: string | null
- state: string | null
- songCount: number
- syncedAt: number

#### `isCachedSong` (Lines 321-334)
Validates all required fields of CachedSong:
- id: number
- title: string
- slug: string
- isCover: boolean
- timesPlayed: number
- firstPlayed: string | null
- lastPlayed: string | null
- syncedAt: number

#### `isCachedVenue` (Lines 339-352)
Validates all required fields of CachedVenue:
- id: number
- name: string
- slug: string
- city: string | null
- state: string | null
- country: string
- totalShows: number
- syncedAt: number

### 2. Enhanced Mapper Functions

All four mapper functions now include runtime validation before transformation:

#### `mapCachedShowToListItem` (Lines 362-385)
**Before:**
```typescript
function mapCachedShowToListItem(cached: CachedShow): ShowListItem {
  return {
    id: cached.id,
    showDate: cached.showDate,
    // ... rest of mapping
  };
}
```

**After:**
```typescript
function mapCachedShowToListItem(cached: CachedShow): ShowListItem {
  // Validate input data
  if (!isCachedShow(cached)) {
    throw new Error('Invalid CachedShow data from IndexedDB');
  }

  return {
    id: cached.id,
    showDate: cached.showDate,
    // ... rest of mapping
  };
}
```

#### `mapCachedSongToListItem` (Lines 409-428)
Added validation guard to ensure data integrity before accessing properties.

#### `mapCachedVenueToListItem` (Lines 450-465)
Added validation guard to ensure data integrity before accessing properties.

#### `mapCachedShowToDetail` & `mapCachedSongToDetail` (Lines 392-403, 434-444)
Simplified to call validated mapper functions, inheriting validation from them.

## Type Safety Improvements

### Before
```typescript
// Potential issues:
// 1. IndexedDB data could have incorrect shape
// 2. Missing or extra fields silently accepted
// 3. Wrong property types silently coerced
// 4. No runtime detection of corruption

const data = await clientDb.shows.toArray();
data.forEach(show => {
  // TypeScript assumes show is CachedShow
  // But what if syncedAt is a string? city is a number?
  mapCachedShowToListItem(show);
});
```

### After
```typescript
// Runtime safety:
// 1. Each property type is verified at runtime
// 2. Null values are explicitly allowed where appropriate
// 3. Type mismatches throw errors immediately
// 4. Corrupted data detected and handled

const data = await clientDb.shows.toArray();
data.forEach(show => {
  try {
    mapCachedShowToListItem(show); // Will throw if data is invalid
  } catch (error) {
    console.error('Corrupted show data:', error);
    // Handle gracefully or skip invalid entries
  }
});
```

## Design Patterns Used

### 1. Type Predicate (User-Defined Type Guard)
```typescript
function isCachedShow(value: unknown): value is CachedShow {
  // Verify shape at runtime
  // TypeScript now knows value is CachedShow after this guard
}
```

Benefits:
- Single source of truth for validation logic
- Reusable across multiple functions
- Type-safe: TypeScript narrows type in if blocks

### 2. Defensive Programming
```typescript
const obj = value as Record<string, unknown>;
// Safe: only check properties we know about
```

This avoids `as unknown as Type` double casts by:
- Using `as Record<string, unknown>` as a bridge (single cast to known type)
- Validating each property individually
- Not relying on any unchecked assumptions

### 3. Fail-Fast Pattern
```typescript
if (!isCachedShow(cached)) {
  throw new Error('Invalid CachedShow data from IndexedDB');
}
```

Errors are surfaced immediately with clear messages, making debugging easier.

## Impact Analysis

### Type Safety
- **Before**: 0% validation, 100% reliance on TypeScript compile-time checking
- **After**: 100% runtime validation of IndexedDB data

### Performance
- Minimal impact: validation occurs once per data retrieval
- IndexedDB queries are already async, validation cost negligible
- Early validation prevents downstream errors

### Maintainability
- Clear intent: validation functions document expected data shape
- DRY principle: validation logic centralized, not duplicated
- Easier debugging: error messages point to specific validation failure

## Edge Cases Handled

1. **Null/Undefined Values**: Explicitly checked with `value === null` and optional field validation
2. **Wrong Types**: Each property type verified with `typeof` operator
3. **Extra Properties**: Ignored (validation only checks required fields)
4. **Missing Properties**: Caught when accessing `obj.fieldName` and finding undefined
5. **Corrupted Data**: Throws with descriptive error message

## Future Enhancements

Consider these improvements:

### 1. Structured Error Information
```typescript
interface ValidationError {
  field: string;
  expected: string;
  actual: unknown;
}

function validateCachedShow(value: unknown): { valid: true } | { valid: false; errors: ValidationError[] }
```

### 2. Zod Integration (if adopted)
```typescript
import { z } from 'zod';

const CachedShowSchema = z.object({
  id: z.number(),
  showDate: z.string(),
  // ... rest of schema
});

// Single source of truth for both types and validation
type CachedShow = z.infer<typeof CachedShowSchema>;
```

### 3. Centralized Validation Utilities
Create `/packages/database/src/validation.ts`:
```typescript
export function validateCachedData<T>(
  data: unknown,
  schema: (value: unknown) => value is T
): T {
  if (!schema(data)) {
    throw new Error(`Invalid data structure`);
  }
  return data;
}
```

## Testing Recommendations

Add tests to verify:

```typescript
describe('Type Guards', () => {
  it('should accept valid CachedShow', () => {
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

  it('should reject CachedShow with wrong type', () => {
    const invalid = { ...validShow, id: '1' }; // id should be number
    expect(isCachedShow(invalid)).toBe(false);
  });

  it('should reject CachedShow with missing field', () => {
    const invalid = { id: 1, showDate: '2024-01-01' }; // missing many fields
    expect(isCachedShow(invalid)).toBe(false);
  });
});

describe('Mappers', () => {
  it('should throw on invalid input', () => {
    const invalid = { id: '1' }; // Wrong type
    expect(() => mapCachedShowToListItem(invalid as any)).toThrow();
  });
});
```

## Files Modified

- `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/hooks/useOfflineData.ts`
  - Lines 295-352: Added type validation utilities
  - Lines 362-466: Enhanced mapper functions with validation

## Compatibility

- No breaking changes to public API
- All existing function signatures unchanged
- Type narrowing is backward compatible
- Stricter error handling may expose previously silent failures

## Conclusion

These improvements significantly enhance type safety when mapping Dexie/IndexedDB data to API types by adding runtime validation. This follows the principle that **data from untrusted sources (like browser storage) should always be validated**, preventing subtle bugs that would only surface in production under specific conditions.
