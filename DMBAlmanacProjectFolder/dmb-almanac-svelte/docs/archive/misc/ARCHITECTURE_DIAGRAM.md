# Type Safety Architecture Diagram

## Data Flow Diagram

### Before (No Runtime Validation)
```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION RUNTIME                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Component/Hook                                                  │
│      │                                                           │
│      ├─→ useOfflineShows()                                       │
│      │       │                                                   │
│      │       └─→ getOfflineShows(filters)                        │
│      │               │                                           │
│      │               └─→ IndexedDB.toArray()                     │
│      │                       │                                   │
│      │                       └─→ Returns: CachedShow[] ⚠️        │
│      │                           (Type assumed, not validated)   │
│      │                                                           │
│      │               Map to API type                             │
│      │               │                                           │
│      │               └─→ mapCachedShowToListItem() ⚠️            │
│      │                   (Direct property access)               │
│      │                       │                                   │
│      │                       └─→ ShowListItem                    │
│      │                                                           │
│      └─→ Display in UI                                           │
│          (Potential runtime error here ✗)                        │
│                                                                   │
│  ISSUES:                                                         │
│  ❌ No validation of IndexedDB data                              │
│  ❌ Can't detect corruption                                      │
│  ❌ Type errors only caught at compile-time                      │
│  ❌ Property access assumes validity                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    BROWSER STORAGE                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  IndexedDB (untrusted, can be corrupted/tampered)                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ shows                                                      │  │
│  │  [{id: 1, showDate: '2024-01-01', ... }, ...]            │  │
│  │  ⚠️  Could have:                                           │  │
│  │     - Wrong types (id: "1" instead of 1)                 │  │
│  │     - Missing fields (id is undefined)                    │  │
│  │     - Extra fields (not in schema)                        │  │
│  │     - Null values for non-nullable fields                 │  │
│  │     - Corruption from storage quota exceeded             │  │
│  │     - User-initiated IndexedDB manipulation              │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### After (With Runtime Validation)
```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION RUNTIME                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Component/Hook                                                  │
│      │                                                           │
│      ├─→ useOfflineShows()                                       │
│      │       │                                                   │
│      │       └─→ getOfflineShows(filters)                        │
│      │               │                                           │
│      │               └─→ IndexedDB.toArray()                     │
│      │                       │                                   │
│      │                       └─→ Returns: unknown[] ✓           │
│      │                           (Proper uncertainty)            │
│      │                                                           │
│      │               Type Guard Validation                        │
│      │               │                                           │
│      │               ├─→ isCachedShow(item) ✓                    │
│      │               │   (Check id: number)                      │
│      │               │   (Check showDate: string)                │
│      │               │   (Check all fields)                      │
│      │               │       │                                   │
│      │               │       ├─ Valid? ✓ Continue                │
│      │               │       └─ Invalid? ✗ Throw/Skip            │
│      │               │                                           │
│      │               Map to API type (guaranteed valid)          │
│      │               │                                           │
│      │               └─→ mapCachedShowToListItem() ✓             │
│      │                   (Validation already done)               │
│      │                       │                                   │
│      │                       └─→ ShowListItem ✓                  │
│      │                           (Type-safe)                     │
│      │                                                           │
│      └─→ Display in UI                                           │
│          (No runtime errors ✓)                                   │
│                                                                   │
│  IMPROVEMENTS:                                                   │
│  ✅ Runtime validation of IndexedDB data                         │
│  ✅ Detects corruption immediately                               │
│  ✅ Type-safe at compile-time AND runtime                        │
│  ✅ Property access guaranteed valid                             │
│  ✅ Clear error messages for debugging                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    BROWSER STORAGE                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  IndexedDB (untrusted, can be corrupted/tampered)                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ shows                                                      │  │
│  │  [{id: 1, showDate: '2024-01-01', ... }, ...]            │  │
│  │  ✓ Type validation catches any issues:                    │  │
│  │     - Wrong types → Validation fails                      │  │
│  │     - Missing fields → Validation fails                   │  │
│  │     - Invalid structure → Validation fails                │  │
│  │     - Can handle gracefully (skip/retry/API fetch)        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Type Guard Pattern

