# IndexedDB Error Handling - Quick Reference Guide

## Critical Issues at a Glance

### 🔴 CRITICAL - Implement Immediately

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| **No Quota Management** | queries.ts, sync.ts, data-loader.ts | Data loss on quota exceeded | 8 hrs |
| **No Cross-Tab Sync** | Missing file | Data corruption across tabs | 6 hrs |
| **No Graceful Degradation** | Throughout | Poor UX in failures | 4 hrs |

### 🟠 HIGH - Implement Soon

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| Transaction retry logic | db.ts, queries.ts | Aborted transactions fail | 4 hrs |
| Network backoff retry | data-loader.ts, sync.ts | Failed syncs crash app | 4 hrs |
| Error telemetry | Missing file | Can't monitor issues | 3 hrs |

### 🟡 MEDIUM - Implement Later

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| Upsert pattern | stores/dexie.ts | Performance issue | 2 hrs |
| Foreign key cleanup | data-loader.ts | Data corruption risk | 2 hrs |
| Auto-recovery migrations | db.ts | Manual restart needed | 3 hrs |

---

## File Changes Summary

### New Files to Create (18 hours)

```
src/lib/db/dexie/quota-manager.ts        (120 lines, 8 hrs)
src/lib/db/dexie/cross-tab-sync.ts       (100 lines, 6 hrs)
src/lib/db/dexie/error-handlers.ts       (140 lines, 6 hrs)
src/lib/utils/dexie-telemetry.ts         (80 lines, 3 hrs)
```

### Existing Files to Modify (24 hours)

```
src/lib/db/dexie/db.ts                   (900 lines, 4 hrs)
src/lib/stores/dexie.ts                  (1842 lines, 4 hrs)
src/lib/db/dexie/queries.ts              (1587 lines, 6 hrs)
src/lib/db/dexie/data-loader.ts          (1500+ lines, 4 hrs)
src/lib/db/dexie/sync.ts                 (850+ lines, 4 hrs)
src/lib/db/dexie/init.ts                 (732 lines, 2 hrs)
```

---

## Error Handling Checklist

### QuotaExceededError

- [ ] Add quota-manager.ts with estimate tracking
- [ ] Add quota checks before bulk operations
- [ ] Implement partial success for bulkInsert* functions
- [ ] Add quota cleanup trigger on quota pressure
- [ ] User notification on quota warning (80%)
- [ ] User notification on quota critical (95%)

### Cross-Tab Mutations

- [ ] Create cross-tab-sync.ts with BroadcastChannel
- [ ] Update userAttendedShows store to broadcast
- [ ] Update userFavoriteSongs store to broadcast
- [ ] Update userFavoriteVenues store to broadcast
- [ ] Subscribe to mutations from other tabs
- [ ] Invalidate caches on remote mutations
- [ ] Test with 2+ browser windows

### Transaction Recovery

- [ ] Add error-handlers.ts with recovery strategies
- [ ] Implement retry wrapper for transactions
- [ ] Add exponential backoff for retries
- [ ] Handle TransactionInactiveError
- [ ] Handle AbortError
- [ ] Handle TimeoutError
- [ ] Max retries: 2-3 per error type

### Network Resilience

- [ ] Add backoff retry to data-loader.ts fetch
- [ ] Add backoff retry to sync.ts requests
- [ ] Backoff sequence: [100ms, 500ms, 2000ms]
- [ ] Max retries: 3
- [ ] Graceful failure message

### Monitoring

- [ ] Create dexie-telemetry.ts
- [ ] Track error counts by type
- [ ] Track recovery success rate
- [ ] Track quota usage trend
- [ ] Export metrics to dashboard
- [ ] Set up alerts for anomalies

---

## Code Snippets (Copy-Paste Ready)

### Quota Check Before Write
```typescript
const estimate = await navigator.storage.estimate();
const canFit = estimate.available > sizeBytes * 1.2;
if (!canFit) {
  throw new Error('Insufficient storage quota');
}
```

