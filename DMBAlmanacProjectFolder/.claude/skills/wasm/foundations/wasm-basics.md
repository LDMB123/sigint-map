# WASM Basics

## Description
Core WebAssembly concepts including linear memory model, import/export system, value types, function signatures, tables, globals, and module instantiation. This skill provides foundational knowledge for working with WASM modules.

## When to Use
- Building or integrating WebAssembly modules
- Understanding WASM runtime behavior
- Debugging WASM execution issues
- Designing WASM-based architectures
- Optimizing memory usage in WASM
- Interfacing between JavaScript and WASM
- Creating language bindings for WASM

## Required Inputs
| Input | Description | Example |
|-------|-------------|---------|
| Use Case | What you're building or debugging | "Image processing library", "Game physics engine" |
| Host Environment | Where WASM will run | "Browser", "Node.js", "Wasmtime", "WASI" |
| Language Source | What compiles to WASM (if applicable) | "Rust", "C/C++", "AssemblyScript", "Hand-written WAT" |
| Memory Requirements | Expected memory usage pattern | "10MB static + 50MB dynamic", "Streaming data processing" |

## Steps

### 1. Understand Linear Memory Model

**Concept**: WASM has a single, contiguous linear memory space (an expandable array buffer).

**Key Properties**:
- Memory is byte-addressable (addresses are i32 values: 0 to 2^32-1)
- Initial size defined in pages (1 page = 64KB = 65,536 bytes)
- Can grow dynamically up to maximum size (if specified)
- Multiple WASM instances can share memory (with threads proposal)
- Memory is zero-initialized

**Example Memory Declaration**:
```wat
(module
  ;; Initial: 1 page (64KB), Max: 10 pages (640KB)
  (memory (export "memory") 1 10)
)
```

**JavaScript Interaction**:
```javascript
// Access WASM memory from JavaScript
const wasmMemory = instance.exports.memory;
const buffer = new Uint8Array(wasmMemory.buffer);

// Write data to WASM memory
const data = new TextEncoder().encode("Hello WASM");
buffer.set(data, 0);  // Write at offset 0

// Read data from WASM memory
const result = buffer.slice(0, 10);
```

**Memory Layout Strategy**:
```
0x0000_0000  ┌─────────────────────┐
             │  Stack (grows down) │
0x0001_0000  ├─────────────────────┤
             │  Static Data        │
0x0002_0000  ├─────────────────────┤
             │  Heap (grows up)    │
             │  (malloc/free)      │
             └─────────────────────┘
```

### 2. Master Import/Export System

**Exports**: Functions, memories, tables, and globals made available to host.

```wat
(module
  ;; Export a function
  (func (export "add") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add
  )

  ;; Export memory
  (memory (export "memory") 1)

  ;; Export a global
  (global (export "counter") (mut i32) (i32.const 0))

  ;; Export a table
  (table (export "functions") 10 funcref)
)
```

**Imports**: Functions, memories, tables, and globals provided by host.

```wat
(module
  ;; Import a function from JavaScript
  (import "env" "console_log" (func $log (param i32)))

  ;; Import memory (shared memory pattern)
  (import "js" "mem" (memory 1))

  ;; Import a global
  (import "env" "timestamp" (global $now (mut i64)))

  (func (export "debug") (param i32)
    local.get 0
    call $log
  )
)
```

**JavaScript Host Setup**:
```javascript
const imports = {
  env: {
    console_log: (num) => console.log(num),
    timestamp: new WebAssembly.Global({ value: 'i64', mutable: true }, 0n)
  },
  js: {
    mem: new WebAssembly.Memory({ initial: 1 })
  }
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('module.wasm'),
  imports
);
```

### 3. Work with Value Types

**Four Fundamental Types**:
- `i32`: 32-bit integer (signed or unsigned depending on operation)
- `i64`: 64-bit integer
- `f32`: 32-bit IEEE 754 floating point
- `f64`: 64-bit IEEE 754 floating point

**Reference Types** (additional):
- `funcref`: Reference to a function
- `externref`: Reference to host object (opaque to WASM)

