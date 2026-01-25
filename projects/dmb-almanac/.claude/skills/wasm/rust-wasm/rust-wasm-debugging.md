# Rust WASM Debugging Guide

Comprehensive guide to debugging Rust WebAssembly applications in browsers and Node.js.

## Overview

Debugging WASM requires different tools and techniques than traditional JavaScript or Rust debugging. This guide covers:
- Setting up panic hooks and error handling
- Using browser DevTools effectively
- Source map configuration
- Performance profiling
- Common error patterns and solutions

## console_error_panic_hook

### Basic Setup

The `console_error_panic_hook` crate forwards Rust panics to browser console with full stack traces.

**Cargo.toml:**
```toml
[dependencies]
console_error_panic_hook = "0.1"

[features]
default = ["console_error_panic_hook"]
```

**src/lib.rs:**
```rust
use wasm_bindgen::prelude::*;

// Initialize panic hook
#[cfg(feature = "console_error_panic_hook")]
pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}

// Call this at module initialization
#[wasm_bindgen(start)]
pub fn main() {
    #[cfg(feature = "console_error_panic_hook")]
    set_panic_hook();
}

// Or call it explicitly from JavaScript
#[wasm_bindgen]
pub fn init_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    set_panic_hook();
}
```

**JavaScript usage:**
```javascript
import init, { init_panic_hook } from './pkg/index.js';

async function run() {
    await init();
    init_panic_hook(); // Set up panic handling

    // Now panics will show detailed stack traces
}

run();
```

### Custom Panic Messages

```rust
use wasm_bindgen::prelude::*;
use std::panic;

#[wasm_bindgen]
pub fn setup_detailed_panic_hook() {
    panic::set_hook(Box::new(|panic_info| {
        let msg = if let Some(s) = panic_info.payload().downcast_ref::<&str>() {
            s
        } else if let Some(s) = panic_info.payload().downcast_ref::<String>() {
            s
        } else {
            "Unknown panic"
        };

        let location = if let Some(location) = panic_info.location() {
            format!("{}:{}:{}", location.file(), location.line(), location.column())
        } else {
            "Unknown location".to_string()
        };

        web_sys::console::error_1(
            &format!("Panic at {}: {}", location, msg).into()
        );
    }));
}
```

### Panic with Context

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn process_with_context(input: &str) -> Result<String, JsValue> {
    // Set panic hook first
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    // Use expect for better panic messages
    let parsed = input
        .parse::<i32>()
        .expect(&format!("Failed to parse '{}' as integer", input));

    Ok(format!("Parsed: {}", parsed))
}

#[wasm_bindgen]
pub fn safe_operation(value: i32) -> Result<i32, JsValue> {
    if value < 0 {
        return Err(JsValue::from_str("Value must be non-negative"));
    }

    // This panic will show full stack trace
    if value > 1000 {
        panic!("Value {} exceeds maximum of 1000", value);
    }

    Ok(value * 2)
}
```

## Source Maps

### Enabling Source Maps

Source maps allow browser DevTools to show Rust source code instead of WASM instructions.

**Build with debug info:**
```bash
# Development build (includes debug info)
wasm-pack build --dev

# Release build with debug info
wasm-pack build --profiling

# Or use custom profile
cargo build --profile release-with-debug --target wasm32-unknown-unknown
```

**Cargo.toml profile:**
```toml
[profile.dev]
debug = true

[profile.release-with-debug]
inherits = "release"
debug = true
strip = false

[profile.release]
debug = false
strip = true
```

### Verifying Source Maps

**Check generated files:**
```bash
ls pkg/
# Should see:
# - index_bg.wasm
# - index_bg.wasm.d.ts
# If debug = true, DWARF debug info is embedded in .wasm
```

**Browser DevTools:**
1. Open Chrome DevTools
2. Go to Sources tab
3. Look for `wasm://` URLs
4. You should see Rust source files

### Source Map Limitations

```rust
// Note: Source maps in WASM are limited compared to JavaScript
// They show file/line but may not map perfectly to Rust source

// Inline functions may not appear in stack traces
#[inline]
fn helper() {
    // May not show in stack trace
}

// Use #[inline(never)] for debugging
#[inline(never)]
fn debuggable_helper() {
    // Will appear in stack trace
}

#[wasm_bindgen]
pub fn example() {
    debuggable_helper(); // Stack trace will show this
}
```

