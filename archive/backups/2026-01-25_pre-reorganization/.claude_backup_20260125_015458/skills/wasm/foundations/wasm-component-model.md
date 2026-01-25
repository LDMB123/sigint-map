# WASM Component Model

## Description
The WebAssembly Component Model is a high-level interface definition system using WIT (WebAssembly Interface Types). It enables type-safe, language-agnostic composition of WASM modules with rich types (strings, records, variants, lists) and standardized linking. This is the future of WASM interoperability.

## When to Use
- Building composable WASM components
- Creating language-agnostic libraries
- Developing WASM plugins and extensions
- Implementing microservices with WASM
- Working with WASI preview 2 and beyond
- Need rich type system beyond i32/i64/f32/f64
- Building component ecosystems and registries
- Interfacing multiple languages via WASM

## Required Inputs
| Input | Description | Example |
|-------|-------------|---------|
| Component Purpose | What the component does | "Image processing", "Database connector" |
| Interface Design | Data types and functions needed | "Process image → thumbnail", "Query records" |
| Language | Implementation language | "Rust", "Go", "JavaScript", "C++" |
| Host Environment | Where component runs | "wasmtime", "Browser (future)", "WASI runtime" |
| Dependencies | Other components needed | "wasi:filesystem", "wasi:http" |

## Steps

### 1. Understand WIT (WebAssembly Interface Types)

**WIT File Structure**: Define interfaces using `.wit` files.

```wit
// world.wit
package example:calculator@1.0.0;

/// A simple calculator interface
interface calculator {
    /// Add two numbers
    add: func(a: s32, b: s32) -> s32;

    /// Divide two numbers, returns error on division by zero
    divide: func(dividend: s32, divisor: s32) -> result<s32, string>;

    /// Calculate multiple operations in batch
    batch-calculate: func(operations: list<operation>) -> list<s32>;
}

/// Represents a mathematical operation
record operation {
    kind: operation-kind,
    a: s32,
    b: s32,
}

/// Types of operations supported
enum operation-kind {
    add,
    subtract,
    multiply,
    divide,
}

/// Main component world
world calculator-component {
    export calculator;
}
```

**WIT Type System**:
```wit
package example:types@1.0.0;

interface type-examples {
    // Primitive types
    use-primitives: func(
        b: bool,
        i8: s8, u8: u8,
        i16: s16, u16: u16,
        i32: s32, u32: u32,
        i64: s64, u64: u64,
        f32: float32,
        f64: float64,
        c: char,
        str: string,
    );

    // Container types
    use-containers: func(
        list-of-ints: list<s32>,
        optional-value: option<string>,
        tuple-data: tuple<string, u32, bool>,
    );

    // Records (structs)
    record user {
        id: u64,
        name: string,
        email: option<string>,
        age: u8,
    }

    // Variants (enums/tagged unions)
    variant response {
        success(user),
        not-found,
        error(string),
    }

    // Enums (simple variants)
    enum status {
        pending,
        active,
        suspended,
        deleted,
    }

    // Flags (bitflags)
    flags permissions {
        read,
        write,
        execute,
        admin,
    }

    // Result type (built-in variant)
    create-user: func(name: string, email: string) -> result<user, string>;

    // Resource types (handles with methods)
    resource file {
        constructor(path: string);
        read: func() -> result<list<u8>, string>;
        write: func(data: list<u8>) -> result<_, string>;
        close: func();
    }
}
```

### 2. Define World Interfaces

**Simple Export World**:
```wit
// greeter.wit
package example:greeter@1.0.0;

interface greet {
    /// Greet a person by name
    greet: func(name: string) -> string;

    /// Set the greeting prefix (default: "Hello")
    set-prefix: func(prefix: string);
}

world greeter {
    export greet;
}
```

**Import and Export World**:
```wit
// processor.wit
package example:processor@1.0.0;

interface logging {
    log: func(level: log-level, message: string);

    enum log-level {
        debug,
        info,
        warn,
        error,
    }
}

interface processor {
    record config {
        max-size: u64,
        timeout: u32,
    }

    process: func(data: list<u8>, config: config) -> result<list<u8>, string>;
}

world data-processor {
    import logging;
    export processor;
}
```

