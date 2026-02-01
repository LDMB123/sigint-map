# Bundle Optimization - Quick Reference Card

## Current State
- **Total workspace**: 514 MB
- **Recoverable savings**: 90-115 MB (18-22%)
- **Quick wins today**: 22 MB in 35 minutes
- **Major win (monorepo)**: 45-60 MB in 2-4 hours

---

## The 3 Biggest Offenders

### 1. Duplicate DevDependencies (134 MB removable)
```
typescript × 3 copies      = 69 MB
vitest × 4 copies          = 60 MB
better-sqlite3 × 3 copies  = 36 MB
(+ vite, esbuild, playwright-core duplicated)

ROOT CAUSE: No monorepo setup (each project has own node_modules)
SOLUTION: npm workspaces (2-4 hour setup, -45-60 MB)
```

### 2. Excessive Test Setup (21 MB unused)
```
emerson-violin-pwa:
  happy-dom (14 MB) + jsdom (4.9 MB) → both installed for 2 test files!

ROOT CAUSE: Over-configured test environment
SOLUTION: Remove happy-dom + jsdom + coverage-v8 (5 min, -21 MB)
```

### 3. Build Tool Overlap (37 MB necessary)
```
dmb-almanac/app:
  @swc family = 37 MB (core Svelte transpiler)
  @esbuild = 9.9 MB (Vite bundler component)
  rollup = 2.7 MB (bundling)

ROOT CAUSE: Vite 6 requires multiple overlapping tools
SOLUTION: Accept as necessary, focus on monorepo dedup instead
```

---

## Actions to Take

### DO TODAY (22 MB, 35 min)
```bash
# 1. Remove redundant test frameworks
cd projects/emerson-violin-pwa
npm uninstall happy-dom jsdom @vitest/coverage-v8

# 2. Remove unused test library
cd projects/dmb-almanac/app
npm uninstall @testing-library/jest-dom

# 3. Commit
git add -A && git commit -m "fix: Remove unused test dependencies"
```

### DO THIS WEEK (45-60 MB, 2-4 hours)
```bash
# Implement npm workspaces (see full report for details)
# Benefits: Single node_modules, instant dedup, faster CI
# Effort: Update workspace package.json + test CI
```

### DO LATER (18-19 MB, 2+ hours)
```bash
# Remove redundant test frameworks from dmb-almanac
# Lazy-load web-push and dotenv
# Make lightningcss optional
```

---

## By The Numbers

| Metric | Value |
|--------|-------|
| **Quick wins (today)** | 22 MB saved |
| **Monorepo setup (week)** | 45-60 MB saved |
| **Full optimization** | 90-115 MB saved |
| **Time investment** | <1 day total |
| **Risk level** | Very Low |
| **CI/CD impact** | Positive (faster installs) |

---

## Duplication Breakdown

| Package | Copies | Total Size | Removable |
|---------|--------|-----------|-----------|
| typescript | 3 | 69 MB | 46 MB |
| vitest | 4 | 60 MB | 45 MB |
| better-sqlite3 | 3 | 36 MB | 24 MB |
| vite | 3 | 18.6 MB | 12.4 MB |
| @esbuild | 3 | 29.7 MB | 19.8 MB |
| playwright-core | 2 | 18.2 MB | 9 MB |
| **TOTAL** | | **202.8 MB** | **134 MB** |

---

## Files to Change

### Phase 1 (Today)
- `projects/emerson-violin-pwa/package.json` - Remove 3 packages
- `projects/dmb-almanac/app/package.json` - Remove 1 package

### Phase 2 (This Week)
- `/package.json` - Add workspaces config
- `package-lock.json` - Regenerate (delete all per-project ones)
- `.github/workflows/*.yml` - Update install commands (if needed)

### Phase 3+ (Later)
- Individual vite/vitest configs (optional environment tweaks)
- Scripts that reference specific node_modules paths

---

## Success Checklist

- [ ] Phase 1: Remove test bloat (5 min)
- [ ] Phase 1: Remove unused test library (2 min)
- [ ] Phase 1: Run tests to verify no breakage (10 min)
- [ ] Phase 1: Commit changes (3 min)
- [ ] Phase 2: Design workspace structure (30 min)
- [ ] Phase 2: Implement npm workspaces (1.5-2 hours)
- [ ] Phase 2: Test all projects build/test/run (30 min)
- [ ] Phase 2: Update CI/CD pipeline (30 min)
- [ ] Phase 2: Performance verification (15 min)

---

## Common Questions

**Q: Is it safe to remove dependencies?**
A: Yes. Phase 1 removes packages that are literally not imported anywhere. Phase 2 is monorepo dedup (standard best practice).

**Q: Will monorepo break our CI?**
A: Unlikely. npm workspaces are stable since npm 8. You might need minor updates to workflow commands.

**Q: Do we need to remove @swc?**
A: No. That 37 MB is the core Svelte transpiler. It's necessary for Svelte 5 compilation.

**Q: Can we just use pnpm instead of npm?**
A: Yes, but that's Phase 2B (lower priority). Start with npm workspaces first.

**Q: How much will this improve build time?**
A: ~15-30% faster CI/CD installs (single `npm install` instead of 4). Development builds unchanged.

---

## Key Insights

1. **This workspace never had monorepo setup** → Explains 134 MB of duplication
2. **Test frameworks are over-provisioned** → 21 MB of totally unnecessary packages
3. **Build tools are at minimum viable size** → Can't optimize further without breaking builds
4. **No actual unused runtime dependencies** → All 4 runtime deps are genuinely used

---

## Next Steps

1. **Read full report**: `docs/reports/BUNDLE_OPTIMIZATION_ANALYSIS_2026.md`
2. **Execute Phase 1 today**: 22 MB in 35 minutes
3. **Plan Phase 2 this week**: 45-60 MB from monorepo setup
4. **Schedule Phases 3-4**: 18-19 MB from build optimization

---

## Report Location
- **Full Analysis**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/BUNDLE_OPTIMIZATION_ANALYSIS_2026.md`
- **This Summary**: `/Users/louisherman/ClaudeCodeProjects/docs/reports/BUNDLE_QUICK_REFERENCE.md`

Generated: 2026-01-31
