# WASM Agent Roster

> 9 specialized agents for comprehensive WebAssembly development support

---

## Agent Tiers Overview

| Tier | Model | Purpose | Count |
|------|-------|---------|-------|
| **Opus** | Strategic | Orchestration, coordination | 1 |
| **Sonnet** | Implementation | Compilation, optimization, frameworks, testing | 7 |
| **Haiku** | Validation | Tooling | 1 |

**Total: 9 Agents**

---

## Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 WASM Lead Orchestrator (00)                      │
│                         [Opus Tier]                              │
│        Workflow coordination, quality gates, delegation          │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│ Rust Compiler │     │ JS Interop    │     │ Optimization      │
│ (01) [Sonnet] │     │ (02) [Sonnet] │     │ (03) [Sonnet]     │
└───────┬───────┘     └───────┬───────┘     └─────────┬─────────┘
        │                     │                       │
        └─────────────────────┼───────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Browser       │     │ Memory        │     │ Framework     │
│ (04) [Sonnet] │     │ (05) [Sonnet] │     │ (06) [Sonnet] │
└───────────────┘     └───────────────┘     └───────────────┘

        ┌───────────────────────────────────────────────┐
        │              Support Layer [Sonnet/Haiku]     │
        │  ┌─────────────────┐  ┌─────────────────────┐ │
        │  │ Testing         │  │ Toolchain           │ │
        │  │ (07) [Sonnet]   │  │ (08) [Haiku]        │ │
        │  └─────────────────┘  └─────────────────────┘ │
        └───────────────────────────────────────────────┘
