# Safari 26.2 API Audit — Risk Assessment & Testing Strategy

## Risk Matrix

| Change | Complexity | Risk Level | Mitigation | Testing Effort |
|--------|-----------|-----------|-----------|--------------|
| Remove duplicate Batch handler | Low | LOW | Code review, unit test | 30 min |
| INP baseline reporting | Medium | LOW | Non-blocking, fallback to console | 1 hour |
| Trusted Types policy | High | MEDIUM | CSP already enforced, policy safe | 2 hours |
| AbortSignal.timeout() | High | MEDIUM | Fallback to manual controller | 1.5 hours |
| Audio GainNode pooling | Medium | LOW | Isolated to audio module | 1 hour |
| scrollend handler | Low | LOW | New code, doesn't affect existing | 1 hour |
| CLS + FCP monitoring | Low | LOW | Read-only metrics, no side effects | 1 hour |
| Navigation API forward() | Medium | MEDIUM | Adds new code path, needs testing | 1.5 hours |

---

## Detailed Risk Assessment

### P0 Risk: Remove Duplicate Batch Handler

**Severity**: MEDIUM (correctness bug)
**Impact**: If first handler throws, second (currently unreachable) would never execute
**Risk if NOT fixed**: Database write failures silently ignored
**Risk if fixed**: None — removing dead code

**Pre-deployment Testing**:
```bash
# Verify exactly one Batch handler remains
grep -c "if (reqType === 'Batch')" db-worker.js
# Output: 1 (exactly one)

# Verify logic is identical
diff <(sed -n '504,537p' db-worker.js) \
     <(sed -n '540,557p' db-worker.js) 2>&1 | wc -l
# Output: should show they're nearly identical (proving duplication)
```

**Deployment Strategy**: Low-risk, deploy immediately.

---

### P1 Risk: Trusted Types Policy Implementation

**Severity**: MEDIUM (security policy)
**Impact**: Could break innerHTML if sanitizer too aggressive
**Risk if NOT fixed**: CSP requires trusted-types but no policy created (graceful degradation)
**Risk if fixed**: Policy properly enforces XSS prevention

**Critical Risk Point**:
```rust
// The createHTML handler sanitizes input
// If too strict: removes valid HTML (breaks game rendering)
// If too loose: allows XSS (security issue)
```

**Mitigation**:
1. Use whitelist approach (allow only safe tags: div, span, p, img, button, etc.)
2. Remove all event handlers (onclick, onerror, etc.)
3. Use DOMPurify-equivalent logic

**Testing**:
```rust
#[test]
fn test_trusted_types_sanitization() {
    let input = "<div onclick='alert(1)'>Click</div>";
    let sanitized = sanitize_html(input);
    assert!(!sanitized.contains("onclick"));
    assert!(sanitized.contains("<div"));
}

#[test]
fn test_trusted_types_allows_safe_html() {
    let input = "<p>Hello <b>world</b></p>";
    let sanitized = sanitize_html(input);
    assert!(sanitized.contains("<p>"));
    assert!(sanitized.contains("<b>"));
}
```

**Deployment Strategy**:
1. Deploy with policy in report-only mode (logs violations)
2. Monitor console for 48 hours
3. If no violations, enable enforcement

---

### P1 Risk: AbortSignal.timeout() Integration

**Severity**: MEDIUM (reliability)
**Impact**: DB queries could hang indefinitely without timeout
**Risk if NOT fixed**: UI freeze if worker crashes (rare)
**Risk if fixed**: Queries abort after 5s, graceful error handling

**Critical Risk Point**:
```rust
// If timeout fires mid-transaction:
// - Transaction might be partially written
// - Abort prevents further writes
// - DB should be in consistent state (SQLite ACID guarantees)
```

**Testing**:
```javascript
// Test in db-worker.js
// Simulate slow query (sleep 10 seconds)
case 'TestSlowQuery':
  await new Promise(r => setTimeout(r, 10000));
  // Should timeout after 5s
  break;
```

**Deployment Strategy**: Test with longer timeout first (10s), reduce to 5s after validation.

---

### P2 Risk: View Transition Readiness Detection

**Severity**: LOW (UX edge case)
**Impact**: Could prevent navigation if transition detection wrong
**Risk if NOT fixed**: Rare animation jank if overlapping transitions
**Risk if fixed**: Extra guard prevents edge case

**Testing**: Spam panel buttons (click 10x rapidly)

**Deployment Strategy**: Low-risk, can be merged without extensive testing.

---

## Test Plan by Category

### Unit Tests (120 min)

