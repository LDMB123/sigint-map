# Current Structure Map: ClaudeCodeProjects

**Date**: 2026-01-25
**Purpose**: Complete inventory of repository structure before reorganization

---

## Top-Level Directory Tree

```
/Users/louisherman/ClaudeCodeProjects/ (2.1GB)
├── .DS_Store (12KB)
├── .github/ (7 files)
├── .claude/ (6.6MB - ACTIVE)
├── .claude_backup_20260125_015458/ (6.9MB)
├── .claude_backup_skills_20260125_015831/ (284KB)
├── projects/dmb-almanac/app/ (2.0GB)
├── gemini-mcp-server/ (116KB)
├── AGENT_VALIDATION_REPORT.md (12K)
├── AUDIT_COMPLETION_REPORT.md (16K)
├── AUDIT_DELIVERABLES_INDEX.md (16K)
├── FINAL_AUDIT_SUMMARY.md (12K)
├── ORPHAN_AGENTS_REPORT.md (12K)
├── README.md (12K)
├── README_AUDIT_COMPLETE.md (4K)
├── claude-code-audit-report.md (20K)
└── test-skill.md (4K)
```

**Total Items**: 18 (7 directories, 11 files)
**Root Clutter**: 9 audit reports + 1 test file = 10 files that should be organized

---

## .claude/ Directory (UAF Framework)

### Structure

```
.claude/ (6.6MB)
├── agents/ (50 categories, 49 YAML files)
├── audit/ (58 analysis files)
├── commands/ (95 skill files)
├── config/ (6 config files)
├── context/ (5 context files)
├── docs/ (3 documentation files)
├── lib/ (6 library files)
├── optimization/ (9 optimization files)
├── runtime/ (6 runtime files)
├── scripts/ (12 utility scripts)
├── settings.local.json
├── skills/ (34 skill files)
├── swarms/ (4 swarm configs)
├── telemetry/ (4 telemetry files)
├── templates/ (5 template files)
├── tests/ (6 test files)
├── triggers/ (2 trigger files)
└── [30+ markdown documentation files]
```

### Agent Categories (50 total)

| Category | Agent Count | Notes |
|----------|-------------|-------|
| accuracy | 1 | Performance tracking |
| ai-ml | 7 | ML/AI engineering |
| amplification | 1 | Performance amplification |
| analyzers | 3 | Code analysis |
| apple-silicon | 4 | M-series optimization |
| caching | 10 | Cache strategies |
| cognitive | 1 | Cognitive architectures |
| compound | 11 | Multi-agent orchestration |
| compression | 4 | Token/context compression |
| content | 9 | Content creation |
| data | 7 | Data engineering |
| debuggers | 18 | Debugging specialists |
| devops | 10 | DevOps/infrastructure |
| dmb | 19 | DMB Almanac-specific |
| **docs** | **3** | **⚠️ DUPLICATE** |
| **documentation** | **4** | **⚠️ DUPLICATE** |
| ecommerce | 8 | E-commerce specialists |
| efficiency | 1 | Efficiency optimization |
| events | 7 | Live event production |
| generators | 3 | Code generation |
| guardians | 1 | Safety/security |
| infinite-scale | 1 | Scalability |
| integrators | 5 | System integration |
| learners | 2 | Self-learning agents |
| mcp | 1 | MCP integration |
| monitoring | 6 | Observability |
| neural-routing | 4 | Intelligent routing |
| omniscient | 1 | System-wide awareness |
| orchestrators | 15 | Workflow orchestration |
| predictive | 5 | Predictive systems |
| prefetching | 1 | Prefetch optimization |
| quantum-parallel | 3 | Quantum-inspired patterns |
| reality-bending | 1 | Advanced architectures |
| reporters | 1 | Reporting/analytics |
| **rust** | **0** | **⚠️ EMPTY** |
| security | 7 | Security specialists |
| self-improving | 3 | Self-optimization |
| shared | 1 | Shared utilities |
| speculative | 3 | Speculative execution |
| **sveltekit** | **0** | **⚠️ EMPTY** |
| swarms | 6 | Swarm coordination |
| synthesized | 1 | Knowledge synthesis |
| temporal | 1 | Time-based operations |
| testing | 9 | Testing specialists |
| transformers | 5 | Data transformation |
| validators | 80 | Validation specialists (LARGEST) |
| **wasm** | **0** | **⚠️ EMPTY** |
| workflows | 4 | Workflow management |
| zero-latency | 1 | Latency optimization |

