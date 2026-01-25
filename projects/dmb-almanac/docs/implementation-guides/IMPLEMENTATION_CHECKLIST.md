# PWA Implementation Checklist
## DMB Almanac - Ready to Code

**Start Date:** January 23, 2026
**Project:** Enable Native PWA APIs
**Target:** Chrome 143+ Advanced Features
**Estimated Effort:** 2-3 hours for Quick Wins, 3-4 weeks for full implementation

---

## PRE-IMPLEMENTATION

### Setup & Preparation
- [ ] Read PWA_FINDINGS_SUMMARY.txt (overview)
- [ ] Review PWA_API_REFERENCE.md (technical details)
- [ ] Review PWA_QUICK_WINS_GUIDE.md (step-by-step)
- [ ] Verify npm packages installed
  - [ ] Check SvelteKit 2.0+
  - [ ] Check Svelte 5.0+
  - [ ] Check vite-plugin-pwa
- [ ] Git branch created: `feat/pwa-native-apis`
- [ ] Development server tested locally
- [ ] Chrome DevTools installed and familiar

### Team Preparation
- [ ] Assign implementation owner
- [ ] Schedule code review
- [ ] Notify QA for testing
- [ ] Add to sprint planning

---

## PHASE 1: QUICK WINS (Priority Immediate)

### Task 1.1: Enable Periodic Sync Registration
**File:** `/src/routes/+layout.svelte`
**Estimated Time:** 15 minutes
**Difficulty:** Easy