## Browser DevTools

### Console Logging

```rust
use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
pub fn debug_example() {
    // Basic logging
    console::log_1(&"Hello from Rust!".into());

    // Multiple arguments
    console::log_2(&"Value:".into(), &42.into());

    // Warning
    console::warn_1(&"This is a warning".into());

    // Error
    console::error_1(&"This is an error".into());

    // Info
    console::info_1(&"This is info".into());

    // Debug (may be filtered in console)
    console::debug_1(&"Debug message".into());
}

// Logging complex objects
#[wasm_bindgen]
pub fn log_object(obj: &JsValue) {
    console::log_1(obj);
}

// Formatted logging
#[wasm_bindgen]
pub fn log_formatted(name: &str, value: i32) {
    console::log_1(&format!("Name: {}, Value: {}", name, value).into());
}

// Conditional logging
#[wasm_bindgen]
pub fn conditional_log(condition: bool, message: &str) {
    if condition {
        console::log_1(&message.into());
    }
}
```

### Console Groups

```rust
use web_sys::console;

#[wasm_bindgen]
pub fn grouped_logs() {
    console::group_1(&"Processing Data".into());
    console::log_1(&"Step 1: Loading".into());
    console::log_1(&"Step 2: Parsing".into());
    console::log_1(&"Step 3: Validating".into());
    console::group_end();

    // Collapsed group
    console::group_collapsed_1(&"Details".into());
    console::log_1(&"Detail 1".into());
    console::log_1(&"Detail 2".into());
    console::group_end();
}
```

### Performance Timing

```rust
use web_sys::console;

#[wasm_bindgen]
pub fn timed_operation() {
    console::time_with_label("operation");

    // Do some work
    let mut sum = 0;
    for i in 0..1000000 {
        sum += i;
    }

    console::time_end_with_label("operation");
    console::log_2(&"Result:".into(), &sum.into());
}

// Multiple timers
#[wasm_bindgen]
pub fn multiple_timers() {
    console::time_with_label("total");

    console::time_with_label("step1");
    // Step 1 work
    console::time_end_with_label("step1");

    console::time_with_label("step2");
    // Step 2 work
    console::time_end_with_label("step2");

    console::time_end_with_label("total");
}
```

### Assertions

```rust
use web_sys::console;

#[wasm_bindgen]
pub fn debug_assertions(value: i32) {
    // Console assertion (shows error if false)
    console::assert_with_condition_and_data_1(
        value > 0,
        &format!("Value must be positive, got {}", value).into(),
    );

    // Multiple values
    console::assert_with_condition_and_data_2(
        value < 100,
        &"Value too large:".into(),
        &value.into(),
    );
}
```

### Debugging Memory

```rust
use wasm_bindgen::prelude::*;

// Check WASM memory usage
#[wasm_bindgen]
pub fn get_memory_info() -> js_sys::Object {
    let obj = js_sys::Object::new();

    // Get memory object
    let memory = wasm_bindgen::memory();
    let buffer = memory.buffer();

    js_sys::Reflect::set(
        &obj,
        &"bufferByteLength".into(),
        &buffer.byte_length().into(),
    ).unwrap();

    obj
}

// Log large allocations
#[wasm_bindgen]
pub struct DebugVec {
    data: Vec<u8>,
}

#[wasm_bindgen]
impl DebugVec {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> DebugVec {
        web_sys::console::log_1(
            &format!("Allocating {} bytes", size).into()
        );
        DebugVec {
            data: vec![0; size],
        }
    }
}

impl Drop for DebugVec {
    fn drop(&mut self) {
        web_sys::console::log_1(
            &format!("Freeing {} bytes", self.data.len()).into()
        );
    }
}
```

## wasm-snip for Debugging

### What is wasm-snip?

`wasm-snip` removes functions from WASM binaries, useful for:
- Reducing binary size
- Removing unused functions
- Debugging by isolating code

### Installation and Usage

