---
name: context-compressor
description: >
  Compresses large documentation and code into concise summaries while
  preserving essential information. Uses semantic compression, reference
  extraction, and YAML/JSON encoding to achieve 80-95% token reduction.
disable-model-invocation: false
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash
---

# Context Compressor Skill

Intelligently compresses large files and documentation into compact summaries that preserve essential information while dramatically reducing token consumption.

## Execution Checklist

- [ ] Identify compression target (file, directory, or pattern)
- [ ] Analyze content type (documentation, code, config, data)
- [ ] Select compression strategy (summary, reference, structured, hybrid)
- [ ] Execute compression
- [ ] Validate essential information preserved
- [ ] Write compressed output
- [ ] Calculate compression ratio
- [ ] Report results

## Compression Strategies

### Strategy 1: Summary-Based Compression

**Best for:** Documentation, README files, verbose explanations

**Method:**
1. Extract key facts and actionable information
2. Remove examples, verbose explanations, redundant text
3. Preserve critical data (config values, API signatures)
4. Use concise markdown structure

**Example:**
```markdown
Before (5,000 tokens):
# Authentication System

Our authentication system provides comprehensive user management...
[3 paragraphs of explanation]

## Features
- JWT-based authentication with RS256 signing
- Refresh token rotation
- Password hashing with bcrypt
[10 more feature descriptions with examples]

## Configuration
The system can be configured using environment variables...
[2 pages of config documentation]

After (400 tokens):
# Auth System Summary
- JWT (RS256) + refresh tokens
- bcrypt passwords
- Config: JWT_SECRET, REFRESH_TTL, HASH_ROUNDS
- Endpoints: /login, /refresh, /logout
- Middleware: requireAuth, refreshToken
- See full docs: docs/AUTH.md

Compression: 92% (5,000 → 400 tokens)
```

### Strategy 2: Reference-Based Compression

**Best for:** Large files accessed infrequently

**Method:**
1. Keep only metadata (path, size, type)
2. Extract critical snippets (type signatures, exports)
3. Point to full file for details
4. Cache file hash for validation

**Example:**
```markdown
Before (reading full 10,000-line file = 30,000 tokens):
[Full file content]

After (50 tokens):
**File:** src/lib/database.ts (10,247 lines, 87 KB)
**Exports:** connectDB, query, transaction, migrate
**Types:** Database, QueryResult, Transaction
**Last modified:** 2026-01-30
**Hash:** a1b2c3d4
**Access:** Read full file if needed

Compression: 99.8% (30,000 → 50 tokens)
```

### Strategy 3: Structured Data Compression

**Best for:** JSON, YAML, configuration files

**Method:**
1. Convert to most compact format (JSON > YAML > condensed)
2. Remove comments and whitespace
3. Extract only essential fields
4. Use abbreviations for repetitive keys

**Example:**
```yaml
Before (2,000 tokens):
# Package configuration
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  "description": "A really cool project that does amazing things",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  },
  [100 more lines of dependencies, devDependencies, config]
}

After (200 tokens):
Package: my-awesome-project@1.0.0
Scripts: build(tsc), test(jest), lint, format
Deps: 23 prod, 45 dev
Entry: dist/index.js + types
Full: package.json

Compression: 90% (2,000 → 200 tokens)
```

### Strategy 4: Code Reference Compression

**Best for:** Source code files

**Method:**
1. Extract exports, types, interfaces
2. Remove implementation details
3. Keep function signatures only
4. Preserve type information

**Example:**
```typescript
Before (8,000 tokens - full implementation):
// [Full file with implementations, comments, examples]

After (600 tokens):
## src/api/routes.ts

**Exports:**
- GET /users → getUsers(): Promise<User[]>
- POST /users → createUser(data: UserInput): Promise<User>
- PUT /users/:id → updateUser(id, data): Promise<User>
- DELETE /users/:id → deleteUser(id): Promise<void>

**Types:**
- User: { id, name, email, role }
- UserInput: { name, email, password }

**Dependencies:** db, auth, validation
**See full:** src/api/routes.ts

Compression: 92.5% (8,000 → 600 tokens)
```

### Strategy 5: Hybrid Compression

**Best for:** Mixed content (docs + code + config)

**Method:** Combine multiple strategies based on content sections

## Compression Process

### Step 1: Analyze Target

```bash
# Identify file type
file_type=$(file -b "$TARGET_FILE")

# Get size
file_size=$(wc -c < "$TARGET_FILE")
token_estimate=$((file_size / 4))  # Rough estimate: 1 token ≈ 4 chars

# Determine compression strategy
if [[ $file_type == *"text"* ]]; then
  if [[ $TARGET_FILE == *.md ]]; then
    STRATEGY="summary"
  elif [[ $TARGET_FILE == *.json ]] || [[ $TARGET_FILE == *.yaml ]]; then
    STRATEGY="structured"
  elif [[ $TARGET_FILE == *.ts ]] || [[ $TARGET_FILE == *.js ]]; then
    STRATEGY="code-reference"
  fi
fi
```

### Step 2: Execute Compression