**Total**: 50 categories, 49 agent files

**Issues**:
- 2 duplicate categories: `docs/` and `documentation/` (semantic overlap)
- 3 empty categories: `rust/`, `sveltekit/`, `wasm/` (can be removed)

### Audit Directory (58 files)

```
.claude/audit/
├── INDEX.md (navigation)
├── phase-0/ (environment verification)
├── phase-1/ (inventory)
├── phase-2/ (validation)
├── phase-3/ (smoke tests)
├── phase-4/ (optimization)
└── phase-5/ (gap resolution)
```

**Status**: Well-organized, keep as-is

### Markdown Documentation (30+ files at root)

| File | Size | Purpose |
|------|------|---------|
| AGENT_ECOSYSTEM_INDEX.md | 8K | Agent category index |
| AGENT_TEMPLATE.md | 24K | Agent creation template |
| AUDIT_ARTIFACTS.txt | 8K | Audit output inventory |
| AUDIT_SUMMARY.md | 9K | Audit results summary |
| COMPLETION_REPORT.md | 12K | Completion status |
| COORDINATION.md | 24K | Agent coordination guide |
| DEPLOYMENT_STATUS.txt | 16K | Deployment tracking |
| EFFICIENCY_ACCURACY_INDEX.md | 7K | Efficiency metrics |
| GLOBAL_INDEX.md | 13K | Master agent index |
| MODEL_POLICY.md | 16K | Model tier policy |
| MODERNIZATION_AUDIT.md | 17K | Modernization audit |
| MODERNIZATION_CHANGES.md | 10K | Change log |
| PERFORMANCE_AMPLIFICATION_INDEX.md | 7K | Performance index |
| README.md | 4K | UAF framework overview |
| REMEDIATION_DASHBOARD.md | 6K | Issue tracking |
| RUST_AGENT_ROSTER.md | 12K | Rust agent inventory |
| RUST_SKILLS_LIBRARY.md | 9K | Rust skill library |
| SKILL_CROSS_REFERENCES.md | 64K | Skill capability matrix |
| SKILL_TEMPLATE.md | 17K | Skill creation template |
| SVELTEKIT_AGENT_ROSTER.md | 11K | SvelteKit agent inventory |
| SVELTEKIT_SKILLS_LIBRARY.md | 7K | SvelteKit skill library |
| SWARM_DEPLOYMENT_REPORT.md | 11K | Swarm status |
| ULTIMATE_PERFORMANCE_INDEX.md | 16K | Performance master index |
| WASM_AGENT_ROSTER.md | 10K | WASM agent inventory |
| WASM_SKILLS_LIBRARY.md | 6K | WASM skill library |
| [5+ other files] | - | Various |

**Issue**: 30+ markdown files at .claude/ root → Should be organized into subdirectories

**Proposed Organization**:
- `.claude/docs/architecture/` - Framework design, coordination
- `.claude/docs/reference/` - Indexes, cross-references, rosters
- `.claude/docs/guides/` - Templates, workflows

---

## projects/dmb-almanac/app/ (2.0GB)

### Top-Level Structure

```
projects/dmb-almanac/app/
├── [107 MARKDOWN FILES AT ROOT] ⚠️
├── dmb-almanac-svelte/ (1.9GB - main app)
├── docs/ (reference documentation)
├── .claude/ (project-level config)
└── missing_setlist_shows.csv
```

### Root Markdown Clutter (107 files)

**Breakdown by Category**:

