# DMB Almanac Test File TypeScript to JavaScript Migration Plan

## Executive Summary

Convert 27 TypeScript test files to JavaScript with JSDoc type annotations to complete the TypeScript elimination initiative. This migration will remove the `tsx` dependency and simplify the test infrastructure while maintaining type safety through JSDoc.

## Current Status

✅ **Completed**:
- Source code converted to JavaScript with JSDoc (100% complete)
- Build configurations converted (`vite.config.js`, `playwright.config.js`)

🚧 **In Progress**:
- Test file migration (0 of 27 files)

## File Inventory

### Phase 1: Foundation (Priority P0) - 3 files

These files must be converted first as they are dependencies for all other tests.

| File | Lines | Difficulty | Description |
|------|-------|------------|-------------|
| `tests/setup.ts` | 43 | EASY | Vitest setup with WASM mocks |
| `tests/mocks/wasm-stub.ts` | 13 | EASY | Generic WASM mock |
| `tests/mocks/wasm-transform.ts` | 45 | EASY | DMB transform WASM mock |

**Conversion Pattern**:
```javascript
// Before (TypeScript)
export function version(): string {
    return 'mock-1.0.0';
}

// After (JavaScript with JSDoc)
/**
 * @returns {string}
 */
export function version() {
    return 'mock-1.0.0';
}
```

**After Phase 1**: Update `vite.config.js` to reference `.js` files:
```javascript
setupFiles: ['./tests/setup.js'],
```

---

### Phase 2: Unit Tests (Priority P1) - 14 files

Convert all unit tests to JavaScript. These have minimal external dependencies.

#### 2A: Store Tests (2 files)
| File | Lines | Dependencies | Notes |
|------|-------|--------------|-------|
| `tests/unit/stores/data.test.ts` | 514 | Svelte stores, Vitest | Type imports from `$stores/data` |

**Conversion Pattern**:
```javascript
// Before (TypeScript)
import { type DataPhase, type LoadProgress, type DataState } from '$stores/data';

// After (JavaScript with JSDoc)
/**
 * @typedef {import('$stores/data').DataPhase} DataPhase
 * @typedef {import('$stores/data').LoadProgress} LoadProgress
 * @typedef {import('$stores/data').DataState} DataState
 */
```

#### 2B: Component Tests (2 files)
| File | Lines | Dependencies |
|------|-------|--------------|
| `tests/unit/components/LazyVisualization.test.ts` | ~100 | Svelte components |
| `tests/unit/components/VirtualList.test.ts` | ~150 | Svelte components |

#### 2C: Database Tests (3 files)
| File | Lines | Dependencies |
|------|-------|--------------|
| `tests/unit/db/data-loader.test.ts` | ~200 | Dexie, WASM mocks |
| `tests/unit/db/queries.test.ts` | ~150 | Dexie queries |
| `tests/unit/db/query-helpers.test.ts` | ~100 | Dexie helpers |

**Conversion Pattern**:
```javascript
// Before (TypeScript)
import { type DexieSong } from '$db/dexie/schema';

// After (JavaScript with JSDoc)
/**
 * @typedef {import('$db/dexie/schema').DexieSong} DexieSong
 */
```

#### 2D: Utility Tests (4 files)
| File | Lines | Dependencies |
|------|-------|--------------|
| `tests/unit/utils/popover.test.ts` | ~80 | DOM utilities |
| `tests/unit/utils/rum.test.ts` | ~120 | RUM metrics |
| `tests/unit/utils/scheduler.test.ts` | ~90 | Scheduler |
| `tests/unit/utils/shareParser.test.ts` | ~60 | URL parser |

#### 2E: WASM Tests (2 files) - EXCLUDED
| File | Status |
|------|--------|
| `tests/unit/wasm/forceSimulation.test.ts` | SKIP - Already excluded in vite.config |
| `tests/unit/wasm/transform.test.ts` | SKIP - Already excluded in vite.config |

These tests require Rust WASM builds and are already excluded. No conversion needed.

