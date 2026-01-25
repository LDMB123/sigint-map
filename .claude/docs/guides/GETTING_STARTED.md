# Universal Agent Framework - Getting Started

## Overview

The Universal Agent Framework (UAF) is a function-first agent architecture designed for **maximum parallelization**. Instead of organizing agents by technology domain (rust-engineer, frontend-developer), UAF organizes agents by **what they do**:

- **Validators** - Check things (syntax, schemas, security)
- **Generators** - Create things (code, tests, docs)
- **Analyzers** - Understand things (performance, complexity, impact)
- **Transformers** - Change things (refactor, migrate, optimize)
- **Orchestrators** - Coordinate things (workflows, swarms, consensus)
- **Debuggers** - Fix things (errors, performance, tests)
- **Learners** - Discover things (patterns, conventions, domains)
- **Reporters** - Communicate things (summaries, metrics, notifications)
- **Integrators** - Connect things (APIs, databases, services)
- **Guardians** - Protect things (security, compliance, privacy)

## Quick Start

### 1. Run a Code Review

```bash
# Uses fan-out validation with parallel Haiku workers
/review src/**/*.ts --depth standard
```

### 2. Generate Tests

```bash
# Uses progressive refinement for high-quality tests
/test-gen src/auth/login.ts --coverage_target 90
```

### 3. Security Audit

```bash
# Parallel security scanning across codebase
/security-audit --scan_types vulnerabilities,secrets
```

## Three-Tier Model Hierarchy

### Haiku Workers (Fast, Cheap, Parallelizable)
- **Cost**: $0.25/1M tokens
- **Latency**: ~800ms
- **Max Concurrent**: 200
- **Best For**: Validation, formatting, simple transformations
- **Speedup**: 50-200x through parallelization

### Sonnet Specialists (Balanced Quality/Cost)
- **Cost**: $3.00/1M tokens
- **Latency**: ~2.5s
- **Max Concurrent**: 30
- **Best For**: Code generation, analysis, debugging

### Opus Orchestrators (Strategic Decisions)
- **Cost**: $15.00/1M tokens
- **Latency**: ~8s
- **Max Concurrent**: 5
- **Best For**: Architecture decisions, swarm coordination

## Swarm Patterns

### Fan-Out Validation
```yaml
# 1 Sonnet coordinator → 100+ Haiku validators
# Cost: 70-90% savings vs sequential
Use for: Validating many files in parallel
```

### Hierarchical Delegation
```yaml
# Opus → Sonnet coordinators → Haiku workers
# Scales to 500+ parallel workers
Use for: Large-scale migrations, refactoring
```

### Consensus Building
```yaml
# Multiple Sonnets propose → Haiku evaluate → Opus decides
# High-quality decisions through diverse perspectives
Use for: Architecture decisions, technology selection
```

### Progressive Refinement
```yaml
# Draft → Review → Polish → Evaluate → Repeat
# Iterates until quality threshold met
Use for: Code generation, documentation
```

### Self-Healing
```yaml
# Monitor → Diagnose → Fix → Verify
# Automatic error recovery
Use for: CI/CD pipelines, deployment recovery
```

## Directory Structure

```
.claude/
├── agents/           # Agent definitions by function
│   ├── validators/
│   ├── generators/
│   ├── analyzers/
│   ├── transformers/
│   ├── orchestrators/
│   ├── debuggers/
│   ├── learners/
│   ├── reporters/
│   ├── integrators/
│   └── guardians/
├── skills/           # Composable workflows
│   ├── quality/
│   ├── migration/
│   ├── analysis/
│   └── deployment/
├── swarms/           # Swarm pattern definitions
│   └── patterns/
├── config/           # Framework configuration
│   ├── model_tiers.yaml
│   ├── cost_limits.yaml
│   └── parallelization.yaml
├── templates/        # Templates for creating new agents/skills
└── docs/             # Documentation
```

## Cost Optimization

### Example: Validate 100 Files

| Approach | Cost | Time |
|----------|------|------|
| Traditional (100 Sonnet calls) | $0.30 | 250s |
| UAF Swarm (100 Haiku parallel) | $0.028 | 15s |
| **Savings** | **90.7%** | **94%** |

### Example: Large Migration (1000 files)

| Approach | Cost | Time |
|----------|------|------|
| Traditional (1000 Sonnet) | $3.00 | 42 min |
| UAF Hierarchical (Opus→Sonnet→Haiku) | $0.33 | 5 min |
| **Savings** | **89%** | **88%** |

## Creating Custom Agents

1. Copy template: `templates/agents/agent_template.yaml`
2. Define capabilities and schemas
3. Set appropriate model tier
4. Add to relevant category folder

See `docs/agent_development.md` for details.

## Creating Custom Skills

1. Copy template: `templates/skills/skill_template.yaml`
2. Define parameters and workflow
3. Select appropriate swarm pattern
4. Add examples and cost model

See `docs/skill_composition.md` for details.

## Next Steps

- Read [Agent Development Guide](agent_development.md)
- Read [Skill Composition Guide](skill_composition.md)
- Read [Swarm Patterns Guide](swarm_patterns.md)
- Explore existing agents in `/agents`
- Try existing skills: `/review`, `/test-gen`, `/security-audit`