**Type Characteristics**:
```wat
(module
  ;; i32 operations
  (func $i32_demo (result i32)
    i32.const 42          ;; Push constant
    i32.const 8
    i32.add               ;; 42 + 8 = 50
    i32.const 2
    i32.div_u             ;; Unsigned division: 50 / 2 = 25
  )

  ;; i64 for large numbers
  (func $i64_demo (result i64)
    i64.const 9223372036854775807  ;; Max i64 value
  )

  ;; f32 and f64
  (func $float_demo (result f64)
    f64.const 3.14159265359
    f64.const 2.0
    f64.mul               ;; 3.14159... * 2.0
  )

  ;; Type conversions
  (func $convert (param f64) (result i32)
    local.get 0
    i32.trunc_f64_s       ;; Convert f64 to signed i32
  )
)
```

**JavaScript Type Mapping**:
```javascript
// i32, i64 passed as JavaScript numbers/BigInts
instance.exports.add_i32(10, 20);           // i32
instance.exports.add_i64(10n, 20n);         // i64 (BigInt)

// f32, f64 passed as JavaScript numbers
instance.exports.multiply_f64(3.14, 2.0);   // f64

// externref can be any JavaScript value
instance.exports.process_ref({ data: "hello" });
```

### 4. Define Function Signatures

**Basic Function Structure**:
```wat
(func $function_name (param $p1 i32) (param $p2 f64) (result i32)
  ;; Function body
  ;; Return value left on stack
)
```

**Multiple Return Values** (multi-value proposal):
```wat
(func $divide_with_remainder (param $dividend i32) (param $divisor i32)
                              (result i32 i32)
  ;; Return quotient and remainder
  local.get $dividend
  local.get $divisor
  i32.div_u              ;; Quotient

  local.get $dividend
  local.get $divisor
  i32.rem_u              ;; Remainder
)
```

**Local Variables**:
```wat
(func $calculate (param $input i32) (result i32)
  (local $temp i32)
  (local $result i32)

  ;; Locals are zero-initialized
  local.get $input
  i32.const 10
  i32.mul
  local.set $temp

  local.get $temp
  i32.const 5
  i32.add
  local.set $result

  local.get $result
)
```

**Function Indirection** (function pointers):
```wat
(module
  ;; Define a function type
  (type $binary_op (func (param i32 i32) (result i32)))

  ;; Table to hold function references
  (table 2 funcref)

  (func $add (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add
  )

  (func $multiply (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.mul
  )

  ;; Populate table
  (elem (i32.const 0) $add $multiply)

  ;; Call function indirectly
  (func (export "call_op") (param $op_index i32) (param $a i32) (param $b i32)
                           (result i32)
    local.get $a
    local.get $b
    local.get $op_index
    call_indirect (type $binary_op)
  )
)
```

### 5. Use Tables and Globals

**Tables**: Arrays of references (functions or external objects).

```wat
(module
  ;; Table of function references
  (table $callbacks 5 10 funcref)  ;; Initial: 5, Max: 10

  ;; Table of external references
  (table $objects 1 externref)

  ;; Initialize table elements
  (func $handler1 (param i32) (result i32)
    local.get 0
    i32.const 1
    i32.add
  )

  (func $handler2 (param i32) (result i32)
    local.get 0
    i32.const 2
    i32.mul
  )

  ;; Fill table at positions 0 and 1
  (elem (i32.const 0) $handler1 $handler2)

  ;; Export table for JavaScript access
  (export "callbacks" (table $callbacks))
)
```

**JavaScript Table Manipulation**:
```javascript
// Grow table
instance.exports.callbacks.grow(5);

// Get/set table elements
const func = instance.exports.callbacks.get(0);
instance.exports.callbacks.set(2, func);
```

**Globals**: Mutable or immutable global variables.

```wat
(module
  ;; Immutable global (constant)
  (global $PI f64 (f64.const 3.14159265359))

  ;; Mutable global (state)
  (global $counter (mut i32) (i32.const 0))

  ;; Global initialized from import
  (import "env" "startValue" (global $start i32))

  ;; Function using globals
  (func (export "increment") (result i32)
    global.get $counter
    i32.const 1
    i32.add
    global.set $counter
    global.get $counter
  )

  ;; Export global for JavaScript access
  (export "counter" (global $counter))
)
```

**JavaScript Global Access**:
```javascript
// Read global value
const count = instance.exports.counter.value;

// Write global value (if mutable)
instance.exports.counter.value = 42;
```

### 6. Instantiate Modules

