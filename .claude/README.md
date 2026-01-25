# Universal Agent Framework (UAF)

**Function-first agent architecture for maximum parallelization**

## What is UAF?

UAF organizes AI agents by **what they do** (validators, generators, analyzers) rather than **what technology they know** (rust-engineer, frontend-developer). This enables:

- **Massive Parallelization**: 200+ Haiku workers executing simultaneously
- **70-95% Cost Savings**: Right model tier for each task
- **Technology Agnostic**: Same agents work for Rust, JS, Python, Go, etc.
- **Composable Skills**: Build complex workflows from simple primitives

## Quick Stats

| Metric | Value |
|--------|-------|
| Agent Categories | 10 functional categories |
| Total Agents | 50+ ready-to-use |
| Swarm Patterns | 5 core patterns |
| Skills | 5+ composable workflows |
| Max Parallelization | 200+ concurrent workers |
| Cost Savings | 70-95% vs traditional |

## Functional Categories

| Category | Count | Tier | Purpose |
|----------|-------|------|---------|
| Validators | 5 | Haiku | Check syntax, schemas, security |
| Generators | 5 | Sonnet | Create code, tests, docs |
| Analyzers | 5 | Sonnet | Understand performance, complexity |
| Transformers | 5 | Sonnet | Refactor, migrate, optimize |
| Orchestrators | 5 | Opus | Coordinate swarms, workflows |
| Debuggers | 5 | Sonnet | Fix errors, performance issues |
| Learners | 5 | Sonnet | Discover patterns, conventions |
| Reporters | 5 | Haiku | Summarize, visualize, notify |
| Integrators | 5 | Sonnet | Connect APIs, databases |
| Guardians | 5 | Sonnet | Enforce security, compliance |

## Swarm Patterns

### Fan-Out Validation
```
1 Sonnet → 200 Haiku parallel
Cost: $0.03 for 100 files (vs $0.30 traditional)
```

### Hierarchical Delegation
```
1 Opus → 20 Sonnet → 500 Haiku
Scales to 1000+ file migrations
```

### Consensus Building
```
5 Sonnet propose → 25 Haiku evaluate → 1 Opus decides
High-quality architecture decisions
```

### Progressive Refinement
```
Draft → Review → Polish → Iterate
Quality threshold: 0.85+
```

### Self-Healing
```
Monitor → Diagnose → Fix → Verify
Automatic CI/CD recovery
```

## Usage

```bash
# Code review with parallel validation
/review src/**/*.ts

# Generate comprehensive tests
/test-gen src/auth/

# Security audit
/security-audit --compliance owasp,soc2

# API upgrade migration
/api-upgrade @tanstack/react-query --from 4.0 --to 5.0

# CI/CD pipeline setup
/ci-setup --platform github_actions
```

## Cost Comparison

| Operation | Traditional | UAF Swarm | Savings |
|-----------|-------------|-----------|---------|
| Validate 100 files | $0.30 | $0.028 | 90.7% |
| Code review 50 files | $0.15 | $0.04 | 73.3% |
| Migrate 1000 files | $3.00 | $0.33 | 89% |
| Architecture decision | $0.015 | $0.051 | -240%* |

*Consensus building costs more but delivers higher quality decisions

## Directory Structure

```
.claude/
├── agents/           # 50+ agents by function
├── skills/           # Composable workflows
├── swarms/           # Swarm pattern definitions
├── config/           # Cost, parallelization settings
├── templates/        # Create your own agents/skills
└── docs/             # Getting started, guides
```

## Getting Started

1. Read [`docs/getting_started.md`](docs/getting_started.md)
2. Try a skill: `/review src/`
3. Explore agents: `agents/validators/`, `agents/generators/`
4. Create your own: Copy from `templates/`

## Design Principles

1. **Function over Domain**: Agents defined by WHAT they do
2. **Parallelization-First**: Every decision optimizes for concurrency
3. **Cost-Aware**: Right model tier for right task
4. **Composability**: Skills combine like UNIX pipes
5. **Technology-Agnostic**: Works for any language/framework

## License

MIT
