# DMB Almanac PWA - Testing Guide

## Quick Start

### Running Tests

```bash
# Run all tests
npm run test

# Run with UI dashboard
npm run test:ui

# Run in watch mode
npm run test -- --watch

# Run specific test file
npm run test src/lib/wasm/transform.test.ts

# Run tests matching pattern
npm run test -- --grep "should aggregate"

# Run with coverage report
npm run test -- --coverage
```

## Test Files Overview

### 1. `/src/lib/wasm/transform.test.ts` (95+ tests)
Core WASM transformation pipeline tests.

**Key Areas:**
- Song/Venue/Tour/Show transformations
- Setlist entry transformation
- Data type conversions
- Search text generation
- Foreign key validation
- Large dataset handling (1000+ items)

**Run single file:**
```bash
npm run test src/lib/wasm/transform.test.ts
```

**Example test patterns:**
```typescript
// Test basic transformation
const result = await transformSongs([mockSongServer]);
expect(result.data[0].title).toBe('Crash Into Me');

// Test edge cases
const result = await transformSongs([]);
expect(result.data).toEqual([]);

// Test large datasets
const songs = Array.from({ length: 1000 }, (_, i) => ({
  ...mockSongServer,
  id: i,
}));
const result = await transformSongs(songs);
expect(result.data).toHaveLength(1000);
```

### 2. `/src/lib/db/dexie/query-helpers.test.ts` (120+ tests)
Database query abstraction layer tests.

**Key Areas:**
- Cached queries with TTL
- Year aggregation (sync and async)
- Top N queries with indexes
- Search with sorting
- Safe query execution
- Bulk operations with chunking
- Pagination and streaming
- Relationship queries

**Run single file:**
```bash
npm run test src/lib/db/dexie/query-helpers.test.ts
```

**Example test patterns:**
```typescript
// Test year aggregation
const items = [
  { year: 2024 },
  { year: 2024 },
  { year: 2023 },
];
const result = aggregateByYear(items);
expect(result[0]).toEqual({ year: 2024, count: 2 });

// Test chunking
await processInChunks(
  Array.from({ length: 30 }, (_, i) => i),
  async (chunk) => {
    // Process chunk
  },
  10 // chunk size
);

// Test caching
const result1 = await cachedQuery('key', 60000, queryFn);
const result2 = await cachedQuery('key', 60000, queryFn);
expect(queryFn).toHaveBeenCalledOnce();
```

### 3. `/src/lib/stores/data.test.ts` (35+ tests)
Svelte 5 reactive store tests.

**Key Areas:**
- Store structure and methods
- Progress tracking
- Initialization lifecycle
- Retry mechanism
- Subscriptions
- State consistency
- Error handling

**Run single file:**
```bash
npm run test src/lib/stores/data.test.ts
```

**Example test patterns:**
```typescript
// Test initialization
await dataStore.initialize();
expect(dataStore.isReady()).toBe(true);

// Test subscriptions
let status = '';
const unsub = dataStore.status.subscribe(s => {
  status = s;
});
await dataStore.initialize();
expect(status).toBe('ready');
unsub();

// Test progress tracking
let progress = 0;
dataStore.progress.subscribe(p => {
  progress = p.percentage;
});
// Progress updates from 0-100%
```

### 4. `/src/lib/utils/scheduler.test.ts` (50+ tests)
Scheduler API utilities for INP optimization.

**Key Areas:**
- Scheduler detection and fallback
- Yielding with priority levels
- Task execution with yielding
- Chunk processing
- Debouncing and throttling
- Idle task scheduling
- Time limit monitoring

**Run single file:**
```bash
npm run test src/lib/utils/scheduler.test.ts
```

**Example test patterns:**
```typescript
// Test yielding
await yieldToMain(); // Uses scheduler.yield() or setTimeout

// Test with priority
await yieldWithPriority('user-visible');

// Test task execution
const results = await runWithYielding([
  () => expensiveCalculation1(),
  () => expensiveCalculation2(),
]);

// Test chunk processing with progress
await processInChunks(
  items,
  async (item) => processItem(item),
  {
    chunkSize: 10,
    onProgress: (processed, total) => {
      console.log(`${processed}/${total}`);
    }
  }
);

// Test debouncing
const debounced = debounceScheduled(
  (query) => search(query),
  300
);
input.addEventListener('input', e => {
  debounced(e.target.value);
});
```

### 5. `/src/lib/components/ui/VirtualList.test.ts` (50+ tests)
Virtual list component tests.

**Key Areas:**
- Height calculations (fixed and dynamic)
- Virtualization and visible range
- Keyboard navigation
- Scroll positioning
- Accessibility attributes
- Performance optimizations
- Edge cases

**Example test patterns:**
```typescript
// Test height calculation
const totalHeight = itemHeight * itemCount;
expect(totalHeight).toBe(5000);

// Test visible range with overscan
const startIndex = 10;
const overscan = 3;
const visibleStart = Math.max(0, startIndex - overscan);
expect(visibleStart).toBe(7);

// Test navigation
if (focusedIndex < itemCount - 1) {
  focusedIndex++;
}
expect(focusedIndex).toBe(1);

// Test accessibility
expect(role).toBe('list');
expect(ariaSetsize).toBe(100);
expect(ariaPosinset).toBe(1);
```

### 6. `/src/lib/components/visualizations/LazyVisualization.test.ts` (65+ tests)
Lazy visualization loading component tests.