| Category | Count | Pattern | Example Files |
|----------|-------|---------|---------------|
| Accessibility | 10+ | A11Y_*.md | A11Y_AUDIT_COMPLETE.md, A11Y_ARIA_PATTERNS.md |
| Performance | 15+ | PERFORMANCE_*.md | PERFORMANCE_AUDIT.md, PERFORMANCE_LCP.md |
| WASM | 8+ | WASM_*.md | WASM_ANALYSIS.md, WASM_OPTIMIZATION.md |
| Bundle | 5+ | BUNDLE_*.md | BUNDLE_ANALYSIS.md, BUNDLE_SIZE.md |
| CSS | 8+ | CSS_*.md | CSS_AUDIT.md, CSS_PERFORMANCE.md |
| Async | 4+ | ASYNC_*.md | ASYNC_DEBUGGING.md, ASYNC_PATTERNS.md |
| Error Handling | 6+ | ERROR_*.md | ERROR_BOUNDARIES.md, ERROR_HANDLING.md |
| IndexedDB | 4+ | INDEXEDDB_*.md | INDEXEDDB_AUDIT.md, INDEXEDDB_PERFORMANCE.md |
| Memory | 3+ | MEMORY_*.md | MEMORY_LEAK_ANALYSIS.md, MEMORY_PROFILING.md |
| PWA | 12+ | PWA_*.md | PWA_AUDIT.md, PWA_OFFLINE.md, PWA_MANIFEST.md |
| Voice | 2+ | VOICE_*.md | VOICE_SEARCH.md, VOICE_UI.md |
| WebGPU | 2+ | WEBGPU_*.md | WEBGPU_ANALYSIS.md, WEBGPU_PERFORMANCE.md |
| Security | 5+ | SECURITY_*.md | SECURITY_AUDIT.md, SECURITY_CSP.md |
| Offline | 4+ | OFFLINE_*.md | OFFLINE_STRATEGY.md, OFFLINE_SYNC.md |
| Network | 3+ | NETWORK_*.md | NETWORK_OPTIMIZATION.md, NETWORK_DEBUGGING.md |
| Service Worker | 6+ | SW_*.md | SW_DEBUGGING.md, SW_CACHING.md |
| Database | 3+ | DB_*.md | DB_MIGRATION.md, DB_OPTIMIZATION.md |
| Other | 10+ | Various | ARCHITECTURE.md, DEPLOYMENT.md, etc. |

**Total**: 107 markdown files across 17+ categories

**Issue**: Analysis outputs mixed with source code → Should be in docs/analysis/

### dmb-almanac-svelte/ (1.9GB)

```
dmb-almanac-svelte/
├── src/
│   ├── lib/
│   │   ├── components/ (Svelte 5 components)
│   │   ├── db/ (SQLite + Dexie.js)
│   │   ├── errors/
│   │   ├── hooks/
│   │   ├── motion/
│   │   ├── pwa/
│   │   ├── security/
│   │   ├── server/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── styles/
│   │   ├── sw/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── wasm/
│   │   └── workers/
│   └── routes/ (37 route directories)
│
├── wasm/ (6 Rust WASM modules)
│   ├── dmb-core/
│   ├── dmb-date-utils/
│   ├── dmb-force-simulation/
│   ├── dmb-segue-analysis/
│   ├── dmb-string-utils/
│   ├── dmb-transform/
│   └── dmb-visualize/
│
├── scripts/ (40 TypeScript utility scripts)
├── scraper/ (dmbalmanac.com scraper)
├── docs/ (architecture + performance)
├── data/ (22MB SQLite database)
├── static/ (PWA assets)
├── build/ (48MB - should be gitignored)
├── .svelte-kit/ (51MB - should be gitignored)
├── node_modules/ (226MB - should be gitignored)
├── package.json
├── tsconfig.json
├── svelte.config.js
└── vite.config.ts
```

**Status**: Well-organized internally, but parent directory needs cleanup

---

## gemini-mcp-server/ (116KB)

```
gemini-mcp-server/
├── src/ (TypeScript source)
├── dist/ (Compiled JavaScript)
├── package.json
└── tsconfig.json
```

**Status**: ✓ Well-organized, minimal changes needed (just move to projects/)

---

## .github/ Directory

```
.github/
├── workflows/
│   ├── validate-agents.yml
│   ├── security.yml
│   ├── deploy-docs.yml
│   ├── validate-openapi.yml
│   ├── benchmark.yml
│   └── audit-deps.yml
├── DEPLOYMENT_COMPLETE.txt
└── WORKFLOW_QUICK_REFERENCE.md
```

**Status**: ✓ Standard GitHub structure, keep as-is

---

## Backup Directories (13MB duplication)

| Directory | Size | Created | Status |
|-----------|------|---------|--------|
| .claude/ | 6.6MB | Active | KEEP |
| .claude_backup_20260125_015458/ | 6.9MB | 01/25 01:54 AM | Archive |
| .claude_backup_skills_20260125_015831/ | 284KB | 01/25 01:58 AM | Archive |

**Issue**: Dated backups at root → Should be in archive/backups/

---

## Root Clutter Inventory

