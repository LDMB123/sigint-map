---
skill: typescript-wasm-types
description: TypeScript Type Generation for WASM
---

# TypeScript Type Generation for WASM

## Usage

```bash
/typescript-wasm-types <wasm-source> [output-path] [options]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `wasm-source` | Yes | Path to WASM file, WAT file, or Rust/C source |
| `output-path` | No | Output path for generated types (default: `./types/wasm.d.ts`) |
| `options` | No | Flags: `--strict`, `--branded`, `--zod` |

## Instructions

You are a TypeScript expert specializing in WebAssembly type systems, branded types, and type-safe FFI boundaries.

Generate comprehensive TypeScript type definitions for WASM modules with full type safety and runtime validation.

### Type Mapping Reference

| WASM Type | TypeScript Type | Branded Type |
|-----------|-----------------|--------------|
| `i32` | `number` | `WasmI32` |
| `i64` | `bigint` | `WasmI64` |
| `f32` | `number` | `WasmF32` |
| `f64` | `number` | `WasmF64` |
| `v128` | `Uint8Array` | `WasmV128` |
| `funcref` | `Function` | `WasmFuncRef` |
| `externref` | `unknown` | `WasmExternRef` |
| `*const T` | `number` (ptr) | `WasmPtr<T>` |
| `*mut T` | `number` (ptr) | `WasmMutPtr<T>` |

### Core Type Definitions

**1. Branded Types for Type Safety**
```typescript
// wasm-types.ts
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

// Numeric types
export type WasmI32 = Brand<number, 'i32'>;
export type WasmI64 = Brand<bigint, 'i64'>;
export type WasmF32 = Brand<number, 'f32'>;
export type WasmF64 = Brand<number, 'f64'>;

// Pointer types
export type WasmPtr<T = unknown> = Brand<number, ['ptr', T]>;
export type WasmMutPtr<T = unknown> = Brand<number, ['mut_ptr', T]>;
export type WasmSlice<T> = { ptr: WasmPtr<T>; len: WasmI32 };

// Type guards
export function isWasmI32(value: unknown): value is WasmI32 {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= -2147483648 && value <= 2147483647;
}

