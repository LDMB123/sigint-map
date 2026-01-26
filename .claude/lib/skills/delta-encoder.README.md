# Delta Encoder for Skill Compression

> Achieves additional 20-30% compression beyond structural compression through base + delta pattern extraction

---

## Overview

The delta encoder identifies common patterns across similar skills and stores only the unique content (deltas) for each skill, referencing a shared base. This is the second stage of skill compression after structural compression.

## Compression Pipeline

```
Raw Markdown Skill (500-2000 tokens)
        ↓
[STAGE 1: Structural Compression via compressor.ts]
        ↓
Compressed YAML Skill (150-600 tokens) - 60-70% reduction
        ↓
[STAGE 2: Delta Compression via delta-encoder.ts]
        ↓
Base + Delta (100-400 tokens) - Additional 20-30% reduction
        ↓
TOTAL: 70-80% compression from original
```

---

## Core Concepts

### Base Skill

A base skill contains common patterns shared across similar skills in the same domain:

- **Common keywords**: Keywords that appear in >50% of similar skills
- **Common error patterns**: Shared error code prefixes (E0xxx, TS, ERR_)
- **Common fix patterns**: Reusable solution terms (clone, RefCell, scope, lifetime)
- **Common sections**: Standard skill structure elements

### Delta Skill

A delta skill contains only unique content not found in the base:

- **Unique keywords**: Domain-specific or skill-specific keywords
- **Unique errors**: Specific error codes handled by this skill
- **Unique quick fixes**: Problem-solution mappings not in base
- **Unique patterns**: Match patterns and suggestions
- **Unique details**: Error details, edge cases, related skills

### Skill Pack

A skill pack bundles related skills with their base(s) and deltas for efficient loading:

- **Multiple bases**: Support for different similarity groups
- **Shared loading**: Base loaded once, deltas loaded on-demand
- **Token budgeting**: Track and optimize token usage across pack

---

## API Reference

### Creating Base and Delta

```typescript
import { compressSkill } from './compressor';
import { createBaseSkill, extractDelta } from './delta-encoder';

// Step 1: Structurally compress skills
const skill1 = compressSkill(markdownSkill1);
const skill2 = compressSkill(markdownSkill2);
const skills = [skill1, skill2];

// Step 2: Create base from similar skills
const base = createBaseSkill(skills);

// Step 3: Extract deltas
const delta1 = extractDelta(skill1, base);
const delta2 = extractDelta(skill2, base);
```

### Creating Skill Packs

```typescript
import { createSkillPack } from './delta-encoder';

// Create a pack for a domain
const pack = createSkillPack(
  'rust-debug-pack',
  'rust',
  [skill1, skill2, skill3]
);

console.log(`Original tokens: ${pack.original_total_tokens}`);
console.log(`Compressed tokens: ${pack.total_tokens}`);
console.log(`Savings: ${pack.delta_compression_ratio * 100}%`);
```

### Loading Skills from Pack

```typescript
import { loadSkillFromPack, getLoadCost } from './delta-encoder';

// Load a specific skill
const skill = loadSkillFromPack(pack, 'rust-borrow-checker-debug');

// Check token cost
const cost = getLoadCost(pack, 'rust-borrow-checker-debug');
console.log(`Base tokens: ${cost.base_tokens}`);
console.log(`Delta tokens: ${cost.delta_tokens}`);
console.log(`Total tokens: ${cost.total_tokens}`);
console.log(`Savings: ${cost.savings_ratio * 100}%`);
```

### Batch Operations

```typescript
import { createSkillPacks, calculateTotalSavings } from './delta-encoder';

// Create packs for multiple domains
const skillsByDomain = new Map([
  ['rust', [skill1, skill2, skill3]],
  ['typescript', [skill4, skill5]],
  ['debugging', [skill6, skill7, skill8]],
]);

const packs = createSkillPacks(skillsByDomain);

// Calculate total savings
const savings = calculateTotalSavings(packs);
console.log(`Total compression: ${savings.average_compression_ratio * 100}%`);
```

---

## How It Works

### 1. Pattern Identification

The encoder analyzes similar skills to identify common patterns:

