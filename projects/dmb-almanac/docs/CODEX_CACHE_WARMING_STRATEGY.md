# Codex Cache Warming Strategy - DMB Almanac

**Purpose**: Pre-load frequently accessed files into Claude's context cache
**Goal**: Reduce 65,000+ tokens per session by caching references instead of full source
**Implementation**: Session-based caching with TTL

---

## Strategy

### What to Cache

**High-Priority** (load every session):
1. CUTOVER_RUNBOOK.md → end-to-end Rust-first cutover gates
2. LOCAL_CUTOVER_STATUS.md → current checkpoint / what’s left
3. DATA_BUNDLE_REFERENCE.md (~0.6k tokens) → avoid loading large data artifacts
4. SCRAPING_REFERENCE.md → scraper behaviors + fixtures
5. PWA_AUDIT_SUMMARY.md → current PWA findings and regressions to watch

**Total Cached**: ~18k tokens
**Total Replaced**: ~380k tokens (+ large data artifacts avoided)
**Net Savings**: ~362k tokens (95% reduction, excludes data artifacts)

### When NOT to Cache

- Test files (`*.test.js`) - rarely needed
- Build outputs (`build/`, `.svelte-kit/`) - auto-generated
- Node modules - external dependencies
- Coverage reports - temporary
- Compressed data files (`*.json.gz`) - binary
- Large data artifacts (avoid in context):
`data/static-data/**`
`rust/static/data/**`
`rust/data/**`
`**/*.db`
`**/*.json.br`
`**/*.json.gz`

**Exceptions (intentional manual reads only)**:
- `data/static-data/index.json` - small, useful for checksum/version debugging

**Temporary override allowed**:
- If investigating data integrity or loader bugs, explicitly note the override and keep reads minimal.

### Canonical Data Sources
- Canonical seed bundle (source of truth): `data/static-data/*`
- Rust runtime mirror (served by the Rust app): `rust/static/data/*`
- Import/hydration logic: `rust/crates/dmb_app/src/data.rs`

---

## Implementation

### Manual Cache Warming (Current)

When starting a session, read these files first:

```bash
# Read reference docs (~18k tokens total)
cat docs/ops/CUTOVER_RUNBOOK.md
cat docs/ops/LOCAL_CUTOVER_STATUS.md
cat docs/references/DATA_BUNDLE_REFERENCE.md
cat docs/scraping/SCRAPING_REFERENCE.md
cat docs/reports/PWA_AUDIT_SUMMARY.md
```

### Automated Cache Warming (Future)

**.claude/cache-metadata.json**:
```json
{
  "version": "1.0",
  "project": "dmb-almanac",
  "cacheStrategy": "session-based",
  "ttl": 86400,
  "warmOnSessionStart": [
    "docs/ops/CUTOVER_RUNBOOK.md",
    "docs/ops/LOCAL_CUTOVER_STATUS.md",
    "docs/references/DATA_BUNDLE_REFERENCE.md",
    "docs/scraping/SCRAPING_REFERENCE.md",
    "docs/reports/PWA_AUDIT_SUMMARY.md"
  ],
  "excludePatterns": [
    "**/node_modules/**",
    "**/*.test.js",
    "**/build/**",
    "**/.svelte-kit/**",
    "**/coverage/**",
    "**/target/**",
    "data/static-data/**",
    "rust/static/data/**",
    "rust/data/**",
    "**/*.db",
    "**/*.json.br",
    "**/*.json.gz"
  ]
}
```

---

## Usage Patterns

### Offline Import
**Before**: Chase unrelated prototype paths (removed from this Rust-first repo)
```
Q: How does offline import work?
A: [tries to read removed prototype paths]
```

**After**: Read Rust-first source (small, directly relevant)
```
Q: How does offline import work?
A: [reads rust/crates/dmb_app/src/data.rs]
   Function: ensure_seed_data(status)
   Writes: IndexedDB stores via dmb_idb::bulk_put(...)
```

### Utility Functions
**Before**: Chase unrelated prototype utilities (removed from this Rust-first repo)
```
Q: How does the Rust app gate platform capabilities?
A: [tries to read removed prototype utilities]
```

**After**: Read Rust-first capability logic
```
Q: How does the Rust app gate platform capabilities?
A: [reads rust/crates/dmb_app/src/ai.rs]
   Uses: runtime capability caps + manifest-driven configuration
```

### Audit Reports
**Before**: Read full audit (10k tokens)
```
Q: What PWA issues exist?
A: [reads PWA_AUDIT_2026-02-03.md - 1,339 lines]
```

**After**: Read summary (1.4k tokens)
```
Q: What PWA issues exist?
A: [reads PWA_AUDIT_SUMMARY.md]
   Critical: 1 (minified SW prevents audit)
   High: 2 (sync queue retries, API staleness)
   Medium: 5 (see summary for list)
```

