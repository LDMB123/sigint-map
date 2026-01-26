---
name: type-usage
version: 1.0.0
description: // 📦 BASE TYPES - Reading from database
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: data
complexity: intermediate
tags:
  - data
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

# Migration metadata
migrated_from: projects/dmb-almanac/app/src/lib/db/dexie/TYPE_USAGE_GUIDE.md
migration_date: 2026-01-25
---

# Type Usage Guide - Base vs WithDetails

## Quick Reference

### When to Use Each Type

```typescript
// 📦 BASE TYPES - Reading from database
DexieShowBase
DexieSetlistEntryBase
DexieLiberationEntryBase

// ✨ WITH DETAILS - After sync, in UI components
DexieShowWithDetails
DexieSetlistEntryWithDetails
DexieLiberationEntryWithDetails

// 🔙 LEGACY TYPES - Backward compatibility (deprecated)
DexieShow
DexieSetlistEntry
DexieLiberationEntry
```

---

## Common Patterns

### Pattern 1: Database Query → UI Component

```typescript
// ❌ OLD WAY - Defensive optional chaining
async function loadShow(id: number) {
  const show = await db.shows.get(id);
  return (
    <h1>{show.venue?.name || 'Unknown Venue'}</h1>
  );
}

// ✅ NEW WAY - Type-safe with validation
async function loadShow(id: number): Promise<DexieShowWithDetails> {
  const show = await db.shows.get(id);

  // Validate embedded data exists
  if (!isDexieShowWithDetails(show)) {
    throw new Error('Show missing embedded data - sync may be incomplete');
  }

  return show;
}

// In component:
function ShowPage() {
  const show = await loadShow(id);
  return <h1>{show.venue.name}</h1>;  // ✅ No ?. needed!
}
```

### Pattern 2: List Operations

```typescript
// ✅ Filter out incomplete data
async function getCompleteShows(): Promise<DexieShowWithDetails[]> {
  const allShows = await db.shows.toArray();
  return allShows.filter(isDexieShowWithDetails);
}

// ✅ Map with type narrowing
const completeShows = (await db.shows.toArray())
  .filter((show): show is DexieShowWithDetails =>
    isDexieShowWithDetails(show)
  );
```

### Pattern 3: Component Props

```typescript
// ✅ GOOD - Explicit type requirement
interface ShowCardProps {
  show: DexieShowWithDetails;  // Requires complete data
}

function ShowCard({ show }: ShowCardProps) {
  return (
    <div>
      <h1>{show.venue.name}</h1>      {/* ✅ Type-safe */}
      <p>{show.venue.city}</p>         {/* ✅ Type-safe */}
    </div>
  );
}

// ❌ BAD - Using Base in component
function ShowCardBad({ show }: { show: DexieShowBase }) {
  return <h1>{show.venue.name}</h1>;  // ❌ Error: Property 'venue' does not exist
}
```

### Pattern 4: Sync/Transform Functions

```typescript
// ✅ Transform guarantees embedded data
function transformShowFromServer(raw: ServerShow): DexieShowWithDetails {
  return {
    // Base fields
    id: raw.id,
    date: raw.date,
    venueId: raw.venue_id,
    tourId: raw.tour_id,
    // ... other fields

    // Embedded data - GUARANTEED PRESENT
    venue: {
      id: raw.venue_id,
      name: raw.venue_name,
      city: raw.venue_city,
      // ... other venue fields
    },
    tour: {
      id: raw.tour_id,
      name: raw.tour_name,
      year: raw.tour_year,
      // ... other tour fields
    }
  };
}

// ✅ Sync ensures data completeness
async function syncShows() {
  const serverShows = await fetchFromServer();
  const transformedShows = serverShows.map(transformShowFromServer);

  // Type system guarantees all shows have embedded data
  await db.shows.bulkPut(transformedShows);
}
```

---

## Type Guards

### Available Guards

```typescript
// Check if show has complete embedded data
isDexieShowWithDetails(show): show is DexieShowWithDetails

// Check if setlist entry has song data
isDexieSetlistEntryWithDetails(entry): entry is DexieSetlistEntryWithDetails

// Check if liberation entry has complete data
isDexieLiberationEntryWithDetails(entry): entry is DexieLiberationEntryWithDetails
```

### Usage Examples

```typescript
// Example 1: Conditional rendering
const show = await db.shows.get(id);

if (isDexieShowWithDetails(show)) {
  // TypeScript knows show.venue exists
  return <ShowDetailPage show={show} />;
} else {
  // Handle incomplete data
  return <ShowLoadingPage showId={show.id} />;
}

// Example 2: Filtering
const shows = await db.shows.toArray();
const completeShows = shows.filter(isDexieShowWithDetails);
// completeShows has type DexieShowWithDetails[]

// Example 3: Assertion
const show = await db.shows.get(id);
if (!isDexieShowWithDetails(show)) {
  throw new Error('Show incomplete');
}
// After this point, TypeScript knows show is DexieShowWithDetails
console.log(show.venue.name);  // ✅ Safe
```

---

## Migration Checklist

### Migrating a Component

- [ ] Identify component props using `DexieShow`, `DexieSetlistEntry`, or `DexieLiberationEntry`
- [ ] Determine if component needs complete data:
  - **YES** → Change to `WithDetails` type
  - **NO** → Change to `Base` type
- [ ] Update prop types
- [ ] Remove unnecessary `?.` optional chaining
- [ ] Add validation at data loading boundary if needed
- [ ] Test component with real data

