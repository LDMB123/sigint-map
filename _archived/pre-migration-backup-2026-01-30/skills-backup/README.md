# Project-Level Skills

This directory contains **DMB Almanac project-specific** Claude Code skills.

## Organization

Skills use a **flat structure with category prefixes**:
- `dmb-*.md` - DMB domain knowledge and workflows
- `scraping-*.md` - Web scraping for DMB data
- `sveltekit-*.md` - SvelteKit/DMB integration
- `*.yaml` - Advanced skill definitions (security, testing, CI/CD)

## Skill Discovery

Claude Code automatically discovers skills from two locations:

1. **User-level**: `~/.claude/skills/` - Global, reusable skills
2. **Project-level**: `.claude/skills/` (this directory) - Project-specific skills

Project-level skills **override** user-level skills with the same name.

## Skill Format

All skills use YAML frontmatter:

```yaml
---
name: skill-name
description: "What this skill does"
tags: ['category1', 'category2']
recommended_tier: sonnet
---

# Skill Content

Markdown content follows...
```

## Invocation

Invoke skills with the `/` prefix:
- `/dmb-stats` - DMB statistics and analysis
- `/scraping-dmbalmanac` - Scrape DMBalmanac.com
- `/sveltekit-optimization` - SvelteKit performance

## Restoration History

**2026-01-30**: Skills reorganized from mixed structure
- Moved DMB-specific skills from user-level to project-level
- Restored from backup at `.claude/skills_backup_20260130_065811/`
- Separated global skills (user-level) from project skills (here)

---

## Skills Inventory

**Total Project Skills**: 68
- 63 Markdown skills (.md)
- 5 YAML skills (.yaml)

**User-Level Skills**: 355 (at `~/.claude/skills/`)

**Breakdown by Category**:
- **DMB Domain** (42 skills): DMB-specific analysis, statistics, data collection
  - `dmb-almanac-*` (34): Scraping, integration, implementation
  - `dmb-*` (8): Guest tracking, liberation predictor, rarity scoring, setlist analysis
- **SvelteKit Integration** (18 skills): Database, PWA, testing, performance, accessibility
- **Scraping** (2 skills): Playwright architecture, debugging
- **Advanced Workflows** (5 YAML): Security audit, code review, testing, CI/CD, API migration
- **Documentation** (1): This README

---

*Last Updated: 2026-01-30*
*Reorganized from backup and user-level directory*
