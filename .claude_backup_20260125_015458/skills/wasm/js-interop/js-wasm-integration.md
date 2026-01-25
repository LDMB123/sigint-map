# JavaScript WASM Integration

## Overview
Complete guide to loading and integrating WebAssembly modules in JavaScript, covering loading strategies, memory management, and bidirectional function calls.

## WebAssembly Loading Methods

### instantiateStreaming (Recommended)
Best for production - loads and compiles in parallel:

```javascript
// Basic streaming load
async function loadWasm() {
  const response = await fetch('module.wasm');
  const { instance, module } = await WebAssembly.instantiateStreaming(response);
  return instance.exports;
}

// With error handling
async function loadWasmSafe(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch WASM: ${response.status}`);
    }

    const { instance, module } = await WebAssembly.instantiateStreaming(
      response,
      importObject
    );

    return {
      exports: instance.exports,
      module: module
    };
  } catch (error) {
    console.error('WASM loading failed:', error);
    throw error;
  }
}

// Usage
const wasm = await loadWasmSafe('./math.wasm');
const result = wasm.exports.add(5, 3);
```

### instantiate (Buffer-based)
Use when you need to process the buffer first:

```javascript
// Load from buffer
async function loadWasmFromBuffer(arrayBuffer, importObject) {
  const { instance, module } = await WebAssembly.instantiate(
    arrayBuffer,
    importObject
  );
  return instance.exports;
}

// From Node.js file system
import { readFile } from 'fs/promises';

async function loadWasmNode(path) {
  const buffer = await readFile(path);
  const { instance } = await WebAssembly.instantiate(buffer);
  return instance.exports;
}

// From base64 string
function loadWasmFromBase64(base64String, importObject) {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return WebAssembly.instantiate(bytes.buffer, importObject);
}
```

### Compile + Instantiate Pattern
For caching compiled modules:

```javascript
// Compile once, instantiate multiple times
let compiledModule = null;

async function getCompiledModule(url) {
  if (!compiledModule) {
    const response = await fetch(url);
    compiledModule = await WebAssembly.compileStreaming(response);
  }
  return compiledModule;
}

async function createInstance(importObject) {
  const module = await getCompiledModule('./worker.wasm');
  const instance = await WebAssembly.instantiate(module, importObject);
  return instance.exports;
}

// Create multiple instances with different imports
const instance1 = await createInstance(importObject1);
const instance2 = await createInstance(importObject2);
```

## Import Objects

### Basic Import Object
Providing JavaScript functions to WASM:

```javascript
const importObject = {
  env: {
    // Simple function import
    log: (value) => {
      console.log('WASM says:', value);
    },

    // Math functions
    sqrt: Math.sqrt,
    pow: Math.pow,

    // Memory (if not exported by WASM)
    memory: new WebAssembly.Memory({ initial: 10, maximum: 100 })
  },

  // Custom namespace
  js: {
    getCurrentTime: () => Date.now(),
    random: () => Math.random()
  }
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('module.wasm'),
  importObject
);
```

### Complex Import Functions
Handling different data types:

```javascript
const importObject = {
  env: {
    // String handling (ptr + length)
    printString: (ptr, len) => {
      const memory = instance.exports.memory;
      const bytes = new Uint8Array(memory.buffer, ptr, len);
      const string = new TextDecoder().decode(bytes);
      console.log(string);
    },

    // Array handling
    processArray: (ptr, length) => {
      const memory = instance.exports.memory;
      const array = new Float32Array(memory.buffer, ptr, length);
      return array.reduce((sum, val) => sum + val, 0);
    },

    // Callback functions
    forEach: (arrayPtr, length, callbackPtr) => {
      const memory = instance.exports.memory;
      const array = new Int32Array(memory.buffer, arrayPtr, length);

      array.forEach((value, index) => {
        // Call WASM callback function
        instance.exports.__indirect_function_table.get(callbackPtr)(value, index);
      });
    },

    // Error throwing
    throwError: (messagePtr, messageLen) => {
      const memory = instance.exports.memory;
      const bytes = new Uint8Array(memory.buffer, messagePtr, messageLen);
      const message = new TextDecoder().decode(bytes);
      throw new Error(message);
    }
  }
};
```

### Console API Import
Complete console implementation:

```javascript
function createConsoleImports(memory) {
  const decoder = new TextDecoder();

  const getString = (ptr, len) => {
    const bytes = new Uint8Array(memory.buffer, ptr, len);
    return decoder.decode(bytes);
  };

  return {
    console_log: (ptr, len) => console.log(getString(ptr, len)),
    console_warn: (ptr, len) => console.warn(getString(ptr, len)),
    console_error: (ptr, len) => console.error(getString(ptr, len)),
    console_info: (ptr, len) => console.info(getString(ptr, len)),
    console_debug: (ptr, len) => console.debug(getString(ptr, len)),
    console_time: (labelPtr, labelLen) => {
      console.time(getString(labelPtr, labelLen));
    },
    console_timeEnd: (labelPtr, labelLen) => {
      console.timeEnd(getString(labelPtr, labelLen));
    }
  };
}

