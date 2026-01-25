# ClaudeCodeProjects

**Repository**: Universal Agent Framework (UAF) + DMB Almanac + Gemini MCP
**Health Score**: 100/100 ✨
**Last Updated**: January 25, 2026

---

## Recent Audits

📊 **[January 2026 Audit](./docs/audits/2026-01-audit/)** - Comprehensive UAF audit
- Health Score: 99/100 → **100/100** (↑ from 92/100)
- 465 agents validated across 49 categories
- File organization refactor completed
- All path references updated
- [View full audit reports →](./docs/audits/)

---

## Projects

### [DMB Almanac](./projects/dmb-almanac/)
Dave Matthews Band concert database Progressive Web App

**Stack**: SvelteKit 2 • Svelte 5 • TypeScript • Rust WASM
**Data**: 2,800+ documented shows • 6 WASM modules • SQLite + IndexedDB
**Features**: Offline-first • Advanced search • Tour visualization • Setlist analysis

📖 [WASM Audit Overview](./projects/dmb-almanac/docs/WASM_AUDIT_OVERVIEW.md)

### [Gemini MCP Server](./projects/gemini-mcp-server/)
Google Gemini API integration via Model Context Protocol

**Stack**: TypeScript • Node.js • MCP SDK
**Features**: Gemini Pro integration • Tool use • Streaming responses

---

## Documentation

### Getting Started
- [Project Structure Guide](./docs/PROJECT_STRUCTURE.md) - Repository organization
- [UAF Framework Overview](./.claude/docs/architecture/UAF_FRAMEWORK.md) - Agent system
- [Global Agent Index](./.claude/docs/reference/GLOBAL_INDEX.md) - All 465 agents

### Development
- [File Organization Report](./.claude/audit/file-organization-report.md)
- [Skill Library](./.claude/docs/reference/SKILL_CROSS_REFERENCES.md)
- [Agent Ecosystem](./.claude/docs/reference/AGENT_ECOSYSTEM_INDEX.md)

### Audits & Analysis
- [2026-01 Audit Report](./docs/audits/2026-01-audit/) - Complete audit results
- [Agent Validation](./docs/audits/2026-01-audit/AGENT_VALIDATION_REPORT.md)
- [DMB Almanac Analysis](./projects/dmb-almanac/app/docs/analysis/) - 563 technical documents

---

## Repository Structure

```
ClaudeCodeProjects/
├── .claude/              # Universal Agent Framework
│   ├── agents/           # 465 agents across 49 categories
│   ├── commands/         # 95 skill commands
│   ├── docs/             # Framework documentation
│   └── scripts/          # Automation utilities
├── .github/              # CI/CD workflows
├── projects/
│   ├── dmb-almanac/      # DMB concert database PWA
│   └── gemini-mcp-server/ # Gemini API integration
├── docs/
│   ├── audits/           # Audit history
│   └── PROJECT_STRUCTURE.md
└── archive/              # Historical backups
```

---

## Quick Commands

```bash
# DMB Almanac
cd projects/dmb-almanac/app
npm install
npm run dev              # Start dev server
npm run build           # Production build
npm run test            # Run tests

# Gemini MCP Server
cd projects/gemini-mcp-server
npm install
npm run build
```

---

## License

MIT

---

**Repository Health**: 100/100 ✨
**Organization**: Complete file reorganization (2026-01-25)
**Files Organized**: 563 analysis documents • 130+ project files • 7 audit reports
