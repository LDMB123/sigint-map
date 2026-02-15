# Troubleshooting Guide

**For Parents & Caregivers**

---

## Common Issues

### Reflection Prompt Not Appearing

**Symptoms:** Child logs kind act, but "Why was that kind?" prompt never shows

**Causes:**
1. Another prompt already visible (emotion check-in or previous reflection)
2. App minimized/backgrounded during 3-second delay
3. Browser tab not active

**Fixes:**
- Wait for any existing prompts to close first
- Keep app visible and active for 3 seconds after logging act
- Refresh page if issue persists

**Prevention:** App checks for existing prompts before showing new ones (P1 fix applied)

---

### Story Moments Missing

**Symptoms:** Reflection prompt appears, child responds, but Sparkle doesn't tell story

**Causes:**
1. Reflection skipped too quickly (timeout race condition)
2. Network interruption during story fetch

**Fixes:**
- Wait 2 seconds after responding to reflection
- Check that WiFi/network is stable (app works offline, but initial load requires connection)

**Prevention:** Timeout cleanup system prevents orphaned stories (P1 fix applied)

---

### Emotion Check-In Stuck

**Symptoms:** Emotion grid appears but tapping buttons does nothing

**Causes:**
1. Rapid tapping triggered debounce protection
2. Event listener memory leak (older versions)

**Fixes:**
- Wait 300ms between taps
- Force refresh page (swipe down on Safari)
- Update to latest version if using older build

**Prevention:** 300ms debounce prevents duplicate saves (P1 fix applied)

---

### Data Not Saving (Offline)

**Symptoms:** Child completes reflections/emotions, but data missing in Mom Mode

**Causes:**
1. OPFS storage quota exceeded
2. Offline queue not processing writes
3. Browser cleared storage

**Fixes:**
- Check Safari Settings → Website Data → Remove old data
- Ensure app has storage permissions
- Verify Mom Mode shows correct week (data may be in different week)

**Prevention:** Offline queue retries failed writes automatically (P0 fix applied)

---

### Wrong Category Stories

**Symptoms:** Logged Hug, but Sparkle tells story about Sharing

**Causes:**
1. Category not captured correctly during reflection (older versions)
2. DOM state race condition

**Fixes:**
- Update to latest version (v0.2+ has fix)
- Refresh page and retry

**Prevention:** Category captured immediately from DOM, not via function (P0 fix applied)

---

### App Memory Leak / Slow Performance

**Symptoms:** App gets slower over time, iPad feels sluggish after 30+ acts logged

**Causes:**
1. Event listeners not cleaned up (older versions)
2. Timeout handles accumulating
3. DOM nodes not removed

**Fixes:**
- Force close Safari and reopen
- Clear browser cache (Settings → Safari → Clear History and Website Data)
- Update to latest version

**Prevention:** Event delegation + timeout cleanup on page unload (P1 fix applied)

---

### Duplicate Emotion Saves

**Symptoms:** Tapped "Happy" once, but database shows 3 selections

**Causes:**
1. Rapid multi-tap before debounce implemented
2. Network retry duplicating requests

**Fixes:**
- Single tap only, wait for toast confirmation
- Check database directly via Mom Mode analytics

**Prevention:** 300ms debounce on emotion taps (P1 fix applied)

---

### Parent Insights Missing Emotion Data

**Symptoms:** Mom Mode shows "No emotion data this week" despite child selecting emotions

**Causes:**
1. Reflection data saved but emotion column is NULL
2. Cache corrupted (JSON deserialization failure)
3. Wrong week selected

**Fixes:**
- Verify correct week in Mom Mode (swipe to navigate weeks)
- Check Safari console for cache warnings
- Manually recalculate insights (toggle to different week, then back)

**Prevention:** Cache corruption triggers recalculation, not empty display (P2 QA fix applied)

---

## Advanced Troubleshooting

### Safari Web Inspector

**Enable:**
1. Settings → Safari → Advanced → Web Inspector (ON)
2. Connect iPad to Mac via cable
3. Mac: Open Safari → Develop → [iPad Name] → Blaire's Kind Heart

**Useful Tabs:**
- **Console:** See error/warning logs
- **Storage:** Inspect SQLite database (OPFS)
- **Network:** Check offline queue status
- **Timelines → Memory:** Monitor for leaks

---

### Database Inspection