**Multi-Interface World**:
```wit
// app.wit
package example:app@1.0.0;

interface database {
    record query {
        sql: string,
        params: list<string>,
    }

    record row {
        fields: list<string>,
    }

    execute: func(q: query) -> result<list<row>, string>;
}

interface cache {
    get: func(key: string) -> option<string>;
    set: func(key: string, value: string, ttl: u32);
    delete: func(key: string);
}

interface http {
    record request {
        method: string,
        url: string,
        headers: list<tuple<string, string>>,
        body: option<list<u8>>,
    }

    record response {
        status: u16,
        headers: list<tuple<string, string>>,
        body: list<u8>,
    }

    fetch: func(req: request) -> result<response, string>;
}

world web-app {
    import database;
    import cache;
    import http;
    export run;
}

interface run {
    start: func();
    handle-request: func(path: string) -> string;
}
```

### 3. Implement Component Linking

**Component Composition**:
```wit
// components.wit
package example:components@1.0.0;

// Component A exports image decoding
interface image-decoder {
    record image {
        width: u32,
        height: u32,
        data: list<u8>,
    }

    decode: func(encoded: list<u8>) -> result<image, string>;
}

world decoder-component {
    export image-decoder;
}

// Component B imports decoder, exports processor
interface image-processor {
    enum filter {
        grayscale,
        blur,
        sharpen,
    }

    process: func(img: image, filter: filter) -> image;
}

world processor-component {
    import image-decoder;
    export image-processor;
}

// Component C imports processor, exports web handler
interface web-handler {
    handle-upload: func(data: list<u8>) -> result<list<u8>, string>;
}

world handler-component {
    import image-processor;
    export web-handler;
}
```

**Linking Components at Runtime**:
```rust
// Using wasmtime in Rust
use wasmtime::component::*;
use wasmtime::{Engine, Store};

let engine = Engine::default();
let mut store = Store::new(&engine, ());

// Load components
let decoder = Component::from_file(&engine, "decoder.wasm")?;
let processor = Component::from_file(&engine, "processor.wasm")?;
let handler = Component::from_file(&engine, "handler.wasm")?;

// Create linker
let mut linker = Linker::new(&engine);

// Instantiate decoder (no imports)
let decoder_instance = linker.instantiate(&mut store, &decoder)?;

// Link decoder exports to processor imports
linker.instance("example:components/image-decoder")?
    .func_wrap("decode", |/* ... */| {
        // Forward to decoder_instance.decode()
    })?;

// Instantiate processor
let processor_instance = linker.instantiate(&mut store, &processor)?;

// Link processor exports to handler imports
linker.instance("example:components/image-processor")?
    .func_wrap("process", |/* ... */| {
        // Forward to processor_instance.process()
    })?;

// Instantiate final handler
let handler_instance = linker.instantiate(&mut store, &handler)?;

// Use the composed component
let handle_upload = handler_instance
    .get_typed_func::<(&[u8],), (Result<Vec<u8>, String>,)>(&mut store, "handle-upload")?;

let result = handle_upload.call(&mut store, (image_data,))?;
```

### 4. Use wit-bindgen

**Generate Rust Bindings**:

1. **Install wit-bindgen**:
```bash
cargo install wit-bindgen-cli
```

2. **Define WIT interface** (`calculator.wit`):
```wit
package example:calculator@1.0.0;

interface calculate {
    add: func(a: s32, b: s32) -> s32;
    divide: func(a: s32, b: s32) -> result<s32, string>;
}

world calculator {
    export calculate;
}
```

3. **Generate bindings**:
```bash
wit-bindgen rust ./calculator.wit --out-dir src/bindings
```

