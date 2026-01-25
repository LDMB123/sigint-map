# TypeScript WASM Types

## Overview
Comprehensive guide to creating type-safe TypeScript bindings for WebAssembly modules, including generated types, wrapper patterns, and build integration.

## Generated .d.ts Files

### Manual Type Definitions

```typescript
// wasm-module.d.ts - Basic type definitions
declare module '*.wasm' {
  const content: string;
  export default content;
}

// Specific module types
declare module './calculator.wasm' {
  export interface CalculatorExports extends WebAssembly.Exports {
    memory: WebAssembly.Memory;
    add: (a: number, b: number) => number;
    subtract: (a: number, b: number) => number;
    multiply: (a: number, b: number) => number;
    divide: (a: number, b: number) => number;
  }

  export interface CalculatorImports {
    env: {
      log: (value: number) => void;
      error: (code: number) => void;
    };
  }

  export function instantiate(
    importObject?: CalculatorImports
  ): Promise<WebAssembly.Instance & { exports: CalculatorExports }>;
}
```

### Complete Module Type Definition

```typescript
// math.wasm.d.ts
export interface MathExports extends WebAssembly.Exports {
  // Memory
  memory: WebAssembly.Memory;

  // Numeric functions
  add: (a: number, b: number) => number;
  sqrt: (x: number) => number;
  pow: (base: number, exp: number) => number;

  // Memory management
  allocate: (size: number) => number;
  free: (ptr: number) => void;

  // String functions
  processString: (ptr: number, len: number) => number;
  getLastResultLength: () => number;

  // Array functions
  sumArray: (ptr: number, length: number) => number;
  sortArray: (ptr: number, length: number) => void;

  // Initialization
  init?: () => void;
  cleanup?: () => void;

  // Error handling
  hasError?: () => number;
  getErrorCode?: () => number;
  getErrorMessage?: () => number;
  getErrorMessageLength?: () => number;
}

export interface MathImports {
  env: {
    memory?: WebAssembly.Memory;
    log?: (value: number) => void;
    logString?: (ptr: number, len: number) => void;
    abort?: (messagePtr: number, messageLen: number) => void;
  };
  console?: {
    log?: (ptr: number, len: number) => void;
    error?: (ptr: number, len: number) => void;
    warn?: (ptr: number, len: number) => void;
  };
  Math?: {
    random?: () => number;
    floor?: (x: number) => number;
    ceil?: (x: number) => number;
  };
}

export interface MathInstance extends WebAssembly.Instance {
  exports: MathExports;
}

export function instantiate(
  bytes: ArrayBuffer | Uint8Array,
  imports?: MathImports
): Promise<MathInstance>;

export function instantiateStreaming(
  response: Response | Promise<Response>,
  imports?: MathImports
): Promise<MathInstance>;
```

### Auto-generated Types from WAT

