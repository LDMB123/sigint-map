# Skills & Agents Quick Reference

## Skills (6 directories)

```
.claude/skills/
├── dmb-analysis/SKILL.md       # DMB concert data analysis
├── sveltekit/SKILL.md          # SvelteKit development patterns
├── scraping/SKILL.md           # Web scraping with Playwright
├── code-quality/SKILL.md       # Code review, security, testing
├── deployment/SKILL.md         # CI/CD and API migration
└── organization/SKILL.md       # Workspace organization enforcement
```

All skills use official `skill-name/SKILL.md` directory structure.
Action skills have `disable-model-invocation: true` for token savings.

## Agents (12 files)

```
.claude/agents/
├── code-reviewer.md            # Code review (sonnet, plan)
├── security-scanner.md         # Security audit (sonnet, plan)
├── test-generator.md           # Test creation (sonnet, default)
├── error-debugger.md           # Error diagnosis (sonnet, plan)
├── refactoring-agent.md        # Safe refactoring (sonnet, default)
├── dependency-analyzer.md      # Dependency health (haiku, plan)
├── code-generator.md           # Code scaffolding (sonnet, default)
├── performance-profiler.md     # Performance analysis (sonnet, plan)
├── documentation-writer.md     # Documentation (sonnet, default)
├── migration-agent.md          # Code migration (sonnet, default)
├── dmb-analyst.md              # DMB data analysis (sonnet, plan)
└── bug-triager.md              # Bug triage (sonnet, plan)
```

All agents have proper YAML frontmatter with `name` and `description`.

## Format

### Skill SKILL.md Frontmatter
```yaml
---
name: skill-name
description: What this skill does
disable-model-invocation: true
user-invocable: true
allowed-tools: [Read, Grep, Glob]
---
```

### Agent Frontmatter
```yaml
---
name: agent-name
description: When to delegate to this agent
tools: [Read, Edit, Grep, Glob, Bash]
model: sonnet
permissionMode: default
---
```

## Migration History

Migrated on 2026-01-30 from:
- 69 flat skill files (63 .md + 6 .yaml) -> 6 skill directories
- 70 agent files across 21 categories -> 12 focused agents
- Custom schemas -> Official Claude Code frontmatter only
