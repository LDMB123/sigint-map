# DMB Almanac - Test Improvement Roadmap & Action Plan

**Created**: January 22, 2026
**Status**: CRITICAL - Immediate action required
**Target Coverage**: 70%+ in 8 weeks

---

## Quick Start: What to Test First

### Week 1: Database Layer (30 new tests)

**Why**: App won't load without working database

#### Task 1.1: Database Initialization Tests
**File**: Create `src/__tests__/lib/db/dexie/init.test.ts`

```typescript
describe('Dexie Database Initialization', () => {
  // Test 1: Schema creation
  it('should create database with correct schema', async () => {
    // Verify tables: songs, venues, shows, tours, etc.
  });

  // Test 2: Connection handling
  it('should handle database connection errors', async () => {
    // Mock IndexedDB quota exceeded
  });

  // Test 3: Version migration
  it('should migrate schema versions', async () => {
    // Test upgrade path
  });

  // Test 4: Data initialization
  it('should initialize with seed data', async () => {
    // Test initial data load
  });
});
```

**Estimated Tests**: 8
**Effort**: 1-2 days

#### Task 1.2: Database Sync Tests
**File**: Create `src/__tests__/lib/db/dexie/sync.test.ts`

```typescript
describe('Dexie Data Sync', () => {
  // Test 1: Server to client sync
  it('should sync new data from server to IndexedDB', async () => {
    // Mock fetch, verify Dexie updates
  });

  // Test 2: Offline data persistence
  it('should persist data for offline access', async () => {
    // Verify data stays after offline
  });

  // Test 3: Conflict resolution
  it('should resolve conflicts between server and client', async () => {
    // Test merge logic
  });

  // Test 4: Sync error recovery
  it('should recover from sync failures', async () => {
    // Test retry logic
  });
});
```

**Estimated Tests**: 6
**Effort**: 1-2 days

#### Task 1.3: Server Query Tests
**File**: Create `src/__tests__/lib/db/server/queries.test.ts`

```typescript
describe('Server Queries', () => {
  // Test 1: SQLite connection
  it('should execute queries on SQLite', async () => {
    // Mock better-sqlite3
  });

  // Test 2: Query errors
  it('should handle query execution errors', async () => {
    // Test error handling
  });

  // Test 3: Large result sets
  it('should handle pagination for large results', async () => {
    // Test limit/offset
  });

  // Test 4: Data transformation
  it('should correctly transform SQLite results', async () => {
    // Verify data shape
  });
});
```

**Estimated Tests**: 8
**Effort**: 1-2 days

### Week 2: Core Component Tests (25 new tests)

**Why**: Component bugs cause bad UX

#### Task 2.1: ErrorBoundary Component Tests
**File**: Create `src/__tests__/lib/components/ui/ErrorBoundary.test.ts`

```typescript
import { render } from '@testing-library/svelte';
import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';

describe('ErrorBoundary Component', () => {
  // Test 1: Catches errors
  it('should catch child component errors', async () => {
    // Render component that throws
    // Verify error displayed
  });

  // Test 2: Shows fallback UI
  it('should display fallback error UI', async () => {
    // Verify error message shows
  });

  // Test 3: Doesn't catch handler errors
  it('should not catch errors in error handler', async () => {
    // Verify original error propagates
  });

  // Test 4: Resets on remount
  it('should reset error state when remounted', async () => {
    // Verify component recovers
  });
});
```

**Estimated Tests**: 6
**Effort**: 1 day

#### Task 2.2: Button & Basic Components
**File**: Create `src/__tests__/lib/components/ui/Button.test.ts`

```typescript
describe('Button Component', () => {
  // Test 1: Renders with props
  it('should render button with text content', async () => {
    const { getByRole } = render(Button, { props: { label: 'Click me' } });
    expect(getByRole('button')).toHaveTextContent('Click me');
  });

  // Test 2: Click handling
  it('should fire click event on button press', async () => {
    const { getByRole } = render(Button, { props: { onClick: vi.fn() } });
    await fireEvent.click(getByRole('button'));
  });

  // Test 3: Disabled state
  it('should be disabled when disabled prop is true', async () => {
    const { getByRole } = render(Button, { props: { disabled: true } });
    expect(getByRole('button')).toBeDisabled();
  });

  // Test 4: Accessibility
  it('should have proper ARIA attributes', async () => {
    const { getByRole } = render(Button, { props: { label: 'Save' } });
    expect(getByRole('button')).toHaveAttribute('type', 'button');
  });
});
```

