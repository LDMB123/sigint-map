# ClaudeCodeProjects Workspace

Multi-project Claude Code workspace.

## Projects

- `projects/dmb-almanac/` - Dave Matthews Band concert database PWA
- `projects/emerson-violin-pwa/` - Violin tuner PWA
- `projects/imagen-experiments/` - Google Imagen API experiments
- `projects/blaires-kind-heart/` - Blaire's Kind Heart — kindness tracker PWA (Rust/WASM)
- `projects/gemini-mcp-server/` - MCP server for Google Gemini API

## Quick Start

1. Check which project to work on
2. Navigate to project directory
3. Read project's CLAUDE.md for specific commands and technologies

## Architecture

```
ClaudeCodeProjects/
├── .claude/              # Workspace infrastructure (no active agents here)
│   ├── skills/          # Reusable skills
│   ├── agents/          # README + _archived only — NO active agents
│   ├── config/          # Routing, caching
│   └── scripts/         # Validation and audit scripts (check-contamination.sh)
├── apple-mcp-server/    # macOS native MCP server (active)
├── google-mcp-server/   # Google APIs MCP server (active)
├── projects/            # Individual projects
└── _archived/           # Historical files
```

## Project Isolation

**Each project is fully independent.** When working inside a project directory, treat that project as the entire scope — do not reference, suggest, or pull context from sibling projects. Each project's own CLAUDE.md defines its stack, commands, and architecture. Multiple projects share Rust/WASM tooling but have completely separate codebases, repos, and purposes.

## Workspace Rules

### Organization
- **Workspace root**: Only CLAUDE.md, README.md, LICENSE, .gitignore, package.json, MCP server dirs
- **Reports**: Always in `docs/reports/`, never workspace or project root
- **Backups**: Must be in `_archived/`, not scattered

### Skills & Agents
- **Skills format**: `skill-name/SKILL.md` with YAML frontmatter
- **Agents location**: Project-specific agents ONLY in `projects/<name>/.claude/agents/` — NEVER in workspace `.claude/agents/`
- **Workspace `.claude/agents/`**: Contains README and `_archived/` only. Do not add active agents here.
- **Global `~/.claude/agents/`**: Generic reusable agents only. Never add project-specific agents (dmb-*, safari-*, svelte*, dexie*, etc.)
- **Large skills**: Extract references to separate files

### Report Writing
- Bullet points, not paragraphs
- Technical shorthand allowed
- Omit articles where meaning is clear
- No filler phrases

## MCP Servers

Configured in `~/.claude.json` under `mcpServers`. Desktop Chat uses separate config.

Active servers at workspace root:
- `apple-mcp-server/` - macOS native APIs (weather, system info)
- `google-mcp-server/` - Google APIs (Gemini, Maps, etc.)
