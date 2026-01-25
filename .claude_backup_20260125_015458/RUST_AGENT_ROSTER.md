# Rust Agent Roster

> 13 specialized agents for comprehensive Rust development support

---

## Agent Tiers Overview

| Tier | Model | Purpose | Count |
|------|-------|---------|-------|
| **Opus** | Strategic | Architecture, semantics, orchestration | 3 |
| **Sonnet** | Implementation | Feature development, debugging, optimization | 8 |
| **Haiku** | Validation | Parallel operations, documentation | 2 |

**Total: 13 Agents**

---

## Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Rust Lead Orchestrator (00)                    │
│                         [Opus Tier]                              │
│              Project coordination, gate enforcement              │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│ Project       │     │ Semantics     │     │ Implementation    │
│ Architect (01)│     │ Engineer (02) │     │ Specialists       │
│ [Opus]        │     │ [Opus]        │     │ [Sonnet]          │
└───────┬───────┘     └───────┬───────┘     └─────────┬─────────┘
        │                     │                       │
        ▼                     ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│ Migration (03)│     │ Async (05)    │     │ Performance (07)  │
│ Build (04)    │     │ Safety (06)   │     │ QA (08)           │
│ [Sonnet]      │     │ [Sonnet]      │     │ Debugger (09)     │
└───────────────┘     └───────────────┘     │ Metaprog (10)     │
                                            │ [Sonnet]          │
                                            └───────────────────┘

        ┌───────────────────────────────────────────────┐
        │              Support Layer [Haiku]            │
        │  ┌─────────────────┐  ┌─────────────────────┐ │
        │  │ Parallel        │  │ Documentation       │ │
        │  │ Coordinator (11)│  │ Specialist (12)     │ │
        │  └─────────────────┘  └─────────────────────┘ │
        └───────────────────────────────────────────────┘
