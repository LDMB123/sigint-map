# Organization Standards & Guidelines

**Purpose**: Maintain clean, organized project structure aligned with Claude Code best practices
**Last Updated**: 2026-01-30
**Format Version**: 2.0 (Official Claude Code patterns)

---

## Directory Structure Rules

### Workspace Root (`/Users/louisherman/ClaudeCodeProjects/`)

**Allowed Files**:
- `README.md` - Project overview
- `LICENSE` - License file
- `.gitignore` - Git configuration
- `package.json` - If workspace has npm dependencies

**Forbidden**:
- Scattered markdown files (`*SUMMARY*.md`, `*COMPLETE*.md`, etc.)
- Shell scripts (belong in `.claude/scripts/` or project scripts)
- Analysis reports (belong in `docs/reports/`)
- Documentation files (belong in `docs/`)

**Enforcement**: Git pre-commit hook blocks commits with scattered files

---

### `.claude/` Directory Structure

```
.claude/
├── skills/                    # All Claude Code skills (directory format)
│   ├── skill-name/            # Each skill is a directory
│   │   ├── SKILL.md           # Main skill file (required)
│   │   └── *.md               # Supporting reference files (optional)
│   └── ...
├── agents/                    # All agent definitions (flat markdown)
│   └── agent-name.md          # Each agent is a markdown file with YAML frontmatter
├── scripts/                   # Maintenance scripts
├── hooks/                     # Git hooks
└── ...
```

**Rules**:
- Skills MUST use `skill-name/SKILL.md` directory structure
- Skills frontmatter MUST use only official fields: `name`, `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `context`, `agent`, `hooks`
- Agents MUST have YAML frontmatter with required `name` and `description` fields
- Agent frontmatter supports: `name`, `description`, `tools`, `model`, `permissionMode`, `skills`, `hooks`
- NO nested agent delegation (main conversation is the orchestrator)
- NO custom schema fields in skills or agents

---

### Skills Format (Official)

Each skill is a **directory** containing a `SKILL.md` file:

```
.claude/skills/
├── dmb-analysis/
│   ├── SKILL.md                  # Main skill (required)
│   ├── accessibility-reference.md # Supporting file
│   ├── technical-reference.md     # Supporting file
│   └── ...
├── sveltekit/
│   ├── SKILL.md
│   └── ...
└── code-quality/
    ├── SKILL.md
    └── ...
```

**SKILL.md Frontmatter**:
```yaml
---
name: skill-name
description: >
  Clear description of what this skill does.
  Claude uses this to decide when to apply the skill.
disable-model-invocation: true   # For action skills (deploy, audit, commit)
user-invocable: true             # User can invoke directly
allowed-tools:                   # Restrict tools if needed
  - Read
  - Grep
  - Glob
---
```

**Token optimization**: Use `disable-model-invocation: true` for action-based skills
that should only activate when explicitly invoked, not on every request.

---

### Agents Format (Official)

Each agent is a **markdown file** with YAML frontmatter:

```yaml
---
name: agent-name
description: >
  When to delegate to this agent. Claude uses this for routing.
tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
model: sonnet                    # haiku, sonnet, or opus
permissionMode: default          # plan, default, or dontAsk
skills:                          # Optional: skills this agent uses
  - skill-name
---

# Agent Name

Instructions for the agent go here in markdown.
```

**Model selection**:
- `haiku` - Read-only analysis, simple lookups
- `sonnet` - Code generation, refactoring, testing
- `opus` - Architecture decisions, complex reasoning

**Permission modes**:
- `plan` - Read-only agents (reviewers, analyzers)
- `default` - Normal agents (generators, editors)
- `dontAsk` - Autonomous agents (use sparingly)

---

### Agent Design Principles

1. **Single responsibility**: Each agent excels at one specific task
2. **No nested delegation**: Agents cannot spawn other agents
3. **Explicit tools**: Only grant the tools each agent needs
4. **Clear routing**: Description tells Claude when to delegate
5. **Focused count**: Keep total agents under 15

---

## File Naming Conventions

### Skills
- **Directory**: `kebab-case/` (e.g., `dmb-analysis/`, `code-quality/`)
- **Main file**: Always `SKILL.md`
- **Supporting files**: `kebab-case-reference.md`

### Agents
- **File**: `kebab-case.md` (e.g., `code-reviewer.md`, `test-generator.md`)

### Documentation
- **Standard**: `kebab-case.md`
- **Exceptions**: `README.md`, `LICENSE`, `CHANGELOG.md`

---

## Current Inventory

### Skills (9 directories)
| Skill | Purpose | Model Invocation | Hooks |
|-------|---------|-----------------|-------|
| `dmb-analysis/` | DMB concert data analysis | Disabled | none |
| `sveltekit/` | SvelteKit development patterns | Disabled | none |
| `scraping/` | Web scraping with Playwright | Disabled | none |
| `code-quality/` | Code review, security, testing | Disabled | none |
| `deployment/` | CI/CD and API migration | Disabled | none |
| `organization/` | Workspace organization enforcement | Enabled | SessionStart |
| `skill-validator/` | Skill format and budget validation | Disabled | PreSkillInvocation |
| `agent-optimizer/` | Agent description optimization | Disabled | none |
| `token-budget-monitor/` | Token usage tracking and reporting | Disabled | SessionStart |

### Agents (14 files)
| Agent | Model | Permission | Skills Used | Purpose |
|-------|-------|-----------|-------------|---------|
| `code-reviewer` | sonnet | plan | none | Code review and quality assessment |
| `security-scanner` | sonnet | plan | none | Security vulnerability scanning |
| `test-generator` | sonnet | default | none | Test suite generation |
| `error-debugger` | sonnet | plan | none | Error diagnosis and debugging |
| `refactoring-agent` | sonnet | default | none | Safe code refactoring |
| `dependency-analyzer` | haiku | plan | none | Dependency health analysis |
| `code-generator` | sonnet | default | none | Code scaffolding and generation |
| `performance-profiler` | sonnet | plan | none | Performance bottleneck analysis |
| `documentation-writer` | sonnet | default | none | Documentation generation |
| `migration-agent` | sonnet | default | none | Codebase-wide migrations |
| `dmb-analyst` | sonnet | plan | dmb-analysis | DMB data analysis |
| `bug-triager` | sonnet | plan | none | Bug report triage |
| `best-practices-enforcer` | sonnet | default | skill-validator, agent-optimizer, token-budget-monitor | Quality enforcement |
| `performance-auditor` | sonnet | plan | token-budget-monitor, organization | Performance audit reports |

---

## Prevention Systems

### 1. Git Pre-Commit Hook
- Scans for scattered markdown files
- Checks skills use directory/SKILL.md format
- Checks agents have YAML frontmatter
- BLOCKS commit if issues found

### 2. Organization Skill
- Invoke: use the `organization` skill
- Modes: check, fix, report
- Generates organization score (0-100)

---

## When Creating New Skills

1. Create directory: `.claude/skills/skill-name/`
2. Create `SKILL.md` with official frontmatter fields only
3. Add `disable-model-invocation: true` if action-based
4. Keep SKILL.md under 500 lines
5. Extract detailed reference to supporting files in same directory

## When Creating New Agents

1. Create file: `.claude/agents/agent-name.md`
2. Add YAML frontmatter with `name` (required) and `description` (required)
3. Set `tools`, `model`, `permissionMode` appropriately
4. Write clear instructions after frontmatter
5. Do NOT assume agent can delegate to other agents

---

*Standards established: 2026-01-30*
*Format: Claude Code Official Best Practices v2.0*
*Enforcement: Active*
