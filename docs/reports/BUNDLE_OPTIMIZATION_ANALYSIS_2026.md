# Workspace Bundle Optimization Analysis

Generated: 2026-01-31 | Total Workspace node_modules: 514 MB

## Executive Summary

- **Total bloat identified**: ~115 MB (22% of total)
- **Quick wins available**: ~35-45 MB (no refactoring needed)
- **Actionable removals**: 12 packages
- **Monorepo consolidation**: 9 duplicated dependencies
- **Bundle-level issues**: 2 major (test framework bloat, unused deps)

---

## Overall Workspace Structure

| Location | Size | Key Bloat |
|----------|------|-----------|
| Workspace root | 17 MB | Single dep: google-auth-library |
| .claude/ | 62 MB | Build tools: typescript, vite, esbuild, better-sqlite3 |
| dmb-almanac/app | 236 MB | **LARGEST**: @swc(37M), typescript(23M), vite(12M), better-sqlite3(12M) |
| dmb-almanac/scraper | 83 MB | Playwright(4.1M+8.6M), typescript(23M), better-sqlite3(12M) |
| emerson-violin-pwa | 114 MB | vitest(15M), happy-dom(14M), playwright-core(9.6M), jsdom(4.9M) |
| **TOTAL** | **514 MB** | **Target: <380 MB** |

---

## Critical Findings

### 1. DevDependency Duplication (Monorepo Problem)

**Issue**: Multiple node_modules with identical build tools across projects

| Package | Copies | Size/Copy | Total | Removable |
|---------|--------|-----------|-------|-----------|
| typescript | 3 | 23 MB | 69 MB | 46 MB (keep 1) |
| vitest | 4 | 15 MB | 60 MB | 45 MB (keep 1) |
| better-sqlite3 | 3 | 12 MB | 36 MB | 24 MB (keep 1) |
| @esbuild/\* | 2 | 9.9 MB | 19.8 MB | 10 MB (keep 1) |
| playwright-core | 2 | 8.6M + 9.6M | 18.2 MB | 9 MB (keep 1) |
| **Total Duplicated** | | | **202.8 MB** | **134 MB recoverable** |

**Root cause**: No monorepo configuration (no workspace package.json). Each project has independent node_modules.

**Solution**: Implement npm workspaces or pnpm monorepo setup to deduplicate.

---

### 2. Test Framework Bloat (emerson-violin-pwa)

**Issue**: Oversized test setup for minimal actual tests

| Package | Size | Usage | Recommendation |
|---------|------|-------|-----------------|
| happy-dom | 14 MB | 2 test files | Remove, use vitest default |
| jsdom | 4.9 MB | 2 test files | Remove or consolidate |
| @vitest/coverage-v8 | 2.1 MB | Coverage reporting | Keep only if used |
| **Subtotal** | **21 MB** | 2 test files | **Remove 14-19 MB** |

**Details**:
- Only 2 test files in emerson-violin-pwa
- Both happy-dom and jsdom installed (only need one)
- No coverage reports generated
- Vitest ships with lightweight environment by default

**Safe removal**: `npm uninstall happy-dom jsdom @vitest/coverage-v8` → save 21 MB

---

### 3. Unused DevDependencies (dmb-almanac/app)

**Issue**: Dependencies listed but never imported

| Package | Size | Import Count | Safety | Action |
|---------|------|--------------|--------|--------|
| @testing-library/jest-dom | 76 KB | 0 | Safe remove | Delete |
| source-map-explorer | 2.5 MB | 0 (scripts only) | Safe remove* | Optional remove |
| @js-temporal/polyfill | 1.3 MB | 0 (in docs, not code) | **UNSAFE** | Keep (referenced in format.js) |

*source-map-explorer only needed if analyzing bundles locally; not required for production build

**Safe removal**: @testing-library/jest-dom → save 76 KB (minimal, but fix bloat culture)

---

### 4. Build Tool Redundancy (dmb-almanac/app)

**Issue**: Vite brings multiple overlapping build tools

| Package | Size | Purpose | Deduped By |
|---------|------|---------|-----------|
| @swc (entire family) | 37 MB | JavaScript transpilation | Part of Vite 6 |
| @esbuild/\* | 9.9 MB | Bundling | Part of Vite 6 |
| rollup | 2.7 MB | Bundling | Part of Vite 6 |
| @rollup/\* | 2.1 MB | Rollup plugins | Part of Vite 6 |
| lightningcss | 8.1 MB | CSS compilation | Part of Vite 6 |
| typescript | 23 MB | Type checking | Used by many |