```

---

## Tier 1: Opus (Strategic) - 3 Agents

### 00 - Rust Lead Orchestrator

| Attribute | Value |
|-----------|-------|
| **File** | [00-rust-lead-orchestrator.md](agents/rust/00-rust-lead-orchestrator.md) |
| **Tier** | Opus |
| **Role** | Project coordination, quality gates, agent delegation |

**Responsibilities:**
- Coordinates multi-agent Rust workflows
- Enforces quality gates (clippy, tests, fmt)
- Delegates to specialized agents
- Ensures idiomatic Rust output

**Delegates To:** All other agents

---

### 01 - Rust Project Architect

| Attribute | Value |
|-----------|-------|
| **File** | [01-rust-project-architect.md](agents/rust/01-rust-project-architect.md) |
| **Tier** | Opus |
| **Role** | Architecture decisions, project scaffolding |

**Responsibilities:**
- Project structure design
- Dependency selection
- Module organization
- API design
- Workspace configuration

**Skills:**
- `rust-cli-scaffold`
- `rust-web-scaffold`
- `rust-lib-scaffold`
- `rust-wasm-scaffold`
- `rust-workspace-setup`

**Delegates To:** Migration Engineer, Build Engineer

---

### 02 - Rust Semantics Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [02-rust-semantics-engineer.md](agents/rust/02-rust-semantics-engineer.md) |
| **Tier** | Opus |
| **Role** | Ownership, borrowing, lifetimes, type system |

**Responsibilities:**
- Ownership semantics
- Lifetime annotation
- Type system design
- Borrow checker resolution
- Generic programming

**Skills:**
- `ownership-patterns`
- `lifetime-annotation`
- `trait-design`
- `borrow-checker-debug`
- `lifetime-debug`

**Delegates To:** Async Specialist, Safety Auditor

---

## Tier 2: Sonnet (Implementation) - 8 Agents

### 03 - Rust Migration Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [03-rust-migration-engineer.md](agents/rust/03-rust-migration-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Language-to-Rust transitions |

**Responsibilities:**
- Python → Rust migration (PyO3)
- JavaScript → Rust migration (napi-rs, WASM)
- C/C++ → Rust migration (bindgen)
- Go → Rust migration
- Dependency mapping

**Skills:**
- `rust-from-python`
- `rust-from-js`
- `rust-from-c`
- `rust-from-go`
- `dependency-audit-migration`

---

### 04 - Rust Build Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [04-rust-build-engineer.md](agents/rust/04-rust-build-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Cargo, workspaces, CI/CD, releases |

**Responsibilities:**
- Cargo configuration
- Feature flag management
- CI/CD pipeline setup
- Release automation
- Cross-compilation
- Build optimization

**Skills:**
- `cargo-workflow`
- `crate-selection`

---

### 05 - Rust Async Specialist

| Attribute | Value |
|-----------|-------|
| **File** | [05-rust-async-specialist.md](agents/rust/05-rust-async-specialist.md) |
| **Tier** | Sonnet |
| **Role** | Tokio, async patterns, futures |

**Responsibilities:**
- Async/await patterns
- Tokio runtime usage
- Channel communication
- Graceful shutdown
- Cancellation safety
- Stream processing

**Skills:**
- `async-patterns`
- `tokio-patterns`
- `serde-patterns`

---

### 06 - Rust Safety Auditor

| Attribute | Value |
|-----------|-------|
| **File** | [06-rust-safety-auditor.md](agents/rust/06-rust-safety-auditor.md) |
| **Tier** | Sonnet |
| **Role** | Unsafe code review, Miri, soundness |

**Responsibilities:**
- Unsafe code auditing
- Miri testing
- Soundness verification
- Safety invariants
- FFI boundary safety

**Skills:**
- `unsafe-guidelines`
- `unsafe-audit`

---

### 07 - Rust Performance Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [07-rust-performance-engineer.md](agents/rust/07-rust-performance-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Profiling, benchmarks, optimization |

**Responsibilities:**
- CPU profiling
- Memory profiling
- Benchmark creation
- Zero-cost abstraction verification
- Cache optimization
- SIMD optimization

**Skills:**
- `rust-profiling`
- `rust-benchmarking`
- `zero-cost-audit`
- `memory-optimization`

---

### 08 - Rust QA Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [08-rust-qa-engineer.md](agents/rust/08-rust-qa-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Testing, fuzzing, coverage |

**Responsibilities:**
- Unit test design
- Integration testing
- Property-based testing
- Fuzz testing
- Code coverage
- Test organization

**Skills:**
- `rust-unit-test`
- `rust-integration-test`
- `rust-property-test`
- `rust-fuzzing`

---

### 09 - Rust Debugger

| Attribute | Value |
|-----------|-------|
| **File** | [09-rust-debugger.md](agents/rust/09-rust-debugger.md) |
| **Tier** | Sonnet |
| **Role** | Error resolution, panic analysis |

**Responsibilities:**
- Panic debugging
- Backtrace analysis
- Runtime error diagnosis
- Error propagation design
- Debug tooling

**Skills:**
- `panic-debug`

---

### 10 - Rust Metaprogramming Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [10-rust-metaprogramming-engineer.md](agents/rust/10-rust-metaprogramming-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Declarative/procedural macros |

**Responsibilities:**
- Declarative macros (macro_rules!)
- Procedural macros (derive, attribute, function-like)
- Macro debugging
- Code generation
- Build scripts (build.rs)

**Skills:**
- `macro-development`

---

## Tier 3: Haiku (Validation) - 2 Agents

### 11 - Rust Parallel Coordinator

| Attribute | Value |
|-----------|-------|
| **File** | [11-rust-parallel-coordinator.md](agents/rust/11-rust-parallel-coordinator.md) |
| **Tier** | Haiku |
| **Role** | Batch file operations, parallel validation |

**Responsibilities:**
- Parallel file processing
- Batch validation
- Multi-file refactoring coordination
- Workspace-wide operations

**Assists:** All agents for parallel operations

---

### 12 - Rust Documentation Specialist

| Attribute | Value |
|-----------|-------|
| **File** | [12-rust-documentation-specialist.md](agents/rust/12-rust-documentation-specialist.md) |
| **Tier** | Haiku |
| **Role** | rustdoc, README, API documentation |

**Responsibilities:**
- rustdoc comments
- README generation
- API documentation
- Example code
- Documentation testing

**Assists:** All agents for documentation tasks

---

## Agent Selection Guide

| Task | Primary Agent | Supporting Agents |
|------|---------------|-------------------|
| New CLI project | Project Architect | Build Engineer |
| New web service | Project Architect | Async Specialist |
| Migrate Python code | Migration Engineer | Semantics Engineer |
| Fix borrow errors | Semantics Engineer | Debugger |
| Fix lifetime errors | Semantics Engineer | - |
| Optimize performance | Performance Engineer | Build Engineer |
| Add tests | QA Engineer | - |
| Review unsafe code | Safety Auditor | Semantics Engineer |
| Create macros | Metaprogramming Engineer | - |
| Setup CI/CD | Build Engineer | - |
| Write documentation | Documentation Specialist | - |
| Complex multi-step task | Lead Orchestrator | Various |

---

## Quality Gates

All agents enforce these gates before task completion:

```bash
# Gate 1: Compilation
cargo build

# Gate 2: Linting
cargo clippy -- -D warnings

# Gate 3: Formatting
cargo fmt --check

# Gate 4: Tests
cargo test

# Gate 5: Documentation (if applicable)
cargo doc --no-deps
```

---

## Usage

### Invoking Agents via Task Tool

```
Task(subagent_type="rust-semantics-engineer", prompt="Fix this borrow checker error: ...")
Task(subagent_type="rust-project-architect", prompt="Scaffold a new CLI project for ...")
Task(subagent_type="rust-migration-engineer", prompt="Migrate this Python function to Rust: ...")
```

### Agent Communication Pattern

1. **Lead Orchestrator** receives complex task
2. Analyzes requirements and delegates to specialists
3. Specialists complete their portions
4. **Parallel Coordinator** handles batch operations if needed
5. **Documentation Specialist** adds docs
6. **Lead Orchestrator** runs quality gates
7. Returns consolidated result

---

## Version

**Roster Version**: 1.0.0
**Last Updated**: 2025-01-21
**Total Agents**: 13