**Browser Instantiation**:
```javascript
// Method 1: Streaming compilation (recommended)
const { instance, module } = await WebAssembly.instantiateStreaming(
  fetch('module.wasm'),
  {
    env: {
      memory: new WebAssembly.Memory({ initial: 1 }),
      log: (x) => console.log(x)
    }
  }
);

// Method 2: From ArrayBuffer
const response = await fetch('module.wasm');
const bytes = await response.arrayBuffer();
const { instance } = await WebAssembly.instantiate(bytes, imports);

// Method 3: Separate compilation and instantiation
const module = await WebAssembly.compileStreaming(fetch('module.wasm'));
const instance1 = await WebAssembly.instantiate(module, imports);
const instance2 = await WebAssembly.instantiate(module, imports); // Reuse module
```

**Node.js Instantiation**:
```javascript
const fs = require('fs');
const wasmBuffer = fs.readFileSync('./module.wasm');

const importObject = {
  env: {
    abort: (msg, file, line, col) => {
      console.error(`Abort: ${msg} at ${file}:${line}:${col}`);
    }
  }
};

WebAssembly.instantiate(wasmBuffer, importObject)
  .then(({ instance }) => {
    const result = instance.exports.main();
    console.log(result);
  });
```

**Wasmtime (Rust Runtime)**:
```rust
use wasmtime::*;

fn main() -> Result<()> {
    let engine = Engine::default();
    let module = Module::from_file(&engine, "module.wasm")?;

    let mut store = Store::new(&engine, ());
    let instance = Instance::new(&mut store, &module, &[])?;

    let add = instance.get_typed_func::<(i32, i32), i32>(&mut store, "add")?;
    let result = add.call(&mut store, (5, 3))?;

    println!("Result: {}", result);
    Ok(())
}
```

**WASI (WebAssembly System Interface)**:
```javascript
import { WASI } from 'wasi';
import { readFile } from 'fs/promises';

const wasi = new WASI({
  args: process.argv,
  env: process.env,
  preopens: {
    '/sandbox': '/tmp/wasm-sandbox'
  }
});

const wasm = await readFile('./program.wasm');
const { instance } = await WebAssembly.instantiate(wasm, {
  wasi_snapshot_preview1: wasi.wasiImport
});

wasi.start(instance);
```

## Output Template

```markdown
## WASM Module Design: [Module Name]

### Memory Layout
- **Total Size**: [X] pages (initial), [Y] pages (max)
- **Stack**: [Address range]
- **Static Data**: [Address range]
- **Heap**: [Address range]
- **Memory Management**: [malloc/free implementation or none]

### Exports
| Name | Type | Signature | Purpose |
|------|------|-----------|---------|
| `function_name` | Function | `(i32, i32) -> i32` | [Description] |
| `memory` | Memory | 1 page min | [Description] |
| `state` | Global | `(mut i32)` | [Description] |

### Imports
| Name | Type | Signature | Provided By |
|------|------|-----------|-------------|
| `env.log` | Function | `(i32) -> void` | JavaScript console wrapper |
| `env.memory` | Memory | 1 page | Shared memory |

### Value Type Usage
- **i32**: [Counters, indices, pointers, boolean flags]
- **i64**: [Timestamps, large integers]
- **f32**: [3D coordinates, color values]
- **f64**: [High-precision calculations]
- **funcref**: [Callback tables]
- **externref**: [DOM elements, JS objects]

### Function Signatures
```wat
;; Primary API
(func $process (param $data_ptr i32) (param $data_len i32) (result i32))

;; Internal helpers
(func $validate (param $ptr i32) (result i32))
(func $allocate (param $size i32) (result i32))
```

### Tables
| Name | Type | Initial | Max | Purpose |
|------|------|---------|-----|---------|
| `callbacks` | funcref | 10 | 100 | Event handlers |
| `objects` | externref | 1 | - | JS object references |

### Globals
| Name | Type | Mutable | Initial | Purpose |
|------|------|---------|---------|---------|
| `initialized` | i32 | Yes | 0 | Init flag |
| `VERSION` | i32 | No | 1 | Module version |

### Instantiation Pattern
```javascript
// [Browser/Node.js/Wasmtime]
const imports = {
  env: {
    // ... import definitions
  }
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('module.wasm'),
  imports
);

// Initialize
instance.exports.init();

// Use
const result = instance.exports.process(ptr, len);
```

### Performance Considerations
- [Memory growth strategy]
- [Function call overhead (import vs internal)]
- [Type conversion costs at boundaries]
- [Table indirection vs direct calls]

### Browser Compatibility
- **Core Features**: All modern browsers
- **Multi-value Returns**: [Browser versions]
- **Reference Types**: [Browser versions]
- **Threads**: [Browser versions with SharedArrayBuffer]
```

