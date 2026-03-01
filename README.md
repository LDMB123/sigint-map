# ClaudeCodeProjects

Personal development workspace for multiple projects using Claude Code.

## Projects

### 1. [DMB Almanac](projects/dmb-almanac/)
Progressive Web App for Dave Matthews Band concert database.
- 2,800+ show database
- Setlist analysis and statistics
- Offline-first architecture
- Chromium 143+ optimizations

### 2. [Imagen Experiments](projects/imagen-experiments/)
AI-powered image generation experiments using Google Gemini APIs.
- Batch generation scripts
- Prompt engineering
- Image editing workflows

### 3. [Blaire's Kind Heart](projects/blaires-kind-heart/)
Offline-first kindness PWA for a young child, built with Rust/WASM.
- SQLite stored in OPFS
- Safari 26.2 / iPadOS 26.2 target
- All logic in Rust → WASM

### 4. [Emerson Violin PWA](projects/emerson-violin-pwa/)
Offline-first violin teaching app for children with Red Panda coach.
- WebAssembly audio processing
- iPadOS optimized
- Local-first architecture

### 5. [Gemini MCP Server](projects/gemini-mcp-server/)
Model Context Protocol server for Google Gemini API integration.

## Documentation

Organized technical documentation in [`docs/`](docs/):
- **Audits** - Accessibility, bundle, security, performance analysis
- **Guides** - Implementation guides and quick references
- **Archive** - Historical session reports and superseded docs

## Tools

- **Claude Code Skills** - 118 custom skills in `.claude/skills/`
- **GitHub Workflows** - 8 CI/CD workflows in `.github/workflows/`

## Structure

```
ClaudeCodeProjects/
├── projects/          # All 5 projects
├── docs/              # Organized documentation
├── .claude/           # Claude Code configuration & skills
├── .github/           # GitHub Actions workflows
└── archive/           # Historical backups
```

## Getting Started

Each project has its own README with setup instructions. Start by exploring:
- [`projects/dmb-almanac/`](projects/dmb-almanac/) - Dave Matthews Band concert database
- [`docs/`](docs/) - Technical documentation hub
- [`.claude/skills/`](.claude/skills/) - Available automation skills

## Organization

This workspace was comprehensively reorganized on 2026-01-29:
- 95% reduction in root directory clutter
- All projects properly documented
- 200+ documentation files organized
- Professional directory structure

See [`docs/archive/`](docs/archive/) for cleanup history.