```typescript
// Extract common keywords (appear in >50% of skills)
const commonKeywords = identifyCommonKeywords(skills);

// Extract common error patterns (E0xxx, TS, etc.)
const errorPatterns = identifyErrorPatterns(skills);

// Extract common fix patterns (clone, RefCell, scope, etc.)
const fixPatterns = identifyFixPatterns(skills);
```

### 2. Similarity Grouping

Skills are grouped by domain and keyword overlap:

```typescript
function areSimilar(skill1, skill2): boolean {
  // Must be same domain
  if (skill1.domain !== skill2.domain) return false;

  // >30% keyword overlap = similar
  const overlap = calculateKeywordOverlap(skill1, skill2);
  return overlap > 0.3;
}
```

### 3. Delta Extraction

Only unique content is stored in the delta:

```typescript
// Filter out common keywords
delta.keywords = skill.keywords.filter(
  kw => !base.common_keywords.includes(kw)
);

// Filter out common fix patterns
delta.quick_fixes = skill.quick_fixes.filter(
  fix => !isCommonPattern(fix, base.common_fix_patterns)
);
```

### 4. Reconstruction

Skills are reconstructed by merging base + delta:

```typescript
const fullSkill = {
  keywords: [...base.keywords, ...delta.keywords],
  quick_fixes: { ...base.quick_fixes, ...delta.quick_fixes },
  patterns: [...base.patterns, ...delta.patterns],
  // ... etc
};
```

---

## Loading Strategies

### Strategy 1: Single Skill Load

Load base + one delta for quick fixes:

```
Tokens: base (80) + delta (120) = 200 tokens
Savings vs full: 350 - 200 = 150 tokens (43%)
```

### Strategy 2: Multiple Similar Skills

Base loaded once, multiple deltas:

```
Tokens: base (80) + delta1 (120) + delta2 (110) + delta3 (130) = 440 tokens
Savings vs full: (350 × 3) - 440 = 610 tokens (58%)
```

### Strategy 3: Large-Scale Loading (20+ skills)

Maximum efficiency with shared base:

```
Tokens: base (80) + (avg_delta × 20) = 80 + 2400 = 2480 tokens
Savings vs full: (350 × 20) - 2480 = 4520 tokens (65%)
```

---

## Performance Characteristics

### Token Savings by Scenario

| Scenario | Skills | Original | With Delta | Savings |
|----------|--------|----------|------------|---------|
| Single skill | 1 | 350 | 200 | 43% |
| Small pack | 3 | 1050 | 440 | 58% |
| Medium pack | 10 | 3500 | 1280 | 63% |
| Large pack | 20 | 7000 | 2480 | 65% |
| Very large | 50 | 17500 | 6080 | 65% |

### Compression Efficiency

Delta compression becomes more efficient as more similar skills are loaded:

- **1 skill**: 20-25% additional savings
- **3 skills**: 25-30% additional savings
- **5+ skills**: 30-35% additional savings
- **10+ skills**: 30-40% additional savings
- **20+ skills**: 35-45% additional savings

The marginal benefit increases because the base cost is amortized across more skills.

---

## Use Cases

### Domain-Specific Packs

Package all skills for a specific domain:

```typescript
// Rust debugging pack
const rustDebugPack = createSkillPack('rust-debug', 'rust', [
  borrowCheckerDebug,
  lifetimeDebug,
  ownershipPatterns,
  asyncPatterns,
  unsafeAudit,
]);

// Load only the skills needed for current task
const skill = loadSkillFromPack(rustDebugPack, 'borrow-checker-debug');
```

### Task-Specific Packs

Package skills for a specific task type:

```typescript
// Debugging task pack (cross-domain)
const debugTaskPack = createSkillPack('debug-task', 'debugging', [
  rustBorrowDebug,    // Rust debugging
  tsTypeDebug,        // TypeScript debugging
  svelteReactDebug,   // Svelte debugging
  wasmDebug,          // WASM debugging
]);
```

### Project-Specific Packs

Custom packs for specific projects:

```typescript
// DMB Almanac project pack
const dmbPack = createSkillPack('dmb-almanac', 'project', [
  svelteKitRouting,
  wasmIntegration,
  tsTypePatterns,
  performanceTuning,
]);
```

---

## Implementation Details

### Base Skill Structure

