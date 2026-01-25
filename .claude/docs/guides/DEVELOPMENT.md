# Development Guide

**Repository**: ClaudeCodeProjects
**Last Updated**: 2026-01-25

---

## Getting Started

### Prerequisites
- Git
- Node.js 18+ (for DMB Almanac)
- Python 3.8+ (for Gemini MCP)
- Rust/Cargo (for WASM modules)

### Repository Setup

```bash
# Clone repository
git clone <repository-url>
cd ClaudeCodeProjects

# Install DMB Almanac dependencies
cd projects/dmb-almanac/app/
npm install

# Build DMB Almanac
npm run build

# Run tests
npm run test
```

---

## Pre-Commit Hooks

**Location**: `.git/hooks/pre-commit`
**Status**: ✅ Active

### What It Does
The pre-commit hook automatically validates repository structure before every commit to prevent organizational drift.

**Checks Performed**:
1. No unexpected markdown files at root (except README.md, LICENSE.md)
2. No backup directories at root
3. All projects in `projects/` directory
4. No stale path references (e.g., "dmb-almanac-svelte")
5. Documentation organized properly
6. Claude configuration valid
7. No accidental secrets or credentials

### Bypassing the Hook
If you need to bypass validation (not recommended):

```bash
git commit --no-verify -m "your message"
```

**When to bypass**:
- Emergency hotfixes
- Intentional temporary violations (document in commit message)
- Working on structure changes themselves

### Testing the Hook
```bash
# Create a test violation
touch TEST_VIOLATION.md
git add TEST_VIOLATION.md
git commit -m "test"
# Expected: Hook blocks commit with error message

# Clean up
rm TEST_VIOLATION.md
git reset
```

### Troubleshooting

**Hook doesn't run:**
```bash
# Verify hook is executable
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x

# Make executable if needed
chmod +x .git/hooks/pre-commit
```

**Hook fails unexpectedly:**
```bash
# Run validation manually to see detailed output
.claude/scripts/validate-structure.sh
```

---

## Continuous Integration

### GitHub Actions Workflows

**Active Workflows** (`.github/workflows/`):
1. **structure-validation.yml** - Repository structure checks
2. **validate-agents.yml** - Agent YAML validation
3. **validate-openapi.yml** - API contract validation
4. **benchmark.yml** - Performance benchmarking
5. **security.yml** - Security scanning
6. **audit-deps.yml** - Dependency auditing
7. **deploy-docs.yml** - Documentation deployment

### Structure Validation Workflow

**Triggers**:
- Push to main/develop
- Pull requests to main/develop
- Manual trigger (Actions tab → "Run workflow")

**Jobs**:
1. **validate-structure** - Runs `.claude/scripts/validate-structure.sh`
2. **validate-stale-references** - Checks for old path names
3. **summary** - Consolidates results

**Failure Handling**:
- Failed validation blocks PR merge
- Detailed error messages in workflow logs
- Fix violations and push again

---

## Code Quality

### Running Tests

```bash
# DMB Almanac tests
cd projects/dmb-almanac/app/
npm run test

# Expected: 162/162 passing
```

### Linting

```bash
# Run ESLint
npm run lint

# Expected: 0 errors (warnings acceptable)
```

### Type Checking

```bash
# Run TypeScript checks
npm run check

# Expected: No new errors
```

### Building

```bash
# Build for production
npm run build

# Expected: Success, outputs to build/
```

---

## Repository Structure

### File Organization
See [Project Structure](../../../docs/PROJECT_STRUCTURE.md) for complete directory mapping.

**Key Principles**:
- Root directory: minimal files, professional appearance
- Projects: `projects/` directory only
- Documentation: organized by type (architecture, reference, guides)
- Analysis: categorized in `docs/analysis/` subdirectories
- Audits: timestamped in `docs/audits/YYYY-MM-audit/`

### Adding New Documentation
1. Determine category (architecture, reference, guide, analysis, audit)
2. Place in appropriate directory
3. Update relevant index files
4. Follow naming convention (kebab-case)
5. Include date if audit/report

---

## Performance Metrics

### Baseline Tracking
See [Metrics Guide](./METRICS.md) for complete documentation.

**Current Baseline**: `.claude/metrics/baseline.json`
**Benchmark History**: `.claude/benchmarks/history.txt`

### Running Benchmarks

Benchmarks run automatically in CI on push to main.

**Manual run** (requires benchmark script):
```bash
# Benchmarks are part of CI workflow
# View results in Actions tab
```

---

## Git Workflow

### Branch Naming
- Feature: `feature/<name>`
- Fix: `fix/<name>`
- Docs: `docs/<name>`
- Refactor: `refactor/<name>`

### Commit Messages
Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:
```
feat(dmb-almanac): add concert search filtering

Implements client-side filtering for concert searches by year, venue,
and song. Uses existing index structures for performance.

Closes #123
```

### Pull Requests
1. Create feature branch
2. Make changes
3. Ensure all tests pass locally
4. Push to remote
5. Create PR with description
6. Wait for CI checks to pass
7. Request review
8. Merge after approval

---

## Troubleshooting

### Common Issues

**Build fails:**
```bash
# Clean and rebuild
rm -rf node_modules build .svelte-kit
npm install
npm run build
```

**Tests fail:**
```bash
# Clear test cache
npm run test -- --clearCache
npm run test
```

**Pre-commit hook fails:**
```bash
# Run validation manually to see details
.claude/scripts/validate-structure.sh

# Common fixes:
# - Remove unexpected files from root
# - Move documentation to proper directories
# - Remove backup directories
```

**CI workflow fails:**
```bash
# Check workflow logs in GitHub Actions tab
# Common causes:
# - Structure violations
# - Stale path references
# - Failed tests
# - Linting errors
```

---

## Resources

### Documentation
- [Master Index](../../../docs/INDEX.md) - Navigate all 835+ docs
- [UAF Framework](../UAF_FRAMEWORK.md) - Agent architecture
- [Project Structure](../../../docs/PROJECT_STRUCTURE.md) - Directory mapping
- [Metrics Guide](./METRICS.md) - Performance tracking

### External Links
- [SvelteKit Docs](https://kit.svelte.dev/)
- [Rust WASM Book](https://rustwasm.github.io/book/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

**Questions?** Check the [Master Documentation Index](../../../docs/INDEX.md) or create an issue.