4. **Implement in Rust** (`src/lib.rs`):
```rust
// Import generated bindings
mod bindings;
use bindings::exports::example::calculator::calculate::Guest;

struct Calculator;

impl Guest for Calculator {
    fn add(a: i32, b: i32) -> i32 {
        a + b
    }

    fn divide(a: i32, b: i32) -> Result<i32, String> {
        if b == 0 {
            Err("Division by zero".to_string())
        } else {
            Ok(a / b)
        }
    }
}

// Export the component
bindings::export!(Calculator with_types_in bindings);
```

5. **Build component**:
```bash
cargo build --target wasm32-wasi --release

# Convert module to component
wasm-tools component new \
    target/wasm32-wasi/release/calculator.wasm \
    -o calculator.component.wasm
```

**Use Component from JavaScript** (future):
```javascript
// When browser support arrives
import { calculator } from './calculator.component.wasm';

const result = calculator.add(10, 20);
console.log(result); // 30

const divResult = calculator.divide(10, 0);
if (divResult.err) {
    console.error(divResult.err); // "Division by zero"
} else {
    console.log(divResult.ok);
}
```

**Generate Bindings for Other Languages**:
```bash
# Python
wit-bindgen python ./calculator.wit --out-dir bindings/python

# JavaScript/TypeScript
wit-bindgen js ./calculator.wit --out-dir bindings/js

# Go
wit-bindgen tinygo ./calculator.wit --out-dir bindings/go

# C
wit-bindgen c ./calculator.wit --out-dir bindings/c
```

### 5. Work with WASI Preview 2

**WASI Preview 2 Interfaces**: Standardized system interfaces.

```wit
// Using standard WASI interfaces
package example:app@1.0.0;

world wasi-app {
    // Import WASI preview 2 interfaces
    import wasi:filesystem/types@0.2.0;
    import wasi:filesystem/preopens@0.2.0;
    import wasi:http/types@0.2.0;
    import wasi:http/outgoing-handler@0.2.0;
    import wasi:cli/environment@0.2.0;
    import wasi:cli/stdout@0.2.0;

    export run;
}

interface run {
    run: func() -> result<_, string>;
}
```

**Implement WASI Preview 2 Component** (Rust):
```rust
wit_bindgen::generate!({
    path: "wit",
    world: "wasi-app",
});

use exports::run::Guest;
use wasi::{
    filesystem::{preopens, types::{Descriptor, DescriptorFlags, PathFlags}},
    cli::{environment, stdout},
    http::{types::{Method, Scheme, OutgoingRequest}, outgoing_handler},
};

struct App;

impl Guest for App {
    fn run() -> Result<(), String> {
        // Read environment variables
        let env_vars = environment::get_environment();
        let home = env_vars.iter()
            .find(|(k, _)| k == "HOME")
            .map(|(_, v)| v.clone())
            .unwrap_or_default();

        // Write to stdout
        let stdout_stream = stdout::get_stdout();
        let message = format!("Home directory: {}\n", home);
        stdout_stream.write(message.as_bytes())
            .map_err(|e| format!("Write error: {:?}", e))?;

        // Read file using filesystem
        let preopens_list = preopens::get_directories();
        if let Some((descriptor, path)) = preopens_list.first() {
            let file = descriptor
                .open_at(PathFlags::empty(), "config.txt", DescriptorFlags::READ, 0)
                .map_err(|e| format!("Open error: {:?}", e))?;

            let contents = file
                .read(1024)
                .map_err(|e| format!("Read error: {:?}", e))?;

            // Process file contents...
        }

        // Make HTTP request
        let req = OutgoingRequest::new(
            Method::Get,
            "example.com",
            "/api/data",
            Some(Scheme::Https),
            None,
        );

        let response = outgoing_handler::handle(req, None)
            .map_err(|e| format!("HTTP error: {:?}", e))?;

        Ok(())
    }
}

export!(App);
```

**Run WASI Preview 2 Component**:
```bash
# Using wasmtime with WASI preview 2 support
wasmtime run \
    --wasi preview2 \
    --dir /sandbox::./app-data \
    --env HOME=/home/user \
    app.component.wasm
```

### 6. Version and Publish Components