**Estimated Tests**: 8
**Effort**: 1 day

#### Task 2.3: Card & Badge Components
**File**: Create `src/__tests__/lib/components/ui/Card.test.ts`

```typescript
describe('Card Component', () => {
  it('should render content slot', async () => { });
  it('should apply custom className', async () => { });
  it('should support click events', async () => { });
});

describe('Badge Component', () => {
  it('should render badge with text', async () => { });
  it('should apply variant class', async () => { });
  it('should support dismissal', async () => { });
});
```

**Estimated Tests**: 6
**Effort**: 1 day

### Week 3-4: Integration Tests (25 new tests)

#### Task 3.1: Route Loading Tests
**File**: Create `src/__tests__/routes/index.test.ts`

```typescript
describe('Homepage Route', () => {
  it('should load homepage and display stats', async () => {
    // Mock database
    // Call load function
    // Verify data displayed
  });

  it('should handle loading errors gracefully', async () => {
    // Mock database error
    // Verify error state shows
  });

  it('should show loading state while fetching', async () => {
    // Verify skeleton/spinner shows
  });
});
```

**Estimated Tests**: 10
**Effort**: 2-3 days

#### Task 3.2: Search Flow Tests
**File**: Create `src/__tests__/routes/search.test.ts`

```typescript
describe('Search Page', () => {
  it('should execute search query', async () => { });
  it('should display results for each entity type', async () => { });
  it('should handle empty results', async () => { });
  it('should filter results by type', async () => { });
});
```

**Estimated Tests**: 8
**Effort**: 1-2 days

---

## Phase-by-Phase Test Plan

### Phase 1: Critical Systems (Weeks 1-2)

**Focus**: System-breaking gaps
**Target**: +20% coverage (to 24%)
**Tests to Write**: 80-100

#### P1.1: Database Layer (Priority: CRITICAL)

**Files to Test**:
- `/lib/db/dexie/init.ts` - Database setup
- `/lib/db/dexie/sync.ts` - Data synchronization
- `/lib/db/dexie/cache.ts` - Query caching
- `/lib/db/dexie/schema.ts` - IndexedDB schema
- `/lib/db/server/queries.ts` - SQLite queries
- `/lib/db/server/data-loader.ts` - Data loading

**Test Strategy**:
1. Mock Dexie for client tests
2. Mock better-sqlite3 for server tests
3. Test data flow: Server → Dexie → UI
4. Test offline scenarios

**New Tests**: 35-40
**Estimated Effort**: 5-7 days

#### P1.2: Core Components (Priority: HIGH)

**Components to Test**:
- ErrorBoundary (app stability)
- Button, Card, Badge (basic UI)
- LoadingState, EmptyState, ErrorState
- VirtualList (automated tests, not just docs)

**Test Strategy**:
1. Use @testing-library/svelte
2. Test rendering with props
3. Test event handling
4. Test accessibility (ARIA)
5. Test focus management

**New Tests**: 30-40
**Estimated Effort**: 4-5 days

#### P1.3: Basic Route Integration (Priority: HIGH)

**Routes to Test**:
- Homepage (`/`)
- Shows listing (`/shows`)
- Show detail (`/shows/[slug]`)

**Test Strategy**:
1. Mock database with real data
2. Test data loading
3. Test error states
4. Test responsive layout

**New Tests**: 15-20
**Estimated Effort**: 3-4 days

**Phase 1 Total**: 80-100 tests, 12-16 days

---

### Phase 2: Feature Coverage (Weeks 3-4)

**Focus**: Feature completeness
**Target**: +20% coverage (to 44%)
**Tests to Write**: 100-120

#### P2.1: Utility Functions (Priority: HIGH)

**Critical Utilities**:
- `persistentStorage.ts` - Local storage abstraction
- `navigationApi.ts` - Navigation patterns
- `performance.ts` - Performance monitoring
- `eventListeners.ts` - Event lifecycle

**Test Strategy**:
1. Test public API of each utility
2. Test error cases
3. Test browser API fallbacks
4. Test memory cleanup