```bash
# Install wasm-snip
cargo install wasm-snip

# Build WASM first
wasm-pack build --release

# Snip specific functions
wasm-snip pkg/index_bg.wasm -o pkg/index_bg_snipped.wasm \
    --snip-rust-fmt-code \
    --snip-rust-panicking-code

# Snip specific function by name
wasm-snip pkg/index_bg.wasm -o pkg/index_bg.wasm \
    my_unused_function

# See what can be snipped
wasm-snip pkg/index_bg.wasm --snip-rust-fmt-code --dry-run
```

### Common Snipping Patterns

```bash
# Remove formatting code (useful for size reduction)
wasm-snip pkg/index_bg.wasm -o pkg/index_bg.wasm \
    --snip-rust-fmt-code

# Remove panic infrastructure (if using custom panic handler)
wasm-snip pkg/index_bg.wasm -o pkg/index_bg.wasm \
    --snip-rust-panicking-code

# Remove multiple functions
wasm-snip pkg/index_bg.wasm -o pkg/index_bg.wasm \
    function1 function2 function3

# Pattern matching
wasm-snip pkg/index_bg.wasm -o pkg/index_bg.wasm \
    --pattern "std::fmt::*"
```

### Integration with Build Process

```bash
#!/bin/bash
# build-and-optimize.sh

set -e

echo "Building WASM..."
wasm-pack build --release

echo "Snipping unused code..."
wasm-snip pkg/index_bg.wasm -o pkg/index_bg.wasm \
    --snip-rust-fmt-code \
    --snip-rust-panicking-code

echo "Running wasm-opt..."
wasm-opt -Oz pkg/index_bg.wasm -o pkg/index_bg.wasm

echo "Checking size..."
ls -lh pkg/index_bg.wasm
```

## Common Error Patterns

### Type Confusion Errors

```rust
use wasm_bindgen::prelude::*;

// Bad: Accepting JsValue without validation
#[wasm_bindgen]
pub fn bad_example(value: JsValue) -> i32 {
    value.as_f64().unwrap() as i32 // Can panic!
}

// Good: Proper error handling
#[wasm_bindgen]
pub fn good_example(value: JsValue) -> Result<i32, JsValue> {
    value
        .as_f64()
        .ok_or_else(|| JsValue::from_str("Expected number"))
        .map(|n| n as i32)
}

// Better: Type validation helper
#[wasm_bindgen]
pub fn validate_number(value: JsValue) -> Result<f64, JsValue> {
    if value.is_null() || value.is_undefined() {
        return Err(JsValue::from_str("Value is null or undefined"));
    }

    if !value.is_truthy() {
        return Err(JsValue::from_str("Value is falsy"));
    }

    value
        .as_f64()
        .ok_or_else(|| JsValue::from_str("Value is not a number"))
}
```

### String Encoding Issues

```rust
use wasm_bindgen::prelude::*;

// Handle invalid UTF-8
#[wasm_bindgen]
pub fn safe_string_processing(input: String) -> Result<String, JsValue> {
    // String from JS is already valid UTF-8
    // But if processing bytes:
    let bytes = input.as_bytes();

    String::from_utf8(bytes.to_vec())
        .map_err(|e| JsValue::from_str(&format!("UTF-8 error: {}", e)))
}

// Handle emoji and special characters
#[wasm_bindgen]
pub fn count_chars(input: &str) -> usize {
    // Use .chars() not .len() for Unicode characters
    input.chars().count() // Correct for emoji
}

#[wasm_bindgen]
pub fn reverse_string(input: &str) -> String {
    // Reverse by grapheme clusters for proper Unicode handling
    input.chars().rev().collect()
}
```

### Memory Leaks

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::EventTarget;
use std::rc::Rc;
use std::cell::RefCell;

// Bad: Closure leaked with forget()
#[wasm_bindgen]
pub fn leak_example(target: EventTarget) {
    let closure = Closure::wrap(Box::new(move || {
        web_sys::console::log_1(&"Event!".into());
    }) as Box<dyn Fn()>);

    target.add_event_listener_with_callback(
        "click",
        closure.as_ref().unchecked_ref()
    ).unwrap();

    closure.forget(); // Memory leak! Never cleaned up
}

// Good: Store closure for cleanup
#[wasm_bindgen]
pub struct EventHandler {
    target: EventTarget,
    closure: Closure<dyn Fn()>,
}