#### 2F: PWA Race Condition Test (1 file) - EXCLUDED
| File | Status |
|------|--------|
| `tests/pwa-race-conditions.test.ts` | SKIP - Already excluded in vite.config |

---

### Phase 3: E2E Test Infrastructure (Priority P2) - 4 files

Convert E2E helpers and fixtures before spec files.

| File | Lines | Difficulty | Description |
|------|-------|------------|-------------|
| `tests/e2e/fixtures/base.ts` | 228 | MEDIUM | Playwright custom fixtures |
| `tests/e2e/helpers/accessibility.ts` | ~100 | EASY | Axe-core integration |
| `tests/e2e/helpers/performance.ts` | ~120 | EASY | Performance metrics |
| `tests/e2e/page-objects/HomePage.ts` | ~80 | EASY | Home page object |
| `tests/e2e/page-objects/SearchPage.ts` | ~90 | EASY | Search page object |

**Conversion Pattern for Page Objects**:
```javascript
// Before (TypeScript)
import { type Page } from '@playwright/test';

export class HomePage {
    constructor(private page: Page) {}

    async goto(): Promise<void> {
        await this.page.goto('/');
    }
}

// After (JavaScript with JSDoc)
import { test } from '@playwright/test';

/**
 * Home page object for E2E tests
 */
export class HomePage {
    /** @type {import('@playwright/test').Page} */
    #page;

    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.#page = page;
    }

    /**
     * Navigate to home page
     * @returns {Promise<void>}
     */
    async goto() {
        await this.#page.goto('/');
    }
}
```

---

### Phase 4: E2E Spec Files (Priority P3) - 6 files

Convert E2E test specs last, after all infrastructure is in place.

| File | Lines | Dependencies | Description |
|------|-------|--------------|-------------|
| `tests/e2e/smoke.spec.ts` | ~50 | Base fixtures | Quick smoke tests |
| `tests/e2e/navigation.spec.ts` | ~150 | HomePage, SearchPage | Navigation flows |
| `tests/e2e/search.spec.ts` | ~200 | SearchPage | Search functionality |
| `tests/e2e/pwa.spec.ts` | ~180 | Service worker | PWA features |
| `tests/e2e/accessibility.spec.ts` | ~120 | Axe helpers | A11y tests |
| `tests/e2e/performance.spec.ts` | ~140 | Performance helpers | Performance budgets |

**Conversion Pattern for Spec Files**:
```javascript
// Before (TypeScript)
import { test, expect, type Page } from '@playwright/test';
import { HomePage } from './page-objects/HomePage';

test.describe('Navigation', () => {
    let homePage: HomePage;

    test.beforeEach(async ({ page }: { page: Page }) => {
        homePage = new HomePage(page);
        await homePage.goto();
    });

    test('should navigate to shows', async ({ page }: { page: Page }) => {
        await expect(page).toHaveURL(/\/shows/);
    });
});

// After (JavaScript with JSDoc)
import { test, expect } from '@playwright/test';
import { HomePage } from './page-objects/HomePage.js';

test.describe('Navigation', () => {
    /** @type {HomePage} */
    let homePage;

    test.beforeEach(async ({ page }) => {
        homePage = new HomePage(page);
        await homePage.goto();
    });

    test('should navigate to shows', async ({ page }) => {
        await expect(page).toHaveURL(/\/shows/);
    });
});
```

---

## Migration Workflow by Phase

### Phase 1: Foundation (Day 1, 1 hour)

1. Convert `tests/mocks/wasm-stub.ts` → `wasm-stub.js`
2. Convert `tests/mocks/wasm-transform.ts` → `wasm-transform.js`
3. Convert `tests/setup.ts` → `setup.js`
4. Update `vite.config.js`:
   - Change `setupFiles: ['./tests/setup.ts']` → `['./tests/setup.js']`
   - Change `include: ['tests/**/*.test.ts']` → `['tests/**/*.test.js']`
   - Update all WASM mock paths from `.ts` → `.js`