**New Tests**: 40-50
**Estimated Effort**: 5-7 days

#### P2.2: Store Management (Priority: MEDIUM)

**Stores to Test**:
- `stores/data.ts` - Global app state
- `stores/navigation.ts` - Nav state
- `stores/pwa.ts` - PWA state
- `stores/dexie.ts` - DB integration

**Test Strategy**:
1. Test state mutations
2. Test subscriptions
3. Test effect side effects
4. Test state persistence

**New Tests**: 25-30
**Estimated Effort**: 3-4 days

#### P2.3: Complex Components (Priority: MEDIUM)

**Components to Test**:
- VirtualList (full suite)
- Table (sorting, filtering)
- Pagination
- Dropdown, Tooltip

**New Tests**: 35-40
**Estimated Effort**: 4-5 days

**Phase 2 Total**: 100-120 tests, 12-16 days

---

### Phase 3: Integration & WASM (Weeks 5-6)

**Focus**: System integration
**Target**: +25% coverage (to 69%)
**Tests to Write**: 90-110

#### P3.1: WASM Integration (Priority: CRITICAL)

**WASM Files to Test**:
- `wasm/bridge.ts` - WASM bridge
- `wasm/transform.ts` - Data transformation
- `wasm/queries.ts` - WASM queries
- `wasm/serialization.ts` - Data serialization

**Test Strategy**:
1. Mock WASM module
2. Test data flowing through bridge
3. Test error handling
4. Test performance

**New Tests**: 35-45
**Estimated Effort**: 4-5 days

#### P3.2: Visualization Components (Priority: MEDIUM)

**Components to Test**:
- TransitionFlow, GapTimeline, SongHeatmap
- RarityScorecard, GuestNetwork

**Test Strategy**:
1. Mock D3 library
2. Test data transformation
3. Test rendering
4. Test interactions

**New Tests**: 25-30
**Estimated Effort**: 3-4 days

#### P3.3: Error & Edge Cases (Priority: MEDIUM)

**Scenarios to Test**:
- Network failures
- Invalid data
- Boundary conditions
- Race conditions
- Memory leaks

**New Tests**: 30-35
**Estimated Effort**: 3-4 days

**Phase 3 Total**: 90-110 tests, 10-13 days

---

### Phase 4: E2E & Infrastructure (Week 7+)

**Focus**: Automation & visibility
**Target**: Enable long-term quality
**Tests to Write**: 20-30 E2E tests

#### P4.1: Playwright E2E Tests

**Critical User Flows**:
1. Load app → view homepage → navigate to show
2. Search for song → view details → add to favorites
3. Offline mode → load cached data
4. Responsive layout on mobile

**New Tests**: 15-20 E2E scenarios
**Estimated Effort**: 5-7 days

#### P4.2: Infrastructure

**Setup**:
1. Coverage reporting (c8)
2. Coverage gates (>80%)
3. GitHub Actions workflow
4. Performance tracking
5. Accessibility scanning (axe-core)

**Estimated Effort**: 3-4 days

**Phase 4 Total**: 20-30 tests + infrastructure, 8-11 days

---

## Test File Structure to Create

```
src/__tests__/
├── fixtures/
│   ├── songs.ts          # Song test data
│   ├── venues.ts         # Venue test data
│   ├── shows.ts          # Show test data
│   └── users.ts          # User data
├── helpers/
│   ├── db.ts             # Database test utilities
│   ├── components.ts     # Component render helpers
│   ├── api.ts            # API mocking helpers
│   └── assertions.ts     # Custom matchers
├── mocks/
│   ├── wasm.ts           # WASM module mock
│   ├── d3.ts             # D3 mock
│   ├── indexeddb.ts      # IndexedDB mock
│   └── navigation.ts     # Navigation API mock
├── lib/
│   ├── db/
│   │   ├── dexie/
│   │   │   ├── init.test.ts
│   │   │   ├── sync.test.ts
│   │   │   ├── cache.test.ts
│   │   │   └── schema.test.ts
│   │   └── server/
│   │       ├── queries.test.ts
│   │       └── data-loader.test.ts
│   ├── stores/
│   │   ├── data.test.ts
│   │   ├── navigation.test.ts
│   │   ├── pwa.test.ts
│   │   └── dexie.test.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.test.ts
│   │   │   ├── Card.test.ts
│   │   │   ├── ErrorBoundary.test.ts
│   │   │   ├── VirtualList.test.ts
│   │   │   └── ...
│   │   ├── visualizations/
│   │   │   ├── TransitionFlow.test.ts
│   │   │   ├── GapTimeline.test.ts
│   │   │   └── ...
│   │   └── ...
│   ├── utils/
│   │   ├── navigation.test.ts
│   │   ├── persistent-storage.test.ts
│   │   ├── performance.test.ts
│   │   └── ...
│   └── wasm/
│       ├── bridge.test.ts
│       ├── transform.test.ts
│       └── ...
├── routes/
│   ├── index.test.ts
│   ├── shows.test.ts
│   ├── shows-detail.test.ts
│   ├── search.test.ts
│   └── ...
└── e2e/
    ├── user-flows.spec.ts
    ├── offline-mode.spec.ts
    └── responsive-layout.spec.ts
```