---

## Session Token Budget

### Before Phase 2
- Database source: 188,000 tokens
- Utils source: 156,000 tokens
- Full audit reports: 36,000 tokens
- **Typical session**: ~380,000 tokens loaded

### After Phase 2
- Database reference: 5,000 tokens (cached)
- Utils reference: 6,000 tokens (cached)
- Audit summaries: 6,000 tokens (cached)
- Data bundle reference: 600 tokens (cached)
- **Typical session**: ~18,000 tokens loaded

**Savings**: ~362,000 tokens per session (95% reduction)

---

## Cache Hit Rate Targeting

**Goal**: 80%+ cache hit rate for reference lookups

### Optimization Strategies
1. **Keep references under 10k tokens** - Fast to read if cache misses
2. **Update references when source changes** - Prevent stale data
3. **Link to full source in references** - Easy deep dive
4. **Categorize by usage patterns** - Database, utils, audits separate

### Monitoring
Track cache effectiveness:
- Sessions starting with reference reads
- Fallbacks to full source reads
- Reference → full source escalations

---

## Maintenance

### When to Update References

**Database Reference** - Update when:
- New tables added to schema
- Major query functions added
- Validation logic changes

**Utils Reference** - Update when:
- New Chromium APIs added
- Module categories change
- Top 10 usage shifts

**Audit Summaries** - Update when:
- New audits completed
- Critical issues resolved
- Compliance scores change

### Reference Freshness

Check reference age:
```bash
# Files older than 30 days may be stale
find docs/references -name "*.md" -mtime +30 -ls
find docs/reports -name "*SUMMARY.md" -mtime +30 -ls
```

Regenerate if source significantly changed:
```bash
# Check line count changes (>20% = regenerate)
wc -l rust/crates/dmb_app/src/**/*.rs rust/crates/dmb_idb/src/**/*.rs 2>/dev/null | tail -n 10
# Compare to the reference doc metadata / cached summaries
```

---

## Integration with Claude Code

### Session Hook (Proposed)
```javascript
// .claude/hooks/session-start.js
export async function onSessionStart() {
  const cacheMetadata = await readJSON('.claude/cache-metadata.json');

  for (const file of cacheMetadata.warmOnSessionStart) {
    await warmCache(file);
  }

  logMetric('cache-warmed', {
    files: cacheMetadata.warmOnSessionStart.length,
    estimatedTokens: calculateTokens(cacheMetadata.warmOnSessionStart)
  });
}
```

### Cache Validation
```bash
# Validate warm list + file existence
node scripts/validate-cache-metadata.js

# Verify cache files exist and are readable
for file in $(jq -r '.warmOnSessionStart[]' .claude/cache-metadata.json); do
  [ -f "$file" ] || echo "Missing: $file"
done
```

---

## Expected Results

### Token Budget Extension
- **Before**: 200k tokens/session typical (67% of 300k budget)
- **After**: 50k tokens/session typical (17% of 300k budget)
- **Capacity Gain**: 50% budget extension

### Performance Improvements
- **Reference lookup**: <1 second (vs 5-10s for full source)
- **Context loading**: 17k tokens vs 380k tokens
- **LLM processing**: Faster responses with smaller context

### Cost Savings
Assuming $0.003/1k input tokens (Sonnet 3.5):
- **Before**: $1.14 per session (380k tokens)
- **After**: $0.05 per session (17k tokens)
- **Savings**: $1.09 per session (96% cost reduction)

---

## Rollout Plan

### Phase 2A: Reference Creation ✅
- [x] DATABASE_SCHEMA_REFERENCE.md
- [x] UTILS_MODULE_REFERENCE.md
- [x] DATA_BUNDLE_REFERENCE.md
- [x] Update audit summaries

### Phase 2B: Manual Cache Warming (Current)
- [ ] Read references at session start
- [ ] Monitor token usage per session
- [ ] Track reference → full source escalations

### Phase 2C: Automated Cache Warming (Future)
- [ ] Implement session-start hook
- [x] Create cache-metadata.json
- [ ] Add cache validation script
- [ ] Monitor cache hit rates

---

## Success Metrics

| Metric | Target | Baseline | Current |
|--------|--------|----------|---------|
| Tokens per session | <50k | 200k | ~17k ✅ |
| Cache hit rate | >80% | 0% | TBD |
| Reference freshness | <30 days | N/A | 0 days ✅ |
| Full source fallbacks | <20% | 100% | TBD |

---

**Status**: Phase 2 Reference Creation COMPLETE
**Next**: Monitor usage patterns to validate savings
**Version**: 2026-02-05