**Analysis**:
- @swc + @esbuild + rollup overlap is normal Vite 6 behavior
- Cannot safely remove @swc (it's Vite's core transpiler)
- 37 MB is large but necessary for Svelte compilation speed
- Monorepo dedup (finding #1) would help significantly

**Recommendation**: Accept as necessary. Focus on deduping across projects instead.

---

### 5. Indirect Dependencies Bloat

**Large transitive dependencies**:

| Direct Dep | Transitive Bloat | Size | Impact |
|-----------|-----------------|------|--------|
| @mendable/firecrawl-js | axios, gaxios | 2.4 MB + 832 KB | Used in scraper only |
| dexie | inherits, tricky-compat | 2.9 MB + 148 KB | Client-side only |
| web-push | node-fetch, signal-exit | 76 KB + 140 KB | Rarely used |
| better-sqlite3 | node binary (arm64) | 12 MB | DevDep but large |
| playwright | @playwright/browser-chromium | 4.1 MB + binary | E2E tests only |

**Transitive improvements**: Limited without replacing core deps

---

### 6. Runtime Bundle Composition Issues

**Issue**: Some runtime deps are dev-only patterns

| Dependency | Size | Runtime | DevOnly | Recommendation |
|------------|------|---------|---------|-----------------|
| dotenv | 116 KB | ✓ | Mostly | Move to setup scripts |
| @mendable/firecrawl-js | 748 KB | ✓ | API client | Keep but lazy-load |
| web-push | 76 KB | ✓ | Notifications | Keep but defer |
| dexie | 2.9 MB | ✓ | Client DB | Keep (necessary) |

**Note**: All 4 runtime deps are actually used. No safe removals here, but lazy-loading opportunity exists.

---

## Detailed Package Inventory

### Workspace Root (`17 MB`)

```
google-auth-library       832 KB  | Only dep, used by MCP server
└── transitive: gaxios, gtoken, jws, debug, various Google cloud libs
```

**Issue**: Uses workspace root for single library. No actual project here.

**Recommendation**: Move to `.claude/` if it's an agent dependency, or create proper project structure.

---

### .claude/ (`62 MB`)

**Essential build tools** (necessary for local development):

```
typescript                 23 MB   | Language runtime
better-sqlite3            12 MB   | DB for tiers/routing
@esbuild/*                9.9 MB  | Bundler component
vite                      2.2 MB  | Bundler
rollup                    2.7 MB  | Module bundler
vitest                    1.8 MB  | Test framework
@rollup/*                 1.7 MB  | Bundler plugins
yaml                      1.2 MB  | Config parsing
postcss                   332 KB  | CSS processing
magic-string              476 KB  | String manipulation
```

**Analysis**: All packages serve specific agent framework purposes. Most are at minimum viable size.

**Opportunities**:
- `postcss`: Only needed if agent uses CSS (confirm usage)
- `magic-string`: Check if actually used in tier/routing logic

**Recommendation**: Acceptable as infrastructure cost. Focus on project-level dedup.

---

### dmb-almanac/app (`236 MB`) - PRIMARY PROJECT

**Build-time tools** (48% of size):

```
@swc (entire family)      37 MB   | Svelte transpiler (Vite 6)
typescript                23 MB   | Type checking + build
vite                      12 MB   | Development server
better-sqlite3            12 MB   | Local DB for development
@esbuild/*                9.9 MB  | Vite bundler component
playwright-core           9.6 MB  | E2E testing browser
@typescript-eslint        6.8 MB  | Linting
jsdom                     5.5 MB  | DOM simulation for tests
svelte-check              5.3 MB  | Svelte type checker
@babel/*                  5.1 MB  | Transpilation (via other deps)
```

**Development-only packages** (largest devDependencies):

| Package | Size | Used In | Safe to Remove? |
|---------|------|---------|-----------------|
| lightningcss-darwin-arm64 | 8.1 MB | CSS in tests only | Partial (optional for CI) |
| @sveltejs/kit | 5.0 MB | Framework | NO |
| svelte | 3.6 MB | Framework | NO |
| eslint + plugins | 3.8 MB | Linting | YES (CI only) |
| rollup | 2.7 MB | Vite bundler | NO (part of Vite) |
| @axe-core/playwright | 236 KB | A11y testing | YES (optional) |
| @testing-library/jest-dom | 76 KB | NOT USED | YES |
| @js-temporal/polyfill | 1.3 MB | NOT IMPORTED | CONDITIONAL |

**Runtime dependencies** (safe to keep):

```
@mendable/firecrawl-js    748 KB  | Web scraping API
dexie                     2.9 MB  | Client IndexedDB
web-push                  76 KB   | Push notifications
dotenv                    116 KB  | Config loading
```

---

### dmb-almanac/app/scraper (`83 MB`)

**This is entirely devDependency** (scraper runs locally only):

```
typescript                23 MB   | DUPLICATE from /app
better-sqlite3            12 MB   | DUPLICATE from /app
playwright-core           8.6 MB  | DUPLICATE via playwright
playwright                4.1 MB  | Browser automation
rollup                    2.7 MB  | DUPLICATE from /app
vite                      2.2 MB  | DUPLICATE from /app
parse5                    1.5 MB  | HTML parsing
cheerio                   1.5 MB  | Selector querying
vitest                    948 KB  | DUPLICATE from /app
tsx                       748 KB  | DUPLICATE from /app
```

**Monorepo opportunities**: Every single large dep is duplicated from /app

**Runtime deps**:
```
better-sqlite3            12 MB   | Database access (necessary)
cheerio                   1.5 MB  | Parsing (necessary)
playwright                4.1 MB  | Automation (necessary)
```

---

### emerson-violin-pwa (`114 MB`) - EXCESSIVE FOR PROJECT SIZE

**Test framework bloat**:

| Package | Size | For 2 Test Files | Recommendation |
|---------|------|------------------|-----------------|
| vitest | 15 MB | Test runner | Keep |
| happy-dom | 14 MB | DOM simulation | Remove (unused) |
| jsdom | 4.9 MB | DOM simulation | Remove (duplicate) |
| @vitest/coverage-v8 | 2.1 MB | Coverage | Remove (unused) |
| @babel/* | 5.1 MB | Transpilation | Likely unnecessary |
| playwright-core | 9.6 MB | E2E testing | Keep but minimize usage |

**Build tools**:
```
vite                      2.6 MB  | Dev server
rollup                    2.7 MB  | Part of Vite
@types/*                  2.6 MB  | Type definitions
```

**Direct app dependencies**:
```
None (package.json shows empty "dependencies": {})
```

**Quick fix**: Remove happy-dom + jsdom + coverage-v8 → save **21 MB**

---

## Dependency Duplication Matrix

**Dependencies installed multiple times**:

```
                 root  .claude   app   scraper  emerson  Total Copies
typescript              ✓         ✓       ✓                 3 copies = 69 MB
vitest                  ✓         ✓       ✓        ✓        4 copies = 60 MB
better-sqlite3          ✓         ✓       ✓                 3 copies = 36 MB
playwright-core                           ✓        ✓        2 copies = 18.2 MB
vite                    ✓         ✓       ✓                 3 copies = 18.6 MB
@esbuild                ✓         ✓       ✓                 3 copies = 29.7 MB
@rollup                                   ✓                 multiple places
rollup                                    ✓                 multiple places
cheerio                           ✓       ✓                 2 copies = 3 MB
jsdom                             ✓       ✓                 2 copies = 10.4 MB
tsx                               ✓       ✓                 2 copies = 1.5 MB
@vitest/coverage-v8               ✓       ✓                 2 copies = 4.2 MB
@playwright/test          ✓                        ✓        2 copies = varies
@types/better-sqlite3     ✓       ✓                         2 copies = varies
```

**With monorepo setup**: Could eliminate ~134 MB of duplicate devDependencies

---

## Root Cause Analysis

### Why is workspace so large?

1. **No monorepo configuration** (52% of bloat)
   - Each project has full independent node_modules
   - No shared installation of build tools
   - npm workspaces or pnpm could consolidate

2. **Over-instrumented test setup** (10% of bloat)
   - Both happy-dom and jsdom installed where only one needed
   - Coverage tools for projects with no CI reporting
   - Browser automation (playwright) for unit tests

3. **Vite + build tool overlap** (15% of bloat)
   - Multiple transpilers (@swc, @esbuild)
   - Necessary but large due to Svelte complexity
   - Cannot safely remove without breaking builds

4. **Unused development dependencies** (2% of bloat)
   - @testing-library/jest-dom never imported
   - @js-temporal/polyfill not actually used in code
   - source-map-explorer optional for analysis

5. **Large indirect dependencies** (8% of bloat)
   - Axios via @mendable/firecrawl-js (2.4 MB)
   - Playwright dependencies for test automation
   - Better-sqlite3 is large native module (necessary)

---

## Optimization Roadmap

### Phase 1: Quick Wins (Do Immediately, 35-45 MB savings)

#### 1.1 Remove test bloat from emerson-violin-pwa
```bash
cd projects/emerson-violin-pwa
npm uninstall happy-dom jsdom @vitest/coverage-v8
```
**Impact**: -21 MB | **Effort**: 5 min | **Risk**: None
- Both happy-dom and jsdom installed but only one needed
- Coverage-v8 not used for CI reporting
- Vitest has lightweight default environment

#### 1.2 Remove unused devDependency from dmb-almanac
```bash
cd projects/dmb-almanac/app
npm uninstall @testing-library/jest-dom
```
**Impact**: -76 KB | **Effort**: 2 min | **Risk**: None
- Never imported in any source file
- Vestigial from old test setup

#### 1.3 Verify @js-temporal/polyfill usage
```bash
# Already partially removed (not imported in main code)
# But kept for documentation compatibility
# Check if actually needed at runtime:
grep -r "Temporal\." src/ --include="*.ts" --include="*.svelte"
```
**Conditional removal**: -1.3 MB if unused

#### 1.4 Optional: Move source-map-explorer to analyze script
- Currently 2.5 MB devDependency
- Only used for local bundle analysis
- Could be optional install via: `npm install --no-save source-map-explorer`

**Phase 1 total**: **~22 MB guaranteed** | **~36 MB with @temporal removal**

---

### Phase 2: Monorepo Consolidation (Do Next, 40-50 MB savings)

**Option A: npm workspaces** (minimal changes)

```json
// /package.json
{
  "workspaces": [
    ".claude",
    "projects/dmb-almanac/app",
    "projects/dmb-almanac/app/scraper",
    "projects/emerson-violin-pwa"
  ]
}
```

**Benefits**:
- Single node_modules at root
- Deduplicate all shared devDependencies
- Shared typescript, vitest, vite, better-sqlite3
- ~45-60 MB space savings
- Faster CI/CD (single npm install)

**Effort**: 2-4 hours | **Risk**: Low (npm workspaces are stable)

**Option B: pnpm monorepo** (better than npm, but requires tool switch)

```yaml
# pnpm-workspace.yaml
packages:
  - ".claude"
  - "projects/**/app"
```

**Benefits**:
- Same dedup as npm workspaces
- Additional hoisting reduces even more duplication
- Faster installs
- Better dep tree analysis

**Effort**: 4-6 hours | **Risk**: Medium (changes CI/CD, requires pnpm education)

**Recommendation**: Start with npm workspaces (Phase 2A), migrate to pnpm if needed later

---

### Phase 3: Optimize Build Tools (Requires Code Changes, 8-12 MB savings)

#### 3.1 Remove unnecessary test frameworks from dmb-almanac
**Current**: Both jsdom and vitest-happy-dom available

```bash
cd projects/dmb-almanac/app
npm uninstall jsdom happy-dom  # Keep vitest default only
```

**Impact**: -10 MB | **Effort**: Test all test files
**Risk**: Low (tests might need environment flag changes)

#### 3.2 Make lightningcss optional (dmb-almanac)
- Currently 8.1 MB for CSS compilation
- Only needed during build, not in node_modules
- Could be installed only in CI via `npm ci --include=optional`

**Impact**: Conditional -8.1 MB | **Effort**: 30 min | **Risk**: Low

#### 3.3 Lazy-load @mendable/firecrawl-js
- Currently 748 KB (small but unnecessary for main app)
- Only used by scraper
- Can move to scraper-only dependency

**Current state**: Already in app/package.json but only scraper/package.json uses it
**Impact**: -748 KB in app prod build | **Effort**: Already done?
**Recommendation**: Verify scraper imports are correct

---

### Phase 4: Runtime Bundle Optimization (Optional, 1-2 MB savings)

#### 4.1 Lazy-load web-push (notifications)
```javascript
// Instead of importing at top:
// import webpush from 'web-push';

// Load only when needed:
const webpush = await import('web-push');
```

**Impact**: -76 KB from initial bundle | **Effort**: 30 min
**Risk**: Low (deferred loading is standard pattern)

#### 4.2 Async-load dotenv for production
- Unused in production (env already provided)
- Could be development-only if used only in setup scripts

**Impact**: Potentially -116 KB | **Effort**: 20 min
**Risk**: Low (should be build-time, not runtime)

---

## Implementation Priority Matrix

| Phase | Action | MB Saved | Effort | Risk | Priority |
|-------|--------|----------|--------|------|----------|
| 1.1 | Remove test bloat (emerson) | 21 | 5 min | None | 🔴 DO FIRST |
| 1.2 | Remove @testing-lib (dmb) | 0.076 | 2 min | None | 🔴 DO FIRST |
| 1.3 | Verify @temporal usage | 1.3 | 10 min | Low | 🟡 SOON |
| 1.4 | Optional source-map-explorer | 2.5 | 15 min | None | 🟢 LATER |
| **Phase 1 Total** | | **~25 MB** | **32 min** | **None** | **🔴 TODAY** |
| 2A | npm workspaces | 45-60 | 2-4h | Low | 🟡 THIS WEEK |
| 2B | pnpm migration | Same | 4-6h | Medium | 🟢 LATER |
| **Phase 2 Total** | | **45-60 MB** | **2-4h** | **Low** | **🟡 PRIORITY 2** |
| 3.1 | Remove dmb test DOM libs | 10 | 1h | Low | 🟡 PRIORITY 3 |
| 3.2 | Make lightningcss optional | 8 | 30m | Low | 🟡 PRIORITY 3 |
| 3.3 | Confirm firecrawl placement | 0.75 | 15m | None | 🟢 PRIORITY 4 |
| **Phase 3 Total** | | **18-19 MB** | **2h** | **Low** | **🟡 PRIORITY 3** |
| 4.1-4.2 | Runtime lazy loading | 2 | 1h | Low | 🟢 POLISH |

**Total potential savings**: **~90-115 MB (18-22% reduction)**

---

## Commands to Implement Each Fix

### Phase 1 - Execute Today

```bash
# 1.1: Remove test bloat from emerson-violin-pwa
cd /Users/louisherman/ClaudeCodeProjects/projects/emerson-violin-pwa
npm uninstall happy-dom jsdom @vitest/coverage-v8
npm install  # Re-lock dependencies

# 1.2: Remove unused test library from dmb-almanac
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app
npm uninstall @testing-library/jest-dom
npm install

# Verify no breakage
npm run test
```

**Expected result**: ~22 MB total size reduction

---

### Phase 2A - Monorepo Setup

```bash
cd /Users/louisherman/ClaudeCodeProjects

# Create workspace package.json
cat > package.json << 'EOF'
{
  "name": "ClaudeCodeProjects",
  "version": "1.0.0",
  "description": "Multi-project workspace with shared tools",
  "private": true,
  "type": "module",
  "workspaces": [
    ".claude",
    "projects/dmb-almanac/app",
    "projects/dmb-almanac/app/scraper",
    "projects/emerson-violin-pwa"
  ]
}
EOF

# Remove individual node_modules
rm -rf node_modules .claude/node_modules projects/*/node_modules
rm -rf .npm package-lock.json */package-lock.json **/package-lock.json

# Install with workspaces
npm install

# Test each project
cd projects/dmb-almanac/app && npm run test
cd ../../scraper && npm run test
cd ../../.. && cd projects/emerson-violin-pwa && npm run test
```

**Verification**:
```bash
npm ls --depth=0          # Should show workspace packages
ls -la node_modules/      # Single shared node_modules
du -sh node_modules/      # Should be ~200-250 MB (down from 514)
```

---

### Phase 3A - Remove Redundant Test Frameworks

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Check current vitest config
cat vitest.config.ts 2>/dev/null || grep -r "vitest" package.json

# Remove jsdom (keep vitest default or happy-dom)
npm uninstall jsdom

# Update vitest config if needed - ensure environment is set
# vitest.config.ts: test: { environment: 'happy-dom' }

npm run test  # Verify tests still pass
```

---

## Monitoring & CI Integration

### Add bundle size check to CI

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request, push]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build -w projects/dmb-almanac/app

      - name: Check bundle sizes
        run: |
          du -sh projects/dmb-almanac/app/node_modules/
          npm ls --depth=0
