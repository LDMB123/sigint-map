---
name: predictive-caching
description: >
  Predicts likely file accesses and pre-caches content before it's needed.
  Analyzes task context, file relationships, and access patterns to
  proactively warm caches for 90%+ hit rates.
disable-model-invocation: false
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
---

# Predictive Caching Skill

Anticipates which files will be needed and pre-caches them before they're requested, achieving near-zero token overhead on repeated accesses.

**Detailed algorithms:** See [algorithms-reference.md](algorithms-reference.md) for implementation details, examples, and advanced features.

## Execution Checklist

- [ ] Analyze current task context
- [ ] Identify file relationship graph
- [ ] Predict likely access patterns
- [ ] Calculate cache priority scores
- [ ] Pre-cache high-probability files
- [ ] Monitor prediction accuracy
- [ ] Adjust model based on hits/misses
- [ ] Report prediction results

## Prediction Strategies

### Strategy 1: Task-Based Prediction

**Predict based on task type:**

```yaml
task: "Add new API endpoint"
predicted_files:
  high_probability:  # 80-100% chance
    - src/api/routes.ts
    - src/types/api.ts
    - src/middleware/auth.ts
  medium_probability:  # 50-79% chance
    - src/db/models.ts
    - src/utils/validation.ts
  low_probability:  # 20-49% chance
    - test/api.test.ts
    - docs/API_DESIGN.md
```

```yaml
task: "Fix bug in authentication"
predicted_files:
  high_probability:
    - src/auth/*.ts
    - src/middleware/auth.ts
    - .env.example
  medium_probability:
    - src/db/users.ts
    - src/utils/jwt.ts
  low_probability:
    - docs/AUTH_FLOW.md
    - test/auth.test.ts
```

```yaml
task: "Update documentation"
predicted_files:
  high_probability:
    - README.md
    - docs/**/*.md
    - CONTRIBUTING.md
  medium_probability:
    - package.json (for version)
    - CHANGELOG.md
  low_probability:
    - src/index.ts (for API reference)
```

### Strategy 2: Dependency Graph Prediction

**Predict based on file relationships:**

```
User accesses: src/components/Button.tsx

Dependency graph:
src/components/Button.tsx
├─ imports src/styles/button.css (90% probability)
├─ imports src/types/components.ts (85% probability)
├─ imports src/utils/classNames.ts (70% probability)
└─ tested by test/Button.test.tsx (40% probability)

Pre-cache:
✅ src/styles/button.css
✅ src/types/components.ts
✅ src/utils/classNames.ts
⚠️ test/Button.test.tsx (wait for signal)
```

### Strategy 3: Pattern-Based Prediction

**Predict based on common patterns:**

```markdown
Pattern: User editing file in src/api/
Prediction: Will likely need:
- Other files in src/api/
- src/types/ definitions
- src/db/ models
- Corresponding test files

Pattern: User viewing test file
Prediction: Will likely need:
- Source file being tested
- Test utilities
- Mock data
- jest.config.js

Pattern: User debugging error
Prediction: Will likely need:
- Error handler code
- Logger configuration
- Stack trace locations
- Environment config
```

### Strategy 4: Temporal Pattern Prediction

**Predict based on access sequences:**

```
Historical pattern:
1. User reads package.json
2. User reads tsconfig.json (95% of the time)
3. User reads README.md (80% of the time)
4. User reads src/index.ts (60% of the time)

Current: User just read package.json

Action: Pre-cache tsconfig.json and README.md
```

## Prediction Algorithm

### Step 1: Context Analysis

```bash
# Analyze current context
CURRENT_FILE="$1"
TASK_TYPE="$2"  # e.g., "feature", "bugfix", "refactor", "docs"
USER_INTENT="$3"  # e.g., "add", "fix", "update", "debug"

# Extract project context
PROJECT_TYPE=$(detect_project_type)  # nodejs, rust, python, etc.
CURRENT_DIR=$(dirname "$CURRENT_FILE")
FILE_TYPE="${CURRENT_FILE##*.}"
```

### Step 2: Build Prediction Model

```javascript
function predictFiles(context) {
  const predictions = [];

  // Task-based predictions
  const taskPredictions = getTaskPredictions(context.task_type);
  predictions.push(...taskPredictions);

  // Dependency predictions
  const imports = extractImports(context.current_file);
  predictions.push(...imports.map(f => ({ file: f, probability: 0.85 })));

  // Pattern predictions
  const patternPredictions = matchPatterns(context);
  predictions.push(...patternPredictions);

  // Historical predictions
  const historyPredictions = queryAccessHistory(context.current_file);
  predictions.push(...historyPredictions);

  // Deduplicate and score
  return scorePredictions(predictions);
}
```

