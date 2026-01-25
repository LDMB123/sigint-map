# Project Structure Guide

**Last Updated**: 2026-01-25
**Repository**: ClaudeCodeProjects
**Health Score**: 99/100

---

## Overview

ClaudeCodeProjects is a multi-layered repository containing:
1. **Universal Agent Framework (UAF)** - 465 agents across 49 categories
2. **DMB Almanac** - Dave Matthews Band concert database PWA
3. **Gemini MCP Server** - Google Gemini API integration via MCP

---

## Directory Structure

```
/Users/louisherman/ClaudeCodeProjects/
│
├── README.md                    # Repository overview
├── .gitignore                   # Git exclusions
│
├── .claude/                     # Universal Agent Framework (UAF)
│   ├── agents/                  # 465 agent definitions (49 categories)
│   │   ├── accuracy/           # Performance tracking (1 agent)
│   │   ├── ai-ml/              # AI/ML engineering (7 agents)
│   │   ├── analyzers/          # Code analysis (3 agents)
│   │   ├── apple-silicon/      # M-series optimization (4 agents)
│   │   ├── caching/            # Cache strategies (10 agents)
│   │   ├── debuggers/          # Debugging specialists (18 agents)
│   │   ├── documentation/      # Documentation (1 agent)
│   │   ├── orchestrators/      # Workflow orchestration (15 agents)
│   │   ├── validators/         # Validation (80 agents - largest)
│   │   └── [40 more categories...]
│   │
│   ├── commands/               # 95 skill files
│   ├── skills/                 # 34 skill files
│   ├── audit/                  # 58 analysis files
│   ├── config/                 # 6 config files
│   ├── context/                # 5 context files
│   ├── docs/                   # Organized documentation
│   │   ├── architecture/      # Framework design (3 files)
│   │   ├── reference/         # Indexes, rosters (13 files)
│   │   └── guides/            # Templates, how-tos (10 files)
│   ├── lib/                    # 6 library files
│   ├── optimization/           # 9 optimization files
│   ├── runtime/                # 6 runtime files
│   ├── scripts/                # 12 utility scripts
│   ├── swarms/                 # 4 swarm configs
│   ├── telemetry/              # 4 telemetry files
│   ├── templates/              # 5 template files
│   ├── tests/                  # 6 test files
│   ├── triggers/               # 2 trigger files
│   ├── settings.local.json     # Active configuration
│   └── README.md               # UAF overview
│
├── .github/                     # CI/CD workflows
│   └── workflows/              # 7 GitHub Actions workflows
│
├── docs/                        # Repository documentation
│   ├── audits/                 # Historical audit reports
│   │   ├── README.md          # Audit index
│   │   └── 2026-01-audit/     # January 2026 audit (8 files)
│   ├── architecture/           # (Future) System architecture
│   ├── guides/                 # (Future) User guides
│   ├── reference/              # (Future) Reference docs
│   └── PROJECT_STRUCTURE.md    # This file
│
├── archive/                     # Historical artifacts
│   └── backups/                # Archived backups
│       ├── README.md          # Backup inventory
│       └── 2026-01-25_pre-reorganization/
│           ├── .claude_backup_20260125_015458/
│           └── .claude_backup_skills_20260125_015831/
│
└── projects/                    # Active projects
    ├── dmb-almanac/            # DMB Almanac PWA (2.0GB)
    │   ├── app/               # Main SvelteKit application
    │   │   ├── src/          # Application source
    │   │   │   ├── lib/     # Shared libraries
    │   │   │   └── routes/  # SvelteKit routes (37 directories)
    │   │   ├── wasm/        # 6 Rust WASM modules
    │   │   │   ├── dmb-core/
    │   │   │   ├── dmb-date-utils/
    │   │   │   ├── dmb-force-simulation/
    │   │   │   ├── dmb-segue-analysis/
    │   │   │   ├── dmb-string-utils/
    │   │   │   ├── dmb-transform/
    │   │   │   └── dmb-visualize/
    │   │   ├── scripts/     # 40 utility scripts
    │   │   ├── scraper/     # dmbalmanac.com scraper
    │   │   ├── docs/        # Project documentation
    │   │   │   ├── README.md
    │   │   │   ├── architecture/
    │   │   │   ├── analysis/  # 108 analysis files (14 categories)
    │   │   │   │   ├── accessibility/ (3 files)
    │   │   │   │   ├── async/ (3 files)
    │   │   │   │   ├── bundle/ (1 file)
    │   │   │   │   ├── css/ (8 files)
    │   │   │   │   ├── error-handling/ (5 files)
    │   │   │   │   ├── indexeddb/ (6 files)
    │   │   │   │   ├── memory/ (4 files)
    │   │   │   │   ├── offline/ (1 file)
    │   │   │   │   ├── performance/ (6 files)
    │   │   │   │   ├── pwa/ (13 files)
    │   │   │   │   ├── voice/ (2 files)
    │   │   │   │   ├── wasm/ (7 files)
    │   │   │   │   ├── webgpu/ (4 files)
    │   │   │   │   └── misc/ (45 files)
    │   │   │   ├── performance/
    │   │   │   └── reference/
    │   │   ├── data/        # 22MB SQLite database
    │   │   ├── static/      # PWA assets
    │   │   ├── package.json
    │   │   ├── tsconfig.json
    │   │   ├── svelte.config.js
    │   │   └── vite.config.ts
    │   ├── docs/            # Reference documentation
    │   ├── .claude/         # Project-level agent config
    │   └── missing_setlist_shows.csv
    │
    └── gemini-mcp-server/   # Gemini MCP integration (116KB)
        ├── src/            # TypeScript source
        ├── dist/           # Compiled output (after build)
        ├── package.json
        └── tsconfig.json
```