```bash
case $STRATEGY in
  "summary")
    # Extract key information
    grep -E "^#|^##|^\*|^-" "$TARGET_FILE" > /tmp/summary.md
    # Remove verbose sections
    sed '/^Example:/,/^$/d' /tmp/summary.md
    ;;

  "structured")
    # Compress JSON/YAML
    jq -c '.' "$TARGET_FILE" > /tmp/compressed.json
    ;;

  "code-reference")
    # Extract exports and types
    grep -E "^export |^interface |^type " "$TARGET_FILE"
    ;;
esac
```

### Step 3: Validate Compression

```markdown
## Validation Checklist

- [ ] All critical information preserved
- [ ] No data loss on essential facts
- [ ] Compression ratio > 80%
- [ ] Original file referenced for details
- [ ] Decompression possible if needed
```

### Step 4: Write Compressed Output

```markdown
## Compressed: [original-filename]

**Original:** 10,245 tokens
**Compressed:** 1,024 tokens
**Ratio:** 90% reduction
**Strategy:** Summary-based
**Preserved:**
- Key features and capabilities
- Configuration options
- API signatures
- Critical data points

**Full content:** [path/to/original]
**Last compressed:** 2026-01-30 12:00:00
**Hash:** abc123def456

---

[Compressed content here]
```

## Usage

### Compress Single File
```bash
/context-compressor README.md
```

### Compress Multiple Files
```bash
/context-compressor docs/*.md
```

### Compress Directory
```bash
/context-compressor --dir docs/ --recursive
```

### With Strategy Override
```bash
/context-compressor package.json --strategy=structured
```

### With Target Ratio
```bash
/context-compressor ARCHITECTURE.md --target-ratio=85
```

## Compression Targets by Priority

### High Priority (Compress First)
- Large documentation files (> 5,000 tokens)
- Verbose README files
- Historical audit reports
- Detailed architecture docs
- Example code with comments

### Medium Priority
- Configuration files with comments
- Package manifests
- API documentation
- Tutorial content
- Changelog files

### Low Priority (Keep Original)
- Critical config files (< 500 tokens)
- Type definitions
- Small utility functions
- Active working files

## Output Formats

### Summary Format
```markdown
## [Filename] Summary

**Key Points:**
- Point 1
- Point 2
- Point 3

**Config:** key=value, key2=value2

**Reference:** path/to/full-file.md
```

### Reference Format
```markdown
## [Filename] Reference

**Type:** [documentation/code/config]
**Size:** X tokens (Y KB)
**Exports:** func1, func2, Class1
**Last Modified:** YYYY-MM-DD
**Full:** path/to/file
```

### Structured Format
```json
{
  "file": "config.json",
  "compressed": {
    "essential_key_1": "value1",
    "essential_key_2": "value2"
  },
  "omitted": ["verbose_description", "example_configs"],
  "reference": "path/to/full-config.json"
}
```

## Integration

Works with:
- **token-optimizer agent** - Identifies compression targets
- **cache-warmer skill** - Caches compressed versions
- **predictive-caching skill** - Pre-compresses likely targets
- **token-budget-monitor skill** - Tracks compression impact

## Compression Metrics

### Success Criteria
- Compression ratio > 80%
- Zero critical information loss
- Decompression possible
- Token budget extension > 20%

### Performance Tracking
```markdown
## Compression Report

**Session:** [session-id]
**Files Compressed:** 15
**Original Size:** 125,000 tokens
**Compressed Size:** 18,500 tokens
**Savings:** 106,500 tokens (85% reduction)

**Top Compressions:**
1. ARCHITECTURE.md: 95% (25,000 → 1,250 tokens)
2. API_DOCS.md: 92% (18,000 → 1,440 tokens)
3. CHANGELOG.md: 88% (12,000 → 1,440 tokens)
```

## Advanced Features

### Semantic Compression
Use LLM to understand content and create intelligent summaries:
- Preserve meaning, not just text
- Extract relationships and dependencies
- Create semantic references

### Lossy vs Lossless
- **Lossless:** Can reconstruct original (references, structured)
- **Lossy:** Cannot reconstruct original (summaries)
- Choose based on content importance

### Incremental Compression
Update compressed versions when originals change:
```bash
# Check if compressed version is stale
if [ original.md -nt compressed-summary.md ]; then
  # Re-compress
  /context-compressor original.md
fi
```

### Decompression
Restore full context when needed:
```bash
# Read original if compressed insufficient
if [ NEED_FULL_DETAILS ]; then
  Read path/to/original-file.md
fi
```

## Best Practices

1. **Compress early** - Before token budget pressure
2. **Validate preserved info** - Test that essentials remain
3. **Keep originals** - Never delete source files
4. **Track compression metadata** - For invalidation and updates
5. **Monitor usage** - If compressed version accessed frequently, it worked

## Troubleshooting

**Q: Compressed version missing critical info**
- Use less aggressive compression
- Switch to hybrid strategy
- Keep original accessible

**Q: Compression ratio too low**
- Content may already be concise
- Try different strategy
- Consider if compression needed

**Q: Decompression needed frequently**
- Compressed version too aggressive
- Increase preserved content
- Use reference strategy instead