```typescript
// generate-types.ts - Tool to generate types from WASM
import { readFileSync, writeFileSync } from 'fs';
import { parse } from '@webassemblyjs/wasm-parser';
import { decode } from '@webassemblyjs/wasm-parser';

interface FunctionSignature {
  name: string;
  params: string[];
  returns: string[];
}

function wasmTypeToTS(type: string): string {
  switch (type) {
    case 'i32':
    case 'i64':
    case 'f32':
    case 'f64':
      return 'number';
    case 'v128':
      return 'BigInt';
    case 'funcref':
      return 'Function';
    case 'externref':
      return 'any';
    default:
      return 'unknown';
  }
}

function generateTypes(wasmPath: string, outputPath: string): void {
  const buffer = readFileSync(wasmPath);
  const ast = decode(buffer);

  const exports: FunctionSignature[] = [];
  const imports: Record<string, FunctionSignature[]> = {};

  // Parse exports
  for (const section of ast.body) {
    if (section.type === 'ModuleExport') {
      const sig = section.descr;
      if (sig.type === 'Func') {
        exports.push({
          name: section.name,
          params: sig.params?.map((p: any) => wasmTypeToTS(p.valtype)) || [],
          returns: sig.results?.map((r: any) => wasmTypeToTS(r)) || []
        });
      }
    }

    // Parse imports
    if (section.type === 'ModuleImport') {
      const module = section.module;
      if (!imports[module]) imports[module] = [];

      if (section.descr.type === 'FuncImportDescr') {
        imports[module].push({
          name: section.name,
          params: section.descr.signature.params?.map((p: any) =>
            wasmTypeToTS(p.valtype)
          ) || [],
          returns: section.descr.signature.results?.map((r: any) =>
            wasmTypeToTS(r)
          ) || []
        });
      }
    }
  }

  // Generate TypeScript
  let output = '// Auto-generated from WASM module\n\n';

  // Exports interface
  output += 'export interface Exports extends WebAssembly.Exports {\n';
  output += '  memory: WebAssembly.Memory;\n';

  for (const exp of exports) {
    const params = exp.params.map((t, i) => `p${i}: ${t}`).join(', ');
    const returnType = exp.returns.length > 0 ? exp.returns[0] : 'void';
    output += `  ${exp.name}: (${params}) => ${returnType};\n`;
  }

  output += '}\n\n';

  // Imports interface
  output += 'export interface Imports {\n';

  for (const [module, funcs] of Object.entries(imports)) {
    output += `  ${module}?: {\n`;
    for (const func of funcs) {
      const params = func.params.map((t, i) => `p${i}: ${t}`).join(', ');
      const returnType = func.returns.length > 0 ? func.returns[0] : 'void';
      output += `    ${func.name}?: (${params}) => ${returnType};\n`;
    }
    output += '  };\n';
  }

  output += '}\n';

  writeFileSync(outputPath, output);
}

// Usage
generateTypes('./module.wasm', './module.wasm.d.ts');
```

## Type-Safe Wrappers

### Basic Wrapper Class

```typescript
// wasm-wrapper.ts
import type { MathExports, MathImports } from './math.wasm';

export class WasmMath {
  private exports: MathExports;
  private memory: WebAssembly.Memory;
  private textDecoder = new TextDecoder();
  private textEncoder = new TextEncoder();

  private constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports as MathExports;
    this.memory = this.exports.memory;
  }

  static async load(wasmUrl: string): Promise<WasmMath> {
    const imports = WasmMath.createImports();
    const response = await fetch(wasmUrl);
    const { instance } = await WebAssembly.instantiateStreaming(
      response,
      imports
    );

    const wrapper = new WasmMath(instance);

    if (wrapper.exports.init) {
      wrapper.exports.init();
    }

    return wrapper;
  }

  private static createImports(): MathImports {
    return {
      env: {
        log: (value: number) => console.log(value),
        logString: (ptr: number, len: number) => {
          console.log('WASM:', this.readString(ptr, len));
        }
      }
    };
  }

  // Type-safe number operations
  add(a: number, b: number): number {
    return this.exports.add(a, b);
  }

  sqrt(x: number): number {
    if (x < 0) throw new Error('Cannot compute sqrt of negative number');
    return this.exports.sqrt(x);
  }

  pow(base: number, exp: number): number {
    return this.exports.pow(base, exp);
  }

  // Type-safe string operations
  processString(input: string): string {
    const { ptr, length } = this.writeString(input);
    try {
      const resultPtr = this.exports.processString(ptr, length);
      const resultLen = this.exports.getLastResultLength();
      return this.readString(resultPtr, resultLen);
    } finally {
      this.exports.free(ptr);
    }
  }

  // Type-safe array operations
  sumArray(array: number[]): number {
    const ptr = this.writeNumberArray(array);
    try {
      return this.exports.sumArray(ptr, array.length);
    } finally {
      this.exports.free(ptr);
    }
  }

  sortArray(array: number[]): number[] {
    const ptr = this.writeNumberArray(array);
    try {
      this.exports.sortArray(ptr, array.length);
      return this.readNumberArray(ptr, array.length);
    } finally {
      this.exports.free(ptr);
    }
  }

  // Memory helpers
  private writeString(str: string): { ptr: number; length: number } {
    const bytes = this.textEncoder.encode(str);
    const ptr = this.exports.allocate(bytes.length);
    const memView = new Uint8Array(this.memory.buffer, ptr, bytes.length);
    memView.set(bytes);
    return { ptr, length: bytes.length };
  }

  private readString(ptr: number, length: number): string {
    const bytes = new Uint8Array(this.memory.buffer, ptr, length);
    return this.textDecoder.decode(bytes);
  }

  private writeNumberArray(array: number[]): number {
    const ptr = this.exports.allocate(array.length * 4);
    const memView = new Float32Array(this.memory.buffer, ptr, array.length);
    memView.set(array);
    return ptr;
  }

  private readNumberArray(ptr: number, length: number): number[] {
    const memView = new Float32Array(this.memory.buffer, ptr, length);
    return Array.from(memView);
  }

  destroy(): void {
    if (this.exports.cleanup) {
      this.exports.cleanup();
    }
  }
}

// Usage
const math = await WasmMath.load('./math.wasm');
const sum = math.add(5, 3); // Type-safe: number
const result = math.processString('hello'); // Type-safe: string
const sorted = math.sortArray([3, 1, 2]); // Type-safe: number[]
```

### Advanced Generic Wrapper

```typescript
// generic-wasm-wrapper.ts
type WasmValue = number | bigint;
type WasmReturnValue = WasmValue | void;

interface WasmFunction {
  (...args: WasmValue[]): WasmReturnValue;
}

interface WasmExportsBase extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  allocate?: (size: number) => number;
  free?: (ptr: number) => void;
  [key: string]: WebAssembly.ExportValue;
}

export class TypedWasmWrapper<TExports extends WasmExportsBase> {
  protected exports: TExports;
  protected memory: WebAssembly.Memory;
  protected textDecoder = new TextDecoder();
  protected textEncoder = new TextEncoder();

  constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports as TExports;
    this.memory = this.exports.memory;
  }

  // Generic function caller with type safety
  protected call<TArgs extends WasmValue[], TReturn extends WasmReturnValue>(
    fnName: keyof TExports,
    ...args: TArgs
  ): TReturn {
    const fn = this.exports[fnName];
    if (typeof fn !== 'function') {
      throw new Error(`${String(fnName)} is not a function`);
    }
    return (fn as WasmFunction)(...args) as TReturn;
  }

  // Safe memory allocation
  protected allocate(size: number): number {
    if (!this.exports.allocate) {
      throw new Error('WASM module does not export allocate function');
    }
    const ptr = this.exports.allocate(size);
    if (ptr === 0) {
      throw new Error('Failed to allocate memory');
    }
    return ptr;
  }

  // Safe memory deallocation
  protected free(ptr: number): void {
    if (this.exports.free) {
      this.exports.free(ptr);
    }
  }

  // Type-safe memory operations
  protected writeStruct<T extends Record<string, WasmValue>>(
    struct: T,
    schema: Record<keyof T, 'i32' | 'i64' | 'f32' | 'f64'>
  ): number {
    let size = 0;
    for (const type of Object.values(schema)) {
      size += type === 'i64' || type === 'f64' ? 8 : 4;
    }

    const ptr = this.allocate(size);
    const view = new DataView(this.memory.buffer, ptr);
    let offset = 0;

    for (const [key, type] of Object.entries(schema)) {
      const value = struct[key as keyof T];
      switch (type) {
        case 'i32':
          view.setInt32(offset, Number(value), true);
          offset += 4;
          break;
        case 'i64':
          view.setBigInt64(offset, BigInt(value), true);
          offset += 8;
          break;
        case 'f32':
          view.setFloat32(offset, Number(value), true);
          offset += 4;
          break;
        case 'f64':
          view.setFloat64(offset, Number(value), true);
          offset += 8;
          break;
      }
    }

    return ptr;
  }

  protected readStruct<T extends Record<string, WasmValue>>(
    ptr: number,
    schema: Record<keyof T, 'i32' | 'i64' | 'f32' | 'f64'>
  ): T {
    const view = new DataView(this.memory.buffer, ptr);
    const result = {} as T;
    let offset = 0;

    for (const [key, type] of Object.entries(schema)) {
      switch (type) {
        case 'i32':
          result[key as keyof T] = view.getInt32(offset, true) as T[keyof T];
          offset += 4;
          break;
        case 'i64':
          result[key as keyof T] = view.getBigInt64(offset, true) as T[keyof T];
          offset += 8;
          break;
        case 'f32':
          result[key as keyof T] = view.getFloat32(offset, true) as T[keyof T];
          offset += 4;
          break;
        case 'f64':
          result[key as keyof T] = view.getFloat64(offset, true) as T[keyof T];
          offset += 8;
          break;
      }
    }

    return result;
  }
}

// Example usage with specific module
interface UserExports extends WasmExportsBase {
  processUser: (ptr: number) => void;
  getUserAge: (ptr: number) => number;
}

interface User {
  id: number;
  age: number;
  score: number;
}

class UserModule extends TypedWasmWrapper<UserExports> {
  private userSchema = {
    id: 'i32' as const,
    age: 'i32' as const,
    score: 'f64' as const
  };

  processUser(user: User): void {
    const ptr = this.writeStruct(user, this.userSchema);
    try {
      this.call('processUser', ptr);
    } finally {
      this.free(ptr);
    }
  }

  getUserAge(user: User): number {
    const ptr = this.writeStruct(user, this.userSchema);
    try {
      return this.call<[number], number>('getUserAge', ptr);
    } finally {
      this.free(ptr);
    }
  }
}
```

## Generic Patterns

### Result Type Pattern

```typescript
// result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export class WasmResult {
  static ok<T>(value: T): Result<T> {
    return { ok: true, value };
  }

  static err<E = Error>(error: E): Result<never, E> {
    return { ok: false, error };
  }
}

// wasm-safe-wrapper.ts
import type { Result } from './result';

export class SafeWasmWrapper<TExports extends WasmExportsBase> {
  private exports: TExports;

  constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports as TExports;
  }

  // Safe function call that returns Result
  protected safeCall<TArgs extends WasmValue[], TReturn extends WasmReturnValue>(
    fnName: keyof TExports,
    ...args: TArgs
  ): Result<TReturn> {
    try {
      const fn = this.exports[fnName];
      if (typeof fn !== 'function') {
        return WasmResult.err(
          new Error(`${String(fnName)} is not a function`)
        );
      }

      const result = (fn as WasmFunction)(...args) as TReturn;

      // Check for WASM error flag
      if (this.hasErrorFlag()) {
        const error = this.getErrorMessage();
        return WasmResult.err(new Error(error));
      }

      return WasmResult.ok(result);
    } catch (error) {
      return WasmResult.err(error as Error);
    }
  }

  private hasErrorFlag(): boolean {
    const hasError = this.exports['hasError' as keyof TExports];
    if (typeof hasError === 'function') {
      return (hasError as () => number)() !== 0;
    }
    return false;
  }

  private getErrorMessage(): string {
    const getMsg = this.exports['getErrorMessage' as keyof TExports];
    if (typeof getMsg === 'function') {
      // Implementation to read error message from memory
      return 'WASM error occurred';
    }
    return 'Unknown error';
  }
}

// Usage
const result = wrapper.safeCall('divide', 10, 0);
if (result.ok) {
  console.log('Result:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

### Promise-based Async Pattern

```typescript
// async-wasm-wrapper.ts
export class AsyncWasmWrapper<TExports extends WasmExportsBase> {
  private exports: TExports;
  private pendingOperations = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private nextOperationId = 0;

  constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports as TExports;
  }

  // Promise-based async operation
  protected async callAsync<T>(
    fnName: keyof TExports,
    ...args: WasmValue[]
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const operationId = this.nextOperationId++;
      this.pendingOperations.set(operationId, { resolve, reject });

      const fn = this.exports[fnName];
      if (typeof fn !== 'function') {
        reject(new Error(`${String(fnName)} is not a function`));
        return;
      }

      // Call WASM function with operation ID
      try {
        (fn as WasmFunction)(operationId, ...args);
      } catch (error) {
        this.pendingOperations.delete(operationId);
        reject(error);
      }
    });
  }

  // Called by WASM when async operation completes
  __onAsyncComplete(operationId: number, resultPtr: number): void {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      // Process result from memory
      operation.resolve(resultPtr);
      this.pendingOperations.delete(operationId);
    }
  }

  // Called by WASM when async operation fails
  __onAsyncError(operationId: number, errorPtr: number, errorLen: number): void {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      const bytes = new Uint8Array(this.exports.memory.buffer, errorPtr, errorLen);
      const message = new TextDecoder().decode(bytes);
      operation.reject(new Error(message));
      this.pendingOperations.delete(operationId);
    }
  }
}
```

### Builder Pattern

```typescript
// wasm-builder.ts
export class WasmModuleBuilder<TExports extends WasmExportsBase> {
  private imports: WebAssembly.Imports = {};
  private url?: string;
  private buffer?: ArrayBuffer;