#[wasm_bindgen]
impl EventHandler {
    #[wasm_bindgen(constructor)]
    pub fn new(target: EventTarget) -> Result<EventHandler, JsValue> {
        let closure = Closure::wrap(Box::new(move || {
            web_sys::console::log_1(&"Event!".into());
        }) as Box<dyn Fn()>);

        target.add_event_listener_with_callback(
            "click",
            closure.as_ref().unchecked_ref()
        )?;

        Ok(EventHandler { target, closure })
    }

    pub fn cleanup(&self) {
        let _ = self.target.remove_event_listener_with_callback(
            "click",
            self.closure.as_ref().unchecked_ref()
        );
    }
}

impl Drop for EventHandler {
    fn drop(&mut self) {
        self.cleanup();
    }
}
```

### Async/Await Issues

```rust
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;

// Bad: Not handling promise rejection
#[wasm_bindgen]
pub async fn bad_async() -> String {
    let window = web_sys::window().unwrap();
    let promise = window.fetch_with_str("http://api.example.com");
    let result = JsFuture::from(promise).await.unwrap(); // Can panic!
    "Done".to_string()
}

// Good: Proper error handling
#[wasm_bindgen]
pub async fn good_async() -> Result<String, JsValue> {
    let window = web_sys::window()
        .ok_or_else(|| JsValue::from_str("No window"))?;

    let promise = window.fetch_with_str("http://api.example.com");
    let response = JsFuture::from(promise).await?;

    // Further processing...
    Ok("Done".to_string())
}

// Handle timeout
#[wasm_bindgen]
pub async fn with_timeout(ms: i32) -> Result<String, JsValue> {
    use js_sys::Promise;

    let timeout_promise = Promise::new(&mut |_, reject| {
        let window = web_sys::window().unwrap();
        let reject_clone = reject.clone();
        let closure = Closure::once(move || {
            reject_clone.call1(
                &JsValue::null(),
                &JsValue::from_str("Timeout")
            ).unwrap();
        });

        window.set_timeout_with_callback_and_timeout_and_arguments_0(
            closure.as_ref().unchecked_ref(),
            ms
        ).unwrap();
        closure.forget();
    });

    JsFuture::from(timeout_promise).await?;
    Ok("Completed".to_string())
}
```

### Integer Overflow

```rust
use wasm_bindgen::prelude::*;

// Bad: Can overflow silently in release mode
#[wasm_bindgen]
pub fn bad_math(a: i32, b: i32) -> i32 {
    a + b // Overflows silently in release builds
}

// Good: Use checked arithmetic
#[wasm_bindgen]
pub fn safe_add(a: i32, b: i32) -> Result<i32, JsValue> {
    a.checked_add(b)
        .ok_or_else(|| JsValue::from_str("Integer overflow"))
}

#[wasm_bindgen]
pub fn safe_multiply(a: i32, b: i32) -> Result<i32, JsValue> {
    a.checked_mul(b)
        .ok_or_else(|| JsValue::from_str("Integer overflow"))
}

// Or use saturating arithmetic
#[wasm_bindgen]
pub fn saturating_add(a: i32, b: i32) -> i32 {
    a.saturating_add(b) // Returns i32::MAX on overflow
}
```

## Advanced Debugging Techniques

### Custom Logger

```rust
use wasm_bindgen::prelude::*;
use std::fmt;

pub struct Logger {
    prefix: String,
}

impl Logger {
    pub fn new(prefix: &str) -> Self {
        Logger {
            prefix: prefix.to_string(),
        }
    }

    pub fn log(&self, message: &str) {
        web_sys::console::log_1(
            &format!("[{}] {}", self.prefix, message).into()
        );
    }

    pub fn error(&self, message: &str) {
        web_sys::console::error_1(
            &format!("[{}] ERROR: {}", self.prefix, message).into()
        );
    }

    pub fn debug(&self, message: &str) {
        #[cfg(debug_assertions)]
        web_sys::console::debug_1(
            &format!("[{}] DEBUG: {}", self.prefix, message).into()
        );
    }
}

#[wasm_bindgen]
pub fn example_with_logging() {
    let logger = Logger::new("MyModule");
    logger.log("Starting operation");

    // Do work
    logger.debug("Processing step 1");

    logger.log("Operation complete");
}
```

### Performance Profiling

```rust
use wasm_bindgen::prelude::*;
use web_sys::Performance;

