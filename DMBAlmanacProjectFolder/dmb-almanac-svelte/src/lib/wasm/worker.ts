/**
 * DMB Almanac - WASM Web Worker
 *
 * Executes WASM operations off the main thread to prevent UI blocking.
 * Handles module loading, memory management, and error recovery.
 *
 * This file is bundled separately and loaded as a Web Worker.
 */

import type {
  WasmExports,
  WasmBridgeConfig,
  WorkerRequest,
  WorkerResponse,
  DEFAULT_WASM_CONFIG,
} from './types';
import { fallbackImplementations, type FallbackMethod } from './fallback';
import { serializeForWasm, deserializeFromWasm, validateWasmResponse } from './serialization';

// ==================== WORKER STATE ====================

let wasmModule: WasmExports | null = null;
let wasmMemory: WebAssembly.Memory | null = null;
let config: WasmBridgeConfig | null = null;
let isInitialized = false;

// Track pending operations for abort handling
const pendingOperations = new Map<string, AbortController>();

// Track allocated WASM resources that need explicit cleanup (e.g., search indexes)
// Format: Map<handle, resourceType>
const allocatedResources = new Map<number, 'search_index'>();

// ==================== UTILITY FUNCTIONS ====================

function log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
  const response: WorkerResponse = { type: 'log', level, message };
  self.postMessage(response);

  // Also log to console for debugging
  console[level](`[WASM Worker] ${message}`);
}

function sendResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

function _sendProgress(id: string, progress: number, message?: string): void {
  sendResponse({ type: 'progress', id, progress, message });
}

// ==================== WASM LOADING ====================

async function loadWasmModule(): Promise<void> {
  if (!config) {
    throw new Error('Worker not configured');
  }

  const startTime = performance.now();
  log('info', `Loading WASM module from ${config.wasmPath}`);

  try {
    // Dynamic import of wasm-bindgen generated JS
    // In production, this would be the generated JS glue code
    const wasmUrl = config.wasmPath;

    // Fetch and instantiate WASM
    const response = await fetch(wasmUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
    }

    const wasmBytes = await response.arrayBuffer();
    log('info', `WASM module fetched: ${wasmBytes.byteLength} bytes`);

    // Create import object for WASM
    const imports: WebAssembly.Imports = {
      env: {
        // Memory can be provided by WASM or JS
        memory: new WebAssembly.Memory({ initial: 256, maximum: 4096 }),
      },
      wbg: {
        // wasm-bindgen imports would go here
        __wbindgen_throw: (ptr: number, len: number) => {
          const msg = readStringFromWasm(ptr, len);
          throw new Error(msg);
        },
        __wbindgen_string_new: (ptr: number, len: number): number => 
          // This would create a JS string from WASM memory
           0 // Placeholder
        ,
      },
    };

    // Compile and instantiate
    const { instance } = await WebAssembly.instantiate(wasmBytes, imports);

    // Extract exports
    wasmModule = instance.exports as unknown as WasmExports;
    wasmMemory = instance.exports.memory as WebAssembly.Memory;

    // Initialize the module
    if (wasmModule.init_module) {
      wasmModule.init_module();
    }

    const loadTime = performance.now() - startTime;
    log('info', `WASM module loaded in ${loadTime.toFixed(2)}ms`);

    isInitialized = true;
    sendResponse({ type: 'init-success', loadTime });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Failed to load WASM module: ${errorMessage}`);
    sendResponse({ type: 'init-error', error: errorMessage });
    throw error;
  }
}

function readStringFromWasm(ptr: number, len: number): string {
  if (!wasmMemory) return '';
  const bytes = new Uint8Array(wasmMemory.buffer, ptr, len);
  return new TextDecoder().decode(bytes);
}

// ==================== WASM EXECUTION ====================

async function executeWasmMethod(
  id: string,
  method: keyof WasmExports,
  args: unknown[]
): Promise<void> {
  const startTime = performance.now();
  const controller = new AbortController();
  pendingOperations.set(id, controller);

  try {
    // Check for abort
    if (controller.signal.aborted) {
      throw new Error('Operation aborted');
    }

    let result: unknown;

    // Try WASM first if available
    if (wasmModule && isInitialized && typeof wasmModule[method] === 'function') {
      log('debug', `Executing WASM method: ${method}`);

      // PERF: Skip serialization for strings (already JSON-serialized from high-level API)
      // This avoids double JSON.stringify which adds ~50-100ms for large datasets
      const serializedArgs = args.map(arg => {
        if (typeof arg === 'string') return arg; // Already serialized JSON
        if (typeof arg === 'object') return serializeForWasm(arg);
        return arg;
      });

      // Call WASM function
      const wasmFn = wasmModule[method] as (...args: unknown[]) => unknown;
      const wasmResult = wasmFn(...serializedArgs);

      // Track/untrack resources based on method
      if (method === 'build_search_index' && typeof wasmResult === 'number') {
        trackResource(wasmResult, 'search_index');
      } else if (method === 'free_search_index' && typeof args[0] === 'number') {
        untrackResource(args[0]);
      }

      // Deserialize result if it's a string (JSON)
      if (typeof wasmResult === 'string') {
        const validation = validateWasmResponse(wasmResult);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        result = deserializeFromWasm(wasmResult);
      } else {
        result = wasmResult;
      }
    } else if (config?.enableFallback) {
      // Fall back to JS implementation
      log('debug', `Using fallback for method: ${method}`);
      result = await executeFallback(method, args);
    } else {
      throw new Error(`WASM method not available and fallback disabled: ${method}`);
    }

    const executionTime = performance.now() - startTime;

    if (config?.enablePerfLogging) {
      log('debug', `${method} completed in ${executionTime.toFixed(2)}ms`);
    }

    sendResponse({
      type: 'result',
      id,
      data: result,
      executionTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error executing ${method}: ${errorMessage}`);
    sendResponse({
      type: 'error',
      id,
      error: errorMessage,
    });
  } finally {
    pendingOperations.delete(id);
  }
}