**Key Areas:**
- Component path resolution
- Loading states
- Error handling
- Props management
- Component lifecycle
- UI rendering
- Performance characteristics

**Example test patterns:**
```typescript
// Test component path mapping
const componentPath = 'TransitionFlow';
const modulePath = moduleMap[componentPath];
expect(modulePath).toBe('./TransitionFlow.svelte');

// Test loading state transitions
let isLoading = true;
isLoading = false;
expect(isLoading).toBe(false);

// Test error handling
const error = 'Failed to load visualization';
expect(error).toBeTruthy();

// Test props passing
const data = [{ id: 1, value: 100 }];
const width = 800;
const height = 600;
expect(width).toBeGreaterThan(0);
```

## Test Organization

### Describe Blocks
Tests are organized using nested `describe` blocks:

```typescript
describe('Module Name', () => {
  describe('Feature Area', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = action(input);

      // Assert
      expect(result).toBe(...);
    });
  });
});
```

### Test Naming Convention
- Use descriptive test names starting with "should"
- Be specific about the behavior being tested
- Include edge cases in descriptions

```typescript
it('should handle empty arrays without error')
it('should convert boolean fields from 0/1 values')
it('should clamp year to current year at maximum')
```

## Mocking Patterns

### Mocking Modules
```typescript
vi.mock('./cache', () => ({
  getQueryCache: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));
```

### Mocking Functions
```typescript
const mockFn = vi.fn();
mockFn.mockResolvedValue({ data: [] });
mockFn.mockRejectedValue(new Error('Failed'));
```

### Spy on Functions
```typescript
const consoleSpy = vi.spyOn(console, 'log');
// Test code
expect(consoleSpy).toHaveBeenCalled();
consoleSpy.mockRestore();
```

## Writing New Tests

### Test Template
```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
    vi.clearAllMocks();
  });

  it('should do something', () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = processInput(input);

    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

### Best Practices
1. **One assertion per test** or **related assertions**
   - Tests should be focused and readable
   - Group related assertions logically

2. **Descriptive test names**
   - Test name should explain what's being tested
   - Include the condition being tested

3. **Use fixtures**
   - Create reusable test data
   - Keep fixtures at the top of test files

4. **Mock at boundaries**
   - Mock external dependencies (API, database)
   - Don't mock the code you're testing

5. **Test edge cases**
   - Empty arrays
   - Null/undefined values
   - Large datasets
   - Boundary conditions

## Coverage Reports

### Generate Coverage
```bash
npm run test -- --coverage
```

### Coverage Files
- HTML reports: `coverage/`
- Coverage summary in terminal output

### Coverage Targets (by module)
- **transform.test.ts**: 95% (statements, branches, functions)
- **query-helpers.test.ts**: 85%
- **data.test.ts**: 80%
- **scheduler.test.ts**: 75%
- **VirtualList.test.ts**: 90%
- **LazyVisualization.test.ts**: 85%

## Debugging Tests

### Debug Single Test
```bash
npm run test -- --inspect-brk src/lib/wasm/transform.test.ts
```

### Use Debug Output
```typescript
console.log('Debug info:', value);
console.debug('Detailed debugging');
```

### Check Test Output
```bash
npm run test -- --reporter=verbose
```

## Common Issues & Solutions

### Issue: Tests timing out
**Solution:**
- Check for unresolved promises
- Increase timeout: `it('...', async () => {...}, 10000)`
- Verify mocks are properly configured

### Issue: Mock not working
**Solution:**
- Ensure mock is defined before import
- Check vi.mock() is at top level
- Verify mock path matches import path

### Issue: State not updating
**Solution:**
- Use `vi.clearAllMocks()` in afterEach
- Reset store state between tests
- Ensure async operations complete

### Issue: Flaky tests
**Solution:**
- Avoid time-dependent assertions
- Mock time with `vi.useFakeTimers()`
- Use `vi.runAllTimers()` to advance time
- Properly clean up timers in afterEach

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Commits to main branch
- Pre-commit hooks (if configured)

### GitHub Actions Example
```yaml
- name: Run tests
  run: npm run test

- name: Generate coverage
  run: npm run test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Performance Considerations

### Test Execution Time
- All tests should complete in < 5 seconds
- Individual test should complete in < 100ms
- If slower, consider:
  - Reducing test data size
  - Mocking expensive operations
  - Splitting into multiple tests

### Memory Usage
- Tests run in parallel by default
- Each test worker has isolated memory
- Use `beforeEach` to reset mutable state

## Maintaining Tests

### Regular Maintenance
1. **Review test coverage quarterly**
   - Identify untested code paths
   - Add tests for new features

2. **Update fixtures**
   - Keep mock data current with schema changes
   - Add new test cases for bug fixes

3. **Refactor tests**
   - Remove duplicate test setup
   - Extract common patterns

4. **Performance optimization**
   - Profile slow tests
   - Reduce unnecessary mocking

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Svelte Testing](https://svelte.dev/docs#testing)

### Related Files
- `vite.config.ts` - Vitest configuration
- `src/lib/utils/test-setup.ts` - Global test setup
- `.eslintrc` - Linting rules for tests

## Questions?

For test-related questions:
1. Check existing test examples
2. Review test patterns in similar files
3. Refer to Vitest documentation
4. Ask in team discussions
