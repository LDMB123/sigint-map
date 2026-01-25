# Async Pattern Fixes - Implementation Checklist

## Priority 1: Critical Issues (Fix Now)

### Issue 1.1: User Store Silent Initialization Failures
**Files Affected:**
- [ ] `/src/lib/stores/dexie.ts` Line 789-796 (userAttendedShows)
- [ ] `/src/lib/stores/dexie.ts` Line 883-890 (userFavoriteSongs)
- [ ] `/src/lib/stores/dexie.ts` Line 968-974 (userFavoriteVenues)

**What To Do:**
1. Add initialization state to each store (initialized: boolean, error: Error | null)
2. Expose state through derived store or separate status observable
3. Modify `.add()`, `.remove()`, `.toggle()` methods to check initialization status
4. Throw clear error if store not ready: `throw new Error('User data store not initialized')`

**Verification:**
```typescript
// Test that uninitialized store throws on write
try {
    await userAttendedShows.add(1);
    fail('Should throw');
} catch (e) {
    expect(e.message).toContain('not initialized');
}
```

**Estimated Effort:** 30 minutes (3 files, similar fix)

---

## Priority 2: High-Risk Issues (Fix This Week)

### Issue 2.1: Missing AbortController in Data Loader
**File Affected:**
- [ ] `/src/lib/db/dexie/data-loader.ts` Lines 1200-1246

**What To Do:**
1. Add `signal?: AbortSignal` parameter to `loadInitialData()`
2. Create internal `AbortController` with 60s timeout
3. Pass signal to `fetchJsonData()` (update signature)
4. Pass signal through `fetch()` calls
5. Check `signal.aborted` after fetch phase
6. Cleanup timeout in finally block

**Verification:**
```typescript
// Test that abort cancels fetches
const controller = new AbortController();
const promise = loadInitialData(undefined, {}, controller.signal);
setTimeout(() => controller.abort(), 50);

try {
    await promise;
    fail('Should abort');
} catch (e) {
    expect(e.name).toBe('AbortError');
}
```

**Estimated Effort:** 45 minutes

---

### Issue 2.2: Global Search DB Initialization Race
**File Affected:**
- [ ] `/src/lib/stores/dexie.ts` Lines 1520-1595

**What To Do:**
1. Add `let dbReady = false` before isBrowser check
2. Call `getDb().then(() => { dbReady = true })` before query subscription
3. Inside query subscription, check `if (!dbReady) return` early exit
4. Consider showing "database initializing" state during startup

**Verification:**
```typescript
// Test early search doesn't crash
const store = createGlobalSearchStore();
store.setQuery('test');
await new Promise(r => setTimeout(r, 100)); // Search fires
// Should not throw and should wait for DB
```

**Estimated Effort:** 20 minutes

---

### Issue 2.3: Navigation Promise Error Handling
**File Affected:**
- [ ] `/src/lib/utils/navigationApi.ts` Lines 680-690

**What To Do:**
1. Change `Promise.all()` to `Promise.allSettled()`
2. Add result checking for both dataResult and navResult
3. Log failures but don't reject entire operation
4. Allow navigation to complete even if data fails

**Verification:**
```typescript
// Test navigation succeeds even if data fails
const rejectData = () => Promise.reject(new Error('Data failed'));
const acceptNav = () => Promise.resolve();

await parallelDataAndNavigation('/url', rejectData, {});
// Should not throw
// Should have completed navigation
```

**Estimated Effort:** 15 minutes

---

## Priority 3: Medium-Risk Issues (Fix When Time Permits)

### Issue 3.1: Remove Stale Closure Pattern
**File Affected:**
- [ ] `/src/lib/stores/dexie.ts` Line 594-595

**What To Do:**
1. Extract `getShowsForSong()` call outside Promise.all
2. Use Promise.resolve() wrapper or separate await
3. Cleaner async/await pattern

