# WASM Text Format (WAT)

## Description
WebAssembly Text Format (WAT) is the human-readable representation of WASM binary modules using S-expression syntax. Essential for debugging, learning WASM internals, hand-optimizing critical paths, and understanding compiler output.

## When to Use
- Learning WebAssembly fundamentals
- Debugging compiled WASM modules
- Writing performance-critical code by hand
- Understanding compiler optimizations
- Creating minimal test cases for WASM features
- Prototyping WASM functionality before implementing in higher-level language
- Inspecting and modifying existing WASM binaries

## Required Inputs
| Input | Description | Example |
|-------|-------------|---------|
| Purpose | What you're building or analyzing | "Optimize hot loop", "Debug memory issue", "Learn WASM" |
| Target Runtime | Where WAT will execute | "Browser", "Node.js", "Wasmtime" |
| Toolchain | Tools for WAT ↔ WASM conversion | "wabt (wat2wasm)", "Binaryen (wasm2wat)" |
| Complexity | Module complexity level | "Single function", "Full program with memory management" |

## Steps

### 1. Understand S-Expression Syntax

**Basic Structure**: WAT uses S-expressions (parenthesized prefix notation).

```wat
;; Comments start with ;;

;; Basic S-expression form
(operator operand1 operand2 ...)

;; Nested S-expressions
(i32.add
  (i32.const 10)
  (i32.const 20))

;; Equivalent to: 10 + 20
```

**Module Structure**:
```wat
(module
  ;; Imports come first
  (import "env" "log" (func $log (param i32)))

  ;; Type definitions
  (type $binary_op (func (param i32 i32) (result i32)))

  ;; Function definitions
  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )

  ;; Memory
  (memory 1)

  ;; Tables
  (table 0 funcref)

  ;; Globals
  (global $counter (mut i32) (i32.const 0))

  ;; Exports
  (export "add" (func $add))
  (export "memory" (memory 0))

  ;; Start function (auto-runs on instantiation)
  (start $init)
)
```

**Two Writing Styles**:

1. **Folded (S-expression)**:
```wat
(func $calculate (param $x i32) (result i32)
  (i32.mul
    (i32.add
      (local.get $x)
      (i32.const 5))
    (i32.const 2)))
```

2. **Flat (stack-based)**:
```wat
(func $calculate (param $x i32) (result i32)
  local.get $x
  i32.const 5
  i32.add
  i32.const 2
  i32.mul)
```

Both are equivalent; flat style is closer to binary format.

### 2. Write Functions

**Simple Function**:
```wat
(func $add (param $a i32) (param $b i32) (result i32)
  local.get $a
  local.get $b
  i32.add
)

;; Or with anonymous params (use index)
(func $add (param i32) (param i32) (result i32)
  local.get 0  ;; First param
  local.get 1  ;; Second param
  i32.add
)
```

**Function with Locals**:
```wat
(func $factorial (param $n i32) (result i32)
  (local $result i32)
  (local $i i32)

  ;; Initialize result to 1
  i32.const 1
  local.set $result

  ;; Initialize counter to 1
  i32.const 1
  local.set $i

  ;; Loop from 1 to n
  (block $break
    (loop $continue
      ;; If i > n, break
      local.get $i
      local.get $n
      i32.gt_u
      br_if $break

      ;; result *= i
      local.get $result
      local.get $i
      i32.mul
      local.set $result

      ;; i++
      local.get $i
      i32.const 1
      i32.add
      local.set $i

      ;; Continue loop
      br $continue
    )
  )

  local.get $result
)
```

**Multi-Value Returns**:
```wat
(func $div_mod (param $dividend i32) (param $divisor i32)
               (result i32 i32)
  ;; Return quotient and remainder
  local.get $dividend
  local.get $divisor
  i32.div_u

  local.get $dividend
  local.get $divisor
  i32.rem_u
)

;; Call and use multi-value return
(func $use_div_mod (result i32)
  i32.const 17
  i32.const 5
  call $div_mod
  ;; Stack now has: [quotient=3, remainder=2]
  i32.add  ;; Add them: 3 + 2 = 5
)
```

