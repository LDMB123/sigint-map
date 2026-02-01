# ClaudeCodeProjects Workspace

Multi-project Claude Code workspace with agent-driven development patterns.

## Projects

- `projects/dmb-almanac/` - Dave Matthews Band concert database PWA (SvelteKit 2, Svelte 5, SQLite, Dexie.js)
- `projects/emerson-violin-pwa/` - Violin tuner PWA
- `projects/imagen-experiments/` - Google Imagen API experiments

## Workspace Commands

```bash
# List all projects
ls projects/

# Navigate to project
cd projects/dmb-almanac/

# Global agent operations
.claude/scripts/audit-all-agents.sh       # Audit all agents
.claude/scripts/comprehensive-validation.sh  # Validate configuration
```

## Agent System

This workspace uses:
- **14 reusable skills** in `.claude/skills/`
- **Parallelization config** supporting 130 concurrent agents (burst: 185)
- **Route table** for zero-overhead agent selection
- **MCP servers** (Claude Code only): gemini, puppeteer, github, filesystem, fetch, memory, sqlite
  - Note: Desktop Chat (claude.ai) uses separate MCP config and may have 0 servers
  - MCP servers are configured in `~/.claude.json` under `mcpServers`

## Architecture

```
ClaudeCodeProjects/
├── .claude/              # Shared agent infrastructure
│   ├── skills/          # 14 reusable skills
│   ├── config/          # Parallelization, routing, caching
│   ├── scripts/         # Validation and audit scripts
│   └── templates/       # Agent and skill templates
├── projects/            # Individual projects
│   ├── dmb-almanac/    # 22MB concert database (main project)
│   ├── emerson-violin-pwa/
│   └── imagen-experiments/
├── _archived/           # 2,459 historical files
└── docs/                # Workspace documentation
    ├── reports/         # Audit and analysis reports
    └── summaries/       # Project summaries
```

## Quick Start

### For New Claude Sessions

1. Check which project to work on
2. Navigate to project directory
3. Read project's CLAUDE.md for specific commands
4. Use skills from `.claude/skills/` as needed

### Common Workflows

**Start DMB Almanac development:**
```bash
cd projects/dmb-almanac
npm install
npm run dev
```

**Run workspace-wide validation:**
```bash
.claude/scripts/comprehensive-validation.sh
```

**Audit agent configuration:**
```bash
.claude/scripts/audit-all-agents.sh
```

## Key Technologies

- **Framework**: SvelteKit 2, Svelte 5 (runes-based reactivity)
- **Database**: SQLite (server) + Dexie.js (client)
- **Build**: Vite
- **PWA**: Workbox, vite-plugin-pwa
- **Target**: Chromium 143+ on Apple Silicon (macOS 26.2)

## Gotchas

### Agent System
- **Agent parallelization**: Max 130 concurrent (100 haiku + 25 sonnet + 5 opus)
- **Skills format**: Must use `skill-name/SKILL.md` with YAML frontmatter (NOT standalone .md or YAML files)
- **Route table**: Pre-compiled - regenerate after adding agents
- **Agents location**: Must be in `.claude/agents/` (NOT in skills/ or docs/)

### Organization
- **Workspace root**: Only CLAUDE.md, README.md, LICENSE, .gitignore, package.json allowed
- **Project roots**: Max 3 markdown files before requiring docs/ directory
- **Scattered files**: Run `.claude/scripts/enforce-organization.sh` to check
- **Git commits**: Organization hook blocks commits with scattered files - use `--no-verify` cautiously
- **Backup files**: Must be in `_archived/` directory, not scattered in project

### Documentation
- **Reports location**: Always in `docs/reports/`, never workspace or project root
- **Duplicate files**: Different files can have same name if in different subdirectories (e.g., each project can have its own AUDIT_SUMMARY.md)
- **Archive vs docs**: `_archived/` for old/obsolete files, `docs/archive/` for historical but relevant documentation

### Skills & Agents
- **Skills**: Directory structure with SKILL.md (e.g., `.claude/skills/parallel-agent-validator/SKILL.md`)
- **Large skills**: Extract detailed algorithms/references to separate files (e.g., `algorithms-reference.md`)
- **Invalid formats**: No standalone YAML files, no skill files outside `.claude/skills/` directory

## Report Writing Standards

When writing reports:
- Use bullet points, not paragraphs
- No introductions or conclusions
- Technical shorthand allowed (e.g., "impl" for implementation)
- Omit articles (a, the) where meaning is clear
- No filler phrases ("it's important to note that...")