**Before:**
```typescript
const [performanceShows, entries] = await Promise.all([
    getShowsForSong(song.id).then((shows) => shows.slice(0, 10)),
    db.setlistEntries.where('songId').equals(song.id).toArray()
]);
```

**After:**
```typescript
const [performanceShows, entries] = await Promise.all([
    getShowsForSong(song.id).then(shows => Promise.resolve(shows.slice(0, 10))),
    db.setlistEntries.where('songId').equals(song.id).toArray()
]);
// OR even better:
const performanceShows = await getShowsForSong(song.id);
const entries = await db.setlistEntries.where('songId').equals(song.id).toArray();
```

**Estimated Effort:** 10 minutes

---

### Issue 3.2: File Handler Timeout
**File Affected:**
- [ ] `/src/lib/utils/fileHandler.ts` Lines 73-78

**What To Do:**
1. Add AbortController with 10s timeout to Promise.all
2. Wrap in try/catch for AbortError
3. Call controller.abort() in timeout

**Estimated Effort:** 15 minutes

---

### Issue 3.3: Transaction Isolation Review
**File Affected:**
- [ ] `/src/lib/db/dexie/db.ts` Lines 481-499

**What To Do:**
1. Test concurrent mutations on user tables under load
2. If conflicts occur, consider sequential writes:
   ```typescript
   // Instead of Promise.all()
   for (const operation of [...operations]) {
       await operation();
   }
   ```
3. Document transaction isolation behavior

**Estimated Effort:** 30 minutes (mostly testing)

---

## Testing Plan

### Unit Tests to Add

```typescript
// tests/stores/dexie.test.ts
describe('User Data Stores', () => {
    test('userAttendedShows handles init failure gracefully', async () => {
        // Mock getDb to reject
        // Verify store is in error state
    });

    test('userFavoriteSongs prevents writes before init', async () => {
        // Verify error thrown on premature write
    });

    test('userFavoriteVenues shows initialization status', async () => {
        // Verify consumer can check if ready
    });
});

// tests/stores/search.test.ts
describe('Global Search Store', () => {
    test('waits for database initialization before searching', async () => {
        // Mock slow DB init (500ms)
        // User types at 100ms
        // Verify search waits for DB
    });

    test('handles concurrent search queries correctly', async () => {
        // Multiple rapid searches
        // Only latest results shown
        // No memory leaks
    });
});

// tests/utils/navigationApi.test.ts
describe('Navigation Utilities', () => {
    test('completes navigation even if data load fails', async () => {
        const rejectData = () => Promise.reject(new Error('Fail'));
        const acceptNav = () => Promise.resolve();

        expect(
            parallelDataAndNavigation('/url', rejectData)
        ).resolves.not.toThrow();
    });
});

// tests/db/data-loader.test.ts
describe('Data Loader', () => {
    test('respects abort signal to cancel fetches', async () => {
        const controller = new AbortController();
        const promise = loadInitialData(undefined, {}, controller.signal);

        setTimeout(() => controller.abort(), 50);

        await expect(promise).rejects.toThrow();
    });

    test('cleans up timeout on completion', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
        await loadInitialData();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});
```

### Integration Tests

```typescript
// tests/integration/cold-start.test.ts
describe('App Cold Start', () => {
    test('initializes without user data store errors', async () => {
        const app = await renderApp();
        await waitFor(() => expect(app.initialized).toBe(true));

        // Verify no console errors
        expect(console.error).not.toHaveBeenCalled();
    });

    test('handles rapid user interaction during init', async () => {
        const app = await renderApp();

        // User types in search before DB ready
        app.typeInSearch('Test');

        // Should not crash
        await waitFor(() => expect(app.searchResults).toBeDefined());
    });
});

// tests/integration/navigation.test.ts
describe('Navigation During Data Load', () => {
    test('cancels data load when user navigates away', async () => {
        const app = await renderApp();
        app.navigate('/songs');

        // Immediately navigate away
        setTimeout(() => app.navigate('/home'), 50);

        // Verify no orphaned requests
        await waitFor(() => {
            expect(getOpenRequestCount()).toBe(0);
        });
    });
});
```

