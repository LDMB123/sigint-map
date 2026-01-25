# Badging API Usage Guide - DMB Almanac PWA

## Quick Start

The Badging API integration is **automatic**. No code changes needed in components. The badge updates automatically when:

1. User adds mutations while offline
2. Mutations are synced to server
3. Mutations fail and are retried
4. User manually deletes failed mutations

---

## How It Works

### Automatic Badge Updates

The offline mutation queue now automatically:

```typescript
// When mutation added
await queueMutation(url, method, body);
// Badge increments automatically

// When processing completes
const result = await processQueue();
// Badge updates automatically (clears if all synced)

// When cleanup happens
await clearCompletedMutations();
// Badge recalculated automatically

// When user deletes mutation
await deleteMutation(id);
// Badge decrements automatically
```

### No Additional Component Code Needed

Your existing mutation code continues to work:

```svelte
<script>
  import { addFavorite } from '$lib/services/favorites';

  async function toggleFavorite(songId: number) {
    // This automatically updates the badge
    await addFavorite(songId);
    // User sees badge on app icon
  }
</script>

<button onclick={() => toggleFavorite(123)}>
  Add to Favorites
</button>
```

---

## Real-World Scenarios

### Scenario 1: User Adds Favorite While Offline

```
Timeline:
┌─────────────────────────────────────────┐
│ User offline, in subway                 │
└─────────────────────────────────────────┘
                    ↓
        User taps "Add to Favorites"
                    ↓
    ┌──────────────────────────────────┐
    │ Badge shows "1" on app icon       │
    │ (mutation queued)                 │
    └──────────────────────────────────┘
                    ↓
        User exits app (badge stays visible)
                    ↓
    Arrives home, WiFi turns on
                    ↓
    ┌──────────────────────────────────┐
    │ Browser syncs mutation            │
    │ Badge updates in real-time        │
    │ "1" → (clears when complete)     │
    └──────────────────────────────────┘
```

### Scenario 2: Multiple Offline Mutations

```
Timeline:
┌─────────────────────────────────────────┐
│ User offline at concert                 │
└─────────────────────────────────────────┘
                    ↓
        User adds 3 favorite songs
                    ↓
    ┌──────────────────────────────────┐
    │ Badge shows "3" on app icon       │
    │ Mutation 1 queued → Badge: 1      │
    │ Mutation 2 queued → Badge: 2      │
    │ Mutation 3 queued → Badge: 3      │
    └──────────────────────────────────┘
                    ↓
        User goes online
                    ↓
    ┌──────────────────────────────────┐
    │ Processing starts                 │
    │ 3 mutations sent to server        │
    │ Badge: "3" → "2" → "1" → (clear) │
    └──────────────────────────────────┘
```

### Scenario 3: One Mutation Fails

```
Timeline:
┌─────────────────────────────────────────┐
│ User offline, adds 2 favorites          │
│ Badge shows "2"                         │
└─────────────────────────────────────────┘
                    ↓
        User comes online
                    ↓
    ┌──────────────────────────────────┐
    │ Processing:                       │
    │ Mutation 1: Success ✓             │
    │ Mutation 2: Fail (retry 1/3)     │
    │ Badge updates: "2" → "1"          │
    └──────────────────────────────────┘
                    ↓
        User goes offline again
                    ↓
    ┌──────────────────────────────────┐
    │ Badge shows "1" (pending retry)   │
    │ Reminds user there's failed work  │
    └──────────────────────────────────┘
```

### Scenario 4: User Deletes Failed Mutation

```
Timeline:
┌─────────────────────────────────────────┐
│ User sees failed mutation in UI          │
│ Badge shows "1"                         │
└─────────────────────────────────────────┘
                    ↓
        User taps "Delete" on failed item
                    ↓
    ┌──────────────────────────────────┐
    │ Mutation deleted from queue       │
    │ Badge clears automatically        │
    └──────────────────────────────────┘
```

---

## Browser Behavior

### Chrome/Android (Supported)

```
Before Badging API:
┌──────────┐
│ App Icon │  (no visual feedback)
└──────────┘

After Badging API:
┌──────────┐
│ App Icon │  ← Red dot with number
│  with "5"│     (5 pending mutations)
└──────────┘
```

**Badge appears in:**
- Home screen icon
- App drawer
- Recent apps view
- Notification shade

### iOS Safari (Not Supported)

```
Behavior: Gracefully degrades
- No badge displayed (Badging API not available)
- Mutations still sync normally
- Users see sync status in UI instead
```

### Desktop Chrome/Edge

```
Behavior: Supported
- Badge appears on Windows taskbar
- Badge visible on app icon
- Works in standalone mode
```

---

## Debugging

### Check Badge Support

```typescript
// In DevTools Console
console.log('Badge API available:', 'setAppBadge' in navigator);
// Output: true (Chrome 102+) or false
```

### Monitor Badge Updates

DevTools Console shows debug logs:

```
[Badge] Updated app badge: 1 pending mutations
[Badge] Updated app badge: 2 pending mutations
[Badge] Updated app badge: 1 pending mutations
[Badge] Cleared app badge
```

### Manual Badge Test

```typescript
// Set badge to 5
if ('setAppBadge' in navigator) {
  await navigator.setAppBadge(5);
}

// Clear badge
if ('clearAppBadge' in navigator) {
  await navigator.clearAppBadge();
}
```