  static create<T extends WasmExportsBase>(): WasmModuleBuilder<T> {
    return new WasmModuleBuilder<T>();
  }

  fromUrl(url: string): this {
    this.url = url;
    return this;
  }

  fromBuffer(buffer: ArrayBuffer): this {
    this.buffer = buffer;
    return this;
  }

  withImport(
    module: string,
    name: string,
    value: WebAssembly.ImportValue
  ): this {
    if (!this.imports[module]) {
      this.imports[module] = {};
    }
    (this.imports[module] as Record<string, WebAssembly.ImportValue>)[name] = value;
    return this;
  }

  withImports(module: string, imports: Record<string, WebAssembly.ImportValue>): this {
    this.imports[module] = imports;
    return this;
  }

  withConsole(): this {
    return this.withImports('console', {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console)
    });
  }

  async build(): Promise<TypedWasmWrapper<TExports>> {
    let instance: WebAssembly.Instance;

    if (this.url) {
      const response = await fetch(this.url);
      const result = await WebAssembly.instantiateStreaming(response, this.imports);
      instance = result.instance;
    } else if (this.buffer) {
      const result = await WebAssembly.instantiate(this.buffer, this.imports);
      instance = result.instance;
    } else {
      throw new Error('No WASM source provided');
    }

    return new TypedWasmWrapper<TExports>(instance);
  }
}