5. Run `npm test` to verify mocks work

---

### Phase 2: Unit Tests (Day 1-2, 6 hours)

#### 2A: Store Tests (1 hour)
1. Convert `tests/unit/stores/data.test.ts` → `data.test.js`
2. Replace type imports with JSDoc `@typedef` imports
3. Run `npm test -- data.test` to verify

#### 2B: Component Tests (1 hour)
1. Convert LazyVisualization test
2. Convert VirtualList test
3. Run `npm test -- tests/unit/components` to verify

#### 2C: Database Tests (2 hours)
1. Convert data-loader test (most complex - 200 lines)
2. Convert queries test
3. Convert query-helpers test
4. Run `npm test -- tests/unit/db` to verify

#### 2D: Utility Tests (2 hours)
1. Convert all 4 utility tests in batch
2. Run `npm test -- tests/unit/utils` to verify

**Checkpoint**: All unit tests passing in JavaScript

---

### Phase 3: E2E Infrastructure (Day 2-3, 3 hours)

1. Convert page objects (2 files) - Simple, no dependencies
2. Convert helpers (2 files) - Axe and performance
3. Convert fixtures (1 file) - Most complex, 228 lines
4. Update imports in fixtures to use `.js` extensions
5. Run `npm run test:e2e:smoke` to verify infrastructure

---

### Phase 4: E2E Spec Files (Day 3, 2 hours)

1. Convert `smoke.spec.ts` first (simplest)
2. Convert remaining specs in parallel:
   - `navigation.spec.ts`
   - `search.spec.ts`
   - `pwa.spec.ts`
   - `accessibility.spec.ts`
   - `performance.spec.ts`
3. Run full E2E suite: `npm run test:e2e`

**Final Checkpoint**: All tests passing

---

## Common Conversion Patterns

### Pattern 1: Type Imports
```javascript
// Before
import { type Foo, type Bar } from './module';

// After
/**
 * @typedef {import('./module').Foo} Foo
 * @typedef {import('./module').Bar} Bar
 */
```

### Pattern 2: Function Parameters
```javascript
// Before
async function loadData(id: number): Promise<Data> {
    return fetch(`/api/${id}`);
}

// After
/**
 * Load data by ID
 * @param {number} id
 * @returns {Promise<Data>}
 */
async function loadData(id) {
    return fetch(`/api/${id}`);
}
```

### Pattern 3: Class with Private Fields
```javascript
// Before
class Foo {
    private value: string;

    constructor(value: string) {
        this.value = value;
    }
}

// After
class Foo {
    /** @type {string} */
    #value;

    /**
     * @param {string} value
     */
    constructor(value) {
        this.#value = value;
    }
}
```

### Pattern 4: Vitest Mocks
```javascript
// Before (TypeScript)
const mockFn = vi.fn<[string], void>();

// After (JavaScript - Vitest infers types)
const mockFn = vi.fn();
```

### Pattern 5: Playwright Fixtures
```javascript
// Before
test.use<{ myFixture: string }>({
    myFixture: 'value'
});

// After (types inferred from fixture definition)
test.use({
    myFixture: 'value'
});
```

---

## Testing Strategy

### After Each Phase
1. Run affected test suite
2. Verify type checking with `npm run check`
3. Check for ESLint errors: `npm run lint`
4. Commit changes per phase

### Before Final Completion
1. Run full test suite: `npm test && npm run test:e2e`
2. Run build: `npm run build`
3. Verify no TypeScript compilation errors
4. Check IDE autocomplete still works (VSCode)

---

## Dependency Updates After Completion

### Remove from package.json
- `tsx` - No longer needed (saves ~50MB node_modules)
- `@types/better-sqlite3` - Only used in scraper (separate project)

### Keep in package.json
- `typescript` - Required for `svelte-check`
- `typescript-eslint` - Required for linting Svelte components
- All other `@types/*` for runtime imports (Vitest uses them)

---

## Risk Mitigation

