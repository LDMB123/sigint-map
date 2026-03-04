# Production Deployment Checklist

- Archive Path: `docs/archive/phase-docs/DEPLOYMENT_CHECKLIST.md`
- Normalized On: `2026-03-04`
- Source Title: `Production Deployment Checklist`

## Summary
**Date**: 2026-02-11

## Context
**Date**: 2026-02-11
**Phase**: Phase 6 - Production Deployment Preparation
**Target**: iPad Mini 6 (A15, 4GB RAM, iPadOS 26.2, Safari 26.2)
**Deployment Type**: Offline-first PWA (local file:// serving)

## Actions
_No actions recorded._

## Validation
### Build Quality ✅

- [x] Production build compiles with 0 errors
- [x] All 78 WebP assets present in dist/
- [x] Service Worker precache manifest complete
- [x] All CSS files included in precache
- [x] index.html includes all asset copy directives
- [ ] Bundle size check: Total <10MB (3.8MB assets + code)
- [ ] All dead code warnings documented and acceptable

**Critical Bugs** (15/15 fixed):
- [x] Memory leaks eliminated (<1KB/min growth)
- [x] Race conditions fixed (no flicker)
- [x] Navigation state sync working
- [x] Database types standardized (core modules)
- [x] OPFS skipped on Safari (fast boot)
- [x] Assets render correctly (78 files)
- [x] Service Worker offline mode working

**Known Issues** (17 non-blocking):
- [x] Documented in KNOWN_BUGS.md
- [x] None are CRITICAL or HIGH severity
- [x] All have workarounds or acceptable limitations
- [x] Post-deployment backlog created

### Code Quality

- [x] All Phase 4 fixes documented with before/after
- [x] Devil's advocate critical refinements applied
- [x] Closure ownership semantics correct (no forget())
- [x] PENDING_RENDER tracking comprehensive
- [x] NULL safety validation in place
- [ ] Code review approval (if team exists)

### Deployment Steps

### 1. Final Production Build

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart
trunk build --release
```

**Verify**:
- [ ] Build completes successfully (0 errors)
- [ ] dist/ directory created
- [ ] dist/index.html exists
- [ ] dist/assets/companions/ has 18 files
- [ ] dist/assets/gardens/ has 60 files
- [ ] dist/sw.js exists
- [ ] dist/db-worker.js exists
- [ ] All CSS files present

```bash
ls -1 dist/assets/companions/*.webp | wc -l  # Should be 18
ls -1 dist/assets/gardens/*.webp | wc -l     # Should be 60

du -sh dist/                                  # Should be ~4-5MB
du -sh dist/assets/                           # Should be ~3.8MB
```

**Verify**:
- [ ] 18 companion WebP files (676KB total)
- [ ] 60 garden WebP files (3.1MB total)
- [ ] All files <200KB each (optimized)
- [ ] No placeholder/broken images

**Check precache manifest**:
```bash
grep -A 100 "PRECACHE_ASSETS" dist/sw-assets.js
```

**Verify includes**:
- [ ] All 78 WebP asset paths
- [ ] /gardens.css
- [ ] /scroll-effects.css
- [ ] /particle-effects.css
- [ ] /index.html
- [ ] /wasm-init.js
- [ ] All other core files

### 4. Deployment to iPad

**Option A: Local File Serving** (Recommended for offline PWA)

1. Copy dist/ to iPad via AirDrop or Files app:
   ```bash
   # On Mac, compress dist/
   cd /Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart
   zip -r blaires-kind-heart.zip dist/

   # AirDrop to iPad
   # Unzip in Files app
   ```

2. Open dist/index.html in Safari on iPad
   - Should load from file:// protocol
   - Service Worker may not register on file://
   - Consider using local HTTP server

**Option B: Local HTTP Server** (Recommended)

1. Install HTTP server on iPad (e.g., Servediter for Code)
2. Point to dist/ directory
3. Access via http://localhost:8080/
4. Service Worker registers correctly
5. Add to Home Screen for PWA experience

**Option C: Network Serve from Mac** (Development/Testing)

```bash
cd dist/
python3 -m http.server 8080 --bind 0.0.0.0

```

**Initial Load**:
- [ ] Page loads in <5 seconds (no OPFS delay)
- [ ] Companion renders with default skin
- [ ] No console errors visible
- [ ] Navigation menu appears
- [ ] All UI elements styled correctly

**Service Worker**:
- [ ] Safari → Web Inspector → Application → Service Workers
- [ ] SW status: "Activated"
- [ ] Cache Storage shows all 78 assets
- [ ] Enable Airplane Mode → Reload → Works offline

**Functionality**:
- [ ] Tap companion → Expression changes smoothly
- [ ] Navigate to Gardens panel → Test garden appears
- [ ] Log kind act → Data persists after force-quit
- [ ] Back/forward navigation works 10+ times
- [ ] View Transitions smooth (no jank)

**Performance**:
- [ ] Safari → Timelines → Record session
- [ ] Heap growth <1KB/min during normal use
- [ ] No memory warnings
- [ ] Interactions feel responsive (<200ms)
- [ ] No visual flicker or asset flash

### 6. PWA Installation (Optional)

**Add to Home Screen**:
1. Safari → Share button → Add to Home Screen
2. Verify icon appears correctly (512×512)
3. Open from Home Screen → Standalone mode
4. Verify no Safari UI visible (full screen)
5. Check status bar styling (theme-color)

**Verify PWA Features**:
- [ ] Standalone display mode
- [ ] Correct app name shown
- [ ] Icon not clipped (safe zone respected)
- [ ] Splash screen appears (if configured)
- [ ] Orientation locked to portrait (if configured)

### Post-Deployment Monitoring

### First 24 Hours

**User Testing**:
- [ ] Observe 4-year-old user interaction
- [ ] Note any confusion or friction points
- [ ] Document any unexpected behaviors
- [ ] Check for crashes or freezes

**Performance Monitoring**:
- [ ] Monitor battery drain (should be minimal)
- [ ] Check storage usage (Settings → Safari → Website Data)
- [ ] Verify data persistence across app restarts
- [ ] Test offline mode thoroughly

**Bug Discovery**:
- [ ] Document any new bugs in KNOWN_BUGS.md
- [ ] Prioritize CRITICAL bugs for immediate fix
- [ ] Create backlog items for MEDIUM/LOW bugs

### First Week

**Usage Patterns**:
- [ ] Which features get most use?
- [ ] Any features ignored or confusing?
- [ ] Performance degradation over time?
- [ ] Data accumulation causing issues?

**Iteration Planning**:
- [ ] Collect feedback from user (parent + child)
- [ ] Prioritize Phase 6B improvements
- [ ] Plan UI/UX polish for Phase 6C
- [ ] Consider new features for Phase 7

### Rollback Plan

### If Critical Bug Discovered

1. **Document the issue**:
   - Reproduction steps
   - Impact severity
   - Affected functionality

2. **Assess urgency**:
   - CRITICAL: Crashes, data loss → Immediate rollback
   - HIGH: Major feature broken → Fix within 24h or rollback
   - MEDIUM/LOW: Document and schedule fix

3. **Rollback procedure**:
   - Revert to previous working build (if exists)
   - Or disable broken feature via feature flag
   - Or apply emergency hotfix

4. **Communication**:
   - Inform user of issue
   - Set expectations for fix timeline
   - Provide workaround if available

### Success Metrics

### Deployment Success
- [x] All build steps complete without errors
- [ ] All post-deployment checks pass
- [ ] No CRITICAL bugs in first 24 hours
- [ ] User (4-year-old) can interact successfully
- [ ] Parent approves deployment

### Long-Term Success
- [ ] 7 days uptime without crashes
- [ ] <5 bugs reported in first week
- [ ] Positive user engagement (daily use)
- [ ] Performance remains stable (no degradation)

### Documentation Updates

### Required Before Deployment
- [x] KNOWN_BUGS.md - Document remaining bugs
- [x] DEPLOYMENT_CHECKLIST.md - This checklist
- [ ] README.md - Update with deployment instructions
- [ ] CLAUDE.md - Update status to "Production Deployed"
- [ ] CHANGELOG.md - Create if doesn't exist

### Optional
- [ ] USER_GUIDE.md - Simple guide for parent
- [ ] TROUBLESHOOTING.md - Common issues and fixes
- [ ] CONTRIBUTING.md - If planning future development

### Sign-Off

### Pre-Deployment
- [ ] Developer: Build verified ✅
- [ ] Developer: Tests passed ✅
- [ ] Developer: Documentation complete
- [ ] User (Parent): Ready to deploy

### Post-Deployment
- [ ] User (Parent): Installation successful
- [ ] User (Child): Can interact with app
- [ ] Developer: Monitoring active
- [ ] Developer: Rollback plan ready

---

**Deployment Checklist: Phase 6 - Ready for Execution**
**Status**: Awaiting final build and iPad deployment

## References
_No references recorded._