export function isWasmPtr(value: unknown): value is WasmPtr {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// Type constructors
export const WasmI32 = (n: number): WasmI32 => {
  if (!Number.isInteger(n)) throw new TypeError('Expected integer');
  return (n | 0) as WasmI32;
};

export const WasmF64 = (n: number): WasmF64 => n as WasmF64;
```

**2. Module Interface Types**
```typescript
// Generated module interface
export interface WasmExports {
  // Memory
  memory: WebAssembly.Memory;

  // Allocation functions
  malloc(size: WasmI32): WasmMutPtr<void>;
  free(ptr: WasmPtr<void>): void;
  realloc(ptr: WasmMutPtr<void>, newSize: WasmI32): WasmMutPtr<void>;

  // Example domain functions
  process_data(input: WasmPtr<Uint8Array>, len: WasmI32): WasmI32;
  get_result_ptr(): WasmPtr<Float64Array>;
  get_result_len(): WasmI32;
}

export interface WasmImports {
  env: {
    memory?: WebAssembly.Memory;
    table?: WebAssembly.Table;
    abort?: (msg: WasmPtr<string>, file: WasmPtr<string>, line: WasmI32, col: WasmI32) => void;
    log_value?: (value: WasmF64) => void;
  };
  wasi_snapshot_preview1?: WasiSnapshotPreview1;
}

export interface WasmModule {
  instance: WebAssembly.Instance;
  exports: WasmExports;
  memory: WebAssembly.Memory;
}
```

**3. Memory View Types**
```typescript
// Type-safe memory views
export class TypedMemoryView<T extends TypedArray> {
  constructor(
    private memory: WebAssembly.Memory,
    private ptr: WasmPtr<T>,
    private length: number,
    private TypedArrayCtor: TypedArrayConstructor<T>
  ) {}

  get view(): T {
    return new this.TypedArrayCtor(
      this.memory.buffer,
      this.ptr as number,
      this.length
    ) as T;
  }

  read(index: number): number {
    if (index < 0 || index >= this.length) {
      throw new RangeError(`Index ${index} out of bounds [0, ${this.length})`);
    }
    return this.view[index];
  }

  write(index: number, value: number): void {
    if (index < 0 || index >= this.length) {
      throw new RangeError(`Index ${index} out of bounds [0, ${this.length})`);
    }
    this.view[index] = value;
  }
}

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array
  | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array;

type TypedArrayConstructor<T> = {
  new (buffer: ArrayBuffer, byteOffset: number, length: number): T;
  BYTES_PER_ELEMENT: number;
};
```

**4. Struct Binding Types**
```typescript
// For C/Rust structs exposed to JS
export interface WasmStructDef<T> {
  size: number;
  alignment: number;
  fields: {
    [K in keyof T]: {
      offset: number;
      type: 'i32' | 'i64' | 'f32' | 'f64' | 'ptr';
    };
  };
}

export class WasmStruct<T extends Record<string, number | bigint>> {
  constructor(
    private memory: WebAssembly.Memory,
    private ptr: WasmPtr<T>,
    private def: WasmStructDef<T>
  ) {}

  get<K extends keyof T>(field: K): T[K] {
    const fieldDef = this.def.fields[field];
    const view = new DataView(this.memory.buffer);
    const offset = (this.ptr as number) + fieldDef.offset;

    switch (fieldDef.type) {
      case 'i32': return view.getInt32(offset, true) as T[K];
      case 'i64': return view.getBigInt64(offset, true) as T[K];
      case 'f32': return view.getFloat32(offset, true) as T[K];
      case 'f64': return view.getFloat64(offset, true) as T[K];
      case 'ptr': return view.getUint32(offset, true) as T[K];
    }
  }

  set<K extends keyof T>(field: K, value: T[K]): void {
    const fieldDef = this.def.fields[field];
    const view = new DataView(this.memory.buffer);
    const offset = (this.ptr as number) + fieldDef.offset;

    switch (fieldDef.type) {
      case 'i32': view.setInt32(offset, value as number, true); break;
      case 'i64': view.setBigInt64(offset, value as bigint, true); break;
      case 'f32': view.setFloat32(offset, value as number, true); break;
      case 'f64': view.setFloat64(offset, value as number, true); break;
      case 'ptr': view.setUint32(offset, value as number, true); break;
    }
  }
}

// Example struct definition
const Vec3Def: WasmStructDef<{ x: number; y: number; z: number }> = {
  size: 12,
  alignment: 4,
  fields: {
    x: { offset: 0, type: 'f32' },
    y: { offset: 4, type: 'f32' },
    z: { offset: 8, type: 'f32' },
  },
};
```

**5. Zod Runtime Validation (Optional)**
```typescript
import { z } from 'zod';

// Runtime validation schemas
export const WasmI32Schema = z.number().int().min(-2147483648).max(2147483647);
export const WasmPtrSchema = z.number().int().min(0);
export const WasmF64Schema = z.number();

// Validated function wrapper generator
export function createValidatedExport<TArgs extends z.ZodTuple, TReturn extends z.ZodType>(
  fn: (...args: z.infer<TArgs>) => z.infer<TReturn>,
  argsSchema: TArgs,
  returnSchema: TReturn
) {
  return (...args: z.infer<TArgs>): z.infer<TReturn> => {
    const validatedArgs = argsSchema.parse(args);
    const result = fn(...validatedArgs);
    return returnSchema.parse(result);
  };
}
```

### Response Format

```markdown
## TypeScript Types Generated

### Source Analysis
- **Source**: [file path]
- **Language**: [Rust/C/C++/WAT]
- **Exports detected**: [count]

### Generated Type Definitions

\`\`\`typescript
// wasm.d.ts
[generated types here]
\`\`\`

### Branded Types
\`\`\`typescript
[branded type definitions]
\`\`\`

### Struct Definitions
| Struct | Size | Fields |
|--------|------|--------|
| ... | ... | ... |

### Usage Example
\`\`\`typescript
import type { WasmExports, WasmPtr, WasmI32 } from './wasm';

const wasm = await loadWasmModule<WasmExports>('./module.wasm');
// Type-safe usage example
\`\`\`

### Validation Layer (if --zod)
\`\`\`typescript
[zod schemas]
\`\`\`
```
