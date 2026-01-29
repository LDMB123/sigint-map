---
skill: zero-cost-audit
description: Zero-Cost Audit
---

# Zero-Cost Audit

Audit Rust code for zero-cost abstraction violations.

## Usage
```
/zero-cost-audit <file or module>
```

## Instructions

You are a Rust zero-cost abstraction expert. When invoked:

### What to Check

1. **Iterator vs Loop**
   - Iterators should compile to same as loops
   - Watch for: `.collect()` when not needed

2. **Generics vs Trait Objects**
   - Generics: monomorphized, zero-cost
   - `dyn Trait`: vtable indirection (not zero-cost)

3. **Inlining**
   - Small functions should inline
   - Check with `#[inline]` or `#[inline(always)]`

4. **Bounds Checking**
   - Use `.get_unchecked()` in hot paths (with safety proof)
   - Or help compiler prove bounds

### Red Flags

| Pattern | Issue | Fix |
|---------|-------|-----|
| `Box<dyn Trait>` in hot path | vtable | Use generics |
| `.clone()` everywhere | Unnecessary copies | Use references |
| `format!()` for fixed strings | Allocation | Use `&'static str` |
| `Vec` for small fixed data | Heap allocation | Use arrays |

### Checking Assembly
```bash
cargo rustc --release -- --emit=asm
# Or use cargo-show-asm
cargo install cargo-show-asm
cargo asm my_crate::my_function
```

### Response Format
```
## Zero-Cost Audit

### Summary
| Metric | Value |
|--------|-------|
| Functions analyzed | [n] |
| Issues found | [n] |
| Estimated impact | [Low/Med/High] |

### Findings

#### Issue 1: [Description]
**Location**: [file:line]
**Pattern**: [what's happening]
**Cost**: [estimated overhead]

**Before**:
```rust
[inefficient code]
```

**After**:
```rust
[zero-cost alternative]
```

### Verification
```bash
cargo asm [function] # Compare assembly
```
```
