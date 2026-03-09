function noop() {}

function patchGlobal(name, replacement) {
  const original = globalThis[name];
  globalThis[name] = replacement;
  if (typeof window !== 'undefined') {
    window[name] = replacement;
  }
  return () => {
    globalThis[name] = original;
    if (typeof window !== 'undefined') {
      window[name] = original;
    }
  };
}

function isTrackedParent(node, root) {
  if (!node) return false;
  if (node === document.body || node === document.head) return true;
  if (node.nodeType === Node.ELEMENT_NODE) {
    return root ? node === root || node.contains(root) || root.contains(node) : false;
  }
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return true;
  }
  return false;
}

function collectInsertedNodes(candidate, out) {
  if (!candidate) return;
  if (candidate instanceof DocumentFragment) {
    Array.from(candidate.childNodes).forEach((child) => collectInsertedNodes(child, out));
    return;
  }
  if (candidate instanceof Node) {
    out.push(candidate);
  }
}

function createObserverTracker(OriginalCtor, store, disconnectMethod = 'disconnect') {
  if (typeof OriginalCtor !== 'function') return { restore: noop };

  try {
    class TrackedObserver extends OriginalCtor {
      constructor(...args) {
        super(...args);
        store.add(this);
      }

      [disconnectMethod](...args) {
        store.delete(this);
        return super[disconnectMethod](...args);
      }
    }

    return { replacement: TrackedObserver };
  } catch {
    return { restore: noop };
  }
}

