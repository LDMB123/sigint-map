# Universal Agent Framework - Master Index

**Function-first agent architecture for maximum parallelization**

## Quick Stats

| Metric | Value |
|--------|-------|
| Total Agent Categories | 18 |
| Total Agents | 100+ |
| Technology Ecosystems | 5 |
| Swarm Patterns | 5 |
| Max Parallelization | 200+ concurrent |
| Cost Savings | 70-95% |

---

## Technology Ecosystems

### 1. Rust Development
**Location**: `agents/rust/` | `skills/rust/`
**Index**: [RUST_AGENT_ROSTER.md](RUST_AGENT_ROSTER.md) | [RUST_SKILLS_LIBRARY.md](RUST_SKILLS_LIBRARY.md)

| Agents | Skills | Tier Distribution |
|--------|--------|-------------------|
| 13 | 28 | 3 Opus, 8 Sonnet, 2 Haiku |

Key capabilities:
- Ownership/lifetime debugging
- Migration from Python/JS/C/Go
- Performance profiling
- Async patterns (Tokio)
- Macro development

### 2. WebAssembly (WASM)
**Location**: `agents/wasm/` | `skills/wasm/`
**Index**: [WASM_AGENT_ROSTER.md](WASM_AGENT_ROSTER.md) | [WASM_SKILLS_LIBRARY.md](WASM_SKILLS_LIBRARY.md)

| Agents | Skills | Tier Distribution |
|--------|--------|-------------------|
| 9 | 17 | 1 Opus, 6 Sonnet, 2 Haiku |

Key capabilities:
- Rust-to-WASM compilation
- JS/TS interop
- Size optimization
- Framework support (Leptos, Yew, Dioxus)

### 3. SvelteKit Development
**Location**: `agents/sveltekit/` | `skills/sveltekit/`
**Index**: [SVELTEKIT_AGENT_ROSTER.md](SVELTEKIT_AGENT_ROSTER.md) | [SVELTEKIT_SKILLS_LIBRARY.md](SVELTEKIT_SKILLS_LIBRARY.md)

| Agents | Skills | Tier Distribution |
|--------|--------|-------------------|
| 15 | 18 | 1 Opus, 12 Sonnet, 2 Haiku |

Key capabilities:
- PWA development
- Local-first/offline patterns
- Svelte 5 runes
- Performance optimization

### 4. Apple Silicon Optimization
**Location**: `agents/apple-silicon/`
**Index**: [agents/apple-silicon/README.md](agents/apple-silicon/README.md)

| Agents | Focus |
|--------|-------|
| 6 | M-series optimization, Metal GPU, WebGPU, Energy efficiency |

### 5. MCP (Model Context Protocol)
**Location**: `agents/mcp/`

| Agents | Focus |
|--------|-------|
| 6 | MCP server design, GitHub integration, Browser automation |

---

## Functional Agent Categories

### Core UAF Categories

| Category | Location | Agents | Tier | Purpose |
|----------|----------|--------|------|---------|
| **Validators** | `agents/validators/` | 5 | Haiku | Check syntax, schemas, security |
| **Generators** | `agents/generators/` | 5 | Sonnet | Create code, tests, docs |
| **Analyzers** | `agents/analyzers/` | 5 | Sonnet | Understand performance, complexity |
| **Transformers** | `agents/transformers/` | 5 | Sonnet | Refactor, migrate, optimize |
| **Orchestrators** | `agents/orchestrators/` | 5 | Opus | Coordinate swarms, workflows |
| **Debuggers** | `agents/debuggers/` | 5 | Sonnet | Fix errors, performance issues |
| **Learners** | `agents/learners/` | 5 | Sonnet | Discover patterns, conventions |
| **Reporters** | `agents/reporters/` | 5 | Haiku | Summarize, visualize, notify |
| **Integrators** | `agents/integrators/` | 5 | Sonnet | Connect APIs, databases |
| **Guardians** | `agents/guardians/` | 5 | Sonnet | Enforce security, compliance |

### Domain-Specific Categories

| Category | Location | Agents | Purpose |
|----------|----------|--------|---------|
| **AI/ML** | `agents/ai-ml/` | 5 | LLM, RAG, ML deployment |
| **Data** | `agents/data/` | 5 | Pipelines, quality, streaming |
| **DevOps** | `agents/devops/` | 5 | CI/CD, K8s, Terraform |
| **Documentation** | `agents/documentation/` | 5 | API docs, ADRs, changelogs |
| **Security** | `agents/security/` | 5 | Scanning, compliance, incident response |
| **Swarms** | `agents/swarms/` | 5 | Coordination, partitioning, aggregation |
| **Testing** | `agents/testing/` | 5 | Unit, integration, E2E, coverage |