**Subtasks:**
- [ ] Open `/src/routes/+layout.svelte`
- [ ] Locate line 50 (Background Sync registration)
- [ ] Add periodic sync registration code after line 54
- [ ] Copy code from PWA_QUICK_WINS_GUIDE.md (Quick Win #1)
- [ ] Verify TypeScript compilation: `npm run check`
- [ ] Test in DevTools: Application > Service Workers
- [ ] Commit: `feat: register periodic sync for 24h data freshness`

**Verification:**
- [ ] No TypeScript errors
- [ ] Chrome DevTools shows sync event listener active
- [ ] Console logs show registration success
- [ ] Service worker remains registered after reload

---

### Task 1.2: Integrate Badging API
**File:** `/src/routes/+layout.svelte` or `/src/lib/services/offlineMutationQueue.ts`
**Estimated Time:** 20 minutes
**Difficulty:** Easy

**Subtasks:**
- [ ] Open `/src/routes/+layout.svelte`
- [ ] Add import for `setAppBadge` and `clearAppBadge`
- [ ] Add $effect block to update badge on queue changes
- [ ] Verify compilation: `npm run check`
- [ ] Test offline mutation queue:
  - [ ] Go offline (DevTools > Network > Offline)
  - [ ] Make a change (favorite a show)
  - [ ] Verify badge appears on app icon
  - [ ] Go online
  - [ ] Verify changes sync and badge clears
- [ ] Commit: `feat: add app badge showing pending offline changes`

**Verification:**
- [ ] Badge appears on app icon when changes pending
- [ ] Badge updates as queue changes
- [ ] Badge clears when queue empty
- [ ] Works on macOS (see in dock), Android (launcher)
- [ ] Graceful failure on unsupported browsers

---

### Task 1.3: File Handle Persistence for Save-Back
**Files:**
- New: `/src/lib/pwa/file-handles.ts`
- Modified: `/src/routes/+layout.svelte`

**Estimated Time:** 45 minutes
**Difficulty:** Medium

**Subtasks:**
- [ ] Create new file `/src/lib/pwa/file-handles.ts`
- [ ] Copy complete implementation from PWA_QUICK_WINS_GUIDE.md (Quick Win #3, Step 1)
- [ ] Add to layout initialization (around line 80)
- [ ] Import `storeFileHandle` and `clearAllFileHandles`
- [ ] Add launchQueue handler in onMount
- [ ] Add cleanup in return function
- [ ] Verify TypeScript: `npm run check`
- [ ] Test file operations:
  - [ ] Create test .dmb or .json file
  - [ ] Open via file handler
  - [ ] Make edits
  - [ ] Click "Save to Original File"
  - [ ] Verify file updated
- [ ] Commit: `feat: enable file save-back capability for file handler`

**Verification:**
- [ ] Files can be opened via file handler
- [ ] Save button appears in editing UI
- [ ] Original files updated correctly
- [ ] Permissions requested only once
- [ ] Works on Chrome 86+ only (no error on unsupported)

---

### Task 1.4: Window Controls Overlay CSS
**Files:**
- Modified: `/src/app.css`
- New: `/src/lib/components/window/WindowTitleBar.svelte`
- Modified: `/src/routes/+layout.svelte`

**Estimated Time:** 30 minutes
**Difficulty:** Medium

**Subtasks:**
- [ ] Add CSS to `/src/app.css` (top of file)
- [ ] Copy CSS block from PWA_QUICK_WINS_GUIDE.md (Quick Win #4, Step 1)
- [ ] Create new component `/src/lib/components/window/WindowTitleBar.svelte`
- [ ] Copy component code from Quick Win #4, Step 2
- [ ] Add import to `/src/routes/+layout.svelte`
- [ ] Add component before `{@render children()}`
- [ ] Verify compilation: `npm run check`
- [ ] Build production: `npm run build`
- [ ] Test in installed PWA:
  - [ ] `npm run preview`
  - [ ] Install as PWA to desktop (Chrome menu > Install app)
  - [ ] Open installed app
  - [ ] Verify title bar visible
  - [ ] Verify can drag from title bar
  - [ ] Verify buttons still clickable
- [ ] Commit: `feat: implement window controls overlay CSS and title bar`

**Verification:**
- [ ] Title bar visible in desktop installed app
- [ ] Can drag window from title bar
- [ ] Buttons and controls remain interactive
- [ ] Responsive - content doesn't overlap
- [ ] Mobile view unaffected

---

## PHASE 2: CORE FEATURES (Start Next Week)

### Task 2.1: Protocol Handler URI Parser
**File:** New - `/src/lib/utils/protocolHandler.ts`
**Modified:** `/src/routes/protocol/+page.svelte`
**Estimated Time:** 120 minutes
**Difficulty:** Medium

**Checklist:**
- [ ] Review PWA_API_REFERENCE.md (Protocol Handlers section)
- [ ] Create new utility file
- [ ] Implement `parseProtocolUri()` function
- [ ] Handle all supported actions: show, song, venue, share
- [ ] Add error handling for malformed URIs
- [ ] Add unit tests for parser
- [ ] Update protocol route to use parser
- [ ] Add navigation routing based on parsed action
- [ ] Test all protocol combinations:
  - [ ] `web+dmb://show/2024-12-31`
  - [ ] `web+dmb://song/slug-name`
  - [ ] `web+dmb://venue/12345`
  - [ ] Invalid URIs (verify graceful failure)
- [ ] Commit: `feat: implement protocol handler URI parsing and routing`

---

### Task 2.2: Launch Handler Implementation
**File:** New - `/src/lib/pwa/launch-handler.ts`
**Modified:** `/src/routes/+layout.svelte`
**Estimated Time:** 90 minutes
**Difficulty:** Medium

**Checklist:**
- [ ] Review PWA_API_REFERENCE.md (Launch Handler section)
- [ ] Create new manager file
- [ ] Implement launchQueue consumer
- [ ] Handle file launches
- [ ] Handle URL launches
- [ ] Integrate into layout initialization
- [ ] Test scenarios:
  - [ ] App not running → file opens directly
  - [ ] App running → file navigates in existing window
  - [ ] Deep link URL → app navigates to page
- [ ] Commit: `feat: implement launch handler for file and URL launches`

---

### Task 2.3: Notification Actions Support
**File:** Modified - `/src/lib/pwa/push-manager.ts`
**Modified:** `/static/sw.js`
**Estimated Time:** 90 minutes
**Difficulty:** Medium

**Checklist:**
- [ ] Review PWA_API_REFERENCE.md (Notification Actions)
- [ ] Add actions to notification options in push-manager
- [ ] Update service worker notificationclick handler
- [ ] Support actions: open, snooze, archive
- [ ] Implement snooze logic (reschedule for later)
- [ ] Test with real push notification
- [ ] Commit: `feat: add interactive notification actions`

---

### Task 2.4: Share Target File Support
**Files:**
- Modified: `/static/manifest.json`
- New: `/src/routes/receive-share/+server.ts`
- Modified: `/src/routes/receive-share/+page.svelte`
**Estimated Time:** 60 minutes
**Difficulty:** Medium

**Checklist:**
- [ ] Update manifest for file sharing
- [ ] Create server endpoint for multipart handling
- [ ] Store shared data in IndexedDB
- [ ] Create UI to display shared content
- [ ] Test file sharing from Chrome
- [ ] Test URL sharing from Chrome
- [ ] Commit: `feat: implement share target for files and URLs`

---

## PHASE 3: ENHANCEMENTS (2-3 Weeks Out)

### Task 3.1: Multi-Instance Coordination
**File:** Modified - `/static/sw.js`
**File:** New - `/src/lib/pwa/multi-instance.ts`
**Estimated Time:** 180 minutes
**Difficulty:** Hard

**Checklist:**
- [ ] Implement BroadcastChannel for window communication
- [ ] Sync data between windows
- [ ] Handle conflicts from multiple edits
- [ ] Update UI when other window changes data
- [ ] Test with multiple windows open

---

### Task 3.2: Advanced Offline Features
**Estimated Time:** 120 minutes
**Difficulty:** Medium

**Checklist:**
- [ ] Offline page redirect
- [ ] Offline indicator UI
- [ ] Queue size monitoring
- [ ] Retry strategy improvements

---

### Task 3.3: Performance Optimizations
**Estimated Time:** 90 minutes
**Difficulty:** Medium

**Checklist:**
- [ ] Service worker bundle size
- [ ] Cache warming
- [ ] Request deduplication improvements
- [ ] Core Web Vitals optimization

---

## TESTING CHECKLIST

### Unit Tests
- [ ] Protocol parser handles all cases
- [ ] File validation prevents invalid uploads
- [ ] Sync queue retry logic works correctly
- [ ] Notification action handlers functional

### Integration Tests
- [ ] Offline → online sync completes
- [ ] File handler works end-to-end
- [ ] Protocol handler navigation works
- [ ] Multiple windows sync correctly

### Browser Testing
- [ ] Chrome 143+ (primary)
  - [ ] Desktop (macOS, Windows, Linux)
  - [ ] Android
- [ ] Chrome on iOS (limitations)
  - [ ] File handling fails gracefully
  - [ ] Protocol handlers fail gracefully
  - [ ] Web Push works
- [ ] Edge 143+
- [ ] Samsung Browser 23+

### Device Testing
- [ ] macOS (title bar visible)
- [ ] Windows (title bar + window controls)
- [ ] Linux (title bar + theme)
- [ ] Android (badge visible)
- [ ] iOS (graceful fallbacks)

### DevTools Verification
- [ ] Service Workers: Active and running
- [ ] Storage: IndexedDB queues populated
- [ ] Cache: All caches populated correctly
- [ ] Network: Offline mode works
- [ ] Console: No errors or warnings

---

## CODE REVIEW CHECKLIST

### Code Quality
- [ ] TypeScript strict mode compliant
- [ ] No console.errors (only console.debug)
- [ ] Error handling comprehensive
- [ ] Comments for complex logic
- [ ] No breaking changes to API

### Security
- [ ] File uploads validated
- [ ] JSON schema validation present
- [ ] No XSS vulnerabilities
- [ ] Permissions requested properly
- [ ] No sensitive data in logs

### Performance
- [ ] No memory leaks detected
- [ ] Service worker startup time <100ms
- [ ] Cache hit rate >70%
- [ ] No janky animations

### Documentation
- [ ] README updated
- [ ] Inline comments added
- [ ] Usage examples provided
- [ ] Known limitations documented

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review approved
- [ ] No console errors in prod build
- [ ] Performance budgets met
- [ ] Icons and assets optimized

### Staging Deployment
- [ ] Build succeeds: `npm run build`
- [ ] Preview works: `npm run preview`
- [ ] Service worker loads
- [ ] All features functional
- [ ] No broken links
- [ ] Analytics tracking works

### Production Deployment
- [ ] Backup current version
- [ ] Deploy new version
- [ ] Monitor error rates
- [ ] Check Core Web Vitals
- [ ] Verify features work
- [ ] Customer feedback monitored

### Post-Deployment
- [ ] Rollback plan ready (if needed)
- [ ] Monitor cache hit rates
- [ ] Monitor sync completion rates
- [ ] Collect user feedback
- [ ] Document lessons learned

---

## TIMELINE TEMPLATE

### Week 1: Quick Wins
| Day | Task | Status | Notes |
|-----|------|--------|-------|
| Mon | Setup & Prep | - | |
| Tue | Quick Win #1 & #2 | - | |
| Wed | Quick Win #3 | - | |
| Thu | Quick Win #4 | - | |
| Fri | Testing & Bug Fixes | - | |

### Week 2: Phase 2 Features
| Day | Task | Status | Notes |
|-----|------|--------|-------|
| Mon | Protocol Parser | - | |
| Tue | Launch Handler | - | |
| Wed | Notification Actions | - | |
| Thu | Share Target | - | |
| Fri | Testing & Integration | - | |

---

## ROLLBACK PROCEDURES

### Quick Win #1: Periodic Sync
**If broken:** Delete the registration code block added at line 54

### Quick Win #2: Badging API
**If broken:** Remove the $effect block and remove imports

### Quick Win #3: File Handles
**If broken:** Delete `/src/lib/pwa/file-handles.ts` and revert layout imports

### Quick Win #4: Window Controls
**If broken:** Revert CSS changes and remove title bar component

### Phase 2 Features
**If broken:** Revert commit to previous version
```bash
git revert <commit-hash>
```

---

## DEBUGGING GUIDE

### Issue: Periodic Sync Not Running
```javascript
// Check support
'periodicSync' in ServiceWorkerRegistration.prototype

// Check registration
navigator.serviceWorker.ready.then(reg => {
  reg.periodicSync.getTags().then(tags => console.log(tags));
});
```

### Issue: Badge Not Showing
```javascript
// Test Badge API
navigator.setAppBadge(5);  // Should show badge
navigator.clearAppBadge(); // Should clear
```

### Issue: File Handler Not Triggering
```javascript
// Check support
'launchQueue' in window

// Check handler registered
// Open file via system file association
// Check console for launchQueue messages
```

### Issue: Service Worker Not Updating
```bash
# Clear service worker cache
DevTools > Application > Storage > Clear site data > Service workers

# Or programmatically
navigator.serviceWorker.getRegistrations()
  .then(regs => regs.forEach(r => r.unregister()));
```

---

## RESOURCES

### Documentation Files
- `PWA_FINDINGS_SUMMARY.txt` - Executive overview
- `PWA_ANALYSIS_REPORT.md` - Detailed technical analysis
- `PWA_QUICK_WINS_GUIDE.md` - Step-by-step implementation
- `PWA_API_REFERENCE.md` - API reference and code snippets

### Web References
- [Web App Manifest](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://w3c.github.io/ServiceWorker/)
- [File Handling API](https://www.w3.org/TR/file-handling/)
- [Protocol Handlers](https://www.w3.org/TR/payment-handler/)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/draft-ietf-webpush-protocol)
- [Background Sync](https://wicg.github.io/background-sync/spec/)

### Tools
- Chrome DevTools (Application tab)
- Chrome Lighthouse (PWA audit)
- WebPageTest (performance)
- Manifest Validator: https://manifest-validator.appspot.com/

---

## PROGRESS TRACKING

### Phase 1: Quick Wins
- [ ] Task 1.1: Periodic Sync - ___% complete
- [ ] Task 1.2: Badging - ___% complete
- [ ] Task 1.3: File Handles - ___% complete
- [ ] Task 1.4: Window Controls - ___% complete

**Phase 1 Overall:** ___% complete
**Estimated Completion:** ___/___

### Phase 2: Core Features
- [ ] Task 2.1: Protocol Parser - ___% complete
- [ ] Task 2.2: Launch Handler - ___% complete
- [ ] Task 2.3: Notifications - ___% complete
- [ ] Task 2.4: Share Target - ___% complete

**Phase 2 Overall:** ___% complete
**Estimated Completion:** ___/___

### Phase 3: Enhancements
- [ ] Task 3.1: Multi-Instance - ___% complete
- [ ] Task 3.2: Advanced Offline - ___% complete
- [ ] Task 3.3: Performance - ___% complete

**Phase 3 Overall:** ___% complete
**Estimated Completion:** ___/___

---

## SIGN-OFF

**Implementation Lead:** _______________
**Date Started:** _______________
**Date Completed:** _______________

**QA Lead:** _______________
**Date Tested:** _______________

**Deployment:** _______________
**Date Deployed:** _______________

---

**Last Updated:** January 23, 2026
**Status:** Ready for Implementation
**Next Action:** Start with Phase 1 Quick Wins