---

## File Placement Rules

### Where to Put New Files

| File Type | Location | Example |
|-----------|----------|---------|
| **Agent definition (YAML)** | `.claude/agents/{category}/` | `.claude/agents/validators/schema.yaml` |
| **Skill/command** | `.claude/commands/` or `.claude/skills/` | `.claude/commands/test-runner.md` |
| **Audit report** | `docs/audits/{YYYY-MM-audit}/` | `docs/audits/2026-02-audit/` |
| **Architecture doc** | `docs/architecture/` | `docs/architecture/agent-orchestration.md` |
| **User guide** | `docs/guides/` | `docs/guides/contributing.md` |
| **Reference doc** | `docs/reference/` | `docs/reference/api-index.md` |
| **Project source** | `projects/{project-name}/` | `projects/new-project/` |
| **Backup/archive** | `archive/{type}/{date}/` | `archive/backups/2026-02-01/` |
| **DMB analysis** | `projects/dmb-almanac/app/docs/analysis/{category}/` | `projects/dmb-almanac/app/docs/analysis/performance/` |

### Files That Must NOT Move

**Root Level**:
- `README.md` - Repository entry point
- `.gitignore` - Git exclusions
- `.github/` - GitHub expects this location
- `LICENSE` - If present, must be at root

**.claude/ Structure**:
- `settings.local.json` - Claude Code expects this path
- Agent/skill/command structure - Well-organized, keep stable

**Project Roots**:
- `package.json` - npm/yarn/pnpm expects root of project
- `tsconfig.json` - TypeScript compiler expects root
- `svelte.config.js` - SvelteKit expects root
- `vite.config.ts` - Vite expects root

---

## Common Operations

### Adding a New Agent

1. Choose the appropriate category in `.claude/agents/{category}/`
2. Create YAML file: `.claude/agents/{category}/agent-name.yaml`
3. Follow the template in `.claude/docs/guides/AGENT_TEMPLATE.md`
4. Update `.claude/docs/reference/GLOBAL_INDEX.md`
5. Test agent invocation

### Adding a New Project

1. Create directory: `projects/{project-name}/`
2. Initialize project structure within that directory
3. Add project-specific `.claude/` config if needed
4. Update root `README.md` with project link

### Creating an Audit

1. Create dated directory: `docs/audits/YYYY-MM-audit/`
2. Run audit tools and document findings
3. Create audit summary and index
4. Update `docs/audits/README.md`
5. Link from root `README.md`