#[wasm_bindgen]
pub struct Profiler {
    performance: Performance,
    marks: Vec<String>,
}

#[wasm_bindgen]
impl Profiler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<Profiler, JsValue> {
        let window = web_sys::window()
            .ok_or_else(|| JsValue::from_str("No window"))?;
        let performance = window.performance()
            .ok_or_else(|| JsValue::from_str("No performance API"))?;

        Ok(Profiler {
            performance,
            marks: Vec::new(),
        })
    }

    pub fn mark(&mut self, name: &str) {
        self.performance.mark(name).unwrap();
        self.marks.push(name.to_string());
    }

    pub fn measure(&self, name: &str, start: &str, end: &str) -> Result<f64, JsValue> {
        self.performance.measure_with_start_mark_and_end_mark(name, start, end)?;

        // Get the measurement
        let entries = self.performance.get_entries_by_name(name);
        if let Some(entry) = entries.get(0) {
            Ok(entry.duration())
        } else {
            Err(JsValue::from_str("Measurement not found"))
        }
    }

    pub fn clear(&self) {
        self.performance.clear_marks();
        self.performance.clear_measures();
    }
}

// Usage example
#[wasm_bindgen]
pub fn profiled_operation() -> Result<(), JsValue> {
    let mut profiler = Profiler::new()?;

    profiler.mark("start");

    // Do work
    let mut sum = 0;
    for i in 0..1000000 {
        sum += i;
    }

    profiler.mark("end");

    let duration = profiler.measure("operation", "start", "end")?;
    web_sys::console::log_1(&format!("Duration: {}ms", duration).into());

    profiler.clear();
    Ok(())
}
```

### Debug-only Code

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn conditional_debugging(value: i32) -> i32 {
    // Only runs in debug builds
    #[cfg(debug_assertions)]
    {
        web_sys::console::log_1(&format!("Input value: {}", value).into());
    }

    let result = value * 2;

    #[cfg(debug_assertions)]
    {
        web_sys::console::log_1(&format!("Result: {}", result).into());
    }

    result
}

// Feature-gated debugging
#[cfg(feature = "debug-logging")]
macro_rules! debug_log {
    ($($arg:tt)*) => {
        web_sys::console::log_1(&format!($($arg)*).into());
    };
}

#[cfg(not(feature = "debug-logging"))]
macro_rules! debug_log {
    ($($arg:tt)*) => {};
}

#[wasm_bindgen]
pub fn example_with_debug_log() {
    debug_log!("This only logs if debug-logging feature is enabled");
}
```

## Browser-Specific Debugging

### Chrome DevTools

```javascript
// Enable WASM debugging in Chrome
// chrome://flags/#enable-webassembly-debugging

// Set breakpoints in Rust source (when source maps available)
// Sources > wasm:// > your_crate > src > lib.rs

// Profile WASM performance
// Performance tab > Record > Stop
// Look for "Compile wasm" and "wasm-function" entries

// Memory profiling
// Memory tab > Take heap snapshot
// Look for WebAssembly.Memory
```

### Firefox DevTools

```javascript
// Firefox has excellent WASM debugging support
// about:debugging

// View WASM text format
// Debugger > wasm:// > View WASM source

// Performance profiling
// Performance tab shows WASM function names
```

## Testing with Debugging

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn test_with_logging() {
        console_error_panic_hook::set_once();

        web_sys::console::log_1(&"Test starting".into());

        let result = my_function();

        web_sys::console::log_1(&format!("Result: {:?}", result).into());

        assert_eq!(result, expected_value);
    }

    #[wasm_bindgen_test]
    fn test_error_handling() {
        let result = my_fallible_function();

        match result {
            Ok(val) => {
                web_sys::console::log_1(&format!("Success: {}", val).into());
                assert!(true);
            }
            Err(e) => {
                web_sys::console::error_1(&e);
                panic!("Function failed");
            }
        }
    }
}
```

## Related Skills
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/wasm/rust-wasm/wasm-bindgen-guide.md
- /Users/louisherman/ClaudeCodeProjects/.claude/skills/wasm/rust-wasm/wasm-pack-workflow.md