```typescript
interface BaseSkill {
  id: string;                    // e.g., "rust-base"
  domain: string;                // e.g., "rust"
  structure: {
    common_keywords: string[];   // ["borrow", "lifetime", "rust"]
    common_error_patterns: string[];  // ["E0", "TS"]
    common_fix_patterns: string[];    // ["clone", "RefCell"]
    common_sections: string[];        // ["errors", "patterns"]
  };
  base_data: Partial<FullSkill>;  // Shared data structures
  base_tokens: number;             // Token cost to load base
  derived_skills: string[];        // Skills using this base
}
```

### Delta Skill Structure

```typescript
interface DeltaSkill {
  skill: string;                 // Skill identifier
  base_id: string;              // Reference to base
  delta: {
    keywords?: string[];         // Only unique keywords
    errors?: string[];          // Specific error codes
    quick_fixes?: Record<string, string>;
    patterns?: Array<{ match: string; suggest: string[] }>;
    error_details?: Record<string, { cause: string; fix: string }>;
    edge_cases?: string[];
    related?: string[];
  };
  delta_tokens: number;          // Token cost for delta only
  original_tokens: number;       // Original compressed size
  version: string;
}
```

### Skill Pack Structure

```typescript
interface SkillPack {
  pack_id: string;                    // Pack identifier
  version: string;                    // Pack version
  domain: string;                     // Domain or category
  bases: BaseSkill[];                 // Base skills
  deltas: DeltaSkill[];               // Delta skills
  total_tokens: number;               // Total compressed size
  original_total_tokens: number;      // Size without delta
  delta_compression_ratio: number;    // Additional savings
  meta: {
    skill_count: number;
    created_at: string;
  };
}
```

---

## Testing

Run the test suite to see delta compression in action:

```bash
cd .claude/lib/skills
npx tsx delta-encoder.test.ts
```

The test demonstrates:

1. Structural compression baseline (60-70% reduction)
2. Delta compression on top (20-30% additional)
3. Combined compression (70-80% total)
4. Skill reconstruction from base + delta
5. Loading cost analysis for different scenarios

---

## Integration with Skill System

### Current Workflow

```
1. Agent requests skill
2. Load full compressed skill (300 tokens)
3. Use skill for task
```

### Optimized Workflow with Delta Encoding

```
1. Agent requests skill
2. Check if base already loaded
   - If yes: Load only delta (100 tokens)
   - If no: Load base + delta (200 tokens)
3. Subsequent similar skills: Only delta (100 tokens each)
```

### Memory Management

```typescript
class SkillCache {
  loadedBases: Map<string, BaseSkill>;
  loadedDeltas: Map<string, DeltaSkill>;

  loadSkill(packId: string, skillId: string): FullSkill {
    const pack = this.getPack(packId);
    const delta = pack.deltas.find(d => d.skill === skillId);

    // Load base if not already in cache
    if (!this.loadedBases.has(delta.base_id)) {
      const base = pack.bases.find(b => b.id === delta.base_id);
      this.loadedBases.set(base.id, base);
    }

    // Reconstruct skill
    return reconstructSkill(
      this.loadedBases.get(delta.base_id),
      delta
    );
  }
}
```

---

## Future Enhancements

### Advanced Pattern Detection

- Use ML embeddings to identify semantic similarity
- Detect common code patterns across languages
- Identify implicit relationships between skills

### Dynamic Base Generation

- Generate bases on-the-fly based on loaded skills
- Adapt base to usage patterns over time
- Split or merge bases based on similarity clusters

### Compression Optimization

- Experiment with different similarity thresholds
- Try different grouping strategies
- Optimize for specific use cases (single load vs multi-load)

### Multi-Level Bases

```
Domain Base (level 0)
  ↓
Category Base (level 1)
  ↓
Skill-Specific Delta (level 2)
```

This would enable even more compression for large skill libraries.

---

## File Locations

```
.claude/lib/skills/
├── compressor.ts              # Stage 1: Structural compression
├── compressor.test.ts         # Structural compression tests
├── delta-encoder.ts           # Stage 2: Delta compression
├── delta-encoder.test.ts      # Delta compression tests
├── delta-encoder.README.md    # This file
└── example.ts                 # Example usage
```

---

## Version

**Version**: 1.0.0
**Last Updated**: 2026-01-25
**Compression Target**: 20-30% additional reduction beyond structural compression
