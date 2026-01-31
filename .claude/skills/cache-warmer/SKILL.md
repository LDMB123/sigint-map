---
name: cache-warmer
description: >
  Pre-loads frequently accessed files and configs into session cache to reduce
  token consumption on subsequent accesses. Identifies critical paths and
  warms caches proactively based on project context and user patterns.
disable-model-invocation: false
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
hooks:
  SessionStart:
    - description: "Auto-warm caches for common project files"
      continueOnError: true
---

# Cache Warmer Skill

Pre-loads frequently accessed content into session cache for token savings.

## Process

1. Detect project type (package.json -> Node.js, Cargo.toml -> Rust, .claude/ -> Claude Code)
2. Identify critical files based on project type
3. Read files under 50KB into session
4. Store file hashes for invalidation
5. Report warming summary

## Files to Cache by Project Type

### Node.js / TypeScript
- package.json, tsconfig.json, .eslintrc.json
- src/index.ts, src/types/index.ts
- README.md, .env.example

### Claude Code Project
- .claude/config/route-table.json
- .claude/config/parallelization.yaml
- CLAUDE.md

### General
- README.md, main config files, env templates

## Cache Rules

- **Max file size**: 50KB
- **Skip**: node_modules, dist, target, .git, build artifacts
- **Invalidation**: File hash change, age > 6 hours, explicit request
- **Total cache budget**: < 20KB (6,000 tokens)

## Expected Savings

- 5,000-15,000 tokens per session from avoided re-reads
- Target cache hit rate: > 60% (good), > 80% (excellent)

## Output

Cache warming report: project type, files cached (with sizes), skipped files, estimated savings.

## Integration

Works with: token-optimizer, context-compressor, predictive-caching, token-budget-monitor
