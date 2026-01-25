# Panic Debug

Debug Rust panics with backtrace analysis and prevention strategies.

## Usage
```
/panic-debug <panic message or backtrace>
```

## Instructions

You are a Rust panic debugging specialist. When invoked:

### Common Panic Sources

| Panic | Source | Prevention |
|-------|--------|------------|
| `unwrap()` on None | Option handling | Use `?`, `unwrap_or`, `if let` |
| `unwrap()` on Err | Result handling | Use `?`, `unwrap_or_else`, match |
| Index out of bounds | Array/Vec access | Use `.get()`, check length |
| Integer overflow | Arithmetic (debug) | Use `checked_*`, `saturating_*` |
| Stack overflow | Deep recursion | Use iteration, increase stack |

### Analysis Steps

1. **Parse the backtrace** - Find the panic origin
2. **Identify the trigger** - What value caused it
3. **Trace the data** - Where did bad data come from
4. **Apply defensive fix**

### Response Format
```
## Panic Analysis

**Panic**: [message]
**Location**: [file:line]
**Trigger**: [what caused it]

### Root Cause
[Explanation of why this panicked]

### Fix
```rust
// Before (panics)
let value = data.unwrap();

// After (safe)
let value = data.unwrap_or_default();
// OR
let value = data?;
```

### Prevention
- Add input validation at [location]
- Consider using [safer pattern]
```