**Semantic Versioning in WIT**:
```wit
// Version in package declaration
package example:mylib@1.2.3;

// Multiple versions can coexist
package example:mylib@2.0.0;

interface api-v1 {
    old-function: func() -> string;
}

interface api-v2 {
    new-function: func() -> result<string, string>;
}

world mylib-v1 {
    export api-v1;
}

world mylib-v2 {
    export api-v2;
}
```

**Component Registry** (warg):
```bash
# Publish to component registry (future)
warg publish example:mylib@1.2.3 mylib.component.wasm

# Install component dependency
warg install example:calculator@1.0.0

# List available versions
warg search calculator

# Update dependencies
warg update
```

**Component Metadata**:
```toml
# component.toml
[package]
name = "example:calculator"
version = "1.2.3"
authors = ["Your Name <you@example.com>"]
license = "MIT OR Apache-2.0"
description = "A simple calculator component"
repository = "https://github.com/example/calculator"

[dependencies]
"wasi:cli" = "0.2.0"
"wasi:filesystem" = "0.2.0"

[dev-dependencies]
"example:test-utils" = "1.0.0"
```

## Output Template

```markdown
## Component: [Component Name]

### Package Information
- **Package**: `[namespace]:[name]@[version]`
- **Description**: [Brief description]
- **License**: [License]
- **Repository**: [URL]

### World Definition
```wit
package [namespace]:[name]@[version];

world [world-name] {
    import [imported-interface];
    export [exported-interface];
}
```

### Interfaces

#### Interface: `[interface-name]`
**Purpose**: [What this interface provides]

**Types**:
```wit
record [type-name] {
    [field]: [type],
}

variant [variant-name] {
    [case]([type]),
}

enum [enum-name] {
    [value],
}
```

**Functions**:
| Function | Signature | Description |
|----------|-----------|-------------|
| `[name]` | `func([params]) -> [result]` | [Description] |

### Component Diagram
```
┌─────────────────────────────────┐
│     [Component Name]            │
│                                 │
│  Imports:                       │
│    • [interface-1]              │
│    • [interface-2]              │
│                                 │
│  Exports:                       │
│    • [interface-3]              │
│    • [interface-4]              │
└─────────────────────────────────┘
```

### Implementation

#### Language
[Rust / JavaScript / Go / etc.]

#### Key Files
- `wit/world.wit` - Interface definitions
- `src/lib.rs` - Implementation
- `Cargo.toml` - Dependencies and metadata

#### Build Commands
```bash
# Generate bindings
wit-bindgen [language] ./wit --out-dir src/bindings

# Build component
[build command]

# Convert to component (if needed)
wasm-tools component new module.wasm -o component.wasm
```

### Usage Example

#### As Imported Dependency
```wit
world my-app {
    import [namespace]:[name]/[interface]@[version];
}
```

#### Instantiation (Rust/wasmtime)
```rust
use wasmtime::component::*;

let engine = Engine::default();
let component = Component::from_file(&engine, "component.wasm")?;
let instance = linker.instantiate(&mut store, &component)?;

let func = instance.get_typed_func::<([params],), ([result],)>(
    &mut store,
    "[function-name]"
)?;

let result = func.call(&mut store, ([args],))?;
```

#### Instantiation (JavaScript - future)
```javascript
import { [interface] } from './component.wasm';

const result = await [interface].[function]([args]);
```

### Type Mappings

| WIT Type | Rust | JavaScript | Go | C |
|----------|------|------------|-----|---|
| `s32` | `i32` | `number` | `int32` | `int32_t` |
| `string` | `String` | `string` | `string` | `char*` |
| `list<u8>` | `Vec<u8>` | `Uint8Array` | `[]byte` | `uint8_t*` |
| `option<T>` | `Option<T>` | `T \| null` | `*T` | `T*` |
| `result<T, E>` | `Result<T, E>` | `{ ok: T } \| { err: E }` | custom | custom |

### Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `[package]` | `[version]` | [Purpose] |

### Testing
```bash
# Unit tests
[test command]

# Integration tests with component
[integration test command]
```

### Publishing
```bash
# Build release
[build command]

# Validate component
wasm-tools validate component.wasm