---

## Code Review Checklist

For each fix, verify:

- [ ] Error messages are clear and actionable
- [ ] No silent failures (all errors logged or propagated)
- [ ] Timeout cleanup happens in finally blocks
- [ ] AbortController signals properly propagated
- [ ] No promise fire-and-forget patterns
- [ ] Initialization state exposed to consumers
- [ ] Memory leaks prevented (cleanup functions registered)
- [ ] Tests cover success and error cases
- [ ] TypeScript strict mode compliance
- [ ] No `// @ts-ignore` comments introduced

---

## Deployment Checklist

### Before Deploying
- [ ] All tests passing locally
- [ ] No console errors in dev
- [ ] Load testing with slow network
- [ ] Stress test: 10 concurrent mutations
- [ ] Browser DevTools: Memory growth test (5 minute load)

### After Deploying
- [ ] Monitor error reporting for new patterns
- [ ] Check user data sync errors in logs
- [ ] Verify search functionality works
- [ ] Monitor network request patterns

---

## Monitoring & Observability

### Metrics to Add
```typescript
// Track store initialization failures
recordInitFailure('userAttendedShows', error);

// Track search database waits
recordMetric('search.db_wait_time', dbReadyTime);

// Track navigation timeouts
recordMetric('navigation.data_load_timeout', true);
```

### Alerting Rules
```yaml
- name: UserStoreInitFailure
  threshold: 5 errors per minute
  action: Page alert + email engineer

- name: DataLoaderTimeout
  threshold: 2 timeouts per hour
  action: Log to dashboard

- name: SearchDBRaceCondition
  threshold: Any null results
  action: Log pattern for analysis
```

---

## Implementation Timeline

| Priority | Issue | Est. Hours | Target Date |
|----------|-------|-----------|------------|
| P1 | User store failures | 0.5 | This week |
| P1 | Data loader abort | 0.75 | This week |
| P1 | Global search race | 0.33 | This week |
| P1 | Navigation error handling | 0.25 | This week |
| **P1 Total** | **4 Issues** | **1.83 hours** | |
| P2 | Stale closure pattern | 0.17 | Next week |
| P2 | File handler timeout | 0.25 | Next week |
| P2 | Transaction isolation | 0.5 | Next week |
| **P2 Total** | **3 Issues** | **0.92 hours** | |
| **Total** | **7 Issues** | **2.75 hours** | |

---

## Questions for Code Review

1. **User Store Initialization:**
   - Should we retry failed initializations or fail permanently?
   - Should we expose initialization state through UI?

2. **Data Loader Abortion:**
   - Should cancelled loads be retryable?
   - What's the user experience when load is cancelled?

3. **Navigation Timing:**
   - What timeout should data load have (30s? 60s)?
   - What happens if navigation completes but data fails?

4. **Testing Environment:**
   - Can we simulate slow DB initialization in tests?
   - Can we mock network timeouts reliably?

---

## Resources

### Reading
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Promise.allSettled vs Promise.all](https://javascript.info/promise-api)
- [Dexie Transactions](https://dexie.org/docs/Dexie/Dexie.transaction())
- [Svelte 5 $effect](https://svelte.dev/docs/svelte-5-runes#effect)

### Tools
- Chrome DevTools → Performance → Slow 3G simulation
- Lighthouse → Network throttling profiles
- `navigator.onLine` event monitoring

---

## Sign-Off

Once all Priority 1 fixes are complete and tested:
- [ ] Product Owner approval
- [ ] QA sign-off
- [ ] Code review by senior engineer
- [ ] Deploy to staging
- [ ] 24-hour monitoring window
- [ ] Deploy to production