**Access via Console:**
```javascript
// Check kind_acts table
await window.db.query("SELECT * FROM kind_acts ORDER BY created_at DESC LIMIT 10");

// Verify reflection data
await window.db.query("SELECT id, category, reflection_type, emotion_selected FROM kind_acts WHERE reflection_type IS NOT NULL");

// Check weekly insights cache
await window.db.query("SELECT * FROM weekly_insights");
```

---

### Clear All Data (Reset)

**WARNING:** This deletes ALL progress, acts, quests, rewards

**Steps:**
1. Safari → Settings → Website Data
2. Find `localhost:8080` or app domain
3. Swipe left → Delete
4. Refresh app
5. Database rebuilds from scratch

---

## Known Limitations

### Safari 26.2 Required

**Issue:** App uses Safari 26.2-specific APIs (Popover, Navigation API, View Transitions)

**Impact:** Will not work on older Safari versions or other browsers

**Workaround:** Update iPad to iPadOS 26.2 or later

---

### Offline-First Constraints

**Issue:** App works 100% offline AFTER initial load, but first visit requires network

**Impact:** Cannot use app in airplane mode on first launch

**Workaround:** Load app once with WiFi, then works offline indefinitely

---

### Single User Only

**Issue:** App designed for one child per device

**Impact:** Multiple siblings sharing iPad will see mixed data in Mom Mode

**Workaround:** Use separate iPad profiles (if available) or separate devices

---

### No Cloud Sync

**Issue:** Data stored locally on iPad only

**Impact:** Switching iPads loses progress

**Workaround:** No current workaround (future: iCloud sync via CloudKit)

---

## Getting Help

### Reporting Bugs

**Include:**
1. iPad model and iPadOS version
2. Safari version (Settings → Safari → About)
3. Steps to reproduce issue
4. Safari console logs (if possible)
5. Screenshot or screen recording

**Where to Report:**
- GitHub Issues: `blaires-kind-heart/issues`
- Email: [support email]

---

### Feature Requests

**Ideas Welcome:**
- Emotion tier unlocking
- Voice-recorded reflections
- Gratitude journal
- Sibling collaboration mode
- iCloud sync

**Submit via:**
- GitHub Discussions: `blaires-kind-heart/discussions`

---

## Changelog

### v0.2.0 (2026-W06)
- ✅ Fixed category story mismatch (P0)
- ✅ Fixed timeout race conditions (P1)
- ✅ Fixed event listener memory leaks (P1)
- ✅ Added offline queue for reflections/emotions (P0)
- ✅ Added emotion validation (P0)
- ✅ Added debouncing for emotion taps (P1)
- ✅ Fixed cache corruption recovery (P2)
- ✅ Removed duplicate database fields (P2)

### v0.1.0 (2026-W05)
- Initial release with reflection system
- 10 dynamic reflection prompts
- Story moments (5 per category)
- 16-emotion vocabulary system
- Parent insights dashboard

---

## Emergency Recovery

### App Won't Load

1. Force quit Safari (swipe up from bottom, swipe Safari away)
2. Reopen Safari
3. Navigate to app URL
4. If still broken: Clear website data (see "Clear All Data" above)

### Database Corrupted

1. Open Safari Web Inspector Console
2. Run: `await window.db.exec("PRAGMA integrity_check");`
3. If returns errors: Clear website data and restart
4. Data will be lost (no recovery without backup)

### Infinite Loading

1. Check network connection
2. Disable WiFi, re-enable WiFi
3. Force refresh: Cmd+Shift+R (if using Safari on Mac)
4. Clear cache: Settings → Safari → Clear History

---

## Performance Optimization

### If App Feels Slow

1. Close other Safari tabs
2. Restart Safari entirely
3. Check iPad storage (Settings → General → iPad Storage)
4. Ensure ≥2GB free space for OPFS

### If Animations Lag

1. Reduce Motion: Settings → Accessibility → Motion → Reduce Motion (ON)
2. App will still function, just with simpler animations

---

## Privacy & Data

### What Data is Stored?

- Kind acts (category, timestamp, reflection, emotion)
- Hearts earned
- Quest progress
- Story library unlocks
- Rewards earned

### Where is Data Stored?

- **Local only:** OPFS (Origin Private File System) in Safari
- **NOT in cloud:** No server, no sync
- **NOT shared:** Data never leaves iPad

### How to Export Data?

**Current:** No export feature

**Future:** CSV export via Mom Mode for backup/analysis