```
┌──────────────────────────────────────────────────────────────────┐
│                    TYPE GUARD PATTERN                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Input: unknown                                                  │
│    ↓                                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Type Guard Function                                        │  │
│  │                                                            │  │
│  │ function isCachedShow(value: unknown): value is CachedShow│  │
│  │                                                            │  │
│  │   Step 1: Is it an object?                               │  │
│  │   ├─ No  → return false                                   │  │
│  │   └─ Yes → continue                                       │  │
│  │                                                            │  │
│  │   Step 2: Has correct shape?                             │  │
│  │   ├─ No  → return false                                   │  │
│  │   └─ Yes → continue                                       │  │
│  │                                                            │  │
│  │   Step 3: Has all required fields?                       │  │
│  │   ├─ No  → return false                                   │  │
│  │   └─ Yes → continue                                       │  │
│  │                                                            │  │
│  │   Step 4: All fields correct type?                       │  │
│  │   ├─ No  → return false                                   │  │
│  │   └─ Yes → return true                                    │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│    ↓                                                              │
│  Output: boolean (and TypeScript type narrowing)               │  │
│                                                                    │
│  Usage:                                                          │
│  if (isCachedShow(data)) {                                       │
│    // Inside this block, TypeScript knows data is CachedShow    │
│    data.id        ✓ Safe                                          │
│    data.showDate  ✓ Safe                                          │
│  }                                                                │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Validation Checklist

```
┌──────────────────────────────────────────────────────────────────┐
│          VALIDATION CHECKLIST FOR CachedShow                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Input Data from IndexedDB                                       │
│         │                                                        │
│         ├─ Is object?              ────→ [ ] Check              │
│         │                                                        │
│         ├─ id field exists?         ────→ [ ] Check              │
│         │  ├─ Type is number?       ────→ [ ] Check              │
│         │  └─ Value valid?          ────→ [ ] Check              │
│         │                                                        │
│         ├─ showDate field exists?   ────→ [ ] Check              │
│         │  ├─ Type is string?       ────→ [ ] Check              │
│         │  └─ Format valid?         ────→ [ ] Check (implicit)   │
│         │                                                        │
│         ├─ venueId field exists?    ────→ [ ] Check              │
│         │  ├─ Type is number?       ────→ [ ] Check              │
│         │  ├─ OR null?              ────→ [ ] Check              │
│         │  └─ Value valid?          ────→ [ ] Check              │
│         │                                                        │
│         ├─ venueName field?         ────→ [ ] Check              │
│         │  ├─ Type is string?       ────→ [ ] Check              │
│         │  └─ OR null?              ────→ [ ] Check              │
│         │                                                        │
│         ├─ city field?              ────→ [ ] Check              │
│         │  ├─ Type is string?       ────→ [ ] Check              │
│         │  └─ OR null?              ────→ [ ] Check              │
│         │                                                        │
│         ├─ state field?             ────→ [ ] Check              │
│         │  ├─ Type is string?       ────→ [ ] Check              │
│         │  └─ OR null?              ────→ [ ] Check              │
│         │                                                        │
│         ├─ songCount field?         ────→ [ ] Check              │
│         │  └─ Type is number?       ────→ [ ] Check              │
│         │                                                        │
│         └─ syncedAt field?          ────→ [ ] Check              │
│            └─ Type is number?       ────→ [ ] Check              │
│                                                                    │
│  All checks pass? ✓ → Data is valid CachedShow                   │
│  Any check fails?  ✗ → Validation fails, throw error             │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Type Safety Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    TYPE SAFETY LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Layer 3: Mapper Functions (After Validation)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ mapCachedShowToListItem(cached: CachedShow): ShowListItem │ │
│  │ - Input guaranteed to be valid CachedShow                 │ │
│  │ - Can safely access all properties                        │ │
│  │ - No null checks needed (already validated)               │ │
│  │ - Output is guaranteed valid ShowListItem                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                      ↑                                           │
│                  (Type-safe)                                     │
│                      │                                           │
│  Layer 2: Type Guard Validation (Runtime)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ if (!isCachedShow(data)) throw Error(...)                 │ │
│  │ - Validates object shape                                  │ │
│  │ - Checks all required fields                              │ │
│  │ - Verifies field types                                    │ │
│  │ - Narrows type for TypeScript compiler                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                      ↑                                           │
│                  (Runtime)                                       │
│                      │                                           │
│  Layer 1: IndexedDB Data Retrieval                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ const data = await clientDb.shows.toArray()               │ │
│  │ - Data type: unknown[] (properly typed as untrusted)     │ │
│  │ - Could contain corrupted items                           │ │
│  │ - Could have wrong field types                            │ │
│  │ - Could be missing required fields                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                      ↑                                           │
│                (Untrusted)                                       │
│                      │                                           │
│              Browser Storage (IndexedDB)                         │
│                                                                   │
│  SECURITY MODEL:                                                │
│  Trust Level:  Low ←────→ Medium ←────→ High                    │
│  Layer:        Storage → Validation → Application               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   ERROR HANDLING FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  mapCachedShowToListItem(cachedData)                             │
│         │                                                       │
│         ├─→ Validation Check                                    │
│         │   if (!isCachedShow(cachedData))                      │
│         │         │                                             │
│         │         ├─ INVALID DATA ─────────────────┐            │
│         │         │                                 │            │
│         │         └─ throw Error()                  │            │
│         │             "Invalid CachedShow..."       │            │
│         │                                           │            │
│         │                           ┌───────────────┘            │
│         │                           │                           │
│         │                      EXCEPTION                        │
│         │                           │                           │
│         │            ┌──────────────┼──────────────┐            │
│         │            │              │              │            │
│         ├──→ Option 1: Throw   Option 2: Catch   Option 3:     │
│         │    (Development)    (Fallback to API) (Skip Item)    │
│         │         │              │                │            │
│         │         └─ Error logs   └─ Fetch from  └─ Continue  │
│         │           Stack trace      server API     with next  │
│         │                                          item        │
│         │                                                       │
│         └─→ DATA VALID ─────────────────────────────────────┐  │
│             (isCachedShow returned true)                    │  │
│                 │                                            │  │
│                 └─→ Safe Mapping                             │  │
│                     return { /* ... */ }                     │  │
│                         │                                    │  │
│                         └─→ ShowListItem ✓                  │  │
│                             (Type-safe)                      │  │
│                                                              │  │
└──────────────────────────────────────────────────────────────┘  │
```

---

## Component Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMPONENT INTEGRATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  React Component                                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ function ShowListPage() {                                │   │
│  │   const { data, isLoading, error } =                     │   │
│  │     useOfflineShows(filters);                            │   │
│  │                                                          │   │
│  │   if (isLoading) return <Loading />;                     │   │
│  │   if (error) return <Error error={error} />;            │   │
│  │   if (!data) return <Empty />;                           │   │
│  │                                                          │   │
│  │   return (                                               │   │
│  │     <div>                                                │   │
│  │       {data.map(show => (   ← Already validated!         │   │
│  │         <ShowCard key={show.id} show={show} />           │   │
│  │       ))}                                                │   │
│  │     </div>                                               │   │
│  │   );                                                     │   │
│  │ }                                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↑                                                        │
│         │                                                        │
│  useOfflineShows Hook                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ export function useOfflineShows(filters: ShowFilters) {  │   │
│  │   const cachedShows = getOfflineShows(filters);          │   │
│  │   // Returns CachedShow[]                               │   │
│  │                                                          │   │
│  │   const data = cachedShows?.map(cached => {             │   │
│  │     try {                                                │   │
│  │       return mapCachedShowToListItem(cached);  ← Validate!  │   │
│  │     } catch (error) {                                    │   │
│  │       console.error('Invalid cached show:', error);      │   │
│  │       return null;                                       │   │
│  │     }                                                    │   │
│  │   }).filter(Boolean);                                   │   │
│  │   // Returns ShowListItem[] (all validated)             │   │
│  │                                                          │   │
│  │   return { data, isLoading, error, ... };              │   │
│  │ }                                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↑                                                        │
│         │                                                        │
│  Validation Pipeline                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ IndexedDB Data                                           │   │
│  │     ↓                                                    │   │
│  │ mapCachedShowToListItem()  (validation happens here)     │   │
│  │     ↓                                                    │   │
│  │ ShowListItem[] (guaranteed valid)                        │   │
│  │     ↓                                                    │   │
│  │ Component (no error handling needed!)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

The architecture implements **layered type safety**:

1. **Storage Layer** (IndexedDB): Data is untrusted (type: `unknown[]`)
2. **Validation Layer** (Type Guards): Data is verified at runtime
3. **Mapping Layer** (Mappers): Data is transformed safely
4. **Application Layer** (Components): Data is guaranteed valid

This ensures type safety at both compile-time (TypeScript) and runtime (validation), preventing silent failures and data corruption issues.