```rust
// navigation.rs
#[test]
fn test_panel_state_js_serialization() {
    let state = panel_state_js("panel-tracker");
    assert_eq!(panel_from_js(&state), Some("panel-tracker".into()));
}

#[test]
fn test_navigate_opts_structure() {
    let opts = navigate_opts_js("panel-quests");
    assert!(!opts.is_null());
}

// safari_apis.rs
#[test]
fn test_inp_severity_levels() {
    assert!(matches!(get_inp_severity(100.0), InpSeverity::Warning));
    assert!(matches!(get_inp_severity(500.0), InpSeverity::Critical));
    assert!(matches!(get_inp_severity(900.0), InpSeverity::Catastrophic));
}

#[test]
fn test_inp_baseline_storage() {
    store_inp_baseline(250.0);
    store_inp_baseline(350.0);
    store_inp_baseline(100.0); // not in worst 10

    let worst = get_inp_worst_10();
    assert_eq!(worst[0], 350.0); // highest first
    assert_eq!(worst[1], 250.0);
}

// synth_audio.rs
#[test]
fn test_gain_pooling() {
    let ctx = create_test_audio_context();

    // Get first gain
    let g1 = get_or_create_gain(&ctx);
    let g1_ptr = g1.as_ptr();

    // Return to pool
    return_gain_to_pool(g1);

    // Get next (should be same object)
    let g2 = get_or_create_gain(&ctx);
    assert_eq!(g2.as_ptr(), g1_ptr); // Same object reused
}
```

### Integration Tests (180 min)

```bash
#!/bin/bash
# integration-tests.sh

# Test 1: Navigation persistence
echo "Test 1: Navigation state persistence"
trunk serve &
SERVER_PID=$!
sleep 2
open http://localhost:8080
# Click panel-tracker
# Reload browser
# Verify panel-tracker is shown (not home)
kill $SERVER_PID

# Test 2: OPFS blob export
echo "Test 2: OPFS blob export on pagehide"
# Create a test kindness act
# Close browser tab
# Reopen
# Verify act still present

# Test 3: Audio pooling
echo "Test 3: Audio context pooling"
# Play 5 sounds rapidly
# Check DevTools memory: should not grow with each sound
# Gain nodes should be pooled, not accumulating

# Test 4: Database batch transactions
echo "Test 4: Database batch transaction integrity"
# Execute batch with 3 inserts
# Kill worker mid-batch
# Reopen app
# Verify all 3 inserted or all 3 not (ACID guarantee)

# Test 5: View Transition completion
echo "Test 5: View Transition animation completion"
# Click panel button
# Watch animation smooth
# No jank or overlapping animations
```

### Performance Tests (90 min)

```javascript
// performance-suite.js
describe('Performance Benchmarks', () => {
  test('Boot time < 600ms', () => {
    const bootTime = performance.measure('boot:total').duration;
    expect(bootTime).toBeLessThan(600);
  });

  test('INP < 200ms for all interactions', () => {
    const events = performance.getEntriesByType('event');
    for (const event of events) {
      expect(event.duration).toBeLessThan(200);
    }
  });

  test('LCP < 2.5s', () => {
    const lcp = performance.getEntriesByType('largest-contentful-paint');
    const lcpTime = lcp[lcp.length - 1].startTime;
    expect(lcpTime).toBeLessThan(2500);
  });

  test('CLS < 0.1', () => {
    const cls = performance.getEntriesByType('layout-shift');
    const totalCls = cls.reduce((sum, entry) => sum + entry.value, 0);
    expect(totalCls).toBeLessThan(0.1);
  });

  test('Memory stable during gameplay', () => {
    const startMem = performance.memory.usedJSHeapSize;
    // Simulate 1 minute of gameplay
    playGames(60000);
    const endMem = performance.memory.usedJSHeapSize;
    const leak = endMem - startMem;
    expect(leak).toBeLessThan(5 * 1024 * 1024); // < 5MB growth
  });

  test('Audio first synth latency < 50ms', () => {
    const before = performance.now();
    synth_audio.synth_chime();
    const after = performance.now();
    expect(after - before).toBeLessThan(50);
  });
});
```

### Device Testing (iPad mini 6, 2 hours)

**Setup**:
```bash
# Build release
trunk build --release

# Serve over local network
trunk serve --address 0.0.0.0:8080

# On iPad: Safari → localhost:8080
```

**Test Cases**:

| # | Test | Expected | Pass/Fail |
|---|------|----------|-----------|
| 1 | Load app, verify no console errors | Home screen shows | |
| 2 | Tap each panel button (6 total) | Smooth transitions, no jank | |
| 3 | Create 10 kind acts | All appear, counter updates | |
| 4 | Play each game 2 minutes | No crashes, audio plays | |
| 5 | Scroll gardens quickly | Images lazy-load, no flicker | |
| 6 | Triple-tap anywhere | Debug panel opens (if build has debug) | |
| 7 | Close app via home button, reopen | State persists (hearts, quests, etc.) | |
| 8 | Fill storage to 80% (1000+ acts) | Warning toast appears | |
| 9 | Low battery mode (iPad setting) | App still responsive, animations pause | |
| 10 | Poor network (iPad devtools throttle) | Offline queue captures writes | |

---

## Deployment Strategy

### Phase 1: Shadow Release (Week 1)

```
[ ] Deploy all changes to staging environment
[ ] Run full test suite
[ ] Monitor console logs for Trusted Types violations
[ ] Check performance metrics (INP, LCP, CLS, FCP)
[ ] Verify no memory leaks (24-hour soak test)
[ ] Get approval from product team
```