### Broadcast Tab Mutation
```typescript
crossTabSync.broadcast({
  type: 'attended-show-added',
  data: { showId: 123 }
});
```

### Listen for Cross-Tab Mutations
```typescript
const unsubscribe = crossTabSync.subscribe((mutation) => {
  if (mutation.type === 'attended-show-added') {
    invalidateUserDataCaches();
  }
});
```

### Retry with Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  backoffMs = [100, 500, 2000]
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, backoffMs[i]));
      }
    }
  }
  throw lastError;
}
```

### Partial Success Pattern
```typescript
return {
  successful: insertedCount,
  failed: shows.length - insertedCount,
  errors: failureList,
  recoverable: quotaExceeded
};
```

---

## Testing Commands

```bash
# Run error handling tests (when created)
npm test -- error-handling.test.ts

# Run cross-tab tests
npm test -- cross-tab-sync.test.ts

# Run quota management tests
npm test -- quota-manager.test.ts

# Run all db tests
npm test -- db/dexie/

# E2E test with 2 windows
npm run test:e2e:multi-window
```

---

## Monitoring Dashboard

### Key Metrics to Display

1. **Error Rate**
   ```
   Total errors: 234 (last 24h)
   By type:
   - QuotaExceededError: 12
   - TransactionAbort: 8
   - VersionError: 1
   ```

2. **Quota Status**
   ```
   Usage: 85.2% (425MB / 500MB)
   Trend: +5% since yesterday
   Alert: Approaching critical
   ```

3. **Cross-Tab Sync**
   ```
   Mutations synced: 156 (last 24h)
   Avg sync latency: 45ms
   Failed syncs: 0
   ```

4. **Recovery Success**
   ```
   Auto-retried: 34 ops
   Succeeded: 32 (94%)
   Failed: 2 (6%)
   ```

---

## FAQ

**Q: How much data can be stored?**
A: Typically 50MB-500MB depending on browser. Use quotaManager.getEstimate() to check.

**Q: What if IndexedDB isn't available?**
A: Fall back to server API only. Currently unimplemented - add to Phase 3.

**Q: How do I prevent quota exceeded?**
A: Check quota before writes with quotaManager.canAccommodate(), return partial success.

**Q: What happens if one tab upgrades version?**
A: Other tabs receive versionchange event, close connection, dispatch dexie-version-change event.

**Q: How do I sync mutations across tabs?**
A: Use crossTabSync.broadcast() to send, subscribe() to receive. Implemented in Phase 2.

**Q: What's the recovery strategy for transaction abort?**
A: Retry with exponential backoff: [100ms, 500ms, 2000ms]. Max 3 retries.

---

## Rollout Plan

### Week 1: Foundation
- [ ] Day 1-2: quota-manager.ts
- [ ] Day 2-3: error-handlers.ts
- [ ] Day 3-4: cross-tab-sync.ts
- [ ] Day 5: Code review + merge

### Week 2: Integration
- [ ] Day 1: Update stores/dexie.ts
- [ ] Day 2: Update queries.ts bulkInsert* functions
- [ ] Day 3: Update sync.ts and data-loader.ts
- [ ] Day 4-5: Testing + bug fixes

### Week 3: Polish
- [ ] Day 1-2: dexie-telemetry.ts
- [ ] Day 3-4: Comprehensive testing
- [ ] Day 5: Documentation + QA review

---

## Success Criteria

✅ All QuotaExceededErrors result in graceful feedback
✅ Cross-tab mutations sync within 100ms
✅ 95%+ of retryable errors recover automatically
✅ Storage quota warning at 80%, critical at 95%
✅ No silent failures - all errors visible to users
✅ Comprehensive error telemetry available
✅ E2E tests pass for quota, retry, and cross-tab scenarios

---

## Contact & Questions

**For detailed implementation**: See INDEXEDDB_REMEDIATION_ROADMAP.md
**For full analysis**: See INDEX_DB_ERROR_HANDLING_ANALYSIS.md
**For audit details**: See INDEXEDDB_AUDIT_SUMMARY.txt

Generated: 2026-01-23
