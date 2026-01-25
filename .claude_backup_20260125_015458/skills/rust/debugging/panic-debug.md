# Skill: Panic & Unwinding Debug

**ID**: `panic-debug`
**Category**: Debugging
**Agent**: Rust Debugger

---

## When to Use

- Runtime panics from `unwrap()`, `expect()`, or `panic!()`
- Index out of bounds errors
- Assertion failures
- Stack overflow
- Need to understand panic backtraces
- Converting panics to recoverable errors

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| panic_message | string | Yes | The panic message or backtrace |
| binary_name | string | No | Name of the binary that panicked |
| reproduction_steps | string | No | How to reproduce the panic |

---

## Steps

### Step 1: Enable Full Backtrace

```bash
# Basic backtrace
RUST_BACKTRACE=1 cargo run

# Full backtrace (all frames including stdlib)
RUST_BACKTRACE=full cargo run

# With colors
RUST_BACKTRACE=1 RUST_LIB_BACKTRACE=1 cargo run
```

### Step 2: Read the Panic Message

```
thread 'main' panicked at 'called `Option::unwrap()` on a `None` value', src/main.rs:42:10
```

Components:
- **Thread**: `'main'` - which thread
- **Message**: What happened
- **Location**: `file:line:column`

### Step 3: Analyze Backtrace

```
stack backtrace:
   0: std::panicking::begin_panic_handler
   1: core::panicking::panic_fmt
   2: core::panicking::panic
   3: core::option::Option<T>::unwrap    <-- Immediate cause
      at /rustc/.../option.rs:XXX
   4: my_crate::process_data             <-- Your code starts here
      at ./src/processor.rs:42
   5: my_crate::handle_request
      at ./src/handler.rs:15
   6: my_crate::main
      at ./src/main.rs:10
```

**Focus on frames 3+ (your code)**, ignore 0-2 (panic machinery).

### Step 4: Common Panic Sources and Fixes

#### unwrap() on None

```rust
// PANIC
let value = map.get("key").unwrap();

// FIX 1: Handle None
let value = map.get("key").unwrap_or(&default);

// FIX 2: Propagate error
let value = map.get("key").ok_or(MyError::KeyNotFound)?;

// FIX 3: Pattern match
if let Some(value) = map.get("key") {
    process(value);
}
```

#### unwrap() on Err

```rust
// PANIC
let content = fs::read_to_string("config.toml").unwrap();

// FIX: Handle error
let content = fs::read_to_string("config.toml")
    .context("Failed to read config")?;
```

#### Index Out of Bounds

```rust
// PANIC
let item = vec[index];

// FIX 1: Use get()
let item = vec.get(index).ok_or(Error::InvalidIndex)?;

// FIX 2: Check bounds
if index < vec.len() {
    let item = &vec[index];
}
```

#### Integer Overflow (Debug Mode)

```rust
// PANIC (debug only)
let x: u8 = 255;
let y = x + 1;

// FIX 1: Checked arithmetic
let y = x.checked_add(1).ok_or(Error::Overflow)?;

// FIX 2: Saturating
let y = x.saturating_add(1);  // Returns 255

// FIX 3: Wrapping
let y = x.wrapping_add(1);  // Returns 0
```

#### Stack Overflow

```rust
// PANIC
fn factorial(n: u64) -> u64 {
    if n <= 1 { 1 }
    else { n * factorial(n - 1) }  // Stack overflow for large n
}

// FIX: Use iteration
fn factorial(n: u64) -> u64 {
    (1..=n).product()
}
```

### Step 5: Custom Panic Handling

#### Panic Hook

```rust
use std::panic;

fn setup_panic_hook() {
    panic::set_hook(Box::new(|info| {
        let location = info.location()
            .map(|l| format!("{}:{}", l.file(), l.line()))
            .unwrap_or_else(|| "unknown".into());

        let message = info.payload()
            .downcast_ref::<&str>()
            .copied()
            .or_else(|| info.payload().downcast_ref::<String>().map(|s| s.as_str()))
            .unwrap_or("Unknown panic");

        eprintln!("PANIC at {}: {}", location, message);

        // Log to file, send to error tracking, etc.
    }));
}
```

#### catch_unwind for Recovery

```rust
use std::panic;

fn safe_operation<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce() -> R + panic::UnwindSafe,
{
    match panic::catch_unwind(f) {
        Ok(result) => Ok(result),
        Err(e) => {
            let msg = e.downcast_ref::<&str>()
                .copied()
                .or_else(|| e.downcast_ref::<String>().map(|s| s.as_str()))
                .unwrap_or("Unknown panic");
            Err(msg.to_string())
        }
    }
}

// Usage
let result = safe_operation(|| potentially_panicking_code());
```

#### Abort vs Unwind

```toml
# Cargo.toml - Choose panic behavior
[profile.release]
panic = "abort"  # Smaller binary, no catch_unwind

[profile.release]
panic = "unwind"  # Default, allows catch_unwind
```

### Step 6: Debugging Tools

```bash
# Debug with gdb/lldb
rust-gdb target/debug/my-app
(gdb) catch panic
(gdb) run
(gdb) bt

# With lldb (macOS)
rust-lldb target/debug/my-app
(lldb) break set -n rust_panic
(lldb) run
(lldb) bt
```

---

## Common Issues

### Issue 1: Panic in Async Code

```rust
// Panic in spawned task crashes the task, not the program
tokio::spawn(async {
    panic!("oops");  // Task aborts, runtime continues
});

// FIX: Handle result
let handle = tokio::spawn(async {
    // ...
});

match handle.await {
    Ok(result) => result,
    Err(e) if e.is_panic() => {
        eprintln!("Task panicked: {:?}", e);
        // Handle panic
    }
    Err(e) => {
        eprintln!("Task cancelled: {:?}", e);
    }
}
```

### Issue 2: Panic Across FFI

```rust
// UNDEFINED BEHAVIOR: Panic unwinding across FFI
#[no_mangle]
pub extern "C" fn called_from_c() {
    panic!("oops");  // UB if called from C!
}

// FIX: Catch at boundary
#[no_mangle]
pub extern "C" fn called_from_c() -> i32 {
    match std::panic::catch_unwind(|| {
        // Code that might panic
    }) {
        Ok(_) => 0,
        Err(_) => -1,
    }
}
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| Panic analysis | stdout | Root cause and fix |
| Fix patch | edited file | Applied changes |

---

## Output Template

```markdown
## Panic Debug Report

### Panic Message
```
[panic message and backtrace]
```

### Root Cause
- **Type**: [unwrap/index/overflow/etc]
- **Location**: `file:line`
- **Cause**: [Why the panic occurred]

### Call Stack Analysis
1. `main()` at src/main.rs:10
2. `handle_request()` at src/handler.rs:15
3. `process_data()` at src/processor.rs:42 ← panic origin

### Fix Applied
```rust
// Before
let value = data.unwrap();

// After
let value = data.ok_or(Error::MissingData)?;
```

### Prevention
- Added error handling for [case]
- Added bounds checking for [case]

### Verification
```bash
cargo test test_handles_missing_data
```
```
