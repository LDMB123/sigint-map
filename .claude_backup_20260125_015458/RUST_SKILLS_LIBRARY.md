# Rust Skills Library

> Master index of all 32 Rust development skills for Claude Code

---

## Quick Reference

| Category | Count | Primary Agent |
|----------|-------|---------------|
| [Migration](#migration) | 5 | Rust Migration Engineer |
| [Scaffolding](#scaffolding) | 5 | Rust Project Architect |
| [Features](#features) | 6 | Rust Semantics Engineer |
| [Debugging](#debugging) | 4 | Rust Debugger / Semantics Engineer |
| [Performance](#performance) | 4 | Rust Performance Engineer |
| [Testing](#testing) | 4 | Rust QA Engineer |
| [Ecosystem](#ecosystem) | 4 | Rust Build Engineer / Async Specialist |

**Total: 32 Skills**

---

## Migration

Skills for transitioning codebases from other languages to Rust.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `rust-from-python` | [rust-from-python.md](skills/rust/migration/rust-from-python.md) | PyO3, FFI bindings, type mapping | Migrating Python scripts/libraries to Rust |
| `rust-from-js` | [rust-from-js.md](skills/rust/migration/rust-from-js.md) | napi-rs, WASM, async translation | Migrating Node.js/TypeScript to Rust |
| `rust-from-c` | [rust-from-c.md](skills/rust/migration/rust-from-c.md) | bindgen, safe abstractions | Wrapping C libraries or porting C code |
| `rust-from-go` | [rust-from-go.md](skills/rust/migration/rust-from-go.md) | Goroutine→async, channels, errors | Migrating Go services to Rust |
| `dependency-audit-migration` | [dependency-audit-migration.md](skills/rust/migration/dependency-audit-migration.md) | Crate equivalents for source packages | Finding Rust crate replacements |

---

## Scaffolding

Skills for creating new Rust projects with proper structure.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `rust-cli-scaffold` | [rust-cli-scaffold.md](skills/rust/scaffolding/rust-cli-scaffold.md) | clap, config, logging, error handling | Creating command-line applications |
| `rust-web-scaffold` | [rust-web-scaffold.md](skills/rust/scaffolding/rust-web-scaffold.md) | Axum, middleware, REST, database | Creating web services/APIs |
| `rust-lib-scaffold` | [rust-lib-scaffold.md](skills/rust/scaffolding/rust-lib-scaffold.md) | Public API, docs, feature flags | Creating reusable libraries |
| `rust-wasm-scaffold` | [rust-wasm-scaffold.md](skills/rust/scaffolding/rust-wasm-scaffold.md) | wasm-bindgen, JS interop, size opt | Creating WebAssembly modules |
| `rust-workspace-setup` | [rust-workspace-setup.md](skills/rust/scaffolding/rust-workspace-setup.md) | Multi-crate, shared deps, CI | Setting up monorepo workspaces |

---

## Features

Skills for leveraging Rust's unique language features.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `ownership-patterns` | [ownership-patterns.md](skills/rust/features/ownership-patterns.md) | Clone vs borrow, interior mutability | Understanding ownership semantics |
| `lifetime-annotation` | [lifetime-annotation.md](skills/rust/features/lifetime-annotation.md) | Elision, common patterns, self-ref | Adding lifetime annotations |
| `trait-design` | [trait-design.md](skills/rust/features/trait-design.md) | Generics, trait objects, blanket impls | Designing trait hierarchies |
| `async-patterns` | [async-patterns.md](skills/rust/features/async-patterns.md) | Futures, cancellation, runtime selection | Writing async code |
| `macro-development` | [macro-development.md](skills/rust/features/macro-development.md) | Declarative vs procedural, debugging | Creating macros |
| `unsafe-guidelines` | [unsafe-guidelines.md](skills/rust/features/unsafe-guidelines.md) | When to use, invariants, auditing | Writing safe unsafe code |

---

## Debugging

Skills for resolving Rust-specific errors and issues.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `borrow-checker-debug` | [borrow-checker-debug.md](skills/rust/debugging/borrow-checker-debug.md) | E0502, E0499, E0505, E0507 fixes | Fixing borrow checker errors |
| `lifetime-debug` | [lifetime-debug.md](skills/rust/debugging/lifetime-debug.md) | E0106, E0621, E0495, E0597 fixes | Fixing lifetime errors |
| `panic-debug` | [panic-debug.md](skills/rust/debugging/panic-debug.md) | Backtrace, panic hooks, catch_unwind | Debugging panics and crashes |
| `unsafe-audit` | [unsafe-audit.md](skills/rust/debugging/unsafe-audit.md) | Miri, UB detection, safety proofs | Auditing unsafe code |

---

## Performance

Skills for optimizing Rust code performance.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `rust-profiling` | [rust-profiling.md](skills/rust/performance/rust-profiling.md) | perf, flamegraph, Instruments | Profiling CPU/memory usage |
| `rust-benchmarking` | [rust-benchmarking.md](skills/rust/performance/rust-benchmarking.md) | Criterion setup, regression detection | Benchmarking code performance |
| `zero-cost-audit` | [zero-cost-audit.md](skills/rust/performance/zero-cost-audit.md) | Iterator vs loop, inlining analysis | Verifying zero-cost abstractions |
| `memory-optimization` | [memory-optimization.md](skills/rust/performance/memory-optimization.md) | Struct packing, arena, cache opt | Optimizing memory usage |

---

## Testing

Skills for comprehensive Rust testing strategies.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `rust-unit-test` | [rust-unit-test.md](skills/rust/testing/rust-unit-test.md) | #[cfg(test)], mocking, organization | Writing unit tests |
| `rust-integration-test` | [rust-integration-test.md](skills/rust/testing/rust-integration-test.md) | tests/, fixtures, database testing | Writing integration tests |
| `rust-property-test` | [rust-property-test.md](skills/rust/testing/rust-property-test.md) | proptest/quickcheck, shrinking | Property-based testing |
| `rust-fuzzing` | [rust-fuzzing.md](skills/rust/testing/rust-fuzzing.md) | cargo-fuzz, AFL, libfuzzer | Fuzz testing |

---

## Ecosystem

Skills for working with Rust tooling and popular crates.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `cargo-workflow` | [cargo-workflow.md](skills/rust/ecosystem/cargo-workflow.md) | Workspaces, features, cross-compile | Optimizing Cargo workflows |
| `crate-selection` | [crate-selection.md](skills/rust/ecosystem/crate-selection.md) | Evaluating, security audit, versions | Choosing crates |
| `tokio-patterns` | [tokio-patterns.md](skills/rust/ecosystem/tokio-patterns.md) | Spawning, channels, graceful shutdown | Using Tokio runtime |
| `serde-patterns` | [serde-patterns.md](skills/rust/ecosystem/serde-patterns.md) | Custom serializers, format selection | Serialization/deserialization |

---

## Usage

### Invoking Skills

Skills can be invoked using the Skill tool:

```
Skill(rust-cli-scaffold)
Skill(borrow-checker-debug)
Skill(rust-from-python)
```

### Skill Categories by Common Task

| Task | Recommended Skills |
|------|-------------------|
| Starting a new CLI project | `rust-cli-scaffold`, `cargo-workflow` |
| Starting a new web service | `rust-web-scaffold`, `tokio-patterns`, `serde-patterns` |
| Migrating from Python | `rust-from-python`, `dependency-audit-migration` |
| Fixing compile errors | `borrow-checker-debug`, `lifetime-debug` |
| Improving performance | `rust-profiling`, `rust-benchmarking`, `zero-cost-audit` |
| Adding tests | `rust-unit-test`, `rust-integration-test`, `rust-property-test` |
| Working with async | `async-patterns`, `tokio-patterns` |
| Creating a library | `rust-lib-scaffold`, `trait-design`, `ownership-patterns` |

---

## Skill-Agent Mapping

| Agent | Skills |
|-------|--------|
| Rust Project Architect | `rust-cli-scaffold`, `rust-web-scaffold`, `rust-lib-scaffold`, `rust-wasm-scaffold`, `rust-workspace-setup` |
| Rust Semantics Engineer | `ownership-patterns`, `lifetime-annotation`, `trait-design`, `borrow-checker-debug`, `lifetime-debug` |
| Rust Migration Engineer | `rust-from-python`, `rust-from-js`, `rust-from-c`, `rust-from-go`, `dependency-audit-migration` |
| Rust Build Engineer | `cargo-workflow`, `crate-selection` |
| Rust Async Specialist | `async-patterns`, `tokio-patterns`, `serde-patterns` |
| Rust Safety Auditor | `unsafe-guidelines`, `unsafe-audit` |
| Rust Performance Engineer | `rust-profiling`, `rust-benchmarking`, `zero-cost-audit`, `memory-optimization` |
| Rust QA Engineer | `rust-unit-test`, `rust-integration-test`, `rust-property-test`, `rust-fuzzing` |
| Rust Debugger | `panic-debug` |
| Rust Metaprogramming Engineer | `macro-development` |

---

## Version

**Library Version**: 1.0.0
**Last Updated**: 2025-01-21
**Total Skills**: 28
