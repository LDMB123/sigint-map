# Documentation Master Index

**Repository**: ClaudeCodeProjects
**Last Updated**: 2026-01-25
**Total Documentation Files**: 835+

> This is the master index for ALL documentation across the repository. Use this as your entry point for finding any documentation.

---

## 🚀 Quick Start

**New to this repository?**
1. [Repository Overview](../README.md) - What this repository contains
2. [Project Structure](./PROJECT_STRUCTURE.md) - Directory organization
3. [Getting Started Guide](../.claude/docs/guides/GETTING_STARTED.md) - First steps
4. [Development Guide](../.claude/docs/guides/DEVELOPMENT.md) - Development workflow & tools

**Looking for specific documentation?**
- [Universal Agent Framework](#universal-agent-framework-uaf) - UAF architecture & agents
- [DMB Almanac Project](#dmb-almanac-project) - Concert database PWA
- [Gemini MCP Server](#gemini-mcp-server) - MCP integration
- [Repository Audits](#repository-audits--reports) - Quality & compliance reports

---

## 📚 Universal Agent Framework (UAF)

### Architecture & Core Concepts
- [UAF Framework Overview](../.claude/docs/UAF_FRAMEWORK.md) - System architecture
- [Agent Coordination Guide](../.claude/docs/COORDINATION.md) - Multi-agent patterns (24KB)
- [Model Selection Policy](../.claude/docs/reference/MODEL_POLICY.md) - When to use Haiku/Sonnet/Opus
- [Deployment Status](../.claude/docs/DEPLOYMENT_STATUS.txt) - Current deployment state

### Agent & Skill Reference
- [Global Agent Index](../.claude/docs/reference/GLOBAL_INDEX.md) - **465 agents** across 49 categories
- [Agent Ecosystem Index](../.claude/docs/reference/AGENT_ECOSYSTEM_INDEX.md) - Category-based organization
- [Skill Cross-References](../.claude/docs/reference/SKILL_CROSS_REFERENCES.md) - 64KB cross-reference matrix
- [Rust Agent Library](../.claude/docs/reference/RUST_AGENTS_AND_SKILLS.md) - Rust-specific agents
- [SvelteKit Agent Library](../.claude/docs/reference/SVELTEKIT_AGENTS_AND_SKILLS.md) - SvelteKit specialists
- [WASM Agent Library](../.claude/docs/reference/WASM_AGENTS_AND_SKILLS.md) - WASM optimization agents

### Performance & Optimization
- [Ultimate Performance Index](../.claude/docs/reference/ULTIMATE_PERFORMANCE_INDEX.md) - Performance optimization agents
- [Efficiency & Accuracy Index](../.claude/docs/reference/EFFICIENCY_ACCURACY_INDEX.md) - Quality-focused agents

### Development Guides
- [Agent Creation Template](../.claude/docs/guides/AGENT_TEMPLATE.md) - Create new agents
- [Skill Creation Template](../.claude/docs/guides/SKILL_TEMPLATE.md) - Create new skills
- [Getting Started Guide](../.claude/docs/guides/GETTING_STARTED.md) - UAF basics
- [Development Guide](../.claude/docs/guides/DEVELOPMENT.md) - Pre-commit hooks, CI, Git workflow
- [Metrics Guide](../.claude/docs/guides/METRICS.md) - Performance tracking & baselines

### Audit Reports
- [Agent Completion Report](../.claude/docs/guides/COMPLETION_REPORT.md) - UAF deployment status
- [Swarm Deployment Report](../.claude/docs/guides/SWARM_DEPLOYMENT_REPORT.md) - Swarm architecture
- [Remediation Dashboard](../.claude/docs/guides/REMEDIATION_DASHBOARD.md) - Issue tracking
- [Modernization Audit](../.claude/docs/guides/MODERNIZATION_AUDIT.md) - Modernization status
- [Modernization Changes](../.claude/docs/guides/MODERNIZATION_CHANGES.md) - Implementation log

---

## 🎵 DMB Almanac Project

### Project Overview
- [Project README](../projects/dmb-almanac/README.md) - DMB Almanac overview
- [Project Documentation Index](../projects/dmb-almanac/docs/DOCS_INDEX.md) - Project-specific docs (71 files)
- [WASM Audit Overview](../projects/dmb-almanac/docs/WASM_AUDIT_OVERVIEW.md) - Complete WASM audit (extracted from root README)

### Analysis & Planning (71 docs)

**Analysis Reports** (`projects/dmb-almanac/docs/analysis/` - 6 files):
- [Chromium 143 Modernization](../projects/dmb-almanac/docs/analysis/CHROMIUM_143_MODERNIZATION_ANALYSIS.md)
- [Complexity Analysis](../projects/dmb-almanac/docs/analysis/COMPLEXITY_ANALYSIS.md)
- [D3 Simplification Analysis](../projects/dmb-almanac/docs/analysis/D3_SIMPLIFICATION_ANALYSIS.md)
- [PWA Analysis Report](../projects/dmb-almanac/docs/analysis/PWA_ANALYSIS_REPORT.md)
- [Tour Statistics](../projects/dmb-almanac/docs/analysis/TOUR_STATS_ANALYSIS.md)
- [Scraper Coverage](../projects/dmb-almanac/docs/analysis/SCRAPER_COVERAGE_ANALYSIS.md)

**Audit Reports** (`projects/dmb-almanac/docs/audits/` - 7 files):
- [DMB Audit Report](../projects/dmb-almanac/docs/audits/DMB_AUDIT_REPORT.md)
- [DMB Executive Summary](../projects/dmb-almanac/docs/audits/DMB_AUDIT_EXECUTIVE_SUMMARY.md)
- [WASM Audit Report](../projects/dmb-almanac/docs/audits/WASM_AUDIT_REPORT.md)
- [WASM Audit Summary](../projects/dmb-almanac/docs/audits/WASM_AUDIT_SUMMARY.md)
- [Scraping Audit](../projects/dmb-almanac/docs/audits/SCRAPING_AUDIT.md)

**Quick References** (`projects/dmb-almanac/docs/quick-references/` - 7 files):
- [DMB Quick Reference](../projects/dmb-almanac/docs/quick-references/DMB_QUICK_REFERENCE.md)
- [D3 Quick Reference](../projects/dmb-almanac/docs/quick-references/D3_QUICK_REFERENCE.md)
- [PWA Quick Wins](../projects/dmb-almanac/docs/quick-references/PWA_QUICK_WINS_GUIDE.md)
- [Chromium 143 Reference](../projects/dmb-almanac/docs/quick-references/CHROMIUM_143_QUICK_REFERENCE.md)

**Implementation Guides** (`projects/dmb-almanac/docs/implementation-guides/` - 7 files):
- [Chromium 143 Implementation](../projects/dmb-almanac/docs/implementation-guides/IMPLEMENTATION_GUIDE_CHROMIUM_143.md)
- [WASM Implementation Spec](../projects/dmb-almanac/docs/implementation-guides/WASM_IMPLEMENTATION_SPEC.md)
- [D3 Replacement Code](../projects/dmb-almanac/docs/implementation-guides/D3_REPLACEMENT_CODE.md)
- [PWA API Reference](../projects/dmb-almanac/docs/implementation-guides/PWA_API_REFERENCE.md)

**Scraping Documentation** (`projects/dmb-almanac/docs/scraping/` - 9 files):
- [Releases Scraper Report](../projects/dmb-almanac/docs/scraping/RELEASES_SCRAPER_REPORT.md)
- [Scraping Quickstart](../projects/dmb-almanac/docs/scraping/QUICKSTART.md)
- [Code Reference](../projects/dmb-almanac/docs/scraping/CODE_REFERENCE.md)
- [Tour Stats Extraction](../projects/dmb-almanac/docs/scraping/TOUR_STATS_EXTRACTION_GUIDE.md)

**UI Modernization** (`projects/dmb-almanac/docs/ui-modernization/` - 10 files):
- [GPU-Accelerated Animations](../projects/dmb-almanac/docs/ui-modernization/GPU-accelerated-animations.md)
- [View Transitions Patterns](../projects/dmb-almanac/docs/ui-modernization/View-transitions-patterns.md)
- [Scroll-Driven UI](../projects/dmb-almanac/docs/ui-modernization/Scroll-driven-ui.md)
- [Native Popovers](../projects/dmb-almanac/docs/ui-modernization/Native-popovers.md)

**Summary Reports** (`projects/dmb-almanac/docs/summaries/` - 13 files)

### Technical Analysis (731+ docs)

**App Documentation** (`projects/dmb-almanac/app/docs/` - 731 files across 30+ categories):

For the complete index of all 731 technical analysis docs, see the project's comprehensive documentation:

**Major Categories** (80+ docs on Chromium 143+ features):
- **Anchor Positioning** (19 docs) - CSS anchor positioning API
- **Container Queries** (11 docs) - Component-level responsive design
- **Popover API** (7 docs) - Native popover elements
- **Scheduler API** (8 docs) - Task scheduling & yielding
- **Scroll Animations** (17 docs) - CSS scroll-driven animations
- **Speculation Rules** (10 docs) - Prefetching & prerendering

**Additional Categories** (650+ docs):
- Accessibility patterns (15+ docs)
- Animation techniques (20+ docs)
- API design patterns (12+ docs)
- Async/performance optimization (18+ docs)
- Authentication & security (10+ docs)
- Bundle analysis & optimization (25+ docs)
- Caching strategies (15+ docs)
- Component architecture (30+ docs)
- CSS modernization (40+ docs)
- D3.js & data visualization (35+ docs)
- Database design & optimization (25+ docs)
- Deployment & DevOps (20+ docs)
- Developer experience (15+ docs)
- Error handling patterns (12+ docs)
- Form patterns & validation (10+ docs)
- And 15+ more categories...

**Note**: Due to the volume (731 files), see `projects/dmb-almanac/app/docs/` directory for complete file listings.

---

## 🤖 Gemini MCP Server

### Project Documentation
- [Gemini MCP README](../projects/gemini-mcp-server/README.md) - Project overview
- Additional documentation to be created as project develops

---

## 📊 Repository Audits & Reports

### 2026 January Audit (8 reports)
Location: `docs/audits/2026-01-audit/`

- [Agent Validation Report](./audits/2026-01-audit/AGENT_VALIDATION_REPORT.md)
- [Audit Completion Report](./audits/2026-01-audit/AUDIT_COMPLETION_REPORT.md)
- [Orphan Agents Report](./audits/2026-01-audit/ORPHAN_AGENTS_REPORT.md)
- [Final Audit Summary](./audits/2026-01-audit/FINAL_AUDIT_SUMMARY.md)
- [Pre-Audit Validation](./audits/2026-01-audit/PRE_AUDIT_VALIDATION.md)
- [Deferred Items Report](./audits/2026-01-audit/DEFERRED_ITEMS_REPORT.md)
- [Deployment Summary](./audits/2026-01-audit/DEPLOYMENT_SUMMARY.md)
- [Audit Index](./audits/README.md)

### File Organization Project
- [Completion Report](../.claude/audit/file-organization-completion.md) - 484-line comprehensive report (100/100 health score)

---

## 🛠️ Development & Infrastructure

### Repository Structure
- [Project Structure](./PROJECT_STRUCTURE.md) - Complete directory mapping
- [Structure Validation Script](../.claude/scripts/validate-structure.sh) - Automated checks (7 validations)

### CI/CD Workflows
Location: `.github/workflows/`

- [Workflow Documentation](../.github/workflows/README.md) - Complete workflow guide
- [Deployment Summary](../.github/workflows/DEPLOYMENT_SUMMARY.md) - Deployment tracking

**Active Workflows** (8 total):
1. `structure-validation.yml` - Repository structure checks ✨ NEW
2. `validate-agents.yml` - Agent YAML validation
3. `validate-openapi.yml` - API contract validation
4. `benchmark.yml` - Performance benchmarking
5. `security.yml` - Security scanning (Trivy, TruffleHog, CodeQL)
6. `audit-deps.yml` - Dependency auditing
7. `deploy-docs.yml` - Documentation deployment
8. Workflow documentation files (README, DEPLOYMENT_SUMMARY)

### Scripts & Automation
- [Validation Script](../.claude/scripts/validate-structure.sh) - Repository structure checks
- [Pre-commit Hook](../.git/hooks/pre-commit) - Automated validation on commit ✨ NEW

---

## 📈 Metrics & Performance

### Performance Baselines
- [Repository Baseline](../.claude/metrics/baseline.json) - Current performance snapshot ✨ NEW
- [Benchmark History](../.claude/benchmarks/history.txt) - Historical tracking ✨ NEW
- [Metrics Guide](../.claude/docs/guides/METRICS.md) - Performance tracking documentation ✨ NEW

### Monitoring Infrastructure
- [Metrics Reporter](../.claude/agents/monitoring/metrics_reporter.yaml) - Telemetry & analytics agent (563 lines)
- [Benchmark Framework](../.claude/agents/testing/benchmark_framework.yaml) - Performance testing agent (551 lines)

**Tracked Metrics**:
- UAF agent load time (threshold: <5000ms)
- YAML parsing & validation time
- DMB Almanac test pass rate (162/162 tests)
- Build success & bundle size
- Structure validation (7 checks)
- Stale reference count (target: 0)

---

## 🔍 How to Find Documentation

### By Topic
1. **Agent/Skill Development** → [UAF Reference](#universal-agent-framework-uaf)
2. **DMB Project Implementation** → [DMB Almanac](#dmb-almanac-project)
3. **Modern Browser Features** → [DMB App Docs - Chromium 143+](#technical-analysis-731-docs)
4. **Repository Governance** → [Audits & Reports](#repository-audits--reports)
5. **CI/CD & DevOps** → [Development & Infrastructure](#development--infrastructure)
6. **Performance Tracking** → [Metrics & Performance](#metrics--performance)

### By File Type
- **Architecture docs** → `.claude/docs/` (25 files)
- **Project docs** → `projects/*/docs/` (71+ files)
- **Technical analysis** → `projects/dmb-almanac/app/docs/` (731 files)
- **Audit reports** → `docs/audits/` (8 files)
- **Workflow docs** → `.github/workflows/` (8 files)
- **Metrics & baselines** → `.claude/metrics/`, `.claude/benchmarks/`

### By Recency
- **Latest**: Phase 3 Enhancements (2026-01-25) - Pre-commit hooks, CI validation, this index, metrics baseline
- **Recent**: File Organization Completion Report (2026-01-25) - 100/100 health score
- **Recent**: 2026 January Audit (8 reports)
- **Ongoing**: DMB Almanac development docs (731 files)

---

## 📝 Documentation Standards

### File Naming Conventions
- **Kebab-case**: `my-document.md` (preferred for multi-word files)
- **ALL_CAPS**: `GLOBAL_INDEX.md` (for major reference docs)
- **Descriptive names**: `CHROMIUM_143_IMPLEMENTATION.md` not `guide.md`
- **Dated audits**: `2026-01-audit/` directory structure

### Location Guidelines
- **Architecture & framework** → `.claude/docs/`
- **Project-specific** → `projects/{project}/docs/`
- **Technical deep-dives** → `projects/{project}/app/docs/`
- **Repository audits** → `docs/audits/YYYY-MM-audit/`
- **Development guides** → `.claude/docs/guides/`
- **Performance metrics** → `.claude/metrics/`, `.claude/benchmarks/`

### Maintenance
- **Update this index** when adding major documentation sections
- **Archive old audits** to `docs/audits/archive/` when superseded
- **Keep timestamps** on all audit and report files
- **Cross-reference** related documentation

---

## 🚀 Recent Additions

### Phase 3 Enhancements (2026-01-25)
- ✨ **Pre-commit hooks** - Automated validation on every commit
- ✨ **CI structure validation** - GitHub Actions workflow preventing drift
- ✨ **This master index** - Unified navigation for 835+ documentation files
- ✨ **Performance baseline** - Metrics tracking for repository & UAF efficiency
- ✨ **Development guide** - Complete workflow documentation
- ✨ **Metrics guide** - Baseline tracking & regression detection

### File Organization Excellence (2026-01-25)
- ✅ 563 files organized into 30+ categories
- ✅ All 1,491 stale references updated
- ✅ README.md cleaned (350→106 lines)
- ✅ 100/100 health score achieved
- ✅ Validation script with 7 automated checks

---

**Total Files Indexed**: 835+ markdown documentation files
**Repository Health Score**: 100/100 ✅
**Last Updated**: 2026-01-25
**Maintained By**: Claude Code automation

**Questions?** Start with the [Quick Start](#-quick-start) section or explore by [Topic](#-how-to-find-documentation).