```

---

## Tier 1: Opus (Strategic) - 1 Agent

### 00 - WASM Lead Orchestrator

| Attribute | Value |
|-----------|-------|
| **File** | [00-wasm-lead-orchestrator.md](agents/wasm/00-wasm-lead-orchestrator.md) |
| **Tier** | Opus |
| **Role** | Workflow coordination, quality gates, delegation |

**Responsibilities:**
- Coordinates multi-agent WASM workflows
- Enforces WASM-specific quality gates
- Delegates to specialist agents
- Ensures cross-language type safety
- Validates browser compatibility

**Delegates To:** All other WASM agents

---

## Tier 2: Sonnet (Implementation) - 6 Agents

### 01 - WASM Rust Compiler

| Attribute | Value |
|-----------|-------|
| **File** | [01-wasm-rust-compiler.md](agents/wasm/01-wasm-rust-compiler.md) |
| **Tier** | Sonnet |
| **Role** | Rust to WASM compilation with wasm-bindgen |

**Responsibilities:**
- Configure Cargo.toml for WASM targets
- Set up wasm-bindgen attributes
- Use wasm-pack for builds
- Handle #[wasm_bindgen] annotations
- Configure panic handling

**Skills:**
- `wasm-bindgen-guide`
- `wasm-pack-workflow`

---

### 02 - WASM JS Interop Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [02-wasm-js-interop-engineer.md](agents/wasm/02-wasm-js-interop-engineer.md) |
| **Tier** | Sonnet |
| **Role** | JS/TS bindings, type mappings, cross-language communication |

**Responsibilities:**
- Design clean JS API surfaces
- Generate TypeScript type definitions
- Handle complex type conversions
- Implement memory sharing patterns
- Create ergonomic async interfaces

**Skills:**
- `js-wasm-integration`
- `typescript-wasm-types`
- `bundler-integration`

---

### 03 - WASM Optimizer

| Attribute | Value |
|-----------|-------|
| **File** | [03-wasm-optimizer.md](agents/wasm/03-wasm-optimizer.md) |
| **Tier** | Sonnet |
| **Role** | Size reduction, performance optimization |

**Responsibilities:**
- Reduce WASM binary size
- Configure optimal compiler flags
- Run wasm-opt passes
- Analyze and eliminate bloat
- Measure before/after metrics

**Skills:**
- `wasm-size-optimization`
- `wasm-performance-tuning`
- `wasm-loading-strategies`

---

### 04 - WASM Browser Specialist

| Attribute | Value |
|-----------|-------|
| **File** | [04-wasm-browser-specialist.md](agents/wasm/04-wasm-browser-specialist.md) |
| **Tier** | Sonnet |
| **Role** | Browser APIs, web-sys, DOM manipulation |

**Responsibilities:**
- Configure web-sys features
- Handle DOM manipulation from WASM
- Implement event listeners
- Manage browser APIs (fetch, storage)
- Ensure cross-browser compatibility

**Skills:**
- `wasm-bindgen-guide`
- `js-wasm-integration`

---

### 05 - WASM Memory Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [05-wasm-memory-engineer.md](agents/wasm/05-wasm-memory-engineer.md) |
| **Tier** | Sonnet |
| **Role** | Memory management, JS-WASM data sharing |

**Responsibilities:**
- Design memory sharing strategies
- Implement efficient data transfer
- Handle memory growth
- Prevent memory leaks
- Optimize allocation patterns

**Skills:**
- `wasm-basics`
- `wasm-performance-tuning`

---

### 06 - WASM Framework Specialist

| Attribute | Value |
|-----------|-------|
| **File** | [06-wasm-framework-specialist.md](agents/wasm/06-wasm-framework-specialist.md) |
| **Tier** | Sonnet |
| **Role** | Leptos, Yew, Dioxus, Sycamore frameworks |

**Responsibilities:**
- Implement reactive components
- Configure SSR/hydration
- Handle routing
- Manage application state
- Integrate with backend APIs

**Skills:**
- `leptos-setup`
- `yew-setup`
- `dioxus-setup`

---

### 07 - WASM Testing Specialist

| Attribute | Value |
|-----------|-------|
| **File** | [07-wasm-testing-specialist.md](agents/wasm/07-wasm-testing-specialist.md) |
| **Tier** | Sonnet |
| **Role** | WASM testing, browser testing |

**Responsibilities:**
- wasm-pack test workflows
- Headless browser testing
- Async WASM function testing
- Browser API mocking
- Jest/Vitest integration

**Skills:**
- `wasm-pack-workflow`
- `rust-wasm-debugging`

---

## Tier 3: Haiku (Validation) - 1 Agent

### 08 - WASM Toolchain Engineer

| Attribute | Value |
|-----------|-------|
| **File** | [08-wasm-toolchain-engineer.md](agents/wasm/08-wasm-toolchain-engineer.md) |
| **Tier** | Haiku |
| **Role** | WASM tooling and workflows |

**Responsibilities:**
- wasm-pack workflows
- trunk dev server
- wasm-bindgen configuration
- wasm-tools manipulation
- Cross-compilation setup

**Skills:**
- `wasm-tools-guide`
- `trunk-dev-server`
- `wasm-pack-workflow`

---

## Agent Selection Guide

| Task | Primary Agent | Supporting Agents |
|------|---------------|-------------------|
| Compile Rust to WASM | Rust Compiler | Optimizer |
| Create JS bindings | JS Interop Engineer | Rust Compiler |
| Reduce bundle size | Optimizer | Toolchain Engineer |
| DOM manipulation | Browser Specialist | JS Interop Engineer |
| Memory optimization | Memory Engineer | Optimizer |
| Build full-stack app | Framework Specialist | Rust Compiler |
| Test WASM code | Testing Specialist | Toolchain Engineer |
| Set up tooling | Toolchain Engineer | - |
| Complex WASM project | Lead Orchestrator | Various |

---

## Quality Gates

All agents enforce these gates before task completion:

```bash
# Gate 1: Rust compilation
cargo build --target wasm32-unknown-unknown --release

# Gate 2: wasm-bindgen
wasm-bindgen target/wasm32-unknown-unknown/release/*.wasm --out-dir pkg

# Gate 3: Size check
ls -la pkg/*.wasm
wasm-opt -Os pkg/*.wasm -o pkg/*.wasm

# Gate 4: Type generation
# Verify .d.ts files exist

# Gate 5: Tests (if applicable)
wasm-pack test --headless --chrome
```

---

## Integration with Rust Agents

| WASM Agent | Collaborates With |
|------------|-------------------|
| WASM Lead Orchestrator | Rust Lead Orchestrator |
| WASM Rust Compiler | Rust Build Engineer, Rust Semantics Engineer |
| WASM Memory Engineer | Rust Performance Engineer |
| WASM Testing Specialist | Rust QA Engineer |
| WASM Optimizer | Rust Performance Engineer |

---

## Version

**Roster Version**: 1.0.0
**Last Updated**: 2025-01-21
**Total Agents**: 8