### Example Migration

```typescript
// BEFORE
interface ShowCardProps {
  show: DexieShow;  // Ambiguous - is venue guaranteed?
}

function ShowCard({ show }: ShowCardProps) {
  return (
    <div>
      <h1>{show.venue?.name || 'Unknown'}</h1>  // Defensive
      <p>{show.tour?.year}</p>                   // Defensive
    </div>
  );
}

// AFTER
interface ShowCardProps {
  show: DexieShowWithDetails;  // ✅ Explicit - venue guaranteed
}

function ShowCard({ show }: ShowCardProps) {
  return (
    <div>
      <h1>{show.venue.name}</h1>  // ✅ No ?. needed
      <p>{show.tour.year}</p>      // ✅ No ?. needed
    </div>
  );
}

// Data loading with validation
async function loadShow(id: number): Promise<DexieShowWithDetails> {
  const show = await db.shows.get(id);
  if (!isDexieShowWithDetails(show)) {
    throw new Error('Show data incomplete');
  }
  return show;
}
```

---

## Decision Tree

```
Do I need embedded data (venue/tour/song)?
│
├─ YES → Is the data guaranteed to be present?
│        │
│        ├─ YES (after sync, in UI) → Use WithDetails
│        │                             ✅ DexieShowWithDetails
│        │                             ✅ DexieSetlistEntryWithDetails
│        │
│        └─ NO (direct from DB) → Use Base + Type Guard
│                                  ✅ DexieShowBase
│                                  ✅ isDexieShowWithDetails()
│
└─ NO → Use Base type
         ✅ DexieShowBase (only need id, date, foreign keys)
```

---

## Anti-Patterns to Avoid

### ❌ Using Base in UI without validation
```typescript
// BAD - Will crash if venue missing
function ShowCard({ show }: { show: DexieShowBase }) {
  return <h1>{show.venue.name}</h1>;  // Error!
}
```

### ❌ Using optional chaining on WithDetails
```typescript
// BAD - Unnecessary defensive code
function ShowCard({ show }: { show: DexieShowWithDetails }) {
  return <h1>{show.venue?.name}</h1>;  // Unnecessary ?.
}
```

### ❌ Returning Base when you have WithDetails
```typescript
// BAD - Losing type information
async function loadShow(id: number): Promise<DexieShowBase> {
  const show = await db.shows.get(id);
  if (!isDexieShowWithDetails(show)) throw new Error('Incomplete');
  return show;  // Returns WithDetails but typed as Base
}

// GOOD - Preserve specific type
async function loadShow(id: number): Promise<DexieShowWithDetails> {
  const show = await db.shows.get(id);
  if (!isDexieShowWithDetails(show)) throw new Error('Incomplete');
  return show;  // ✅ Correctly typed
}
```

---

## TypeScript Tips

### Type Narrowing
```typescript
// ✅ Filter narrows type
const shows = await db.shows.toArray();
const complete = shows.filter((show): show is DexieShowWithDetails =>
  isDexieShowWithDetails(show)
);
// complete is DexieShowWithDetails[]

// ❌ Without type predicate
const complete2 = shows.filter(isDexieShowWithDetails);
// complete2 is still DexieShow[] - type not narrowed
```

### Assertion Functions
```typescript
// Create assertion helper
function assertShowWithDetails(
  show: DexieShowBase
): asserts show is DexieShowWithDetails {
  if (!isDexieShowWithDetails(show)) {
    throw new Error('Show missing embedded data');
  }
}

// Usage
const show = await db.shows.get(id);
assertShowWithDetails(show);
// After assertion, TypeScript knows show is WithDetails
console.log(show.venue.name);  // ✅ Safe
```

---

## FAQ

**Q: When should I use the legacy `DexieShow` type?**
A: Only for backward compatibility. Prefer `DexieShowBase` or `DexieShowWithDetails` for new code.

**Q: What if I'm not sure which type to use?**
A: Ask yourself: "Do I need venue/tour data, and is it guaranteed present?" If yes to both, use `WithDetails`. Otherwise, use `Base` with a type guard.

**Q: Should I validate data at every usage site?**
A: No - validate once at the **boundary** (after sync, before UI), then use `WithDetails` throughout.

**Q: What if my data is sometimes complete, sometimes not?**
A: Use `DexieShowBase | DexieShowWithDetails` union type, or handle both cases explicitly:
```typescript
function handleShow(show: DexieShowBase) {
  if (isDexieShowWithDetails(show)) {
    // Handle complete case
  } else {
    // Handle incomplete case
  }
}
```

**Q: Does this affect database queries?**
A: No - the types are compile-time only. Database schema and queries are unchanged.

---

## Resources

- **Schema Types**: `app/src/lib/db/dexie/schema.ts`
- **Type Guards**: Same file, bottom section
- **Full Documentation**: `/TYPE_SAFETY_IMPROVEMENTS.md`
- **Examples**: Check sync.ts and data-loader.ts for transform examples

---

## TL;DR

```typescript
// 📦 Reading from DB → Use Base
const show: DexieShowBase = await db.shows.get(id);

// ✨ After sync / In UI → Use WithDetails
const show: DexieShowWithDetails = transformedShow;
return <h1>{show.venue.name}</h1>;  // No ?. needed!

// 🔍 Type guard to validate
if (isDexieShowWithDetails(show)) {
  // show is now DexieShowWithDetails
}
```

**Golden Rule**: If you're using `?.` on an embedded field, you probably need the `WithDetails` type!
