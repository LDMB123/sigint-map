# Claude Code Model Policy

**Version**: 1.0
**Last Updated**: 2026-01-25
**For**: Claude Max subscribers using macOS Desktop
**Current Session**: Sonnet 4.5

---

## Purpose

This policy defines WHICH Claude model tier to use for WHICH type of work across our 462-agent, 536-skill toolkit.

**Goal**: Optimize for **quality** AND **cost** by matching model capability to task complexity.

---

## I. Available Model Tiers (Claude Max)

### Official Model Aliases (Preferred)

Use **aliases** instead of hard-coded version strings for future-proofing:

| Alias | Current Model | Best For | Cost | Speed |
|-------|---------------|----------|------|-------|
| `haiku` | Claude 3.5 Haiku | Fast scanning, simple tasks | Lowest | Fastest |
| `sonnet` | Claude 3.5 Sonnet v2 | General coding, refactoring | Medium | Fast |
| `opus` | Claude Opus 4.5 | Deep reasoning, architecture | Highest | Slower |
| `opusplan` | Opus 4.5 + planning mode | Complex plan→implement | Highest | Slower |

### Deprecated: `default`

**DO NOT USE** `model: default` in agent frontmatter.

**Why**:
- Varies by account type (Free→Haiku, Pro→Sonnet, Max→Opus)
- Unpredictable routing (can't reason about cost/quality)
- For Max users, defaults to most expensive tier for all work

**Current State**: 458/462 agents use `default` ❌
**Target State**: 0 agents use `default` ✅

---

## II. Model Selection Matrix

### Quick Decision Tree

```
Is the task...
    │
    ├─ Reading/scanning code? → haiku
    │
    ├─ Writing/refactoring code? → sonnet
    │
    ├─ Planning/designing architecture?
    │   ├─ Just planning? → opus
    │   └─ Plan then implement? → opusplan
    │
    ├─ Security/quality review? → opus
    │
    └─ Running tests/validation? → sonnet
```

### Lane-Based Policy

From COORDINATION.md capability lanes:

| Lane | Model | Rationale |
|------|-------|-----------|
| **Lane 1: Explore & Index** | `haiku` | Fast file scanning, dependency tracing, simple analysis |
| **Lane 2: Design & Plan** | `opus` or `opusplan` | Architecture decisions require deep reasoning |
| **Lane 3: Implement** | `sonnet` | Balanced: good code quality, reasonable cost |
| **Lane 4: Review & Security** | `opus` | Thoroughness critical, cost justified |
| **Lane 5: QA & Verify** | `sonnet` | Understand code for testing, not ultra-complex |
| **Lane 6: Release & Ops** | `sonnet` | Human-gated anyway, cost not critical |

---

## III. Agent-Specific Recommendations

### Lane 1: Explore & Index → `haiku`

**Agents**:
- `architecture-analyzer`
- `dependency-analyzer`
- `coverage-analyzer`
- `complexity-analyzer`
- Explore (built-in)
- Any `-indexer`, `-scanner`, `-mapper` agents

**Why Haiku**:
- Fast file reading/parsing
- Pattern matching (grep, glob)
- Dependency graph construction
- Code metrics calculation
- These don't need deep reasoning

**Example Frontmatter**:
```yaml
---
name: dependency-analyzer
model: haiku
tools: [Read, Grep, Glob]
---
```

---

### Lane 2: Design & Plan → `opus` or `opusplan`

**Agents**:
- `system-architect`
- `rust-project-architect`
- `sveltekit-orchestrator` (when planning)
- `wasm-lead-orchestrator` (when planning)
- `pwa-engineer` (for architecture decisions)
- Plan (built-in)
- Any `-architect` agents

**Why Opus**:
- Evaluate multiple approaches
- Reason about tradeoffs
- Make strategic decisions
- Design complex systems

**When to use `opusplan`**:
- User says "design and implement X"
- Multi-phase workflows
- Task requires planning THEN coding

**Example Frontmatter**:
```yaml
---
name: rust-project-architect
model: opus
tools: [Read, Grep, Glob, Write]  # Can write plan docs
---
```

---

### Lane 3: Implement → `sonnet`

**Agents**:
- `sveltekit-engineer`
- `rust-semantics-engineer`
- `svelte-component-engineer`
- `pwa-engineer` (implementation)
- `wasm-rust-compiler`
- `code-refactorer`
- Any `-engineer`, `-developer` agents

**Why Sonnet**:
- Strong code generation quality
- Understands complex codebases
- Balanced cost/quality
- Fast enough for iterative work

**Example Frontmatter**:
```yaml
---
name: sveltekit-engineer
model: sonnet
tools: [Read, Write, Edit, Bash, Grep, Glob]
---
```

---

### Lane 4: Review & Security → `opus`

**Agents**:
- `code-reviewer`
- `security-scanner`
- `rust-safety-auditor`
- `compliance-checker`
- `threat-modeler`
- Any `-auditor`, `-reviewer` agents

**Why Opus**:
- Security is critical (cost justified)
- Deep code understanding needed
- Subtle vulnerability detection
- Comprehensive coverage

**Example Frontmatter**:
```yaml
---
name: security-scanner
model: opus
tools: [Read, Grep, Glob, WebSearch]  # May need CVE lookup
---
```

---

### Lane 5: QA & Verify → `sonnet`

**Agents**:
- `unit-test-generator`
- `integration-test-generator`
- `e2e-test-generator`
- `test-coverage-analyzer`
- `sveltekit-qa-engineer`
- `rust-qa-engineer`
- `wasm-testing-specialist`

**Why Sonnet**:
- Needs to understand code structure
- Generate test cases
- Not as complex as architecture/security
- Cost-effective for test generation

**Example Frontmatter**:
```yaml
---
name: sveltekit-qa-engineer
model: sonnet
tools: [Read, Bash, Grep, Glob]
---
```

---

### Lane 6: Release & Ops → `sonnet`

**Skills** (manual-only, no agents):
- `/commit`
- `/pr-review`
- `/release-manager`
- Deployment skills

**Why Sonnet**:
- Human-gated (confirmation required)
- Cost not critical (infrequent use)
- Needs to understand context, but not ultra-complex

**Example Frontmatter**:
```yaml
---
name: commit
model: inherit  # Inherits from session
context: inline
manual-only: true
---
```

---

## IV. Orchestrator Model Selection

### Orchestrators → `opus`

**Agents**:
- `rust-lead-orchestrator`
- `wasm-lead-orchestrator`
- `sveltekit-orchestrator`
- `swarm-intelligence-orchestrator`
- Any `*-orchestrator`, `*-coordinator`

**Why Opus**:
- Make routing decisions (which specialist for which task?)
- Coordinate complex multi-agent workflows
- Aggregate results from multiple specialists
- Strategic thinking required

**Exception**: Lightweight coordinators can use `sonnet`:
- `rust-parallel-coordinator` (just dispatches parallel work)
- `scatter-gather-coordinator` (simple aggregation)

**Example Frontmatter**:
```yaml
---
name: sveltekit-orchestrator
model: opus
tools: [Task, Read, Grep, Glob]
---
```

---

### Swarm/Parallel Workers → `haiku`

**Agents**:
- `work-partitioner`
- `parallel-file-processor`
- `parallel-validation-swarm`
- Any swarm worker agents

**Why Haiku**:
- Execute simple, parallelizable tasks
- Cost scales with number of parallel workers
- Speed matters (many workers simultaneously)

**Coordinator**: Uses `sonnet` or `opus` to orchestrate

**Example Frontmatter**:
```yaml
---
name: parallel-file-processor
model: haiku
tools: [Read, Grep]
---
```

---

## V. Special Cases

### Generators → `sonnet`

**Agents**:
- `code-generator`
- `test-generator`
- `documentation-generator`
- `migration-generator`
- `scaffold-generator`

**Why Sonnet**:
- Generate boilerplate/scaffolding
- Good quality without Opus cost
- Iterative (may run multiple times)

---

### Analyzers → Depends on Complexity

**Simple Analyzers** → `haiku`:
- Metrics collection (count lines, cyclomatic complexity)
- Dependency graphing
- File/symbol indexing

**Complex Analyzers** → `sonnet`:
- Performance bottleneck analysis
- Code smell detection
- Architecture pattern analysis

**Deep Analyzers** → `opus`:
- Security vulnerability analysis
- Concurrency bug detection
- Subtle code quality issues

**Rule of Thumb**:
- Pattern matching → haiku
- Understanding code → sonnet
- Finding subtle issues → opus

---

### Validators → `haiku` to `sonnet`

**Simple Validators** → `haiku`:
- Schema validation (check structure)
- Type checking (syntax validation)
- Config file validation

**Complex Validators** → `sonnet`:
- Security validation (check for vulnerabilities)
- Business logic validation (ensure correctness)
- Integration validation (test interactions)

---

### Documentation Agents → `sonnet`

**Agents**:
- `technical-writer`
- `api-documentation-generator`
- `architecture-documenter`
- `changelog-generator`
- `onboarding-guide-creator`

**Why Sonnet**:
- Need to understand code well
- Generate clear explanations
- Not as critical as security (Opus overkill)

---

## VI. Skill Model Behavior

### Default: `model: inherit`

**Recommendation**: Most skills should use `inherit`

**Why**:
- Skill inherits model from invoking context
- If invoked in Opus session → runs on Opus
- If invoked by Haiku agent → runs on Haiku
- Flexible, context-appropriate

**Example**:
```yaml
---
name: security-audit
model: inherit  # ← RECOMMENDED for most skills
---
```

---

### When to Override: `model: <specific>`

**Use specific model when**:
- Skill has critical quality requirements (e.g., security analysis)
- Skill is expensive and should always be cheap (e.g., file scanning)
- Skill output quality matters more than context

**Example**:
```yaml
---
name: vulnerability-scan
model: opus  # Always use Opus for security
---
```

**Caution**: This locks the skill to one tier, removing flexibility.

---

### Fork-Context Skills → Inherit from Agent

**Frontmatter**:
```yaml
---
name: complex-migration
context: fork
agent: migration-specialist
model: inherit
---
```

**Behavior**:
1. Skill uses `context: fork`
2. Spawns `migration-specialist` agent
3. Skill inherits model from `migration-specialist`'s frontmatter
4. If `migration-specialist` has `model: sonnet`, skill runs on Sonnet

**Recommendation**: Let agent control model, skill uses `inherit`

---

## VII. Migration Strategy

### Current State (Before)

```yaml
# 458 agents like this ❌
---
name: example-agent
model: default  # WRONG
---
```

### Target State (After)

```yaml
# All agents use explicit tiers ✅
---
name: dependency-analyzer
model: haiku  # Fast scanning
---

---
name: sveltekit-engineer
model: sonnet  # Balanced coding
---

---
name: security-scanner
model: opus  # Critical analysis
---
```

---

### Migration Script

```python
# Apply model policy to agents
import re
from pathlib import Path

POLICY = {
    # Lane 1: Explore & Index → haiku
    'analyzer': 'haiku',
    'indexer': 'haiku',
    'scanner': 'haiku',
    'mapper': 'haiku',

    # Lane 2: Design & Plan → opus
    'architect': 'opus',
    'orchestrator': 'opus',
    'planner': 'opus',

    # Lane 3: Implement → sonnet
    'engineer': 'sonnet',
    'developer': 'sonnet',
    'refactorer': 'sonnet',
    'generator': 'sonnet',

    # Lane 4: Review & Security → opus
    'auditor': 'opus',
    'reviewer': 'opus',
    'security': 'opus',
    'compliance': 'opus',

    # Lane 5: QA & Verify → sonnet
    'qa': 'sonnet',
    'test': 'sonnet',
    'validator': 'sonnet',

    # Swarm workers → haiku
    'parallel': 'haiku',
    'swarm': 'haiku',
    'worker': 'haiku',
}

def infer_model(agent_name: str) -> str:
    """Infer model from agent name based on policy"""
    name_lower = agent_name.lower()

    for keyword, model in POLICY.items():
        if keyword in name_lower:
            return model

    # Default fallback (use sonnet for unknown)
    return 'sonnet'

# Apply to all agents
for agent_file in Path('.claude/agents').rglob('*.md'):
    content = agent_file.read_text()

    # Extract current model
    match = re.search(r'^model:\s*(.+)$', content, re.MULTILINE)
    if match and match.group(1).strip() == 'default':
        # Infer new model
        new_model = infer_model(agent_file.stem)

        # Replace
        content = re.sub(
            r'^model:\s*default\s*$',
            f'model: {new_model}',
            content,
            flags=re.MULTILINE
        )

        agent_file.write_text(content)
        print(f"Updated {agent_file.stem}: default → {new_model}")
```

---

## VIII. Cost Optimization Strategies

### 1. Tier Cascading

**Pattern**: Start cheap, escalate if needed

```yaml
---
name: adaptive-analyzer
model: haiku  # Start with Haiku
---

# In agent logic:
# 1. Try analysis with Haiku
# 2. If inconclusive, escalate to Sonnet
# 3. If still unclear, escalate to Opus
```

**Savings**: 70-80% for tasks that succeed with cheaper tiers

---

### 2. Swarm Parallelization

**Pattern**: Use many cheap workers instead of one expensive worker

```python
# Instead of:
opus_agent.process_100_files()  # Expensive, serial

# Do:
swarm_coordinator(
    worker_model='haiku',
    files=100
)  # Cheap, parallel
```

**Savings**: 10x cost reduction, 5x speed improvement

---

### 3. Lazy Loading

**Pattern**: Only load agents when invoked, not at startup

**Current Problem**: All 462 agent descriptions load for routing → expensive

**Solution**: Load descriptions on-demand or use lightweight routing index

---

### 4. Context Compression

**Pattern**: Deduplicate, remove examples from agent definitions

**Current Problem**: 9.1 MB of agent/skill content (~2.4M tokens)

**Solution**: After deduplication → ~1.4M tokens (42% reduction)

---

## IX. Max Plan Considerations

### Subscription Limits

**Claude Max** (as of 2026-01):
- Opus requests: Limited (varies by usage)
- Sonnet requests: Higher limit
- Haiku requests: Highest limit

**Implication**: Use Opus judiciously for critical work

**Check Usage**:
```bash
# In Claude Desktop
/usage
```

---

### When Opus is Worth It

**Always justified**:
- Security audits (prevent vulnerabilities)
- Architecture decisions (wrong design is expensive)
- Code review before release (catch bugs early)

**Questionable**:
- File scanning (Haiku sufficient)
- Boilerplate generation (Sonnet sufficient)
- Running tests (Sonnet sufficient)

**Rule**: If failure is expensive → use Opus. If iterative → use Sonnet/Haiku.

---

## X. Model Policy Validation

### Validation Script (Phase 6)

```bash
# Check for remaining "default" models
grep -r "model: default" .claude/agents/ .claude/skills/

# Verify model distribution
python3 << 'EOF'
import json
with open('.claude/audit/coordination-map.json') as f:
    data = json.load(f)

models = {}
for agent in data['agents']:
    model = agent['model']
    models[model] = models.get(model, 0) + 1

print("Model Distribution:")
for model, count in sorted(models.items()):
    print(f"  {model}: {count}")
EOF
```

**Expected After Migration**:
```
Model Distribution:
  haiku: ~100 agents (explorers, scanners, swarm workers)
  sonnet: ~250 agents (engineers, QA, generators)
  opus: ~100 agents (architects, security, orchestrators)
  opusplan: ~10 agents (complex plan→implement)
```

---

## XI. Quick Reference

### Model Selection Cheatsheet

| Task Type | Model | Example Agents |
|-----------|-------|----------------|
| Scan files | haiku | dependency-analyzer, indexer |
| Analyze code (simple) | haiku | complexity-analyzer, coverage-analyzer |
| Analyze code (deep) | sonnet | performance-analyzer, architecture-analyzer |
| Plan architecture | opus | system-architect, rust-project-architect |
| Implement features | sonnet | sveltekit-engineer, rust-semantics-engineer |
| Review code | opus | code-reviewer, security-scanner |
| Generate tests | sonnet | unit-test-generator, integration-test-generator |
| Run tests | sonnet | sveltekit-qa-engineer, rust-qa-engineer |
| Orchestrate workflow | opus | sveltekit-orchestrator, wasm-lead-orchestrator |
| Parallel workers | haiku | parallel-file-processor, swarm workers |
| Generate docs | sonnet | technical-writer, api-documentation-generator |

### Cost-Quality Tradeoff

```
Haiku:  Fastest, Cheapest  → Simple pattern matching
Sonnet: Balanced           → General coding, testing
Opus:   Best Quality       → Architecture, security, critical decisions
```

### Migration Checklist

- [ ] Run model policy migration script
- [ ] Verify: 0 agents use `model: default`
- [ ] Test: Critical workflows still work
- [ ] Measure: Context cost reduction
- [ ] Monitor: `/usage` to track Opus consumption

---

**End of Model Policy**

**Next**: Apply this policy in Phase 5 (implementation)

