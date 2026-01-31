---
name: organization
description: >
  Workspace organization enforcement including scattered file detection,
  directory structure validation, auto-fix capabilities, and
  organization scoring for maintaining clean project structure.
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Grep
  - Glob
  - Bash
hooks:
  SessionStart:
    - description: "Check workspace organization on session start"
      command: "bash .claude/scripts/enforce-organization.sh"
      continueOnError: true
---

# Organization Enforcement Skill

Automatically detects and fixes organizational issues across the
workspace. Prevents documentation sprawl and maintains clean structure.

## Capabilities

- Detect scattered markdown files in workspace and project roots
- Find orphaned scripts and duplicate files
- Identify misplaced skills and agents
- Auto-move files to correct locations
- Create missing directory structures
- Generate organization score (0-100)
- Produce detailed organization reports

## When to Use

- Before major commits (verify workspace cleanliness)
- Weekly maintenance checks
- After large refactoring sessions
- When organization score drops below 95

## Modes

- **check** (default): Scan for issues and report findings
- **fix**: Automatically move files and create directories
- **report**: Generate detailed report with metrics

## Rules

### Workspace Root
- **Allowed**: README.md, CLAUDE.md, LICENSE, .gitignore, package.json
- **Forbidden**: Other scattered markdown, shell scripts (except temp fix scripts), analysis reports

### Project Root
- **Allowed**: README.md, package.json, config files
- **Max markdown**: 3 files before requiring docs/ directory

### Skills Location
- **Must be in**: `.claude/skills/` (directory structure with SKILL.md)
- **Forbidden**: project directories, docs/

### Agents Location
- **Must be in**: `.claude/agents/` or `projects/*/.claude/agents/`
- **Forbidden**: docs/, scripts/

## Scoring

- **100**: Perfect organization, zero violations
- **-5 points**: Per scattered markdown in workspace root
- **-3 points**: Per scattered markdown in project root
- **-10 points**: Per misplaced skill or agent
- **-2 points**: Per duplicate file
- **-1 point**: Per backup file outside _archived/

**Target**: Maintain 95+ score

## Procedure

1. Scan workspace root for scattered files
2. Scan project roots for excess documentation
3. Verify skills are in correct directory structure
4. Verify agents have proper location and format
5. Check for duplicate and orphaned files
6. Calculate organization score
7. Apply fixes if in fix mode
8. Generate report with recommendations