export function createLegacyResourceTracker() {
  if (typeof window === 'undefined') {
    return { cleanup: noop };
  }

  const root = document.getElementById('legacy-dashboard-root');
  const listeners = new Set();
  const intervals = new Set();
  const timeouts = new Set();
  const animationFrames = new Set();
  const idleCallbacks = new Set();
  const observers = new Set();
  const workers = new Set();
  const channels = new Set();
  const wakeLocks = new Set();
  const appendedNodes = new Set();
  const restoreFns = [];
  let destroyed = false;

  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function trackedAddEventListener(type, listener, options) {
    if (!destroyed && listener) {
      listeners.add({ target: this, type, listener, options });
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function trackedRemoveEventListener(type, listener, options) {
    for (const entry of [...listeners]) {
      if (entry.target === this && entry.type === type && entry.listener === listener) {
        listeners.delete(entry);
      }
    }
    return originalRemoveEventListener.call(this, type, listener, options);
  };
  restoreFns.push(() => {
    EventTarget.prototype.addEventListener = originalAddEventListener;
    EventTarget.prototype.removeEventListener = originalRemoveEventListener;
  });

  const nativeSetInterval = globalThis.setInterval.bind(globalThis);
  const nativeClearInterval = globalThis.clearInterval.bind(globalThis);
  restoreFns.push(
    patchGlobal('setInterval', (callback, delay, ...args) => {
      const id = nativeSetInterval(() => {
        if (destroyed) return;
        callback(...args);
      }, delay);
      intervals.add(id);
      return id;
    }),
  );
  restoreFns.push(
    patchGlobal('clearInterval', (id) => {
      intervals.delete(id);
      return nativeClearInterval(id);
    }),
  );

  const nativeSetTimeout = globalThis.setTimeout.bind(globalThis);
  const nativeClearTimeout = globalThis.clearTimeout.bind(globalThis);
  restoreFns.push(
    patchGlobal('setTimeout', (callback, delay, ...args) => {
      const id = nativeSetTimeout(() => {
        timeouts.delete(id);
        if (destroyed) return;
        callback(...args);
      }, delay);
      timeouts.add(id);
      return id;
    }),
  );
  restoreFns.push(
    patchGlobal('clearTimeout', (id) => {
      timeouts.delete(id);
      return nativeClearTimeout(id);
    }),
  );

  const nativeRequestAnimationFrame = globalThis.requestAnimationFrame?.bind(globalThis);
  const nativeCancelAnimationFrame = globalThis.cancelAnimationFrame?.bind(globalThis);
  if (nativeRequestAnimationFrame && nativeCancelAnimationFrame) {
    restoreFns.push(
      patchGlobal('requestAnimationFrame', (callback) => {
        const id = nativeRequestAnimationFrame((timestamp) => {
          animationFrames.delete(id);
          if (destroyed) return;
          callback(timestamp);
        });
        animationFrames.add(id);
        return id;
      }),
    );
    restoreFns.push(
      patchGlobal('cancelAnimationFrame', (id) => {
        animationFrames.delete(id);
        return nativeCancelAnimationFrame(id);
      }),
    );
  }

  const nativeRequestIdleCallback = globalThis.requestIdleCallback?.bind(globalThis);
  const nativeCancelIdleCallback = globalThis.cancelIdleCallback?.bind(globalThis);
  if (nativeRequestIdleCallback && nativeCancelIdleCallback) {
    restoreFns.push(
      patchGlobal('requestIdleCallback', (callback, options) => {
        const id = nativeRequestIdleCallback((deadline) => {
          idleCallbacks.delete(id);
          if (destroyed) return;
          callback(deadline);
        }, options);
        idleCallbacks.add(id);
        return id;
      }),
    );
    restoreFns.push(
      patchGlobal('cancelIdleCallback', (id) => {
        idleCallbacks.delete(id);
        return nativeCancelIdleCallback(id);
      }),
    );
  }

  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function trackedAppendChild(child) {
    const result = originalAppendChild.call(this, child);
    if (!destroyed && isTrackedParent(this, root)) {
      const nodes = [];
      collectInsertedNodes(child, nodes);
      nodes.forEach((node) => appendedNodes.add(node));
    }
    return result;
  };
  restoreFns.push(() => {
    Node.prototype.appendChild = originalAppendChild;
  });

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function trackedInsertBefore(node, child) {
    const result = originalInsertBefore.call(this, node, child);
    if (!destroyed && isTrackedParent(this, root)) {
      const nodes = [];
      collectInsertedNodes(node, nodes);
      nodes.forEach((candidate) => appendedNodes.add(candidate));
    }
    return result;
  };
  restoreFns.push(() => {
    Node.prototype.insertBefore = originalInsertBefore;
  });

  const prependTargets = [Element.prototype, Document.prototype, DocumentFragment.prototype].filter(
    (proto) => proto && typeof proto.prepend === 'function',
  );
  for (const proto of prependTargets) {
    const originalPrepend = proto.prepend;
    proto.prepend = function trackedPrepend(...nodes) {
      const result = originalPrepend.apply(this, nodes);
      if (!destroyed && isTrackedParent(this, root)) {
        const inserted = [];
        nodes.forEach((node) => collectInsertedNodes(node, inserted));
        inserted.forEach((candidate) => appendedNodes.add(candidate));
      }
      return result;
    };
    restoreFns.push(() => {
      proto.prepend = originalPrepend;
    });
  }

  const resizeObserverTracker = createObserverTracker(globalThis.ResizeObserver, observers);
  if (resizeObserverTracker.replacement) {
    restoreFns.push(patchGlobal('ResizeObserver', resizeObserverTracker.replacement));
  }

  const mutationObserverTracker = createObserverTracker(globalThis.MutationObserver, observers);
  if (mutationObserverTracker.replacement) {
    restoreFns.push(patchGlobal('MutationObserver', mutationObserverTracker.replacement));
  }

  const intersectionObserverTracker = createObserverTracker(globalThis.IntersectionObserver, observers);
  if (intersectionObserverTracker.replacement) {
    restoreFns.push(patchGlobal('IntersectionObserver', intersectionObserverTracker.replacement));
  }

  const performanceObserverTracker = createObserverTracker(globalThis.PerformanceObserver, observers, 'disconnect');
  if (performanceObserverTracker.replacement) {
    restoreFns.push(patchGlobal('PerformanceObserver', performanceObserverTracker.replacement));
  }

  const workerTracker = createObserverTracker(globalThis.Worker, workers, 'terminate');
  if (workerTracker.replacement) {
    restoreFns.push(patchGlobal('Worker', workerTracker.replacement));
  }

  const broadcastTracker = createObserverTracker(globalThis.BroadcastChannel, channels, 'close');
  if (broadcastTracker.replacement) {
    restoreFns.push(patchGlobal('BroadcastChannel', broadcastTracker.replacement));
  }

  if (navigator.wakeLock?.request) {
    try {
      const originalWakeLockRequest = navigator.wakeLock.request.bind(navigator.wakeLock);
      navigator.wakeLock.request = async (...args) => {
        const sentinel = await originalWakeLockRequest(...args);
        wakeLocks.add(sentinel);
        sentinel?.addEventListener?.('release', () => wakeLocks.delete(sentinel), { once: true });
        return sentinel;
      };
      restoreFns.push(() => {
        navigator.wakeLock.request = originalWakeLockRequest;
      });
    } catch {}
  }

  const cleanup = () => {
    if (destroyed) return;
    destroyed = true;

    for (const id of [...intervals]) {
      try { nativeClearInterval(id); } catch {}
    }
    intervals.clear();

    for (const id of [...timeouts]) {
      try { nativeClearTimeout(id); } catch {}
    }
    timeouts.clear();

    if (nativeCancelAnimationFrame) {
      for (const id of [...animationFrames]) {
        try { nativeCancelAnimationFrame(id); } catch {}
      }
      animationFrames.clear();
    }

    if (nativeCancelIdleCallback) {
      for (const id of [...idleCallbacks]) {
        try { nativeCancelIdleCallback(id); } catch {}
      }
      idleCallbacks.clear();
    }

    for (const entry of [...listeners]) {
      try {
        originalRemoveEventListener.call(entry.target, entry.type, entry.listener, entry.options);
      } catch {}
    }
    listeners.clear();

    for (const observer of [...observers]) {
      try { observer.disconnect?.(); } catch {}
      try { observer.close?.(); } catch {}
    }
    observers.clear();

    for (const worker of [...workers]) {
      try { worker.terminate?.(); } catch {}
    }
    workers.clear();

    for (const channel of [...channels]) {
      try { channel.close?.(); } catch {}
    }
    channels.clear();

    for (const sentinel of [...wakeLocks]) {
      try { sentinel.release?.(); } catch {}
    }
    wakeLocks.clear();

    for (const node of [...appendedNodes].reverse()) {
      try {
        if (node?.isConnected && node.id !== 'legacy-dashboard-root') {
          node.remove();
        }
      } catch {}
    }
    appendedNodes.clear();

    while (restoreFns.length) {
      const restore = restoreFns.pop();
      try { restore?.(); } catch {}
    }
  };

  return { cleanup };
}
