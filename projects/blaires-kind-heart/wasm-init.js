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
  const rawJs = params.get('js') || 'blaires-kind-heart.js';
  const rawWasm = params.get('wasm') || 'blaires-kind-heart_bg.wasm';
  // Resolve relative to document base — bare specifiers fail in strict CSP
  const jsPath = new URL(rawJs, document.baseURI).href;
  const wasmPath = new URL(rawWasm, document.baseURI).href;

  // Parallel boot: fetch WASM bytes + import bindings simultaneously
  {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = jsPath;
    document.head.appendChild(link);
  }

  performance.mark('wasm-parallel-start');
  // Safari 26.2: Use compileStreaming for 200-400ms faster WASM init.
  // Compilation starts during download (no arrayBuffer() round-trip).
  // Fallback: if compileStreaming fails (e.g. wrong MIME type from dev server),
  // fetch as ArrayBuffer. New fetch() call required — the streaming response
  // body is already consumed and cannot be re-read.
  async function compileWasm() {
    try {
      return await WebAssembly.compileStreaming(fetch(wasmPath));
    } catch (_) {
      const buf = await fetch(wasmPath).then(r => r.arrayBuffer());
      return await WebAssembly.compile(buf);
    }
  }
  const [bindings, wasmModule] = await Promise.all([
    import(jsPath),
    compileWasm()
  ]);
  performance.mark('wasm-parallel-end');
  performance.measure('wasm-parallel-load', 'wasm-parallel-start', 'wasm-parallel-end');

  performance.mark('wasm-instantiate-start');
  const wasm = await bindings.default({ module: wasmModule });
  performance.mark('wasm-instantiate-end');
  performance.measure('wasm-instantiate', 'wasm-instantiate-start', 'wasm-instantiate-end');

  window.wasmBindings = bindings;
  performance.mark('wasm-init-end');
  performance.measure('wasm-init-total', 'wasm-init-start', 'wasm-init-end');
  dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
} catch (err) {
  console.error('[wasm-init] Fatal:', err);
  // Show user-friendly error on the loading screen
  const loading = document.getElementById('loading-screen');
  if (loading) {
    const msg = loading.querySelector('.loading-text') || loading;
    msg.textContent = 'Oops! Something went wrong. Please refresh the page.';
    // Hide the spinner/progress if present
    const bar = loading.querySelector('.loading-bar-fill');
    if (bar) bar.style.display = 'none';
  }
}