**Function Types and Indirect Calls**:
```wat
(module
  ;; Define function type
  (type $callback (func (param i32) (result i32)))

  ;; Table to hold function references
  (table 3 funcref)

  ;; Define some functions matching the type
  (func $double (param i32) (result i32)
    local.get 0
    i32.const 2
    i32.mul
  )

  (func $triple (param i32) (result i32)
    local.get 0
    i32.const 3
    i32.mul
  )

  (func $square (param i32) (result i32)
    local.get 0
    local.get 0
    i32.mul
  )

  ;; Initialize table
  (elem (i32.const 0) $double $triple $square)

  ;; Call function indirectly
  (func (export "apply") (param $index i32) (param $value i32) (result i32)
    local.get $value
    local.get $index
    call_indirect (type $callback)
  )
)
```

### 3. Perform Memory Operations

**Memory Declaration**:
```wat
(module
  ;; Memory: initial 1 page (64KB), max 10 pages (640KB)
  (memory 1 10)

  ;; Or named memory
  (memory $main 1 10)

  ;; Export memory for JS access
  (export "memory" (memory 0))
)
```

**Data Initialization**:
```wat
(module
  (memory 1)

  ;; Active data: copied to memory at instantiation
  ;; Store "Hello" at offset 0
  (data (i32.const 0) "Hello")

  ;; Store bytes at offset 100
  (data (i32.const 100) "\00\01\02\03\04")

  ;; Multiple data segments
  (data (i32.const 1000) "World")

  ;; Passive data: not automatically copied (bulk memory proposal)
  (data $passive "Passive data")
)
```

**Load/Store Operations**:
```wat
(func $memory_demo
  ;; Store i32 at address 0
  i32.const 0      ;; Address
  i32.const 42     ;; Value
  i32.store        ;; memory[0..3] = 42

  ;; Load i32 from address 0
  i32.const 0
  i32.load         ;; -> 42
  drop

  ;; Store i8 (1 byte)
  i32.const 4
  i32.const 255
  i32.store8       ;; memory[4] = 255

  ;; Load i8 unsigned
  i32.const 4
  i32.load8_u      ;; -> 255
  drop

  ;; Load i8 signed
  i32.const 4
  i32.load8_s      ;; -> -1 (sign extended)
  drop

  ;; Store with alignment and offset
  i32.const 100    ;; Base address
  i32.const 12345
  i32.store offset=8 align=4  ;; Store at address 100+8=108
)
```

**Memory Size Operations**:
```wat
(func $memory_grow (result i32)
  ;; Get current memory size in pages
  memory.size  ;; -> current page count

  ;; Grow memory by 1 page
  i32.const 1
  memory.grow  ;; Returns previous size, or -1 if failed
)
```

**Bulk Memory Operations** (proposal):
```wat
(module
  (memory 1)
  (data $msg "Hello, WASM!")

  (func $bulk_ops
    ;; memory.copy: copy memory region
    ;; Signature: (dest_addr source_addr size)
    i32.const 100  ;; Destination
    i32.const 0    ;; Source
    i32.const 12   ;; Size
    memory.copy

    ;; memory.fill: fill memory with byte value
    ;; Signature: (dest_addr value size)
    i32.const 200  ;; Destination
    i32.const 0    ;; Value (byte)
    i32.const 100  ;; Size
    memory.fill

    ;; memory.init: copy from passive data segment
    ;; Signature: (dest_addr source_offset size data_index)
    i32.const 0    ;; Destination in memory
    i32.const 0    ;; Offset in data segment
    i32.const 13   ;; Size
    i32.const 0    ;; Data segment index
    memory.init

    ;; data.drop: free passive data segment
    i32.const 0
    data.drop
  )
)
```