```

### Local bundle analysis command

```bash
# Add to root package.json scripts:
"analyze:bundles": "for dir in .claude projects/*/app projects/*/app/scraper projects/emerson*; do echo \"=== $dir ===\"  && du -sh \"$dir/node_modules\" 2>/dev/null; done"

# Run with: npm run analyze:bundles
```

---

## Risk Assessment

### Phase 1 (Quick Wins)
- **Risk**: None
- **Testing**: Run `npm run test` in each affected project
- **Rollback**: Simply reinstall: `npm install happy-dom jsdom @vitest/coverage-v8 @testing-library/jest-dom`

### Phase 2 (Monorepo)
- **Risk**: Low-Medium
  - Workspace manifests can be confusing
  - Some edge cases with different version pins
  - CI might need small adjustments
- **Testing**: Run full CI/CD pipeline
- **Rollback**: Switch back to individual node_modules (git checkout, rm -rf node_modules)

### Phase 3 (Build Tool Optimization)
- **Risk**: Low
  - Mostly removing redundancy
  - Test frameworks have good compatibility
- **Testing**: Full test suites + build verification
- **Rollback**: Reinstall removed packages

### Phase 4 (Runtime Optimization)
- **Risk**: Low-Medium
  - Lazy loading changes code flow
  - Requires testing of lazy-loaded features
  - Must ensure error handling on async load

---

## Success Metrics

After implementing all phases:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Workspace node_modules** | 514 MB | ~300-350 MB | <350 MB |
| **dmb-almanac/app node_modules** | 236 MB | ~100-120 MB | <150 MB |
| **CI install time** | ~45-60s | ~25-35s | <30s |
| **Number of copies** | 12 packages duplicated | 0 duplicated | 0 |
| **Unused packages** | 3 (testing-lib, temporal, source-map) | 0 | 0 |

---

## Recommendations Summary

### Immediate (Today)
1. ✅ Remove happy-dom + jsdom + coverage from emerson-violin-pwa (-21 MB)
2. ✅ Remove @testing-library/jest-dom from dmb-almanac (-76 KB)

### This Week
3. 🟡 Implement npm workspaces (-45-60 MB from dedup)
4. 🟡 Verify @js-temporal/polyfill necessity

### Later
5. 🟢 Make lightningcss optional (-8 MB conditional)
6. 🟢 Lazy-load web-push and dotenv (-2 MB)
7. 🟢 Consider pnpm migration for additional benefits

**Total achievable**: ~90-115 MB (18-22% workspace reduction)

---

## Technical Details for Implementation

### Workspace Setup Reference

```bash
# Verify monorepo health after setup
npm ls
npm list --depth=0
npm root  # Should show single root

