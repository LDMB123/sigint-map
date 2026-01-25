# Week 1 Day 4-5: Bundle Optimization - IN PROGRESS

## Summary

**Status**: 1/3 tasks complete (33%)
**Time Invested**: ~20 minutes
**Remaining**: 2 tasks (6-7 hours)

---

## ✅ Completed Tasks

### 1. Replace Zod with Valibot ✓
**Files Modified**:
- `src/lib/db/dexie/sync.ts` (3 changes)
- `package.json` (zod removed, valibot added)

**Changes**:

**Import replacement** (line 24):
```typescript
// Before
import { z } from 'zod';

// After
import * as v from 'valibot';
```

**Schema definition** (lines 41-56):
```typescript
// Before (Zod)
const ServerVenueSchema = z.object({
  id: z.number(),
  name: z.string(),
  state: z.string().nullable(),
  // ...
});

// After (Valibot)
const ServerVenueSchema = v.object({
  id: v.number(),
  name: v.string(),
  state: v.nullable(v.string()),
  // ...
});
```

**Validation call** (line 305):
```typescript
// Before (Zod)
const result = ServerVenueSchema.safeParse(server);
if (!result.success) {
  console.warn('Invalid data:', result.error.format());
}

// After (Valibot)
const result = v.safeParse(ServerVenueSchema, server);
if (!result.success) {
  console.warn('Invalid data:', result.issues);
}
```

**Package changes**:
```bash
# Before
zod: 4.3.6 (~14 KB gzipped)

# After
valibot: 1.2.0 (~4 KB gzipped)

# Savings: ~10 KB gzipped
```

**Impact**:
- **Bundle Size**: -10 KB gzipped
- **API**: Cleaner (v.nullable instead of .nullable())
- **Tree-shaking**: Better with Valibot's modular design
- **Performance**: Slightly faster validation
- **Breaking Changes**: None (internal validation only)

---

## 🚧 In Progress

### 2. Code-split Dexie to Data Routes
**Status**: Analysis complete, implementation pending
**Effort**: 3-4 hours
**Impact**: 20-30 KB deferred from initial bundle

**Current State**:
- Dexie imported in 44 files
- Root `+layout.svelte` imports dexie/cache (global)
- All data routes import Dexie directly
- No lazy loading - eager bundle inclusion

**Strategy**:
1. Create lazy Dexie loader wrapper
2. Update root layout to use lazy cache setup
3. Convert direct imports to dynamic imports on data routes
4. Keep WASM bridge imports (already lazy)

**Files to Modify**:
- `src/routes/+layout.svelte` (lazy cache setup)
- Create `src/lib/db/lazy-dexie.ts` (wrapper)
- Update 40+ data route files (dynamic imports)

**Pending Analysis**:
- Identify truly global vs route-specific Dexie usage
- Ensure offline mutation queue works with lazy loading
- Test with Service Worker interactions

---

## 📋 Pending

### 3. Remove Dead Code (3 Example Files)
**Effort**: 2 hours
**Impact**: 7-10 KB savings

**Files to Remove** (per MASTER_OPTIMIZATION_REPORT.md):
1. `src/lib/examples/demo-1.ts` (example file, never imported)
2. `src/lib/examples/demo-2.ts` (example file, never imported)
3. `src/lib/examples/demo-3.ts` (example file, never imported)

**Additional Dead Code Found**:
- Unused components in `src/lib/components/examples/`
- Old visualization prototypes
- Commented-out code blocks

---

## Total Impact (When Complete)

| Optimization | Bundle Savings | Status |
|-------------|----------------|---------|
| **Zod → Valibot** | 10 KB | ✅ DONE |
| **Code-split Dexie** | 20-30 KB | 🚧 PENDING |
| **Remove dead code** | 7-10 KB | 📋 PENDING |
| **Total** | 37-50 KB | 33% |

---

## Next Steps

1. ⏭️ Implement Dexie code-splitting (3-4h)
   - Create lazy loader wrapper
   - Update layout and routes
   - Test offline functionality

2. ⏭️ Remove dead code files (2h)
   - Delete example files
   - Remove unused components
   - Clean up comments

3. ⏭️ Move to Week 2: Performance Improvements (12-15h)

---

## Notes

- Zod replacement was straightforward (single schema, single file)
- Dexie code-splitting is more complex (44 files, global dependencies)
- Dead code removal needs careful analysis (avoid breaking imports)

**Generated**: 2026-01-24
**Status**: Day 4-5 33% complete (1/3 tasks done)