const importObject = {
  env: {
    memory: new WebAssembly.Memory({ initial: 1 })
  },
  console: createConsoleImports(importObject.env.memory)
};
```

## Memory Sharing

### Accessing WASM Memory from JavaScript

```javascript
class WasmMemoryHelper {
  constructor(exports) {
    this.memory = exports.memory;
    this.exports = exports;
  }

  // Read string from memory
  readString(ptr, length) {
    const bytes = new Uint8Array(this.memory.buffer, ptr, length);
    return new TextDecoder().decode(bytes);
  }

  // Write string to memory
  writeString(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);

    // Allocate memory in WASM
    const ptr = this.exports.allocate(bytes.length);
    const memoryBytes = new Uint8Array(this.memory.buffer, ptr, bytes.length);
    memoryBytes.set(bytes);

    return { ptr, length: bytes.length };
  }

  // Read typed array
  readFloat32Array(ptr, length) {
    return new Float32Array(this.memory.buffer, ptr, length);
  }

  // Write typed array
  writeFloat32Array(array) {
    const ptr = this.exports.allocate(array.length * 4);
    const memoryArray = new Float32Array(this.memory.buffer, ptr, array.length);
    memoryArray.set(array);
    return ptr;
  }

  // Read struct
  readStruct(ptr, schema) {
    const view = new DataView(this.memory.buffer, ptr);
    const result = {};
    let offset = 0;

    for (const [key, type] of Object.entries(schema)) {
      switch (type) {
        case 'i32':
          result[key] = view.getInt32(offset, true);
          offset += 4;
          break;
        case 'f64':
          result[key] = view.getFloat64(offset, true);
          offset += 8;
          break;
        case 'u8':
          result[key] = view.getUint8(offset);
          offset += 1;
          break;
      }
    }

    return result;
  }

  // Free memory
  free(ptr) {
    if (this.exports.free) {
      this.exports.free(ptr);
    }
  }
}

// Usage
const helper = new WasmMemoryHelper(wasmExports);
const { ptr, length } = helper.writeString("Hello, WASM!");
wasmExports.processString(ptr, length);
helper.free(ptr);
```

### Memory Growth Handling

```javascript
class WasmMemoryManager {
  constructor(instance) {
    this.instance = instance;
    this.memory = instance.exports.memory;
    this.pointers = new Set();

    // Monitor memory growth
    this.lastBufferSize = this.memory.buffer.byteLength;
  }

  checkMemoryGrowth() {
    const currentSize = this.memory.buffer.byteLength;
    if (currentSize !== this.lastBufferSize) {
      console.log(`Memory grew from ${this.lastBufferSize} to ${currentSize}`);
      this.lastBufferSize = currentSize;

      // Invalidate cached typed array views
      this.onMemoryGrow();
    }
  }

  onMemoryGrow() {
    // Override this to handle memory growth
    console.warn('Memory buffer changed - typed array views are invalidated');
  }

  // Safe typed array access
  getUint8Array(ptr, length) {
    this.checkMemoryGrowth();
    return new Uint8Array(this.memory.buffer, ptr, length);
  }

  getFloat32Array(ptr, length) {
    this.checkMemoryGrowth();
    return new Float32Array(this.memory.buffer, ptr, length);
  }

  // Track allocations
  allocate(size) {
    const ptr = this.instance.exports.allocate(size);
    this.pointers.add(ptr);
    return ptr;
  }

  free(ptr) {
    if (this.pointers.has(ptr)) {
      this.instance.exports.free(ptr);
      this.pointers.delete(ptr);
    }
  }

  freeAll() {
    for (const ptr of this.pointers) {
      this.instance.exports.free(ptr);
    }
    this.pointers.clear();
  }
}
```

## Function Calls

### Calling WASM from JavaScript

```javascript
class WasmWrapper {
  constructor(instance) {
    this.exports = instance.exports;
    this.memory = new WasmMemoryHelper(instance.exports);
  }

