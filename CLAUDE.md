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
- **12 reusable skills** in `.claude/skills/`
- **Parallelization config** supporting 130 concurrent agents (burst: 185)
- **Route table** for zero-overhead agent selection
- **MCP integrations** for desktop automation

## Architecture

```
ClaudeCodeProjects/
├── .claude/              # Shared agent infrastructure
│   ├── skills/          # 12 reusable skills
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

- **Agent parallelization**: Max 130 concurrent (100 haiku + 25 sonnet + 5 opus)
- **Skills format**: Must use `skill-name/SKILL.md` with YAML frontmatter
- **Route table**: Pre-compiled - regenerate after adding agents
- **Git status**: Keep clean - move reports to docs/, not workspace root