### Phase 2: Beta Release (Week 2)

```
[ ] Deploy to 10% of users (feature flag)
[ ] Monitor crash rates (Firebase/Sentry)
[ ] Collect performance telemetry
[ ] If >0.5% crash rate: rollback
[ ] If pass: increment to 50%
```

### Phase 3: Full Release (Week 3)

```
[ ] Deploy to all users
[ ] Monitor for 72 hours
[ ] Publish release notes
[ ] Celebrate! 🎉
```

### Rollback Criteria

```
- Crash rate > 1%
- INP > 400ms (average)
- LCP > 4s (average)
- DB query errors > 0.1%
- Consent from stakeholders
```

---

## Monitoring & Observability

### Key Metrics

```javascript
// Capture in errors module
const metrics = {
  boot_time_ms: performance.measure('boot:total').duration,
  inp_worst_10: safari_apis.get_inp_worst_10(),
  lcp_ms: performance.getEntriesByType('largest-contentful-paint')[0].startTime,
  cls_total: /* sum of all layout shifts */,
  fcp_ms: performance.getEntriesByType('paint')[0].startTime,
  db_query_avg_ms: /* track per db_client */,
  memory_used_mb: performance.memory.usedJSHeapSize / 1024 / 1024,
  audio_latency_ms: /* measure synth startup */,
  cache_hit_rate: /* track Service Worker cache hits */,
};

// Send to analytics
if (navigator.sendBeacon) {
  navigator.sendBeacon('/api/metrics', JSON.stringify(metrics));
}
```

### Dashboard (Grafana/Datadog)

```
Queries:
- boot_time_ms: avg, p95, p99
- inp_worst: max value in worst_10
- lcp_ms, cls_total, fcp_ms: avg + percentiles
- crash_rate: errors per session
- memory_used_mb: trend over 24h

Alerts:
- boot_time > 700ms: page
- crash_rate > 0.5%: page
- memory_used > 150MB: page
```

---

## Sign-Off Checklist

Before deploying to production:

```
Security:
[ ] Code reviewed by security engineer
[ ] Trusted Types policy allows only safe HTML tags
[ ] CSP enforced (require-trusted-types-for 'script')
[ ] No unescaped user input in innerHTML

Performance:
[ ] Boot time < 600ms (measured on device)
[ ] INP < 200ms (all interactions)
[ ] LCP < 2.5s
[ ] No memory leaks (24h soak test)
[ ] Audio latency < 50ms

Functionality:
[ ] All 5 games playable
[ ] Panel navigation smooth
[ ] Offline functionality works
[ ] Database persists on reopen
[ ] Speech synthesis works

Testing:
[ ] Unit tests pass (100% coverage for new code)
[ ] Integration tests pass
[ ] Device testing completed (iPad mini 6)
[ ] Performance profiling done
[ ] Regression testing passed

Documentation:
[ ] Implementation guide complete
[ ] Release notes written
[ ] Analytics dashboard configured
[ ] Rollback procedure documented

Approval:
[ ] Product owner sign-off
[ ] Security team sign-off
[ ] QA sign-off
[ ] Engineering lead sign-off
```

---

## Emergency Procedures

### If Crash Rate Spikes (>1%)

```bash
# 1. Trigger rollback
git revert <commit-sha>
trunk build --release
deploy production

# 2. Investigate
# Check logs for stack traces
# Look for pattern in crashes
# Was it new code or existing bug?

# 3. Communicate
# Post to team Slack
# Status update to users
# Estimate fix time

# 4. Fix & redeploy
# Develop fix
# Test locally
# Gradual rollout (10% → 50% → 100%)
```

### If Performance Degrades (>700ms boot)

```bash
# 1. Profile boot sequence
# Check Performance API timings
# Identify which batch is slow

# 2. Check common causes
# New assets too large?
# GPU init blocking?
# DB slow to hydrate?

# 3. Optimize
# Compress assets
# Defer non-critical work
# Parallelize queries

# 4. Redeploy
# Test on device first
# Gradual rollout
```

---

## Success Criteria

After deployment, we'll consider the audit successful if:

1. **Zero regressions**: Boot time ≤ 600ms, INP ≤ 200ms, LCP ≤ 2.5s
2. **Bug fixes**: Duplicate Batch handler removed, no errors in Console
3. **New features**:
   - INP baseline reporting working
   - Trusted Types policy enforced
   - scrollend detection working
4. **Security**: Trusted Types violations logged but not blocking
5. **User impact**: Zero user-facing issues, app feels faster

---

## Post-Deployment Validation (Week 4)

```
Day 1: Monitor crash rate (should be 0%)
Day 2: Check performance metrics (should improve 5-10%)
Day 3: Verify no Trusted Types violations in logs
Day 4: Spot-check memory usage (should be stable)
Day 5: Compare metrics before/after
Day 6: Publish results to team
Day 7: Plan next optimization cycle
```

---

**Created**: 2026-02-12
**Author**: Safari 26.2 Web API Specialist
**Status**: Ready for implementation