**String Handling Example**:
```wat
(module
  (memory (export "memory") 1)

  ;; Store a string literal
  (data (i32.const 0) "Hello, World!")

  ;; Return pointer and length for JavaScript
  (func (export "get_greeting") (result i32 i32)
    i32.const 0   ;; Pointer
    i32.const 13  ;; Length
  )

  ;; String length function
  (func $strlen (param $ptr i32) (result i32)
    (local $len i32)

    (block $break
      (loop $continue
        ;; Load byte at current position
        local.get $ptr
        local.get $len
        i32.add
        i32.load8_u

        ;; If zero, break
        i32.eqz
        br_if $break

        ;; Increment length and continue
        local.get $len
        i32.const 1
        i32.add
        local.set $len

        br $continue
      )
    )

    local.get $len
  )
)
```

### 4. Implement Control Flow

**If-Then-Else**:
```wat
(func $max (param $a i32) (param $b i32) (result i32)
  local.get $a
  local.get $b
  i32.gt_s
  (if (result i32)
    (then
      local.get $a)
    (else
      local.get $b)))

;; Flat style
(func $max_flat (param $a i32) (param $b i32) (result i32)
  local.get $a
  local.get $b
  i32.gt_s
  if (result i32)
    local.get $a
  else
    local.get $b
  end)
```

**Block and Branch**:
```wat
(func $early_return (param $x i32) (result i32)
  (block $exit (result i32)
    ;; If x < 0, return 0
    local.get $x
    i32.const 0
    i32.lt_s
    (if
      (then
        i32.const 0
        br $exit))

    ;; If x > 100, return 100
    local.get $x
    i32.const 100
    i32.gt_s
    (if
      (then
        i32.const 100
        br $exit))

    ;; Otherwise return x
    local.get $x
  )
)
```

**Loops**:
```wat
;; Sum from 1 to n
(func $sum (param $n i32) (result i32)
  (local $i i32)
  (local $sum i32)

  i32.const 1
  local.set $i

  i32.const 0
  local.set $sum

  (block $break
    (loop $continue
      ;; If i > n, break
      local.get $i
      local.get $n
      i32.gt_u
      br_if $break

      ;; sum += i
      local.get $sum
      local.get $i
      i32.add
      local.set $sum

      ;; i++
      local.get $i
      i32.const 1
      i32.add
      local.set $i

      ;; Continue loop
      br $continue
    )
  )

  local.get $sum
)
```

**Branch Table (Switch/Case)**:
```wat
(func $switch (param $value i32) (result i32)
  (block $default
    (block $case3
      (block $case2
        (block $case1
          (block $case0
            ;; Branch based on value
            local.get $value
            br_table $case0 $case1 $case2 $case3 $default
          )
          ;; Case 0
          i32.const 10
          return
        )
        ;; Case 1
        i32.const 20
        return
      )
      ;; Case 2
      i32.const 30
      return
    )
    ;; Case 3
    i32.const 40
    return
  )
  ;; Default
  i32.const 0
)
```

**Select (Ternary Operator)**:
```wat
(func $abs (param $x i32) (result i32)
  local.get $x
  i32.const 0
  local.get $x
  i32.sub
  local.get $x
  i32.const 0
  i32.ge_s
  select
  ;; Equivalent to: x >= 0 ? x : (0 - x)
)
```

### 5. Debug with WAT

**Add Debug Exports**:
```wat
(module
  (memory 1)

  (global $debug_counter (mut i32) (i32.const 0))

  (func $process (param $input i32) (result i32)
    ;; Increment debug counter
    global.get $debug_counter
    i32.const 1
    i32.add
    global.set $debug_counter

    ;; ... actual processing
    local.get $input
    i32.const 2
    i32.mul
  )

  ;; Export internals for debugging
  (export "process" (func $process))
  (export "debug_counter" (global $debug_counter))
  (export "memory" (memory 0))
)
```

**Use Logging Imports**:
```wat
(module
  ;; Import debug functions
  (import "debug" "log_i32" (func $log (param i32)))
  (import "debug" "log_f64" (func $log_f64 (param f64)))
  (import "debug" "trace" (func $trace (param i32 i32)))

  (memory 1)
  (data (i32.const 0) "Checkpoint 1")

  (func $process (param $value i32) (result i32)
    ;; Log input value
    local.get $value
    call $log

    ;; Trace execution
    i32.const 0   ;; String pointer
    i32.const 12  ;; String length
    call $trace

    ;; ... processing
    local.get $value
    i32.const 10
    i32.add
    local.tee $result

    ;; Log output
    call $log

    local.get $result
  )
)
```