### Check Queue Status

```typescript
// In DevTools Console
const stats = await window.__queue_service__.getQueueStats?.();
console.log('Queue stats:', stats);
// {
//   total: 3,
//   pending: 2,
//   retrying: 1,
//   failed: 0,
//   completed: 5,
//   oldestMutation: {...}
// }
```

---

## Implementation Details for Developers

### When Badge Updates

The badge is automatically updated in these situations:

1. **Mutation Added** (`queueMutation`)
   ```typescript
   // Called after adding to queue
   await updateAppBadge();
   // Badge increments
   ```

2. **Processing Complete** (`processQueue`)
   ```typescript
   // Called after batch processing
   await updateAppBadge();
   // Badge reflects remaining mutations
   ```

3. **Completed Cleared** (`clearCompletedMutations`)
   ```typescript
   // Called after cleanup
   await updateAppBadge();
   // Badge recalculated
   ```

4. **Mutation Deleted** (`deleteMutation`)
   ```typescript
   // Called after deletion
   await updateAppBadge();
   // Badge decrements
   ```

### Badge Count Logic

```typescript
const badgeCount = pending + retrying;

// Only active mutations count:
// - pending: Not yet attempted
// - retrying: Failed, waiting for next retry
// - NOT counted: completed, failed (max retries exceeded)

if (badgeCount > 0) {
  navigator.setAppBadge(badgeCount);
} else {
  navigator.clearAppBadge();
}
```

---

## Performance Notes

### Impact on Mutations

Badge updates are:
- **Non-blocking**: Don't delay mutation queueing/processing
- **Async**: Updates happen in background
- **Fast**: IndexedDB count queries < 1ms typically
- **Parallel**: Pending and retrying counts fetched simultaneously

### Database Queries

```typescript
// Two indexed queries run in parallel
Promise.all([
  db.offlineMutationQueue.where('status').equals('pending').count(),
  db.offlineMutationQueue.where('status').equals('retrying').count(),
])
// Both use 'status' index - very fast
```

### Resource Usage

- CPU: Negligible (< 1ms per update)
- Memory: Negligible (no storage)
- Network: None (local only)
- Battery: Negligible impact

---

## Testing

### Manual Test Steps

1. **Install PWA**
   ```bash
   npm run build && npm run preview
   # Open in Chrome
   # Click "Install app" in omnibox
   ```

2. **Go Offline**
   - DevTools > Network > "Offline" dropdown
   - Or physically disconnect WiFi

3. **Add Mutations**
   - Click "Add to Favorites" on any song
   - Repeat 2-3 times
   - Check app icon for badge

4. **Go Online**
   - Enable network again
   - Watch badge update in real-time
   - Should clear when sync complete

5. **Check Console**
   - DevTools > Console tab
   - Look for `[Badge]` log messages

### Automated Test Ideas

```typescript
// Test badge update on queue
const before = await navigator.getAppBadge?.();
await queueMutation(url, 'POST', body);
const after = await navigator.getAppBadge?.();
expect(after).toBe((before || 0) + 1);

// Test badge clear on complete
await processQueue();
const final = await navigator.getAppBadge?.();
expect(final).toBe(0);
```

---

## Troubleshooting

### Badge Not Showing

**Cause:** PWA not installed
- **Fix:** Install as PWA (Chrome omnibox > "Install app")

**Cause:** Browser doesn't support Badging API
- **Fix:** Use Chrome 102+, or use unsupported browser with graceful degradation

**Cause:** No pending mutations
- **Fix:** Add offline mutations to queue
- Check with: `navigator.getAppBadge?.()`

### Badge Shows Wrong Count

**Cause:** Queue has orphaned mutations
- **Fix:** Clear completed mutations
- ```typescript
  await clearCompletedMutations();
  ```

**Cause:** Count query out of sync
- **Fix:** Force badge update
- ```typescript
  // If helper exposed: window.__updateBadge?.()
  ```

### Badge Not Updating

**Cause:** Browser tab in background (Chrome throttles)
- **Fix:** Bring app to foreground, or wait for background sync

**Cause:** Badge updates in background
- **Fix:** This is expected - badge updates when mutations sync

---

## Best Practices

### For Users

1. **Check badge regularly** - Shows pending work
2. **Sync when online** - App syncs automatically
3. **Monitor badge** - Disappears when all synced

### For Developers

1. **Don't disable badge** - Provides valuable UX feedback
2. **Test on real device** - Badge only visible when installed
3. **Check console logs** - `[Badge]` messages show what's happening
4. **Handle errors gracefully** - Badge failures won't break mutations

### For Operations

1. **Monitor badge updates** - Shows offline activity
2. **Track failed mutations** - Badge indicates retry queue
3. **Alert users** - Badge reminds them to sync when online

---

## Summary

The Badging API integration:

✅ **Automatic** - No code changes needed
✅ **Non-blocking** - Doesn't affect mutation sync
✅ **Graceful** - Degrades on unsupported browsers
✅ **Visual** - Users see pending work at a glance
✅ **Real-time** - Updates as mutations sync
✅ **Native** - Uses PWA capabilities fully

The badge becomes the visual indicator for offline mutation status across the DMB Almanac PWA.