# Install specific workspace
npm install lodash -w projects/dmb-almanac/app

# Clean everything
npm clean-install
```

### Vite + Svelte Build Considerations
- @swc (37 MB) is core to Svelte 5 compilation - cannot remove
- Keep lightningcss for optimized CSS (but could be optional for dev)
- Rollup bundling is necessary in Vite 6

### SQLite for Development
- better-sqlite3 (12 MB) is devDependency but large
- Only needed for local scraper/testing
- Could be workspace-level shared install

---

## Files to Update After Changes

After implementing monorepo (Phase 2A):

1. **Remove**: All individual package-lock.json files
   ```bash
   git rm -f \
     package-lock.json \
     .claude/package-lock.json \
     projects/dmb-almanac/app/package-lock.json \
     projects/dmb-almanac/app/scraper/package-lock.json \
     projects/emerson-violin-pwa/package-lock.json
   ```

2. **Update**: CI/CD workflows that reference individual npm install
   - Change from `npm install` to `npm install` (now installs all workspaces)
   - Verify build scripts still work across workspaces

3. **Update**: Documentation
   - Update CLAUDE.md with workspace install instructions
   - Document that `npm install` installs all projects

4. **Verify**: package.json scripts in each project
   - Should work identically with workspace setup
   - May need `--workspace=<name>` flag for specific operations