### Step 3: Priority Scoring

```javascript
function scorePredictions(predictions) {
  return predictions
    .reduce((acc, p) => {
      const existing = acc.find(x => x.file === p.file);
      if (existing) {
        // Combine probabilities
        existing.probability = Math.min(1, existing.probability + p.probability * 0.3);
      } else {
        acc.push(p);
      }
      return acc;
    }, [])
    .sort((a, b) => b.probability - a.probability);
}
```

### Step 4: Cache Threshold

```javascript
const CACHE_THRESHOLD = {
  high: 0.80,      // Cache immediately
  medium: 0.50,    // Cache if tokens available
  low: 0.30,       // Wait for confirmation signal
  ignore: 0.10     // Don't cache
};

function shouldCache(prediction) {
  if (prediction.probability >= CACHE_THRESHOLD.high) {
    return 'immediate';
  }
  if (prediction.probability >= CACHE_THRESHOLD.medium) {
    return 'if_budget_allows';
  }
  if (prediction.probability >= CACHE_THRESHOLD.low) {
    return 'wait_for_signal';
  }
  return 'skip';
}
```

## Prediction Examples

### Example 1: API Development

```yaml
Context:
  current_file: src/api/users.ts
  task: "Add pagination to users endpoint"

Predictions:
  - file: src/types/api.ts
    probability: 0.95
    reason: "Type definitions for API responses"
    action: cache_immediately

  - file: src/db/users.ts
    probability: 0.90
    reason: "Database queries need pagination"
    action: cache_immediately

  - file: src/utils/pagination.ts
    probability: 0.85
    reason: "Pagination utility likely exists"
    action: cache_immediately

  - file: test/api/users.test.ts
    probability: 0.60
    reason: "Will need to update tests"
    action: cache_if_budget_allows

  - file: docs/API.md
    probability: 0.40
    reason: "May reference docs"
    action: wait_for_signal
```

### Example 2: Bug Fixing

```yaml
Context:
  current_file: src/auth/login.ts
  task: "Fix login timeout issue"
  error_trace: ["src/auth/login.ts:45", "src/utils/jwt.ts:120"]

Predictions:
  - file: src/utils/jwt.ts
    probability: 0.98
    reason: "In error stack trace"
    action: cache_immediately

  - file: src/middleware/auth.ts
    probability: 0.85
    reason: "Related auth code"
    action: cache_immediately

  - file: .env.example
    probability: 0.75
    reason: "May need timeout config"
    action: cache_immediately

  - file: src/config/index.ts
    probability: 0.70
    reason: "Config values for timeouts"
    action: cache_if_budget_allows
```

### Example 3: Documentation Update

```yaml
Context:
  current_file: README.md
  task: "Update installation instructions"

Predictions:
  - file: package.json
    probability: 0.92
    reason: "Will reference versions/scripts"
    action: cache_immediately

  - file: CONTRIBUTING.md
    probability: 0.75
    reason: "Related documentation"
    action: cache_immediately

  - file: docs/INSTALLATION.md
    probability: 0.70
    reason: "Detailed install docs"
    action: cache_if_budget_allows

  - file: .nvmrc
    probability: 0.60
    reason: "Node version requirement"
    action: cache_if_budget_allows
```

## Cache Warming Execution

```bash
#!/bin/bash

# Predictive cache warming
predict_and_cache() {
  CURRENT_FILE="$1"
  TASK_TYPE="$2"

  # Get predictions
  PREDICTIONS=$(generate_predictions "$CURRENT_FILE" "$TASK_TYPE")

  # Cache high-probability files
  echo "$PREDICTIONS" | jq -r '.[] | select(.probability >= 0.80) | .file' | while read file; do
    if [ -f "$file" ]; then
      echo "Pre-caching: $file ($(jq -r --arg f "$file" '.[] | select(.file == $f) | .probability' <<< "$PREDICTIONS"))"
      # Read file into session cache
      cat "$file" > /dev/null
    fi
  done

  # Report predictions
  echo ""
  echo "Prediction Summary:"
  echo "$PREDICTIONS" | jq -r '.[] | "\(.probability | tonumber | . * 100 | floor)% - \(.file)"'
}
```

## Usage

### Automatic Prediction
```bash
# Triggered when user accesses a file
/predictive-caching --auto --context="User editing src/api/users.ts"
```

### Manual Prediction
```bash
# Explicitly predict for a task
/predictive-caching --task="Add authentication" --current-file="src/index.ts"
```