| File | Size | Type | Proposed Action |
|------|------|------|----------------|
| README.md | 12K | Documentation | KEEP (main entry point) |
| AGENT_VALIDATION_REPORT.md | 12K | Audit report | → docs/audits/2026-01-audit/ |
| AUDIT_COMPLETION_REPORT.md | 16K | Audit report | → docs/audits/2026-01-audit/ |
| AUDIT_DELIVERABLES_INDEX.md | 16K | Audit report | → docs/audits/2026-01-audit/ |
| FINAL_AUDIT_SUMMARY.md | 12K | Audit report | → docs/audits/2026-01-audit/ |
| ORPHAN_AGENTS_REPORT.md | 12K | Audit report | → docs/audits/2026-01-audit/ |
| README_AUDIT_COMPLETE.md | 4K | Audit report | → docs/audits/2026-01-audit/ |
| claude-code-audit-report.md | 20K | Audit report | → docs/audits/2026-01-audit/ |
| test-skill.md | 4K | Test artifact | DELETE |
| .DS_Store | 12K | macOS metadata | Add to .gitignore |

**Summary**:
- Keep: 1 file (README.md)
- Move: 7 files (audit reports)
- Delete: 1 file (test-skill.md)
- Ignore: 1 file (.DS_Store)

---

## Size Breakdown

| Directory | Size | % of Total |
|-----------|------|------------|
| projects/dmb-almanac/app/ | 2.0GB | 95.2% |
| - node_modules/ | 226MB | 10.8% |
| - build/ | 48MB | 2.3% |
| - .svelte-kit/ | 51MB | 2.4% |
| - data/ | 22MB | 1.0% |
| - Other | 1.7GB | 81.0% |
| .claude/ | 6.6MB | 0.3% |
| .claude_backup_20260125_015458/ | 6.9MB | 0.3% |
| .claude_backup_skills_20260125_015831/ | 284KB | 0.01% |
| gemini-mcp-server/ | 116KB | 0.01% |
| .github/ | ~100KB | 0.005% |
| Root files | 108KB | 0.005% |
| **TOTAL** | **~2.1GB** | **100%** |

**Build Artifacts** (should be gitignored): 325MB (15.5% of total)

---

## Pattern Summary

### Good Patterns ✓

1. **Agent Organization**: 50 functional categories (not technology-specific)
2. **WASM Isolation**: 6 separate Rust crates with clear boundaries
3. **SvelteKit Structure**: Standard src/lib/ and src/routes/ layout
4. **Configuration Separation**: .claude/ keeps framework config isolated
5. **Relative Paths**: Scripts use process.cwd() + relative imports

### Problematic Patterns ⚠️

1. **Root Clutter**: 9 audit reports + 1 test file at root
2. **Backup Proliferation**: 3 backup directories (13MB duplication)
3. **Documentation Fragmentation**: 5+ locations for markdown files
4. **DMB Root Clutter**: 107 analysis files at project root
5. **Agent Category Duplication**: docs/ vs documentation/
6. **Empty Agent Categories**: rust/, sveltekit/, wasm/ (0 agents)
7. **Build Artifacts in VCS Area**: node_modules/, build/, .svelte-kit/

---

## Key Insights

### What Works Well

1. **Agent Framework**: UAF is well-designed with functional categorization
2. **Recent Audit**: 99/100 health score shows system is in good shape
3. **Project Structure**: Individual projects are well-organized internally
4. **Path Independence**: Minimal hardcoded paths (safe to reorganize)
5. **Technology Diversity**: Supports multiple languages/frameworks

### What Needs Improvement

1. **File Organization**: Too many files at wrong levels (root, DMB root)
2. **Backup Strategy**: No clear archival process (accumulating at root)
3. **Documentation**: No single source of truth (fragmented across 5+ locations)
4. **Naming Consistency**: "projects/dmb-almanac/app" vs "gemini-mcp-server"
5. **Gitignore**: Missing .gitignore (build artifacts present)

### Reorganization Readiness

**Ready**: ✓ YES
- Minimal path dependencies
- Recent audit validates system health
- Well-defined functional boundaries
- No active development blocking changes

**Risk Level**: LOW to MEDIUM
- Most moves are documentation (low risk)
- Project restructure requires build verification (medium risk)
- Agent category merge requires system validation (medium risk)

---

*Structure map created: 2026-01-25*
*Total items inventoried: 200+ files across 18 root items*
*Reorganization recommendation: PROCEED with 6-chunk incremental approach*