## Best Practices

1. **Memory Management**:
   - Always bounds-check memory access
   - Use typed arrays for structured data
   - Implement custom allocator or use language runtime
   - Consider memory alignment for performance

2. **Import/Export Design**:
   - Minimize boundary crossings (each import call has overhead)
   - Use batch operations to reduce calls
   - Export memory for direct data access from host
   - Version your exports for compatibility

3. **Type Usage**:
   - Use i32 for most integer operations (native WASM size)
   - Use f64 for JavaScript number compatibility
   - Avoid unnecessary type conversions
   - Use reference types to avoid copying large objects

4. **Function Design**:
   - Keep functions small and focused
   - Use locals to reduce stack manipulation
   - Prefer direct calls over indirect when possible
   - Use multi-value returns to avoid out-parameters

5. **Tables and Globals**:
   - Use tables for dynamic dispatch and callbacks
   - Use globals sparingly (harder to optimize)
   - Prefer function parameters over globals
   - Export globals only when host needs access

6. **Module Instantiation**:
   - Use streaming instantiation in browsers
   - Cache compiled modules when instantiating multiple times
   - Provide all imports upfront (no dynamic imports)
   - Initialize module state before exposing to users

7. **Debugging**:
   - Use name section for better stack traces
   - Export internal state as globals for inspection
   - Implement debug logging via imports
   - Test with WAT text format first

## Common Patterns

### Pattern 1: String Passing (JavaScript ↔ WASM)
```javascript
// JavaScript side
function passStringToWasm(str, instance) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  // Allocate memory in WASM
  const ptr = instance.exports.allocate(bytes.length);
  const memory = new Uint8Array(instance.exports.memory.buffer);
  memory.set(bytes, ptr);

  // Call WASM function with pointer and length
  instance.exports.process_string(ptr, bytes.length);

  // Free memory
  instance.exports.deallocate(ptr, bytes.length);
}

function readStringFromWasm(ptr, len, instance) {
  const memory = new Uint8Array(instance.exports.memory.buffer);
  const bytes = memory.slice(ptr, ptr + len);
  return new TextDecoder().decode(bytes);
}
```

### Pattern 2: Callback Pattern
```wat
(module
  (import "env" "callback" (func $callback (param i32)))

  (func (export "process_array") (param $arr_ptr i32) (param $len i32)
    (local $i i32)
    (local $value i32)

    (loop $loop
      ;; Get current value
      local.get $arr_ptr
      local.get $i
      i32.const 4  ;; Assuming i32 array (4 bytes per element)
      i32.mul
      i32.add
      i32.load
      local.set $value

      ;; Call callback with value
      local.get $value
      call $callback

      ;; Increment and continue
      local.get $i
      i32.const 1
      i32.add
      local.tee $i
      local.get $len
      i32.lt_u
      br_if $loop
    )
  )
)
```

### Pattern 3: Shared Memory (Threads)
```javascript
// Create shared memory
const memory = new WebAssembly.Memory({
  initial: 10,
  maximum: 100,
  shared: true  // Enables SharedArrayBuffer
});

// Instantiate in main thread
const mainInstance = await WebAssembly.instantiateStreaming(
  fetch('module.wasm'),
  { env: { memory } }
);

// Share with worker
const worker = new Worker('worker.js');
worker.postMessage({ module: mainModule, memory });

// Worker can instantiate with same memory
// Uses Atomics for synchronization
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "LinkError: import not found" | Missing import in importObject | Add all required imports from module |
| "RuntimeError: out of bounds memory access" | Invalid memory address | Check pointer arithmetic and buffer sizes |
| "TypeError: i64 not supported" | Passing i64 to/from JavaScript | Use BigInt or split into two i32 values |
| Module instantiation slow | Large module, no streaming | Use `instantiateStreaming` instead of `instantiate` |
| "RuntimeError: indirect call signature mismatch" | Wrong function type in table | Ensure table element matches call_indirect type |
| Global value not updating | Using immutable global | Declare global as `(mut type)` |
| Memory layout conflicts | Uncoordinated allocations | Document memory layout, use allocator |

## Related Skills
- `wasm-text-format.md` - Writing WAT for debugging and learning
- `wasm-component-model.md` - Modern WASM interop with WIT
- `rust-wasm-compilation.md` - Compiling Rust to WASM
- `assemblyscript-basics.md` - TypeScript-like language for WASM