// Usage
const wrapper = await WasmModuleBuilder.create<MathExports>()
  .fromUrl('./math.wasm')
  .withConsole()
  .withImport('env', 'random', Math.random)
  .build();
```

## Module Declaration

### Global Module Augmentation

```typescript
// global.d.ts
declare global {
  interface Window {
    wasmModules: Map<string, WebAssembly.Instance>;
  }

  namespace WebAssembly {
    interface Memory {
      grow(delta: number): number;
    }

    interface Table {
      get(index: number): Function | null;
      set(index: number, value: Function | null): void;
      grow(delta: number): number;
      length: number;
    }
  }
}

export {};
```

### Ambient Module Declarations

```typescript
// wasm-modules.d.ts
declare module '*.wasm' {
  const wasmModule: {
    exports: WebAssembly.Exports;
    instantiate: (
      imports?: WebAssembly.Imports
    ) => Promise<WebAssembly.Instance>;
  };
  export default wasmModule;
}

declare module '*?url' {
  const url: string;
  export default url;
}

declare module '*?init' {
  interface WasmModuleInit {
    (imports?: WebAssembly.Imports): Promise<WebAssembly.Exports>;
  }
  const init: WasmModuleInit;
  export default init;
}

// Usage
import wasmUrl from './module.wasm?url';
import initWasm from './module.wasm?init';

