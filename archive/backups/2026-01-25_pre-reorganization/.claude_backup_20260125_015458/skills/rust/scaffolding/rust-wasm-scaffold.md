# Skill: WebAssembly Scaffold

**ID**: `rust-wasm-scaffold`
**Category**: Scaffolding
**Agent**: Rust Project Architect

---

## When to Use

- Creating a WebAssembly module
- Building Rust code for the browser
- Integrating Rust with JavaScript
- Performance-critical web applications

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Project name |
| target | string | No | web (default), node, or both |

---

## Steps

### Step 1: Install Tools

```bash
# Install wasm-pack
cargo install wasm-pack

# Add target
rustup target add wasm32-unknown-unknown
```

### Step 2: Create Project

```bash
cargo new my-wasm --lib
cd my-wasm
```

### Step 3: Configure Cargo.toml

```toml
[package]
name = "my-wasm"
version = "0.1.0"
edition = "2021"
description = "A WebAssembly module"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = [
    "console",
    "Document",
    "Element",
    "HtmlElement",
    "Window",
]}
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"
console_error_panic_hook = "0.1"

[dev-dependencies]
wasm-bindgen-test = "0.3"

[profile.release]
lto = true
opt-level = "s"  # Optimize for size

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O4"]
```

### Step 4: Project Structure

```
my-wasm/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   └── utils.rs
├── tests/
│   └── web.rs
├── www/                    # JavaScript/HTML for testing
│   ├── index.html
│   ├── index.js
│   └── package.json
└── README.md
```

### Step 5: Implement WASM Library

**src/lib.rs**
```rust
use wasm_bindgen::prelude::*;

mod utils;

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    utils::set_panic_hook();
}

/// A greeting function callable from JavaScript.
#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

/// A struct exposed to JavaScript.
#[wasm_bindgen]
pub struct Counter {
    value: i32,
}

#[wasm_bindgen]
impl Counter {
    /// Creates a new counter.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Counter {
        Counter { value: 0 }
    }

    /// Increments the counter.
    pub fn increment(&mut self) {
        self.value += 1;
    }

    /// Returns the current value.
    pub fn value(&self) -> i32 {
        self.value
    }

    /// Resets the counter to zero.
    pub fn reset(&mut self) {
        self.value = 0;
    }
}

/// Process data and return result to JavaScript.
#[wasm_bindgen]
pub fn process_data(data: &[u8]) -> Vec<u8> {
    // Process the data
    data.iter().map(|&x| x.wrapping_add(1)).collect()
}

/// Work with JavaScript values using serde.
#[wasm_bindgen]
pub fn process_json(val: JsValue) -> Result<JsValue, JsValue> {
    let input: serde_json::Value = serde_wasm_bindgen::from_value(val)?;

    // Process the JSON
    let output = serde_json::json!({
        "input": input,
        "processed": true
    });

    Ok(serde_wasm_bindgen::to_value(&output)?)
}

/// Call a JavaScript function from Rust.
#[wasm_bindgen]
pub fn call_js_function(callback: &js_sys::Function) -> Result<JsValue, JsValue> {
    let this = JsValue::null();
    let arg = JsValue::from_str("Hello from Rust!");
    callback.call1(&this, &arg)
}

/// Log to browser console.
#[wasm_bindgen]
pub fn log_message(message: &str) {
    web_sys::console::log_1(&message.into());
}

/// Access the DOM.
#[wasm_bindgen]
pub fn update_element(id: &str, content: &str) -> Result<(), JsValue> {
    let window = web_sys::window().expect("no global window");
    let document = window.document().expect("no document");

    let element = document
        .get_element_by_id(id)
        .ok_or_else(|| JsValue::from_str(&format!("Element '{}' not found", id)))?;

    element.set_inner_html(content);
    Ok(())
}
```

**src/utils.rs**
```rust
pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
```

**tests/web.rs**
```rust
#![cfg(target_arch = "wasm32")]

use wasm_bindgen_test::*;
use my_wasm::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_greet() {
    assert_eq!(greet("World"), "Hello, World!");
}

#[wasm_bindgen_test]
fn test_counter() {
    let mut counter = Counter::new();
    assert_eq!(counter.value(), 0);

    counter.increment();
    assert_eq!(counter.value(), 1);

    counter.reset();
    assert_eq!(counter.value(), 0);
}

#[wasm_bindgen_test]
fn test_process_data() {
    let input = vec![1, 2, 3];
    let output = process_data(&input);
    assert_eq!(output, vec![2, 3, 4]);
}
```

### Step 6: Create JavaScript Integration

**www/package.json**
```json
{
  "name": "my-wasm-www",
  "version": "0.1.0",
  "scripts": {
    "build": "wasm-pack build --target web ..",
    "start": "python3 -m http.server 8080"
  },
  "dependencies": {}
}
```

**www/index.html**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>WASM Demo</title>
</head>
<body>
    <h1>WebAssembly Demo</h1>
    <div id="output"></div>
    <button id="increment">Increment Counter</button>
    <span id="counter-value">0</span>

    <script type="module" src="index.js"></script>
</body>
</html>
```

**www/index.js**
```javascript
import init, {
    greet,
    Counter,
    process_data,
    log_message,
    update_element
} from '../pkg/my_wasm.js';

async function main() {
    // Initialize WASM module
    await init();

    // Test greet function
    const greeting = greet("WebAssembly");
    console.log(greeting);
    update_element("output", greeting);

    // Test counter
    const counter = new Counter();
    const button = document.getElementById("increment");
    const display = document.getElementById("counter-value");

    button.addEventListener("click", () => {
        counter.increment();
        display.textContent = counter.value();
    });

    // Test process_data
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const processed = process_data(data);
    console.log("Processed:", processed);

    // Log to console from Rust
    log_message("Hello from JavaScript via Rust!");
}

main();
```

### Step 7: Build and Run

```bash
# Build WASM package
wasm-pack build --target web

# Or for Node.js
wasm-pack build --target nodejs

# Run tests
wasm-pack test --headless --firefox
wasm-pack test --headless --chrome

# Serve the demo
cd www
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## Size Optimization

```toml
# Cargo.toml
[profile.release]
lto = true
opt-level = "z"       # Optimize for size
codegen-units = 1
panic = "abort"

# Further optimization with wasm-opt
[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-Oz", "--enable-simd"]
```

```bash
# Check size
ls -la pkg/*.wasm

# Further optimize with wasm-opt
wasm-opt -Oz pkg/my_wasm_bg.wasm -o pkg/my_wasm_optimized.wasm
```

---

## Artifacts Produced

| Artifact | Location | Description |
|----------|----------|-------------|
| WASM module | pkg/ | Compiled WebAssembly |
| JS bindings | pkg/*.js | JavaScript glue code |
| TypeScript types | pkg/*.d.ts | Type definitions |

---

## Output Template

```markdown
## WASM Scaffold Created

### Project: [name]

### Build
```bash
wasm-pack build --target web
```

### Files Generated
- `pkg/my_wasm.js` - JavaScript module
- `pkg/my_wasm_bg.wasm` - WebAssembly binary
- `pkg/my_wasm.d.ts` - TypeScript definitions

### Usage (JavaScript)
```javascript
import init, { greet } from './pkg/my_wasm.js';
await init();
console.log(greet("World"));
```

### Test
```bash
wasm-pack test --headless --chrome
```
```
