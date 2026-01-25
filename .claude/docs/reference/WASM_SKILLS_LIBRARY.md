# WASM Skills Library

> Master index of all 17 WebAssembly development skills for Claude Code

---

## Quick Reference

| Category | Count | Primary Agent |
|----------|-------|---------------|
| [Foundations](#foundations) | 3 | WASM Orchestrator |
| [Rust-WASM](#rust-wasm) | 3 | WASM Rust Compiler |
| [JS Interop](#js-interop) | 3 | WASM JS Interop Engineer |
| [Tooling](#tooling) | 2 | WASM Toolchain Engineer |
| [Optimization](#optimization) | 3 | WASM Optimizer |
| [Frameworks](#frameworks) | 3 | WASM Framework Specialist |

**Total: 17 Skills**

---

## Foundations

Core WebAssembly concepts and fundamentals.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `wasm-basics` | [wasm-basics.md](skills/wasm/foundations/wasm-basics.md) | Linear memory, imports/exports, value types | Learning WASM fundamentals |
| `wasm-text-format` | [wasm-text-format.md](skills/wasm/foundations/wasm-text-format.md) | WAT syntax, debugging, S-expressions | Reading/writing WAT files |
| `wasm-component-model` | [wasm-component-model.md](skills/wasm/foundations/wasm-component-model.md) | WIT, interfaces, component linking | Building WASM components |

---

## Rust-WASM

Skills for compiling Rust to WebAssembly.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `wasm-bindgen-guide` | [wasm-bindgen-guide.md](skills/wasm/rust-wasm/wasm-bindgen-guide.md) | Attributes, type conversions, web-sys | Writing Rust WASM code |
| `wasm-pack-workflow` | [wasm-pack-workflow.md](skills/wasm/rust-wasm/wasm-pack-workflow.md) | Build targets, testing, npm publishing | Building WASM projects |
| `rust-wasm-debugging` | [rust-wasm-debugging.md](skills/wasm/rust-wasm/rust-wasm-debugging.md) | Panic hooks, source maps, DevTools | Debugging Rust WASM |

---

## JS Interop

JavaScript and TypeScript integration with WASM.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `js-wasm-integration` | [js-wasm-integration.md](skills/wasm/js-interop/js-wasm-integration.md) | Loading, memory sharing, function calls | Integrating WASM in JS |
| `typescript-wasm-types` | [typescript-wasm-types.md](skills/wasm/js-interop/typescript-wasm-types.md) | Type definitions, generic patterns | TypeScript + WASM |
| `bundler-integration` | [bundler-integration.md](skills/wasm/js-interop/bundler-integration.md) | Webpack, Vite, Rollup, ESBuild | Bundler configuration |

---

## Tooling

WASM development tools and workflows.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `wasm-tools-guide` | [wasm-tools-guide.md](skills/wasm/tooling/wasm-tools-guide.md) | Parse, validate, print, strip | Manipulating WASM binaries |
| `trunk-dev-server` | [trunk-dev-server.md](skills/wasm/tooling/trunk-dev-server.md) | Dev server, asset pipeline, proxying | Rust WASM development |

---

## Optimization

Performance and size optimization techniques.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `wasm-size-optimization` | [wasm-size-optimization.md](skills/wasm/optimization/wasm-size-optimization.md) | Binary size reduction, wasm-opt | Reducing bundle size |
| `wasm-performance-tuning` | [wasm-performance-tuning.md](skills/wasm/optimization/wasm-performance-tuning.md) | Runtime optimization, SIMD | Improving performance |
| `wasm-loading-strategies` | [wasm-loading-strategies.md](skills/wasm/optimization/wasm-loading-strategies.md) | Streaming, lazy loading, caching | Faster load times |

---

## Frameworks

WASM-based web application frameworks.

| Skill ID | File | Description | Use When |
|----------|------|-------------|----------|
| `leptos-setup` | [leptos-setup.md](skills/wasm/frameworks/leptos-setup.md) | SSR, signals, server functions | Full-stack Rust apps |
| `yew-setup` | [yew-setup.md](skills/wasm/frameworks/yew-setup.md) | Virtual DOM, hooks, agents | React-like Rust apps |
| `dioxus-setup` | [dioxus-setup.md](skills/wasm/frameworks/dioxus-setup.md) | Web, desktop, mobile | Cross-platform apps |

---

## Usage

### Invoking Skills

```
Skill(wasm-bindgen-guide)
Skill(wasm-size-optimization)
Skill(leptos-setup)
```

### Skill Categories by Common Task

| Task | Recommended Skills |
|------|-------------------|
| Starting a Rust WASM project | `wasm-pack-workflow`, `wasm-bindgen-guide` |
| Building a full-stack app | `leptos-setup`, `wasm-pack-workflow` |
| Optimizing bundle size | `wasm-size-optimization`, `wasm-loading-strategies` |
| Debugging WASM issues | `rust-wasm-debugging`, `wasm-tools-guide` |
| Integrating with React/Vue | `js-wasm-integration`, `bundler-integration` |
| Learning WASM concepts | `wasm-basics`, `wasm-text-format` |
| Building WASM components | `wasm-component-model`, `wasm-tools-guide` |

---

## Skill-Agent Mapping

| Agent | Skills |
|-------|--------|
| WASM Lead Orchestrator | All skills (coordination) |
| WASM Rust Compiler | `wasm-bindgen-guide`, `wasm-pack-workflow` |
| WASM JS Interop Engineer | `js-wasm-integration`, `typescript-wasm-types`, `bundler-integration` |
| WASM Optimizer | `wasm-size-optimization`, `wasm-performance-tuning`, `wasm-loading-strategies` |
| WASM Browser Specialist | `js-wasm-integration`, `wasm-bindgen-guide` |
| WASM Memory Engineer | `wasm-basics`, `wasm-performance-tuning` |
| WASM Framework Specialist | `leptos-setup`, `yew-setup`, `dioxus-setup` |
| WASM Testing Specialist | `wasm-pack-workflow`, `rust-wasm-debugging` |
| WASM Toolchain Engineer | `wasm-tools-guide`, `trunk-dev-server`, `wasm-pack-workflow` |

---

## Cross-References

### Integration with Rust Skills

| WASM Skill | Related Rust Skill |
|------------|-------------------|
| `wasm-bindgen-guide` | `ownership-patterns`, `async-patterns` |
| `wasm-size-optimization` | `memory-optimization` |
| `wasm-performance-tuning` | `rust-profiling`, `rust-benchmarking` |
| `rust-wasm-debugging` | `panic-debug`, `borrow-checker-debug` |

### Integration with Existing Skills

| WASM Skill | Related Global Skill |
|------------|---------------------|
| `bundler-integration` | Vite/Webpack configuration skills |
| `typescript-wasm-types` | TypeScript skills |
| `leptos-setup` | SSR/hydration patterns |

---

## Version

**Library Version**: 1.0.0
**Last Updated**: 2025-01-21
**Total Skills**: 17