const exports = await initWasm({
  env: {
    log: console.log
  }
});
```

### Namespace Declarations

```typescript
// wasm-types.d.ts
export namespace WasmTypes {
  export interface StandardExports extends WebAssembly.Exports {
    memory: WebAssembly.Memory;
    _initialize?: () => void;
    _start?: () => void;
  }

  export interface AllocatorExports extends StandardExports {
    malloc: (size: number) => number;
    free: (ptr: number) => void;
    calloc: (count: number, size: number) => number;
    realloc: (ptr: number, size: number) => number;
  }

  export interface ErrorHandlingExports extends StandardExports {
    getLastError: () => number;
    getErrorMessage: () => number;
    clearError: () => void;
  }

  export type PointerType = number;
  export type SizeType = number;

  export interface StringPtr {
    ptr: PointerType;
    len: SizeType;
  }
}

// Usage
import { WasmTypes } from './wasm-types';

class MyWasmModule implements WasmTypes.AllocatorExports {
  memory: WebAssembly.Memory;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
  calloc: (count: number, size: number) => number;
  realloc: (ptr: number, size: number) => number;
  // ...
}
```

## Build Tool Integration

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "WebAssembly"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node", "vite/client"],
    "baseUrl": ".",
    "paths": {
      "@wasm/*": ["./src/wasm/*.wasm.d.ts"],
      "*.wasm": ["./src/types/wasm-modules.d.ts"]
    }
  },
  "include": [
    "src/**/*",
    "src/**/*.wasm.d.ts",
    "src/types/**/*.d.ts"
  ]
}
```

### Type Generation Script