**JavaScript Debug Harness**:
```javascript
const debugImports = {
  debug: {
    log_i32: (value) => console.log('i32:', value),
    log_f64: (value) => console.log('f64:', value),
    trace: (ptr, len) => {
      const memory = new Uint8Array(instance.exports.memory.buffer);
      const bytes = memory.slice(ptr, ptr + len);
      const msg = new TextDecoder().decode(bytes);
      console.log('TRACE:', msg);
    }
  }
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('module.wasm'),
  debugImports
);

// Call function and inspect debug output
const result = instance.exports.process(42);

// Inspect debug state
console.log('Debug counter:', instance.exports.debug_counter.value);

// Inspect memory
const memory = new Uint8Array(instance.exports.memory.buffer);
console.log('Memory at 0:', memory.slice(0, 20));
```

**Convert Binary to WAT for Inspection**:
```bash
# Using wabt (WebAssembly Binary Toolkit)
wasm2wat module.wasm -o module.wat

# With folded expressions (more readable)
wasm2wat module.wasm --fold-exprs -o module_folded.wat

# With debug names
wasm2wat module.wasm --generate-names -o module_named.wat
```

**Validate WAT Syntax**:
```bash
# Compile WAT to WASM (validates syntax)
wat2wasm module.wat -o module.wasm

# Validate with verbose errors
wat2wasm module.wat --debug-names -v

# Dry run (validate only, don't write output)
wat2wasm module.wat --no-check
```

## Output Template

```markdown
## WAT Module: [Module Name]

### Purpose
[Brief description of what this WAT code does]

### Module Overview
```wat
(module
  ;; Imports: [List key imports]

  ;; Exports: [List key exports]

  ;; Memory: [Size and layout]

  ;; Globals: [Key global variables]
)
```

### Key Functions

#### Function: `[function_name]`
**Purpose**: [What it does]
**Signature**: `(param [types]) (result [types])`
**Complexity**: [Time/space complexity]

```wat
(func $function_name (param $a i32) (result i32)
  ;; [Implementation with comments]
)
```

**Stack Trace Example**:
```
Input: [example input]
Stack evolution:
  [10]           ; After: local.get $a
  [10, 20]       ; After: i32.const 20
  [30]           ; After: i32.add
Output: 30
```

### Memory Layout
```
Address Range  | Content           | Size
---------------|-------------------|-------
0x0000-0x0063  | String literals   | 100 bytes
0x0064-0x00FF  | Stack space       | 156 bytes
0x0100-0xFFFF  | Heap              | Dynamic
```

### Data Segments
```wat
(data (i32.const 0) "Hello")      ;; 0x0000: "Hello"
(data (i32.const 100) "\00\01")   ;; 0x0064: [0, 1]
```

### Control Flow Patterns Used
- [If/else for conditional logic]
- [Block/loop for iteration]
- [br_table for switch/case]

### Debugging Notes
- **Debug Exports**: [List exported debug globals/functions]
- **Logging**: [Describe logging strategy]
- **Validation**: `wat2wasm module.wat -o module.wasm`
- **Inspection**: `wasm2wat module.wasm -o module_check.wat`

### Performance Characteristics
- **Stack depth**: [Maximum stack depth]
- **Memory usage**: [Static + dynamic]
- **Instruction count**: [Approximate for hot paths]
- **Optimization opportunities**: [List potential optimizations]

### Testing
```javascript
// Test harness
const imports = {
  // ... imports
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('module.wasm'),
  imports
);

// Test case 1
console.assert(instance.exports.func(10) === 20);

// Test case 2
console.assert(instance.exports.func(0) === 0);
```

### Toolchain
- **Compile**: `wat2wasm module.wat -o module.wasm`
- **Decompile**: `wasm2wat module.wasm -o module.wat`
- **Validate**: `wasm-validate module.wasm`
- **Optimize**: `wasm-opt -O3 module.wasm -o module_opt.wasm`
```