### Low Risk
- **Build configs** - Already completed, builds work ✅
- **WASM mocks** - Simple pass-through functions
- **Unit tests** - Isolated, no cross-dependencies

### Medium Risk
- **E2E fixtures** - 228 lines, complex Playwright types
  - Mitigation: Convert incrementally, test after each change
- **Store tests** - Heavy use of Svelte store types
  - Mitigation: Lean on JSDoc import types

### Rollback Plan
If any phase fails:
1. Git revert to previous phase
2. Keep earlier phases (they're independent)
3. Investigate failure in isolation
4. Re-attempt with fixes

---

## Success Criteria

### Phase Completion
- [ ] Phase 1: All unit tests run with JS mocks
- [ ] Phase 2: All unit tests pass in JavaScript
- [ ] Phase 3: E2E infrastructure works
- [ ] Phase 4: All E2E tests pass

### Final Success
- [ ] Zero `.ts` files in `tests/` (except excluded)
- [ ] `npm test` passes all tests
- [ ] `npm run test:e2e` passes all E2E tests
- [ ] `npm run check` passes type checking
- [ ] `npm run lint` passes linting
- [ ] `npm run build` succeeds
- [ ] No regression in IDE autocomplete

---

## Estimated Timeline

| Phase | Files | Estimated Time | Complexity |
|-------|-------|----------------|------------|
| Phase 1: Foundation | 3 | 1 hour | LOW |
| Phase 2A: Store Tests | 1 | 1 hour | MEDIUM |
| Phase 2B: Component Tests | 2 | 1 hour | LOW |
| Phase 2C: Database Tests | 3 | 2 hours | MEDIUM |
| Phase 2D: Utility Tests | 4 | 2 hours | LOW |
| Phase 3: E2E Infrastructure | 5 | 3 hours | MEDIUM |
| Phase 4: E2E Specs | 6 | 2 hours | LOW-MEDIUM |
| **TOTAL** | **24 files** | **12 hours** | **2-3 days** |

*Note: 3 files excluded (WASM tests, PWA race condition test)*

---

## Post-Migration Cleanup

### 1. Update Documentation
- [ ] Update README to note JavaScript-only codebase
- [ ] Update contributing guide (no TypeScript setup needed)

### 2. Update CI/CD
- [ ] Verify GitHub Actions still work
- [ ] Update any TypeScript-specific CI steps

### 3. Developer Experience
- [ ] Verify VSCode JSDoc autocomplete
- [ ] Update `.vscode/settings.json` if needed
- [ ] Test new developer onboarding flow

---

## Notes

- **Keep `app.d.ts`**: SvelteKit requires this for App namespace (only 19 lines)
- **Keep `tsconfig.json`**: Required for `svelte-check` to validate JSDoc
- **Test incrementally**: Each phase should have passing tests before moving to next
- **Use `.js` extensions**: Import statements need explicit `.js` extensions
- **Private fields**: Use `#field` syntax instead of TypeScript `private`

---

## Example Complete Conversion

### Before: `tests/mocks/wasm-stub.ts`
```typescript
/**
 * Generic stub for WASM modules
 * Used in tests when WASM packages aren't built
 */

export default async function init() {
	return undefined;
}

export function version(): string {
	return 'mock-1.0.0';
}
```

### After: `tests/mocks/wasm-stub.js`
```javascript
/**
 * Generic stub for WASM modules
 * Used in tests when WASM packages aren't built
 */

/**
 * Initialize WASM module (mock)
 * @returns {Promise<undefined>}
 */
export default async function init() {
	return undefined;
}

/**
 * Get WASM module version (mock)
 * @returns {string}
 */
export function version() {
	return 'mock-1.0.0';
}
```

---

## References

- [JSDoc Type Annotations](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Vitest JavaScript Support](https://vitest.dev/guide/)
- [Playwright JavaScript](https://playwright.dev/docs/test-typescript-javascript)
- [Svelte Store Types](https://svelte.dev/docs/svelte-store)