```typescript
// scripts/generate-wasm-types.ts
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';

interface TypeGenConfig {
  wasmDir: string;
  outputDir: string;
  moduleTemplate: string;
}

async function generateWasmTypes(config: TypeGenConfig): Promise<void> {
  const files = await readdir(config.wasmDir);
  const wasmFiles = files.filter(f => f.endsWith('.wasm'));

  for (const file of wasmFiles) {
    const moduleName = basename(file, '.wasm');
    const wasmPath = join(config.wasmDir, file);
    const outputPath = join(config.outputDir, `${moduleName}.wasm.d.ts`);

    // Read WASM binary
    const buffer = await readFile(wasmPath);

    // Generate types (simplified - real implementation would parse WASM)
    const types = `
// Auto-generated types for ${moduleName}.wasm

export interface ${capitalize(moduleName)}Exports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  // Add specific exports here based on WASM analysis
}

export interface ${capitalize(moduleName)}Imports {
  env?: {
    memory?: WebAssembly.Memory;
    [key: string]: WebAssembly.ImportValue;
  };
}

export interface ${capitalize(moduleName)}Instance extends WebAssembly.Instance {
  exports: ${capitalize(moduleName)}Exports;
}

declare module './${file}' {
  export const exports: ${capitalize(moduleName)}Exports;
  export function instantiate(
    imports?: ${capitalize(moduleName)}Imports
  ): Promise<${capitalize(moduleName)}Instance>;
}
`;

    await writeFile(outputPath, types.trim());
    console.log(`Generated types for ${file}`);
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run
generateWasmTypes({
  wasmDir: './public/wasm',
  outputDir: './src/types/wasm',
  moduleTemplate: 'standard'
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "wasm:types": "ts-node scripts/generate-wasm-types.ts",
    "wasm:watch": "nodemon --watch public/wasm --ext wasm --exec npm run wasm:types",
    "prebuild": "npm run wasm:types",
    "build": "tsc && vite build",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@webassemblyjs/wasm-parser": "^1.12.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0"
  }
}
```

## Complete Example

```typescript
// math-module.wasm.d.ts
export interface MathExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  add: (a: number, b: number) => number;
  multiply: (a: number, b: number) => number;
  factorial: (n: number) => number;
}

// math-module.ts
import type { MathExports } from './math-module.wasm';

export class MathModule {
  private exports: MathExports;

  private constructor(instance: WebAssembly.Instance) {
    this.exports = instance.exports as MathExports;
  }

  static async load(url: string): Promise<MathModule> {
    const response = await fetch(url);
    const { instance } = await WebAssembly.instantiateStreaming(response);
    return new MathModule(instance);
  }

  add(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new TypeError('Arguments must be finite numbers');
    }
    return this.exports.add(a, b);
  }

  multiply(a: number, b: number): number {
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new TypeError('Arguments must be finite numbers');
    }
    return this.exports.multiply(a, b);
  }

  factorial(n: number): number {
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError('Argument must be a non-negative integer');
    }
    if (n > 20) {
      throw new RangeError('Factorial overflow (n > 20)');
    }
    return this.exports.factorial(n);
  }
}

// app.ts
import { MathModule } from './math-module';

async function main() {
  const math = await MathModule.load('./math.wasm');

  const sum = math.add(5, 3); // Type: number
  const product = math.multiply(4, 7); // Type: number
  const fact = math.factorial(5); // Type: number

  console.log({ sum, product, fact });
}

main();
```

## Best Practices

1. **Generate types** from WASM when possible
2. **Use strict TypeScript** settings for better type safety
3. **Create wrapper classes** instead of exposing raw exports
4. **Validate inputs** in TypeScript before calling WASM
5. **Document type conversions** between JS and WASM
6. **Use generics** for reusable WASM patterns
7. **Export type definitions** alongside modules
8. **Version types** with WASM modules
9. **Use namespace declarations** for complex modules
10. **Integrate type generation** into build process

## Common Pitfalls

- Forgetting to type memory operations
- Not handling BigInt for i64 types
- Assuming all WASM functions return numbers
- Missing optional exports in type definitions
- Not updating types when WASM changes
- Overly complex type definitions
- Not documenting pointer/length conventions
- Ignoring type narrowing opportunities

## Type Safety Tips

- Use branded types for pointers
- Create type guards for WASM values
- Use discriminated unions for error handling
- Leverage template literal types for function names
- Use const assertions for import objects
- Create utility types for common patterns
- Document memory layout in types
- Use assertion functions for runtime validation