async function executeFallback(method: string, args: unknown[]): Promise<unknown> {
  // Map WASM method names to fallback implementations
  const fallbackMethod = method as FallbackMethod;

  if (!(fallbackMethod in fallbackImplementations)) {
    throw new Error(`No fallback implementation for: ${method}`);
  }

  const impl = fallbackImplementations[fallbackMethod] as (...args: unknown[]) => unknown;

  // Deserialize JSON string arguments if needed
  const processedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      try {
        return JSON.parse(arg);
      } catch {
        return arg;
      }
    }
    return arg;
  });

  return impl(...processedArgs);
}

// ==================== MESSAGE HANDLER ====================

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  switch (request.type) {
    case 'init':
      config = { ...getDefaultConfig(), ...request.config };
      try {
        await loadWasmModule();
      } catch (error) {
        // If WASM loading fails but fallback is enabled, we can still work
        if (config.enableFallback) {
          log('warn', 'WASM loading failed, using fallback implementations');
          isInitialized = true;
          sendResponse({ type: 'init-success', loadTime: 0 });
        }
      }
      break;

    case 'call':
      if (!config) {
        sendResponse({
          type: 'error',
          id: request.id,
          error: 'Worker not initialized',
        });
        return;
      }
      await executeWasmMethod(request.id, request.method, request.args);
      break;

    case 'abort':
      const controller = pendingOperations.get(request.id);
      if (controller) {
        controller.abort();
        log('info', `Aborted operation: ${request.id}`);
      }
      break;

    case 'terminate':
      log('info', 'Worker terminating');
      // Free all allocated WASM resources before terminating
      cleanupAllocatedResources();
      self.close();
      break;
  }
};

// ==================== RESOURCE CLEANUP ====================

/**
 * Track a WASM resource that needs explicit cleanup
 */
function trackResource(handle: number, type: 'search_index'): void {
  allocatedResources.set(handle, type);
  log('debug', `Tracked WASM resource: ${type} (handle: ${handle})`);
}

/**
 * Untrack a WASM resource after it's been freed
 */
function untrackResource(handle: number): void {
  allocatedResources.delete(handle);
  log('debug', `Untracked WASM resource (handle: ${handle})`);
}

/**
 * Free all allocated WASM resources
 * Called during worker termination to prevent memory leaks
 */
function cleanupAllocatedResources(): void {
  if (allocatedResources.size === 0) {
    return;
  }

  log('info', `Cleaning up ${allocatedResources.size} allocated WASM resources`);

  for (const [handle, type] of allocatedResources) {
    try {
      if (type === 'search_index') {
        // Free search index in WASM
        if (wasmModule?.free_search_index) {
          wasmModule.free_search_index(handle);
          log('debug', `Freed search_index (handle: ${handle})`);
        } else {
          // Use fallback
          fallbackImplementations.free_search_index(handle);
          log('debug', `Freed search_index via fallback (handle: ${handle})`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('warn', `Failed to free resource ${type} (handle: ${handle}): ${errorMessage}`);
    }
  }

  allocatedResources.clear();
}

// Get default config (workaround for import issues in worker context)
function getDefaultConfig(): WasmBridgeConfig {
  return {
    wasmPath: '/wasm/dmb-transform/pkg/dmb_transform_bg.wasm',
    jsGluePath: '/wasm/dmb-transform/pkg/dmb_transform.js',
    enableFallback: true,
    operationTimeout: 30000,
    maxRetries: 3,
    enablePerfLogging: false,
    useWorker: true,
    sharedBufferSize: 16 * 1024 * 1024,
  };
}

// Signal worker is ready
log('info', 'WASM Worker initialized and ready for messages');
