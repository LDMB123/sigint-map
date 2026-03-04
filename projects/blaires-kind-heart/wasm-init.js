import './runtime-diagnostics.js';

// WASM initialization with performance marks, streaming compilation, and error handling.
performance.mark('wasm-init-start');

function isPanelRegistry(registry) {
  if (!registry || typeof registry !== 'object') {
    return false;
  }
  return Object.values(registry).every((entry) => entry && typeof entry === 'object');
}

async function loadPanelRegistry() {
  try {
    const mod = await import('./panel-registry.js');
    const registry = mod?.PANEL_REGISTRY ?? mod?.default ?? null;
    if (!isPanelRegistry(registry)) {
      console.warn('[panel-registry] invalid registry export; using inferred fallback labels');
      return null;
    }
    return registry;
  } catch (error) {
    console.warn('[panel-registry] unavailable; using inferred fallback labels', error);
    return null;
  }
}

function inferPanelLabel(panelId) {
  if (!panelId || panelId === 'home-scene') {
    return 'Home';
  }
  const core = panelId.startsWith('panel-') ? panelId.slice(6) : panelId;
  return core
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPanelMeta(panelRegistry, panelId) {
  const panelMeta = panelRegistry?.[panelId];
  if (panelMeta && typeof panelMeta === 'object' && panelMeta.breadcrumb && typeof panelMeta.breadcrumb === 'object') {
    return panelMeta;
  }
  const inferredLabel = inferPanelLabel(panelId);
  return {
    id: panelId,
    parent: null,
    breadcrumb: {
      icon: '',
      label: inferredLabel,
      aria: inferredLabel
    },
    panel_title: inferredLabel,
    panel_aria: inferredLabel,
    theme_token: null
  };
}

function ensureHomeControl(breadcrumb) {
  const template = document.getElementById('breadcrumb-home-template');
  if (!(template instanceof HTMLTemplateElement)) {
    return;
  }

  if (breadcrumb.querySelector('[data-nav-home]')) {
    return;
  }

  const current = breadcrumb.querySelector('.breadcrumb-current');
  const fragment = template.content.cloneNode(true);
  if (current) {
    breadcrumb.insertBefore(fragment, current);
  } else {
    breadcrumb.prepend(fragment);
  }
}

function ensureParentControl(breadcrumb, panelMeta, panelRegistry) {
  if (!panelRegistry) {
    return;
  }

  const template = document.getElementById('breadcrumb-parent-template');
  if (!(template instanceof HTMLTemplateElement)) {
    return;
  }

  if (breadcrumb.querySelector('[data-nav-panel]')) {
    return;
  }

  const parentId = panelMeta?.parent;
  if (!parentId) {
    return;
  }

  const parentMeta = getPanelMeta(panelRegistry, parentId);
  if (!parentMeta?.breadcrumb) {
    return;
  }

  const current = breadcrumb.querySelector('.breadcrumb-current');
  const fragment = template.content.cloneNode(true);
  const parentButton = fragment.querySelector('[data-nav-panel]');
  if (parentButton) {
    parentButton.setAttribute('data-nav-panel', parentId);
    parentButton.setAttribute('aria-label', parentMeta.breadcrumb.aria || parentMeta.breadcrumb.label || parentId);
    parentButton.textContent = parentMeta.breadcrumb.icon || '↩';
  }
  if (current) {
    breadcrumb.insertBefore(fragment, current);
  } else {
    breadcrumb.append(fragment);
  }
}

function hydratePanelChrome(panelRegistry) {
  const panels = document.querySelectorAll('.panel[data-panel-id]');
  for (const panel of panels) {
    const panelId = panel.getAttribute('data-panel-id');
    if (!panelId) {
      continue;
    }

    const panelMeta = getPanelMeta(panelRegistry, panelId);
    if (!panelMeta || typeof panelMeta !== 'object') {
      continue;
    }

    if (panelMeta?.theme_token) {
      panel.setAttribute('data-panel-theme', panelMeta.theme_token);
    }

    if (typeof panelMeta.panel_aria === 'string' && panelMeta.panel_aria.length > 0) {
      panel.setAttribute('aria-label', panelMeta.panel_aria);
    }

    if (typeof panelMeta.panel_title === 'string' && panelMeta.panel_title.length > 0) {
      const panelTitle = panel.querySelector('.panel-title');
      if (panelTitle) {
        panelTitle.textContent = panelMeta.panel_title;
      }
    }

    const breadcrumb = panel.querySelector('.breadcrumb[data-panel-id]');
    if (!(breadcrumb instanceof HTMLElement)) {
      continue;
    }

    ensureHomeControl(breadcrumb);
    ensureParentControl(breadcrumb, panelMeta, panelRegistry);

    const current = breadcrumb.querySelector('[data-breadcrumb-current]');
    if (!current) {
      continue;
    }

    const icon = panelMeta.breadcrumb?.icon || '';
    const label = panelMeta.breadcrumb?.label || panelId;
    current.textContent = icon ? `${icon} ${label}` : label;
  }
}

try {
  window.__BKH_RUNTIME_DIAGNOSTICS__?.install({
    scope: 'wasm-init',
    captureInp: true,
    captureLoaf: true
  });

  const panelRegistry = await loadPanelRegistry();
  // Single pass over panel shell to keep runtime hydration deterministic.
  hydratePanelChrome(panelRegistry);

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
      const messageText = 'Oops! Something went wrong. Please refresh the page.';
      const existingMessage = loading.querySelector('[data-loading-error]');
      if (existingMessage) {
        existingMessage.textContent = messageText;
      } else {
        const message = document.createElement('p');
        message.setAttribute('data-loading-error', '');
        message.textContent = messageText;
        loading.append(message);
      }
    }
  } catch (_) { /* DOM may be unavailable during very early errors. */ }
}