  // Simple numeric function
  add(a, b) {
    return this.exports.add(a, b);
  }

  // String parameter
  processString(str) {
    const { ptr, length } = this.memory.writeString(str);
    try {
      const resultPtr = this.exports.processString(ptr, length);
      const resultLen = this.exports.getLastResultLength();
      return this.memory.readString(resultPtr, resultLen);
    } finally {
      this.memory.free(ptr);
    }
  }

  // Array parameter
  sumArray(array) {
    const ptr = this.memory.writeFloat32Array(array);
    try {
      return this.exports.sumArray(ptr, array.length);
    } finally {
      this.memory.free(ptr);
    }
  }

  // Struct parameter
  processUser(user) {
    const ptr = this.exports.allocateUser();
    const view = new DataView(this.memory.memory.buffer, ptr);

    // Write struct fields
    view.setUint32(0, user.id, true);
    const { ptr: namePtr, length } = this.memory.writeString(user.name);
    view.setUint32(4, namePtr, true);
    view.setUint32(8, length, true);
    view.setUint8(12, user.active ? 1 : 0);

    try {
      this.exports.processUser(ptr);
    } finally {
      this.memory.free(namePtr);
      this.memory.free(ptr);
    }
  }

  // Callback function
  forEach(array, callback) {
    const arrayPtr = this.memory.writeFloat32Array(array);

    // Create callback wrapper
    const wrappedCallback = (value, index) => {
      callback(value, index);
    };

    // Store callback (simplified - real implementation needs function table)
    const callbackId = this.storeCallback(wrappedCallback);

    try {
      this.exports.forEach(arrayPtr, array.length, callbackId);
    } finally {
      this.memory.free(arrayPtr);
      this.removeCallback(callbackId);
    }
  }
}
```

### Async WASM Calls

```javascript
class AsyncWasmWrapper {
  constructor(instance) {
    this.exports = instance.exports;
    this.pendingCallbacks = new Map();
    this.nextCallbackId = 0;
  }

  // Simulate async operation
  async fetchDataAsync(url) {
    return new Promise((resolve, reject) => {
      const callbackId = this.nextCallbackId++;

      this.pendingCallbacks.set(callbackId, { resolve, reject });

      // Pass callback ID to WASM
      this.exports.fetchData(url, callbackId);
    });
  }

  // Called by WASM when operation completes
  __onFetchComplete(callbackId, dataPtr, dataLen) {
    const callback = this.pendingCallbacks.get(callbackId);
    if (callback) {
      const data = this.readString(dataPtr, dataLen);
      callback.resolve(data);
      this.pendingCallbacks.delete(callbackId);
    }
  }

  // Called by WASM on error
  __onFetchError(callbackId, errorPtr, errorLen) {
    const callback = this.pendingCallbacks.get(callbackId);
    if (callback) {
      const error = this.readString(errorPtr, errorLen);
      callback.reject(new Error(error));
      this.pendingCallbacks.delete(callbackId);
    }
  }
}

// Import object with async support
const importObject = {
  env: {
    notifyComplete: (callbackId, dataPtr, dataLen) => {
      wrapper.__onFetchComplete(callbackId, dataPtr, dataLen);
    },
    notifyError: (callbackId, errorPtr, errorLen) => {
      wrapper.__onFetchError(callbackId, errorPtr, errorLen);
    }
  }
};
```

## Error Handling

### Comprehensive Error Handling

```javascript
class WasmErrorHandler {
  constructor(instance) {
    this.instance = instance;
    this.exports = instance.exports;
  }

  // Safe function call with error handling
  safeCall(functionName, ...args) {
    try {
      if (!(functionName in this.exports)) {
        throw new Error(`Function '${functionName}' not found in WASM exports`);
      }

      const result = this.exports[functionName](...args);

      // Check for WASM error flag
      if (this.exports.hasError && this.exports.hasError()) {
        const errorCode = this.exports.getErrorCode();
        const errorMessage = this.getErrorMessage();
        throw new WasmError(errorMessage, errorCode);
      }

      return result;
    } catch (error) {
      if (error instanceof WebAssembly.RuntimeError) {
        throw new WasmRuntimeError(error.message);
      }
      throw error;
    }
  }

  getErrorMessage() {
    if (this.exports.getErrorMessage) {
      const ptr = this.exports.getErrorMessage();
      const len = this.exports.getErrorMessageLength();
      const bytes = new Uint8Array(this.exports.memory.buffer, ptr, len);
      return new TextDecoder().decode(bytes);
    }
    return 'Unknown error';
  }
}

