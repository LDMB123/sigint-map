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

Pre-loads frequently accessed content into session cache to minimize token consumption on repeated accesses.

## Execution Checklist

- [ ] Identify project type and common access patterns
- [ ] Read critical configuration files
- [ ] Cache frequently accessed documentation
- [ ] Pre-load common code reference files
- [ ] Store file hashes for cache invalidation
- [ ] Report cache warming summary

## Cache Warming Strategy

### 1. Project Context Detection

Detect project type to determine what to cache:

```bash
# Check for package.json (Node.js)
if [ -f package.json ]; then
  PROJECT_TYPE="nodejs"
  CRITICAL_FILES=(
    "package.json"
    "tsconfig.json"
    ".eslintrc.json"
    "README.md"
  )
fi

# Check for Cargo.toml (Rust)
if [ -f Cargo.toml ]; then
  PROJECT_TYPE="rust"
  CRITICAL_FILES=(
    "Cargo.toml"
    "Cargo.lock"
    "README.md"
  )
fi

# Check for .claude directory (Claude Code project)
if [ -d .claude ]; then
  CRITICAL_FILES+=(
    ".claude/config/route-table.json"
    ".claude/config/parallelization.yaml"
    ".claude/mcp.json"
  )
fi
```

### 2. Critical Path Identification

Identify files accessed most frequently:

**Always cache:**
- Project README
- Main configuration files
- Environment templates
- Common reference docs

**Conditionally cache:**
- Based on recent session history
- Based on project type
- Based on user patterns
- Based on file size (< 50KB ideal)

### 3. Cache Warming Process

```markdown
## Step 1: Read Critical Files

For each critical file:
1. Check if file exists
2. Check file size (skip if > 50KB)
3. Read file into session
4. Store file hash for invalidation
5. Mark as cached

## Step 2: Pre-load Documentation

Common documentation to cache:
- .claude/docs/README.md
- CONTRIBUTING.md
- ARCHITECTURE.md
- API_REFERENCE.md

## Step 3: Cache Code References

For active development:
- Main entry points (index.ts, main.rs, app.py)
- Core module exports
- Type definitions
- Constants/config modules

## Step 4: Store Cache Metadata

Create `.claude/.cache-metadata.json`:
```json
{
  "warmed_at": "2026-01-30T12:00:00Z",
  "project_type": "nodejs",
  "files_cached": [
    {
      "path": "package.json",
      "hash": "abc123",
      "size": 1245,
      "tokens": ~400
    }
  ],
  "total_tokens": 5000,
  "cache_valid_until": "2026-01-30T18:00:00Z"
}
```
```

### 4. Cache Invalidation

Detect when to invalidate cache:
- File modification time changed
- File hash changed
- Cache age > 6 hours
- Explicit invalidation request

## Warming Patterns by Project Type

### Node.js / TypeScript
```yaml
critical_files:
  - package.json
  - tsconfig.json
  - .eslintrc.json
  - src/index.ts
  - src/types/index.ts

documentation:
  - README.md
  - docs/API.md

configs:
  - .env.example
  - vite.config.ts
  - next.config.js
```

### Rust
```yaml
critical_files:
  - Cargo.toml
  - Cargo.lock
  - src/main.rs
  - src/lib.rs

documentation:
  - README.md
  - docs/architecture.md

configs:
  - .cargo/config.toml
  - rust-toolchain.toml
```

### Python
```yaml
critical_files:
  - requirements.txt
  - pyproject.toml
  - setup.py
  - main.py

documentation:
  - README.md
  - docs/api.md

configs:
  - .env.example
  - pytest.ini
  - setup.cfg
```

### Claude Code Project
```yaml
critical_files:
  - .claude/config/route-table.json
  - .claude/config/parallelization.yaml
  - .claude/mcp.json

documentation:
  - .claude/docs/README.md
  - .claude/docs/OPTIMIZATION_COMPLETE.md

configs:
  - .gitignore
  - package.json
```

## Usage

### Manual Invocation
```
/cache-warmer
```

### Automatic via Hook
Runs automatically on SessionStart to warm common caches.

### With Arguments
```bash
# Warm specific files
/cache-warmer package.json tsconfig.json

# Warm all configs
/cache-warmer --type=configs

# Force refresh (invalidate existing)
/cache-warmer --force
```

## Output Format

```markdown
## Cache Warming Report

**Project Type:** nodejs
**Files Cached:** 12
**Total Tokens:** 5,234
**Cache Valid Until:** 2026-01-30 18:00:00

### Cached Files
✅ package.json (245 bytes, ~80 tokens)
✅ tsconfig.json (512 bytes, ~170 tokens)
✅ README.md (1.2 KB, ~400 tokens)
✅ .claude/config/route-table.json (3.1 KB, ~1,000 tokens)

### Skipped Files
⚠️ node_modules/package.json (too large: 250 KB)
⚠️ dist/bundle.js (build artifact, excluded)

### Cache Metadata
- Warming duration: 1.2s
- Cache location: Session memory
- Invalidation strategy: 6-hour TTL + file hash
- Estimated savings: 15,000+ tokens on subsequent accesses
```

## Integration

Works with:
- **token-optimizer agent** - Uses cache data for optimization
- **context-compressor skill** - Compresses cached content
- **predictive-caching skill** - Predicts what to cache next
- **token-budget-monitor skill** - Tracks cache hit rates

## Best Practices

1. **Cache small files first** - Biggest ROI on frequently accessed small files
2. **Skip build artifacts** - node_modules, dist, target, .git
3. **Invalidate on changes** - Use file hashes to detect modifications
4. **Limit cache size** - Keep total cached content under 20KB (6,000 tokens)
5. **Monitor hit rates** - Track which caches are actually used

## Performance Metrics

### Expected Savings
- **package.json**: Read 10x/session → Save ~700 tokens (9 cache hits)
- **tsconfig.json**: Read 5x/session → Save ~680 tokens (4 cache hits)
- **README.md**: Read 3x/session → Save ~800 tokens (2 cache hits)

**Total typical savings:** 5,000-15,000 tokens per session

### Cache Efficiency
```
Cache Hit Rate = (Cached Reads) / (Total Reads)

Good: > 60% hit rate
Excellent: > 80% hit rate
```

## Advanced Features

### Predictive Warming
Based on file access patterns, predict what to cache:
- If editing src/components/*.tsx → Cache src/types/index.ts
- If working on tests → Cache jest.config.js
- If debugging → Cache error logs location

### Selective Warming
Only cache what's needed for current task:
```yaml
task: "Add new API endpoint"
warm:
  - src/api/routes.ts
  - src/types/api.ts
  - docs/API_DESIGN.md
skip:
  - test files (not needed yet)
  - build configs (not modifying)
```

### Distributed Caching
Share cache across team (future):
- Team cache server
- Shared cache metadata
- Centralized invalidation

## Troubleshooting

**Q: Cache not reducing token usage**
- Check cache hit logs - are files being re-read?
- Verify file paths match exactly
- Check cache TTL hasn't expired

**Q: Too much memory used**
- Reduce cache size limit
- Cache only critical files
- Use compression on cached content

**Q: Stale cache causing issues**
- Lower TTL (6h → 1h)
- Enable hash-based invalidation
- Force refresh with --force flag