---

## Testing Best Practices to Follow

### 1. Database Tests

```typescript
// Use factories for consistent test data
const mockSong = createSong({ id: 1, title: 'Ants Marching' });

// Mock Dexie for unit tests
vi.mock('./db', () => ({
  getDb: () => mockDb
}));

// Test both success and failure paths
describe('Query', () => {
  it('should return data on success', async () => { });
  it('should handle errors gracefully', async () => { });
});
```

### 2. Component Tests

```typescript
// Use testing-library patterns
import { render } from '@testing-library/svelte';

// Test user behavior, not implementation
it('should submit form on button click', async () => {
  const { getByRole, getByLabelText } = render(Form);
  await userEvent.type(getByLabelText('Name'), 'John');
  await userEvent.click(getByRole('button', { name: /submit/i }));
  expect(mockOnSubmit).toHaveBeenCalled();
});
```

### 3. Route Tests

```typescript
// Load server data and render component
it('should load and display data', async () => {
  const data = await load({ params: { slug: 'test' } });
  const { container } = render(Page, { props: data });
  expect(container).toHaveTextContent('Expected Content');
});
```

### 4. E2E Tests

```typescript
// Test complete user flows
test('should search and view song details', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[placeholder="Search"]', 'Ants Marching');
  await page.click('text=Ants Marching');
  await expect(page).toHaveURL(/songs\/ants-marching/);
});
```

---

## Success Metrics

### Coverage Targets (by phase)

| Phase | Timeline | Target | Current | Gain |
|-------|----------|--------|---------|------|
| Current | Now | 4.3% | 4.3% | - |
| Phase 1 | Week 2 | 25% | 4.3% | +20% |
| Phase 2 | Week 4 | 45% | 25% | +20% |
| Phase 3 | Week 6 | 70% | 45% | +25% |
| Phase 4 | Week 8 | 85% | 70% | +15% |

### Test Count Targets

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Unit tests | ~60 | 250 | +190 |
| Component tests | 0 | 80 | +80 |
| Integration tests | 0 | 60 | +60 |
| E2E tests | 0 | 20 | +20 |
| **Total** | **~60** | **410** | **+350** |

### Quality Metrics

1. **Passing Tests**: 100% of tests pass (blocking failures)
2. **Code Coverage**: 85%+ line coverage
3. **Type Coverage**: 95%+ TypeScript coverage
4. **Flaky Tests**: <1% (investigate and fix)
5. **Test Execution Time**: <5 minutes full suite

---

## Quick Reference: Commands to Use

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test src/__tests__/lib/db/dexie/init.test.ts

# Generate coverage report
npm test -- --coverage

# Run E2E tests (after Phase 4)
npm run test:e2e

# Run Playwright tests with UI
npx playwright test --ui
```

---

## Conclusion

This roadmap provides a structured path to comprehensive test coverage in 8 weeks. The key is:

1. **Start with critical systems** (database, core components)
2. **Build test infrastructure** (factories, helpers, mocks)
3. **Incrementally expand coverage** (features, integration, E2E)
4. **Automate everything** (CI/CD, coverage gates, performance)

**Next Step**: Create GitHub issues for Phase 1 tasks and start Week 1.

**Owner**: QA Team
**Timeline**: 8 weeks
**Resources**: 1 FTE QA engineer
**Expected ROI**: 85%+ coverage, 70% fewer production bugs, confident releases