## Best Practices

1. **Code Organization**:
   - Group related functions together
   - Comment sections and complex logic
   - Use meaningful names for functions, locals, and labels
   - Export debugging symbols during development

2. **Naming Conventions**:
   - `$snake_case` for functions and labels
   - `$UPPER_CASE` for constants (immutable globals)
   - `$camelCase` for parameters and locals (optional)
   - Prefix internal functions with `$_` or `$internal_`

3. **Stack Management**:
   - Keep stack depth shallow for readability
   - Use locals to store intermediate values
   - Comment stack state at complex points
   - Use `local.tee` to duplicate and store in one operation

4. **Memory Safety**:
   - Always validate pointers before dereferencing
   - Document memory layout clearly
   - Use alignment hints on loads/stores
   - Initialize data segments carefully

5. **Control Flow**:
   - Use named blocks and loops for clarity
   - Prefer structured control flow over raw branches
   - Keep functions small and focused
   - Use `select` for simple ternary operations

6. **Debugging**:
   - Add temporary logging imports during development
   - Export internal state as globals
   - Use wat2wasm validation frequently
   - Compare with wasm2wat output to verify intent

7. **Performance**:
   - Use local variables instead of repeated stack manipulation
   - Prefer direct calls over indirect when possible
   - Minimize memory operations (loads/stores are slower)
   - Use appropriate data types (i32 is fastest)

## Common Patterns

### Pattern 1: Array Access
```wat
;; Get element from i32 array
(func $array_get (param $array_ptr i32) (param $index i32) (result i32)
  local.get $array_ptr
  local.get $index
  i32.const 4  ;; sizeof(i32)
  i32.mul
  i32.add
  i32.load
)

;; Set element in i32 array
(func $array_set (param $array_ptr i32) (param $index i32) (param $value i32)
  local.get $array_ptr
  local.get $index
  i32.const 4
  i32.mul
  i32.add
  local.get $value
  i32.store
)
```

### Pattern 2: Bounds Checking
```wat
(func $safe_array_get (param $array_ptr i32) (param $index i32)
                       (param $length i32) (result i32)
  ;; Check bounds
  local.get $index
  local.get $length
  i32.ge_u
  (if
    (then
      ;; Return 0 for out of bounds
      i32.const 0
      return))

  ;; Safe to access
  local.get $array_ptr
  local.get $index
  i32.const 4
  i32.mul
  i32.add
  i32.load
)
```

### Pattern 3: Simple Allocator
```wat
(module
  (memory 1)
  (global $heap_ptr (mut i32) (i32.const 0))

  ;; Bump allocator
  (func $malloc (param $size i32) (result i32)
    (local $ptr i32)

    ;; Get current heap pointer
    global.get $heap_ptr
    local.set $ptr

    ;; Increment heap pointer
    global.get $heap_ptr
    local.get $size
    i32.add
    global.set $heap_ptr

    ;; Return allocated pointer
    local.get $ptr
  )

  ;; Note: bump allocator doesn't support free
  ;; For production, use dlmalloc or similar
)
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "expected expression, got )" | Missing operand | Check stack: each instruction needs correct inputs |
| "type mismatch" | Wrong types on stack | Verify function signature matches stack state |
| "unknown operator" | Typo or unsupported instruction | Check spelling, ensure feature is enabled |
| wat2wasm fails with no error | Syntax error in comment | Check for unmatched parentheses even in comments |
| "invalid memory alignment" | Alignment > natural alignment | Use align=1,2,4,8 appropriately for type |
| Stack overflow at runtime | Unbounded recursion | Add base case or use loop instead |
| "unknown label" | Undefined block/loop name | Ensure label is defined before br/br_if |
| "duplicate export name" | Same name exported twice | Each export name must be unique |

## Related Skills
- `wasm-basics.md` - Core WASM concepts and runtime behavior
- `wasm-component-model.md` - Modern component model with WIT
- `binaryen-optimization.md` - Optimizing WASM with Binaryen tools
- `wasm-debugging-tools.md` - Advanced debugging techniques