---

## Swarm Patterns

| Pattern | Description | Cost Savings |
|---------|-------------|--------------|
| **Fan-Out Validation** | 1 Sonnet → 200 Haiku parallel | 70-90% |
| **Hierarchical Delegation** | Opus → Sonnet → Haiku cascade | 80-89% |
| **Consensus Building** | Multi-perspective decision making | Quality over cost |
| **Progressive Refinement** | Draft → Review → Polish iterations | 60-70% |
| **Self-Healing** | Automatic error recovery | Reliability |

Pattern definitions: `swarms/patterns/`

---

## Model Tier Reference

| Tier | Cost (per 1M tokens) | Latency | Max Concurrent | Best For |
|------|---------------------|---------|----------------|----------|
| **Haiku** | $0.25 input / $1.25 output | ~800ms | 200 | Validation, formatting |
| **Sonnet** | $3.00 input / $15.00 output | ~2.5s | 30 | Code generation, analysis |
| **Opus** | $15.00 input / $75.00 output | ~8s | 5 | Architecture, orchestration |

---

## Configuration

| File | Purpose |
|------|---------|
| `config/model_tiers.yaml` | Tier costs, selection criteria |
| `config/cost_limits.yaml` | Budget controls, alerts |
| `config/parallelization.yaml` | Concurrency limits, retry policies |

---

## Quick Start

### 1. Code Review
```bash
/review src/**/*.ts --depth standard
```
Uses fan-out validation with parallel Haiku workers.

### 2. Generate Tests
```bash
/test-gen src/auth/ --coverage_target 90
```
Uses progressive refinement for high-quality tests.

### 3. Security Audit
```bash
/security-audit --scan_types vulnerabilities,secrets
```
Parallel security scanning across codebase.

### 4. Rust Development
```bash
/borrow-checker-debug  # Debug ownership issues
/rust-cli-scaffold     # Create new CLI project
/rust-profiling        # Performance analysis
```

### 5. WASM Development
```bash
/wasm-basics          # Learn fundamentals
/wasm-pack-workflow   # Build & publish
/wasm-size-optimization  # Reduce bundle
```

---

## Creating Custom Agents

1. Copy template: `templates/agents/agent_template.yaml`
2. Define capabilities and schemas
3. Set appropriate model tier
4. Add to relevant category folder

See `docs/agent_development.md` for details.

---

## Directory Structure

```
.claude/
├── agents/
│   ├── validators/       # 5 agents
│   ├── generators/       # 5 agents
│   ├── analyzers/        # 5 agents
│   ├── transformers/     # 5 agents
│   ├── orchestrators/    # 5 agents
│   ├── debuggers/        # 5 agents
│   ├── learners/         # 5 agents
│   ├── reporters/        # 5 agents
│   ├── integrators/      # 5 agents
│   ├── guardians/        # 5 agents
│   ├── ai-ml/            # 5 agents
│   ├── data/             # 5 agents
│   ├── devops/           # 5 agents
│   ├── documentation/    # 5 agents
│   ├── security/         # 5 agents
│   ├── swarms/           # 5 agents
│   ├── testing/          # 5 agents
│   ├── rust/             # 13 agents
│   ├── wasm/             # 9 agents
│   ├── sveltekit/        # 15 agents
│   ├── apple-silicon/    # 6 agents
│   └── mcp/              # 6 agents
├── skills/
│   ├── quality/          # Code review, test gen
│   ├── migration/        # API upgrades
│   ├── analysis/         # Security audit
│   ├── deployment/       # CI/CD
│   ├── rust/             # 28 Rust skills
│   ├── wasm/             # 17 WASM skills
│   └── sveltekit/        # 18 SvelteKit skills
├── swarms/
│   └── patterns/         # 5 swarm patterns
├── config/               # Configuration files
├── templates/            # Agent/skill templates
└── docs/                 # Documentation
```

---

## Related Documentation

- [Getting Started](docs/getting_started.md)
- [Agent Development Guide](docs/agent_development.md)
- [Skill Composition Guide](docs/skill_composition.md)
- [Swarm Patterns Guide](docs/swarm_patterns.md)
- [Rust Skills Library](RUST_SKILLS_LIBRARY.md)
- [WASM Skills Library](WASM_SKILLS_LIBRARY.md)
- [SvelteKit Skills Library](SVELTEKIT_SKILLS_LIBRARY.md)

---

## License

MIT
