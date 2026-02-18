# Workspace Agent Ecosystem

**Active agents in this directory:** 0
**Last updated:** 2026-02-17

## Current State

The shared workspace `.claude/agents/` directory contains **no active agents**. All agents have been migrated to project-specific directories or the user scope (`~/.claude/agents/`).

## Active Agents (Project-Specific)

### DMB Almanac — `projects/dmb-almanac/.claude/agents/` (14 agents)

| Agent | Purpose |
|---|---|
| dmb-analyst.md | Concert analysis and statistics |
| dmbalmanac-scraper.md | Web scraping specialist |
| dmbalmanac-site-expert.md | Site structure and data organization |
| dmb-expert.md | DMB band history, discography, live performance |
| dmb-data-validator.md | Data quality and consistency checks |
| dmb-dexie-architect.md | Dexie.js schema for concert database |
| dmb-offline-first-architect.md | Offline-first PWA architecture |
| dmb-scraper-debugger.md | Scraper debugging, Playwright/Cheerio |
| dmb-show-analyzer.md | Individual show analysis, rarity scoring |
| dmb-sqlite-specialist.md | SQLite optimization for concert DB |
| dexie-specialist.md | Dexie.js 4.x (DMB-optimized) |
| svelte5-specialist.md | Svelte 5 runes (DMB PWA-optimized) |
| sveltekit-specialist.md | SvelteKit 2 routing (dmb-almanac) |

### Blaire's Kind Heart — `projects/blaires-kind-heart/.claude/agents/` (7 agents)

| Agent | Purpose |
|---|---|
| safari-expert.md | Orchestrator: full-stack Safari browser expert (Sonnet) |
| safari-css-specialist.md | Sub-agent: CSS features (Haiku) |
| safari-api-specialist.md | Sub-agent: Web APIs (Haiku) |
| safari-js-specialist.md | Sub-agent: JavaScript/Wasm (Haiku) |
| safari-pwa-specialist.md | Sub-agent: PWA/Extensions/Platform (Haiku) |
| safari-gpu-specialist.md | Sub-agent: Media/GPU/WebXR (Haiku) |
| safari-debug-specialist.md | Sub-agent: DevTools/SafariDriver (Haiku) |

### Emerson Violin PWA — `projects/emerson-violin-pwa/.claude/agents/` (1 agent)

| Agent | Purpose |
|---|---|
| web-audio-specialist.md | Web Audio API, pitch detection, microphone input, WASM audio pipeline |

### Gemini MCP Server — `projects/gemini-mcp-server/.claude/agents/` (1 agent)

| Agent | Purpose |
|---|---|
| gemini-api-specialist.md | Gemini API integration, MCP tool impl, rate limiting, session management |

## Architecture

Project-specific agents only activate when Claude Code is opened in that project's directory. This prevents cross-project agent pollution and ensures agents only load with their relevant project context.

```
ClaudeCodeProjects/
└── .claude/agents/
    ├── README.md          # this file
    └── _archived/         # 16 deprecated agents (see below)

projects/dmb-almanac/.claude/agents/
    ├── dmb-analyst.md, dmb-expert.md, dmb-data-validator.md
    ├── dmb-dexie-architect.md, dmb-offline-first-architect.md
    ├── dmb-scraper-debugger.md, dmb-show-analyzer.md, dmb-sqlite-specialist.md
    ├── dmbalmanac-scraper.md, dmbalmanac-site-expert.md
    ├── dexie-specialist.md, svelte5-specialist.md, sveltekit-specialist.md
    └── _archived/  (20 additional deprecated agents)

projects/blaires-kind-heart/.claude/agents/
    ├── safari-expert.md
    ├── safari-css-specialist.md
    ├── safari-api-specialist.md
    ├── safari-js-specialist.md
    ├── safari-pwa-specialist.md
    ├── safari-gpu-specialist.md
    └── safari-debug-specialist.md

projects/emerson-violin-pwa/.claude/agents/
    └── web-audio-specialist.md

projects/gemini-mcp-server/.claude/agents/
    └── gemini-api-specialist.md
```

## Archived Agents

`_archived/` contains agents deprecated on 2026-02-01. These were workspace-scoped copies of agents that already exist in user scope (`~/.claude/agents/`), with only minor YAML differences. Archived to eliminate duplication.