# Publish to registry
warg publish [namespace]:[name]@[version] component.wasm
```

### Compatibility
- **WASI Version**: Preview 2 (or Core, or Preview 1)
- **Component Model Version**: [Version]
- **Minimum Runtime**: wasmtime 14.0.0 (or other runtime)

### Performance Notes
- [Component size: X KB]
- [Instantiation time: Y ms]
- [Function call overhead: Z μs]
- [Memory usage: W MB]
```

## Best Practices

1. **Interface Design**:
   - Use descriptive names for types and functions
   - Group related functions into interfaces
   - Use `result<T, E>` for failable operations
   - Document all public types and functions with `///` comments
   - Version packages semantically

2. **Type System**:
   - Use records for structured data instead of tuples
   - Use variants for sum types and error handling
   - Use enums for simple discriminated values
   - Use flags for bitflags/permissions
   - Use resources for stateful, lifetime-managed objects

3. **World Organization**:
   - One world per component boundary
   - Import only what you need
   - Export clear, minimal APIs
   - Group related imports/exports

4. **Component Composition**:
   - Design components to be composable
   - Avoid circular dependencies
   - Use interface versioning for compatibility
   - Test component linking early

5. **wit-bindgen Usage**:
   - Regenerate bindings when WIT changes
   - Check generated bindings into version control
   - Use the generated Guest traits in Rust
   - Handle all Result/Option cases explicitly

6. **WASI Integration**:
   - Use standard WASI interfaces when available
   - Don't reinvent system interfaces
   - Test with multiple WASI runtimes
   - Document WASI version requirements

7. **Versioning**:
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Bump MAJOR for breaking changes
   - Bump MINOR for new features
   - Bump PATCH for bug fixes
   - Support multiple versions in transition periods

## Common Patterns

### Pattern 1: Error Handling with Result
```wit
interface operations {
    variant error {
        not-found(string),
        permission-denied,
        invalid-input(string),
        internal(string),
    }

    read-file: func(path: string) -> result<list<u8>, error>;
    write-file: func(path: string, data: list<u8>) -> result<_, error>;
}
```

### Pattern 2: Resource Pattern (Stateful Objects)
```wit
interface database {
    resource connection {
        constructor(url: string);

        query: func(sql: string) -> result<list<row>, string>;
        execute: func(sql: string) -> result<u64, string>;
        close: func();
    }

    record row {
        columns: list<string>,
    }
}

// Usage:
// let conn = connection::new("postgres://...");
// let rows = conn.query("SELECT * FROM users")?;
// conn.close();
```

### Pattern 3: Plugin System
```wit
// Plugin interface that all plugins must implement
interface plugin {
    record config {
        name: string,
        version: string,
        settings: list<tuple<string, string>>,
    }

    init: func(cfg: config) -> result<_, string>;
    execute: func(input: string) -> result<string, string>;
    cleanup: func();
}

// Host world (application loading plugins)
world plugin-host {
    import plugin;
}

// Plugin world (plugin implementation)
world plugin-impl {
    export plugin;
}
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "unknown world" | WIT file not found | Check WIT path in wit-bindgen config |
| "type mismatch" | Implementation doesn't match WIT | Regenerate bindings, fix implementation |
| "import not satisfied" | Missing import at instantiation | Provide all imports in linker |
| "component validation failed" | Invalid component binary | Use `wasm-tools validate` to diagnose |
| Cannot convert module to component | Missing component exports | Use `wit-bindgen` and export the Guest trait |
| wit-bindgen generation fails | Syntax error in WIT | Validate WIT with `wit-parser` or `wasm-tools component wit` |
| Runtime error: "function not found" | Export name mismatch | Check WIT export name matches implementation |
| Large component size | Debug info included | Build with `--release` and strip debug info |

## Related Skills
- `wasm-basics.md` - Core WASM concepts and runtime
- `wasm-text-format.md` - Understanding WAT output
- `rust-wasm-compilation.md` - Building Rust components
- `wasmtime-embedding.md` - Embedding Wasmtime runtime
- `wasi-preview2.md` - WASI system interfaces
