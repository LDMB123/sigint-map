# Directory Structure Explained

**Issue**: Two `.claude` directories causing confusion
**Date**: 2026-01-30

---

## The Two `.claude` Directories

### 1. User-Level (Global)
**Location**: `~/.claude/` (shorthand for `/Users/louisherman/.claude/`)

**Purpose**: Global configuration and skills for ALL workspaces

**Contents**:
```
~/.claude/
├── skills/              # 355 global skills (all projects)
├── agents/              # 73 agent definitions (if any)
├── commands/            # 143 command files
├── plans/               # Saved plans
├── cache/               # Cache files
├── mcp.json             # MCP server configuration
└── preferences.json     # User preferences
```

**Skills**: 355 global skills available to ALL projects

---

### 2. Workspace-Level (Project-Specific)
**Location**: `/Users/louisherman/ClaudeCodeProjects/.claude/`

**Purpose**: Configuration and skills specific to THIS workspace

**Contents**:
```
/Users/louisherman/ClaudeCodeProjects/.claude/
├── skills/              # 67 workspace-specific skills (DMB, SvelteKit, etc.)
│   ├── dmb-almanac-*.md          (42 DMB domain skills)
│   ├── sveltekit-*.md            (18 SvelteKit skills)
│   ├── scraping-*.md             (2 scraping skills)
│   ├── *.yaml                    (5 YAML workflow skills)
│   └── README.md
├── agents/              # 69 workspace agent definitions
│   ├── analyzers/
│   ├── validators/
│   ├── generators/
│   └── ... (21 categories)
└── (other workspace config)
```

**Skills**: 67 workspace skills for DMB Almanac project

---

## Why Two Directories?

**Two-Tier Discovery System**:

```
When you type /skill-name in Claude Code:

1. First checks: /Users/louisherman/ClaudeCodeProjects/.claude/skills/
   (workspace-specific skills - 67 skills)

2. Then checks: ~/.claude/skills/
   (global skills - 355 skills)

3. Total available: 422 skills
```

**Override Behavior**: If same skill name exists in both locations, workspace-level wins.

---

## Working Directory Confusion

### The Problem

When running shell commands, your **current working directory** matters:

**Scenario 1** - In workspace root (correct):
```bash
$ pwd
/Users/louisherman/ClaudeCodeProjects

$ ls .claude/skills/*.md | wc -l
62  # ✅ Finds workspace skills
```

**Scenario 2** - In .claude/skills subdirectory (confusing):
```bash
$ pwd
/Users/louisherman/ClaudeCodeProjects/.claude/skills

$ ls .claude/skills/*.md | wc -l
ls: .claude/skills/*.md: No such file or directory  # ❌ Can't find itself!
```

**Why**: When you're already IN `.claude/skills/`, the relative path `.claude/skills/` doesn't exist!

---

## Solution: Always Use Absolute Paths or Navigate First

### Option 1: Navigate to workspace root first
```bash
cd /Users/louisherman/ClaudeCodeProjects
ls .claude/skills/*.md  # ✅ Works
```

### Option 2: Use absolute paths
```bash
ls /Users/louisherman/ClaudeCodeProjects/.claude/skills/*.md  # ✅ Always works
ls ~/.claude/skills/*.md  # ✅ Always works
```

### Option 3: Use relative paths from current location
```bash
# If in /Users/louisherman/ClaudeCodeProjects/.claude/skills/
ls *.md  # ✅ Works (files in current directory)

# NOT: ls .claude/skills/*.md  # ❌ Fails (looking for .claude/skills/.claude/skills/)
```

---

## Complete Directory Map

```
/Users/louisherman/
├── .claude/                                    # User-level (global)
│   ├── skills/                                 # 355 global skills
│   ├── agents/                                 # 73 agents (if any)
│   └── ... (other user config)
│
└── ClaudeCodeProjects/                         # Workspace root
    ├── .claude/                                # Workspace-level (project)
    │   ├── skills/                             # 67 workspace skills
    │   │   ├── dmb-almanac-*.md               (42 files)
    │   │   ├── sveltekit-*.md                 (18 files)
    │   │   ├── scraping-*.md                  (2 files)
    │   │   ├── *.yaml                         (5 files)
    │   │   └── README.md                      (1 file)
    │   └── agents/                             # 69 workspace agents
    │       ├── analyzers/                      (5 agents)
    │       ├── validators/                     (6 agents)
    │       ├── generators/                     (5 agents)
    │       └── ... (21 categories)
    │
    └── projects/
        ├── dmb-almanac/
        │   ├── .claude/
        │   │   └── agents/                     # 181 project agents
        │   └── app/
        │       └── .claude/
        │           └── agents/                 # 15 app agents
        └── emerson-violin-pwa/
            └── .claude/
                └── (project config)
```

---

## Skill Discovery Hierarchy

**Priority order** (first match wins):

```
1. Workspace skills (highest priority)
   /Users/louisherman/ClaudeCodeProjects/.claude/skills/
   67 skills

2. User-level skills (fallback)
   ~/.claude/skills/
   355 skills

Total: 422 skills available
```

**Example**:
- If `/dmb-stats` exists in BOTH locations
- Workspace version wins (overrides user-level)

---

## Agent Discovery Hierarchy

**Priority order** (first match wins):

```
1. App-level agents
   projects/dmb-almanac/app/.claude/agents/
   15 agents

2. Project-level agents
   projects/dmb-almanac/.claude/agents/
   181 agents

3. Workspace agents
   /Users/louisherman/ClaudeCodeProjects/.claude/agents/
   69 agents

4. User-level agents (if any)
   ~/.claude/agents/
   (none currently)

Total: 265 agent definitions (252 actual agents + 13 docs)
```

---

## Best Practices

### For Shell Commands

**Always navigate to workspace root first**:
```bash
cd /Users/louisherman/ClaudeCodeProjects
# Now all relative paths work correctly
ls .claude/skills/*.md
ls .claude/agents/*/
```

**Or use absolute paths**:
```bash
# Works from anywhere
ls /Users/louisherman/ClaudeCodeProjects/.claude/skills/*.md
ls ~/.claude/skills/*.md
```

### For Skills

**Check which skills are where**:
```bash
# Workspace skills (DMB-specific)
ls /Users/louisherman/ClaudeCodeProjects/.claude/skills/*.md

# User skills (global)
ls ~/.claude/skills/*.md
```

### For Agents

**Check which agents are where**:
```bash
# Workspace agents (generic)
find /Users/louisherman/ClaudeCodeProjects/.claude/agents -name "*.yaml"

# Project agents (DMB-specific)
find /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.claude/agents -name "*.md"
```

---

## Summary

**Two separate `.claude` directories**:
1. **User-level** (`~/.claude/`) - Global to all workspaces
2. **Workspace-level** (`/Users/louisherman/ClaudeCodeProjects/.claude/`) - Specific to this workspace

**Not a problem** - this is the correct Claude Code structure!

**The confusion** comes from using relative paths when already inside a subdirectory.

**The solution**: Always navigate to workspace root first, or use absolute paths.

---

*Directory structure explained: 2026-01-30*
*All paths verified and documented*
