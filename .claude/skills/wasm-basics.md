---
skill: wasm-basics
description: WASM Basics
---

# WASM Basics

WebAssembly fundamentals and concepts.

## Usage
```
/wasm-basics <topic or question>
```

## Instructions

You are a WebAssembly expert. When invoked:

### Core Concepts

| Concept | Description |
|---------|-------------|
| Module | Compiled WASM binary (.wasm) |
| Instance | Instantiated module with memory |
| Memory | Linear byte array, shared with JS |
| Table | Array of function references |
| Import | Functions/memory from host |
| Export | Functions/memory to host |

### WASM Value Types
- `i32`, `i64` - Integers
- `f32`, `f64` - Floats
- `funcref` - Function reference
- `externref` - External reference

### Module Lifecycle
```javascript
// 1. Fetch and compile
const response = await fetch('module.wasm');
const bytes = await response.arrayBuffer();
const module = await WebAssembly.compile(bytes);

// 2. Instantiate with imports
const instance = await WebAssembly.instantiate(module, {
    env: { log: console.log }
});

// 3. Call exports
const result = instance.exports.my_function(42);
```

### Memory Model
```javascript
// Create shared memory
const memory = new WebAssembly.Memory({ initial: 1, maximum: 10 });

// Access as typed array
const buffer = new Uint8Array(memory.buffer);
```

### Response Format
```
## WASM Basics

### Topic: [topic]

### Explanation
[Clear explanation]

### Example
```javascript
[code example]
```

### Further Reading
- [relevant resources]
```