class WasmError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WasmError';
    this.code = code;
  }
}

class WasmRuntimeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WasmRuntimeError';
  }
}

// Usage
const errorHandler = new WasmErrorHandler(instance);

try {
  const result = errorHandler.safeCall('divide', 10, 0);
} catch (error) {
  if (error instanceof WasmError) {
    console.error(`WASM Error ${error.code}: ${error.message}`);
  } else if (error instanceof WasmRuntimeError) {
    console.error('WASM Runtime Error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Trap Handling

```javascript
function handleWasmTraps(fn) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      if (error instanceof WebAssembly.RuntimeError) {
        // Common WASM traps
        if (error.message.includes('unreachable')) {
          throw new Error('WASM executed unreachable instruction');
        } else if (error.message.includes('out of bounds')) {
          throw new Error('WASM memory access out of bounds');
        } else if (error.message.includes('undefined element')) {
          throw new Error('WASM table access undefined element');
        } else if (error.message.includes('divide by zero')) {
          throw new Error('WASM division by zero');
        } else {
          throw new Error(`WASM runtime error: ${error.message}`);
        }
      }
      throw error;
    }
  };
}

// Wrap all exports
function wrapWasmExports(exports) {
  const wrapped = {};
  for (const [key, value] of Object.entries(exports)) {
    if (typeof value === 'function') {
      wrapped[key] = handleWasmTraps(value);
    } else {
      wrapped[key] = value;
    }
  }
  return wrapped;
}

const safeExports = wrapWasmExports(instance.exports);
```

## Complete Integration Example

```javascript
class WasmModule {
  constructor() {
    this.instance = null;
    this.exports = null;
    this.memory = null;
  }

  async initialize(wasmUrl) {
    const importObject = this.createImportObject();

    try {
      const response = await fetch(wasmUrl);
      const { instance } = await WebAssembly.instantiateStreaming(
        response,
        importObject
      );

      this.instance = instance;
      this.exports = instance.exports;
      this.memory = new WasmMemoryHelper(this.exports);

      // Call initialization function if it exists
      if (this.exports.init) {
        this.exports.init();
      }

      console.log('WASM module initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WASM module:', error);
      throw error;
    }
  }

  createImportObject() {
    return {
      env: {
        // Console functions
        log: (ptr, len) => {
          console.log(this.memory.readString(ptr, len));
        },
        error: (ptr, len) => {
          console.error(this.memory.readString(ptr, len));
        },

        // Math functions
        random: () => Math.random(),
        now: () => Date.now(),

        // DOM access
        updateElement: (idPtr, idLen, textPtr, textLen) => {
          const id = this.memory.readString(idPtr, idLen);
          const text = this.memory.readString(textPtr, textLen);
          const element = document.getElementById(id);
          if (element) {
            element.textContent = text;
          }
        }
      }
    };
  }

  destroy() {
    // Cleanup
    if (this.exports && this.exports.cleanup) {
      this.exports.cleanup();
    }
    this.instance = null;
    this.exports = null;
    this.memory = null;
  }
}

// Usage
const wasmModule = new WasmModule();
await wasmModule.initialize('./app.wasm');

// Use WASM functions
const result = wasmModule.exports.calculate(42);

// Cleanup when done
wasmModule.destroy();
```

## Best Practices

1. **Use instantiateStreaming** for production (better performance)
2. **Cache compiled modules** when creating multiple instances
3. **Handle memory growth** - don't cache typed array views
4. **Track allocations** to prevent memory leaks
5. **Wrap exports** with error handling
6. **Validate inputs** before passing to WASM
7. **Use TextEncoder/TextDecoder** for string conversion
8. **Clean up resources** when done with WASM module
9. **Monitor memory usage** in long-running applications
10. **Handle async operations** properly with callbacks/promises

## Common Pitfalls

- Caching typed arrays across memory growth
- Forgetting to free allocated memory
- Not handling WASM traps
- Passing incorrect pointer/length pairs
- Ignoring alignment requirements for structs
- Not validating WASM function existence before calling
- Mixing up import namespaces
- Not handling streaming compilation failures

## Performance Tips

- Use `instantiateStreaming` instead of `instantiate`
- Minimize data copying between JS and WASM
- Batch function calls to reduce overhead
- Keep frequently accessed data in WASM memory
- Use typed arrays for bulk data transfer
- Avoid string conversions in hot paths
- Compile modules once, instantiate multiple times
- Use SharedArrayBuffer for worker communication