### With Constraints
```bash
# Limit cache size
/predictive-caching --max-cache-size=20KB --min-probability=0.75
```

## Prediction Accuracy Tracking

```yaml
Session Metrics:
  total_predictions: 45
  cache_hits: 38        # Predicted files actually accessed
  cache_misses: 7       # Predicted but not accessed
  unexpected_access: 5   # Accessed but not predicted

  hit_rate: 84.4%       # cache_hits / total_predictions
  precision: 88.4%      # cache_hits / (cache_hits + cache_misses)
  recall: 88.4%         # cache_hits / (cache_hits + unexpected_access)

  token_savings: 12,450 tokens
  cache_overhead: 1,200 tokens (files cached but not used)
  net_savings: 11,250 tokens (90% efficiency)
```

## Learning and Adaptation

### Track Patterns
```json
{
  "patterns": [
    {
      "trigger": "user_edits_api_file",
      "predictions": ["types", "db_models", "tests"],
      "hit_rate": 0.87,
      "confidence": "high"
    },
    {
      "trigger": "user_views_test_file",
      "predictions": ["source_file", "mocks", "test_utils"],
      "hit_rate": 0.92,
      "confidence": "very_high"
    }
  ]
}
```

### Adjust Thresholds
```javascript
// If hit rate < 60%, increase threshold
if (hitRate < 0.60) {
  CACHE_THRESHOLD.medium = 0.65;  // Was 0.50
  CACHE_THRESHOLD.low = 0.45;     // Was 0.30
}

// If hit rate > 90%, decrease threshold (more aggressive)
if (hitRate > 0.90) {
  CACHE_THRESHOLD.medium = 0.40;  // Was 0.50
  CACHE_THRESHOLD.low = 0.20;     // Was 0.30
}
```

## Integration

Works with:
- **cache-warmer skill** - Executes cache warming
- **token-optimizer agent** - Provides prediction data
- **context-compressor skill** - Compresses predicted files
- **token-budget-monitor skill** - Tracks prediction efficiency

## Best Practices

1. **Start conservative** - High threshold initially
2. **Track accuracy** - Monitor hit rates
3. **Adjust dynamically** - Lower threshold if accurate
4. **Limit cache size** - Don't cache everything
5. **Invalidate smartly** - Clear stale predictions

## Advanced Features

### Multi-Step Prediction
Predict not just next file, but next 3-5 files in sequence:
```yaml
Current: User reading package.json
Sequence prediction:
  1. tsconfig.json (95%)
  2. src/index.ts (80%)
  3. README.md (75%)
  4. vite.config.ts (60%)
```

### Contextual Awareness
Incorporate time of day, project phase:
```yaml
Time: Morning (9-11am)
Prediction: Higher probability for:
  - README.md (checking what to work on)
  - TODO.md
  - Recent git changes

Time: Afternoon (2-5pm)
Prediction: Higher probability for:
  - Test files (wrapping up)
  - Documentation
  - Code review files
```

### Collaborative Prediction
Learn from team patterns:
```yaml
Team Pattern: "When John works on API, he always checks auth middleware first"
Individual Pattern: "When Sarah fixes bugs, she reads error logs before code"

Use team patterns for better predictions
```

## Output Format

```markdown
## Predictive Caching Report

**Context:** Editing src/api/users.ts for "Add pagination"
**Task Type:** feature-development

### Predictions (Sorted by Probability)

✅ **CACHED** src/types/api.ts (95%)
   Reason: Type definitions always needed for API work
   Size: 450 tokens

✅ **CACHED** src/db/users.ts (90%)
   Reason: Database layer for users endpoint
   Size: 890 tokens

✅ **CACHED** src/utils/pagination.ts (85%)
   Reason: Pagination utility detection
   Size: 320 tokens

⏳ **QUEUED** test/api/users.test.ts (60%)
   Reason: Test updates likely but not immediate
   Action: Cache if token budget allows

⚠️ **SKIP** docs/API.md (40%)
   Reason: Below threshold (50%)
   Action: Wait for access signal

### Summary
- Files cached: 3
- Tokens cached: 1,660
- Hit rate estimate: 85-95%
- Estimated savings: 4,500+ tokens (subsequent accesses)
```

## Troubleshooting

**Q: Low hit rate (< 60%)**
- Increase probability threshold
- Analyze missed predictions
- Adjust task-type mappings

**Q: Caching too many unused files**
- Decrease threshold
- More conservative predictions
- Shorter cache TTL

**Q: Missing obvious files**
- Check dependency extraction
- Verify pattern definitions
- Add common patterns manually
