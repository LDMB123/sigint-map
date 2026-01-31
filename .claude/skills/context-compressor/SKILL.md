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

Compresses large files into compact summaries preserving essential information.

## Compression Strategies

### 1. Summary-Based (docs, READMEs)
Extract key facts, remove verbose explanations, preserve config values and API signatures.
Target: 90%+ reduction.

### 2. Reference-Based (large infrequent files)
Keep only metadata (path, size, exports, types, hash). Point to full file.
Target: 99%+ reduction.

### 3. Structured Data (JSON, YAML, config)
Compact format, remove comments/whitespace, extract essential fields only.
Target: 85%+ reduction.

### 4. Code Reference (source files)
Extract exports, types, interfaces. Remove implementations. Keep signatures.
Target: 90%+ reduction.

### 5. Hybrid (mixed content)
Combine strategies per section.

## Process

1. Analyze target: file type, size, token estimate (size / 4)
2. Select strategy based on content type
3. Execute compression
4. Validate essential info preserved
5. Write compressed output with metadata (original size, ratio, hash, path)

## Priority Targets

- **High**: Large docs > 5K tokens, verbose READMEs, audit reports, architecture docs
- **Medium**: Config files with comments, package manifests, API docs
- **Low**: Small configs < 500 tokens, type definitions, active working files

## Output Format

```
## Compressed: [filename]
Original: X tokens | Compressed: Y tokens | Ratio: Z%
Strategy: [type] | Hash: [hash] | Full: [path]
---
[Compressed content]
```

## Integration

Works with: token-optimizer, cache-warmer, predictive-caching, token-budget-monitor
