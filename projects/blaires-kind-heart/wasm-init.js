import './runtime-diagnostics.js';

// WASM initialization with performance marks, streaming compilation, and error handling.
performance.mark('wasm-init-start');

try {
  window.__BKH_RUNTIME_DIAGNOSTICS__?.install({
    scope: 'wasm-init',
    captureInp: true,
    captureLoaf: true
  });

  const params = new URL(import.meta.url).searchParams;
  const rawWasm = params.get('wasm') || 'blaires-kind-heart_bg.wasm';
  // Resolve relative to document base — bare specifiers fail in strict CSP.
  const wasmPath = new URL(rawWasm, document.baseURI).href;

  // Parallel boot: load no-modules bindgen script + compile WASM simultaneously.
  const bindings = typeof wasm_bindgen === 'function' ? wasm_bindgen : null;
  if (!bindings) {
    throw new Error('wasm_bindgen binding is unavailable. Ensure blaires-kind-heart.js loads before wasm-init.js.');
  }

  // Safari 26.2: Use compileStreaming for faster WASM init with fallback.
  async function compileWasm() {
    try {
      return await WebAssembly.compileStreaming(fetch(wasmPath));
    } catch (_) {
      const buf = await fetch(wasmPath).then(r => r.arrayBuffer());
      return await WebAssembly.compile(buf);
    }
  }

  performance.mark('wasm-parallel-start');
  const wasmModule = await compileWasm();
  performance.mark('wasm-parallel-end');
  performance.measure('wasm-parallel-load', 'wasm-parallel-start', 'wasm-parallel-end');

  performance.mark('wasm-instantiate-start');
  const wasm = await bindings({ module: wasmModule });
  performance.mark('wasm-instantiate-end');
  performance.measure('wasm-instantiate', 'wasm-instantiate-start', 'wasm-instantiate-end');

  // Only expose WASM bindings globally on localhost (dev/debugging only).
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    const debugBindings = { default: bindings };
    for (const key of Object.keys(bindings)) {
      debugBindings[key] = bindings[key];
    }
    window.wasmBindings = debugBindings;
  }

  performance.mark('wasm-init-end');
  performance.measure('wasm-init-total', 'wasm-init-start', 'wasm-init-end');
  dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
} catch (err) {
  console.error('[wasm-init] Fatal:', err);
  // Show user-friendly error on the loading screen.
  try {
    const loading = document.getElementById('loading-screen');
    if (loading) {
      const msg = loading.querySelector('.loading-text') || loading;
      msg.textContent = 'Oops! Something went wrong. Please refresh the page.';
      const bar = loading.querySelector('.loading-bar-fill');
      if (bar) bar.style.display = 'none';
    }
  } catch (_) { /* DOM may be unavailable during very early errors. */ }
}