### Organizing Analysis Files

For DMB Almanac analysis files:
1. Determine category (accessibility, performance, security, etc.)
2. Place in: `projects/dmb-almanac/app/docs/analysis/{category}/`
3. Update `projects/dmb-almanac/app/docs/analysis/README.md`
4. Use descriptive naming: `CATEGORY_SPECIFIC_ANALYSIS.md`

---

## Directory Purposes

| Directory | Purpose | Owner | Contents |
|-----------|---------|-------|----------|
| `.claude/` | UAF framework | Framework | Agents, skills, commands, settings |
| `.github/` | CI/CD | GitHub | Workflows, Actions |
| `docs/` | Repository docs | Repository | Audits, guides, architecture |
| `archive/` | Historical | Repository | Backups, old analyses |
| `projects/` | Active projects | Projects | DMB Almanac, MCP server, etc. |
| `projects/dmb-almanac/app/` | DMB Almanac app | DMB Almanac | SvelteKit app, WASM, docs |

---

## Navigation Quick Reference

### Finding Documentation

**UAF Framework**:
- Overview: `.claude/README.md`
- Full framework guide: `.claude/docs/architecture/UAF_FRAMEWORK.md`
- Agent index: `.claude/docs/reference/GLOBAL_INDEX.md`
- Create agent: `.claude/docs/guides/AGENT_TEMPLATE.md`

**Repository**:
- Structure: This file (`docs/PROJECT_STRUCTURE.md`)
- Audits: `docs/audits/README.md`
- Main README: `README.md`

**DMB Almanac**:
- App README: `projects/dmb-almanac/app/README.md`
- Analysis docs: `projects/dmb-almanac/app/docs/analysis/README.md`
- Architecture: `projects/dmb-almanac/app/docs/architecture/`

**Gemini MCP**:
- Project: `projects/gemini-mcp-server/README.md` (if exists)

---

## Recent Changes (2026-01-25)

This structure was created during the file organization refactor on January 25, 2026. Major changes:

1. **Root Cleanup**: 9 audit reports moved to `docs/audits/2026-01-audit/`
2. **Backup Archival**: 2 dated backups moved to `archive/backups/`
3. **Project Restructure**: Created `projects/` directory
   - `DMBAlmanacProjectFolder/` → `projects/dmb-almanac/`
   - `gemini-mcp-server/` → `projects/gemini-mcp-server/`
4. **DMB Cleanup**:
   - `dmb-almanac-svelte/` → `app/`
   - 108 markdown files organized into 14 analysis categories
5. **.claude/ Cleanup**: 26 markdown files organized into 3 subdirectories
6. **Agent Consolidation**: `docs/` category merged into `documentation/`

See git commit history on `file-organization` branch for full details.

---

## Build Artifacts (Gitignored)

The following directories contain build artifacts and should **not** be committed:

- `node_modules/` - npm dependencies
- `build/` - Production builds
- `.svelte-kit/` - SvelteKit build artifacts
- `dist/` - Compiled output
- `.DS_Store` - macOS metadata

These are excluded via `.gitignore`.

---

## Best Practices

### Do
- ✓ Follow the directory structure outlined above
- ✓ Use descriptive, consistent naming
- ✓ Update index files when adding/removing agents
- ✓ Document significant changes in git commits
- ✓ Keep root directory clean (only essential files)
- ✓ Organize by function, not technology
- ✓ Use git mv to preserve history

### Don't
- ✗ Add files directly to repository root
- ✗ Create new top-level directories without planning
- ✗ Mix concerns (analysis files in source code directories)
- ✗ Duplicate documentation across locations
- ✗ Commit build artifacts (node_modules, build, dist)
- ✗ Use dated backup directories at root
- ✗ Organize agents by technology domain

---

## Getting Help

- **UAF Framework**: See `.claude/docs/guides/GETTING_STARTED.md`
- **DMB Almanac**: See `projects/dmb-almanac/app/docs/`
- **Audits**: See `docs/audits/README.md`
- **Structure Questions**: This file

---

*Last updated: 2026-01-25*
*Repository Health: 99/100*
*Total Files: 12,000+ across all projects*
