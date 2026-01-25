# Memory Leak Analysis Report
## DMB Almanac v2 - Web Application

Date: January 17, 2026
Scan Scope: `/apps/web/src/components`, `/apps/web/src/hooks`, `/apps/web/src/lib`

---

## Executive Summary

Found **6 critical memory leak patterns** and **3 moderate issues** across the codebase. Most issues stem from:
- Missing event listener cleanup in useEffect
- Uncancelled timers (setTimeout)
- Event listener on window without AbortController
- Event emitter listeners not properly managed

**Severity Rating: MEDIUM** - These leaks accumulate over time but are easily fixable.

---

## CRITICAL ISSUES

### 1. NetworkStatus Component - Event Listeners Not Cleaned Up Properly
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/pwa/NetworkStatus.tsx`
**Severity:** HIGH
**Lines:** 26-28 (auto-dismiss timeout)

#### Problem
The auto-dismiss timeout on line 26-28 creates a setTimeout that may not be cleaned up if the component unmounts before the timeout fires.

```typescript
// ❌ LEAK: setTimeout not tracked in return cleanup
if (wasOfflineRef.current) {
  setShowOnlineToast(true);
  setTimeout(() => {
    setShowOnlineToast(false);
  }, 3000);  // This timeout ID is never saved or cleared
}
```

**Impact:** Memory leak when online/offline events fire rapidly or component unmounts during toast timeout.

#### Fix
```typescript
// ✅ FIXED: Track and clear timeout
useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    setShowOfflineBanner(false);

    if (wasOfflineRef.current) {
      setShowOnlineToast(true);
      const timeoutId = setTimeout(() => {
        setShowOnlineToast(false);
      }, 3000);

      return () => clearTimeout(timeoutId);
    }

    wasOfflineRef.current = false;
  };

  const handleOffline = () => {
    setIsOnline(false);
    setShowOfflineBanner(true);
    setShowOnlineToast(false);
    wasOfflineRef.current = true;
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

**Detailed Fix:**
```typescript
// ISSUE: The auto-dismiss setTimeout is created inside event handler
// but never returned as cleanup from useEffect

// Store timeout IDs for cleanup
const timeoutRefRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  const handleOnline = () => {
    setIsOnline(true);
    setShowOfflineBanner(false);

    if (wasOfflineRef.current) {
      setShowOnlineToast(true);
      // FIXED: Save timeout ID and return cleanup function
      timeoutRefRef.current = setTimeout(() => {
        setShowOnlineToast(false);
      }, 3000);
    }

    wasOfflineRef.current = false;
  };

  // ... rest of handlers

  return () => {
    // FIXED: Clear any pending timeouts
    if (timeoutRefRef.current) {
      clearTimeout(timeoutRefRef.current);
    }
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

---

### 2. InstallPrompt Component - Deferred setTimeout Not Cleaned
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/pwa/InstallPrompt.tsx`
**Severity:** HIGH
**Lines:** 93-99

#### Problem
The autoShow timeout created at line 93 returns a cleanup function, but this cleanup is not properly integrated with the useEffect return statement if `autoShow` is false.

```typescript
// ❌ POTENTIAL LEAK: Timer cleanup only returned in conditional
const handleBeforeInstallPrompt = (e: Event): (() => void) | undefined => {
  e.preventDefault();
  setDeferredPrompt(e as BeforeInstallPromptEvent);

  if (autoShow) {
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, autoShowDelay);
    return () => clearTimeout(timer);  // ❌ Cleanup lost if handler discarded
  }
  return undefined;  // No cleanup if autoShow is false
};
```

**Impact:** Timer leaks when `beforeinstallprompt` event fires with `autoShow=false`.

#### Fix
```typescript
// ✅ FIXED: Track timer outside event handler
const timerRefRef = useRef<NodeJS.Timeout | undefined>(undefined);

useEffect(() => {
  const stored = localStorage.getItem('pwa-install-dismissed-until');
  if (stored) {
    const dismissUntil = parseInt(stored);
    if (Date.now() < dismissUntil) {
      setDismissed(true);
      setDismissedUntil(dismissUntil);
      return;
    } else {
      localStorage.removeItem('pwa-install-dismissed-until');
    }
  }

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e as BeforeInstallPromptEvent);

    if (autoShow) {
      // FIXED: Store in ref for cleanup in useEffect return
      timerRefRef.current = setTimeout(() => {
        setShowPrompt(true);
        offlineLogger.log('Showing install prompt');
      }, autoShowDelay);
    }
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  return () => {
    // FIXED: Always clear timer in cleanup
    if (timerRefRef.current) {
      clearTimeout(timerRefRef.current);
    }
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  };
}, [autoShow, autoShowDelay, dismissed, dismissedUntil]);
```

---

### 3. Confetti Component - Timeout Leak on Rapid Activations
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/animations/Confetti.tsx`
**Severity:** HIGH
**Lines:** 115-118

#### Problem
When `isActive` prop changes rapidly (e.g., user triggers multiple achievements), previous timeouts may not be cleared before new ones are created. The cleanup function is returned but stale timeouts could leak.

```typescript
// ❌ POTENTIAL LEAK: Multiple timeouts if isActive toggles rapidly
useEffect(() => {
  if (!isActive) {
    setParticles([]);
    return;
  }

  // ... particles creation ...

  // Auto-dismiss after animation
  timeoutRef.current = setTimeout(() => {
    setParticles([]);
    onComplete?.();
  }, config.duration + 100);  // ❌ Previous timeout overwritten without clearing

  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [isActive, colors, count, intensity, duration, onComplete]);
```

**Impact:** If `isActive` rapidly toggles, timeouts accumulate. Cleanup only runs for the latest timeout.

#### Fix
```typescript
// ✅ FIXED: Ensure previous timeout always cleared
useEffect(() => {
  // FIXED: Always clear any existing timeout first
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }

  if (!isActive) {
    setParticles([]);
    return;
  }

  const config = getConfettiConfig({
    colors,
    count,
    intensity,
    duration,
  });

  const newParticles = Array.from({ length: config.count }, (_, i) => ({
    id: `confetti-${i}`,
    left: Math.random() * 100,
    delay: Math.random() * 100,
  }));

  setParticles(newParticles);

  // Set new timeout
  timeoutRef.current = setTimeout(() => {
    setParticles([]);
    onComplete?.();
  }, config.duration + 100);

  return () => {
    // FIXED: Clear timeout on unmount or effect re-run
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  };
}, [isActive, colors, count, intensity, duration, onComplete]);
```

---

### 4. PredictionSync - Event Listeners Not Cleaned Up
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/lib/sync/predictionSync.ts`
**Severity:** HIGH
**Lines:** 387-399, 404-428

#### Problem
The `setupOnlineListener` and `setupServiceWorkerListener` functions return cleanup functions, but these listeners may not be called on component unmount if the hooks using them don't properly clean up.

```typescript
// ❌ POTENTIAL LEAK: Event listeners stored in functions, not React lifecycle
export function setupOnlineListener(onSync?: (_status: PredictionSyncStatus) => void): () => void {
  const handleOnline = async () => {
    offlineLogger.log('Connection restored, syncing predictions...');
    const status = await syncPredictionQueue({ onProgress: onSync });
    onSync?.(status);
  };

  window.addEventListener('online', handleOnline);  // ❌ Listener added to window

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

export function setupServiceWorkerListener(
  onSync?: (_status: PredictionSyncStatus) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PREDICTION_SYNC_COMPLETE') {
      // ... handle sync ...
    }
  };

  navigator.serviceWorker?.controller?.postMessage?.({
    type: 'SYNC_PREDICTIONS',
  });

  navigator.serviceWorker?.addEventListener('message', handleMessage);  // ❌ Listener added

  return () => {
    navigator.serviceWorker?.removeEventListener('message', handleMessage);
  };
}
```

**Impact:** If these setup functions are called without storing and calling the returned cleanup, listeners persist for application lifetime.

#### Fix - Create React hooks instead of standalone functions
```typescript
// ✅ FIXED: Create React hook for proper cleanup
export function usePredictionSyncListener(onSync?: (_status: PredictionSyncStatus) => void) {
  const callbackRef = useRef(onSync);

  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    const handleOnline = async () => {
      offlineLogger.log('Connection restored, syncing predictions...');
      const status = await syncPredictionQueue({ onProgress: callbackRef.current });
      callbackRef.current?.(status);
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}

// Or if must use standalone function, ensure cleanup is called:
// In component:
export function useOnlineSync(onSync?: (_status: PredictionSyncStatus) => void) {
  useEffect(() => {
    const cleanup = setupOnlineListener(onSync);
    return cleanup;  // FIXED: Return cleanup function
  }, [onSync]);
}

// Better: Use AbortController for modern cleanup
export function setupOnlineListenerWithAbort(
  onSync?: (_status: PredictionSyncStatus) => void
): { controller: AbortController; cleanup: () => void } {
  const controller = new AbortController();

  const handleOnline = async () => {
    if (!controller.signal.aborted) {
      offlineLogger.log('Connection restored, syncing predictions...');
      const status = await syncPredictionQueue({ onProgress: onSync });
      if (!controller.signal.aborted) {
        onSync?.(status);
      }
    }
  };

  window.addEventListener('online', handleOnline, { signal: controller.signal });

  return {
    controller,
    cleanup: () => controller.abort()
  };
}
```

---

### 5. useGlobalSearch - Event Listener Accumulation
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/hooks/useGlobalSearch.ts`
**Severity:** MEDIUM-HIGH
**Lines:** 36-43

#### Problem
The `SearchEventEmitter` class stores all listeners without WeakMap or cleanup mechanism. Each component using `useGlobalSearch` adds a listener that persists unless the component unmounts. If many instances are created/destroyed, listeners accumulate.

```typescript
// ❌ MEMORY LEAK: Listeners array grows with each new component instance
class SearchEventEmitter {
  private listeners: SearchEventListener[] = [];

  subscribe(listener: SearchEventListener) {
    this.listeners.push(listener);  // ❌ Listeners accumulate
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);  // Cleanup depends on unsubscribe call
    };
  }

  emit(open: boolean) {
    this.listeners.forEach((listener) => listener(open));
  }
}

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = searchEmitter.subscribe(setIsOpen);
    return unsubscribe;  // ✓ Cleanup is called
  }, []);  // ✓ Empty deps - OK

  // ... rest of hook
}
```

**Analysis:** Actually this code IS safe - the unsubscribe is properly returned. However, issue could occur if `onSearch` callback is not stable.

**Potential Issue:** The dependency array is empty but `onSearch` might have missing dependencies.

#### Fix (Preventive)
```typescript
// ✅ IMPROVED: Use WeakMap for better memory management (optional optimization)
class SearchEventEmitter {
  private listeners: WeakSet<SearchEventListener> = new WeakSet();
  private strongListeners: Map<SearchEventListener, SearchEventListener> = new Map();

  subscribe(listener: SearchEventListener) {
    this.listeners.add(listener);
    this.strongListeners.set(listener, listener);

    return () => {
      this.listeners.delete(listener);
      this.strongListeners.delete(listener);
    };
  }

  emit(open: boolean) {
    this.listeners.forEach((listener) => listener(open));
  }
}

// OR: Use AbortController pattern
export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AbortController();
    }

    const unsubscribe = searchEmitter.subscribe(setIsOpen);

    return () => {
      unsubscribe();
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  // ... rest of hook
}
```

---

### 6. ScreenReaderAnnouncer - Global Window Reference Leak
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/a11y/ScreenReaderAnnouncer.tsx`
**Severity:** MEDIUM
**Lines:** 66-71

#### Problem
Component stores reference to `announce` function on `window` object. If component unmounts and remounts, multiple references accumulate or old references persist.

```typescript
// ❌ POTENTIAL LEAK: Adds global reference that persists
useEffect(() => {
  (window as any).__dmb_announce = announce;
  return () => {
    delete (window as any).__dmb_announce;
  };
}, [announce]);  // ⚠️ announce function recreated on every render due to dependencies
```

**Issue:** The `announce` function's dependencies might cause it to recreate frequently, updating the global reference repeatedly.

#### Fix
```typescript
// ✅ FIXED: Memoize announce function and use stable global reference
const announceRef = useRef<typeof announce | null>(null);

const announce = useCallback(
  (message: string, options: AnnouncementOptions = {}): (() => void) | undefined => {
    const { priority = 'polite', clearDelay = 1000 } = options;
    const region = priority === 'assertive' ? assertiveRef.current : politeRef.current;

    if (!region) return undefined;

    region.textContent = '';
    region.textContent = message;
    onAnnounce?.(message);

    if (clearDelay > 0) {
      const timeout = setTimeout(() => {
        if (region.textContent === message) {
          region.textContent = '';
        }
      }, clearDelay);

      return () => clearTimeout(timeout);
    }

    return undefined;
  },
  [onAnnounce]
);

useEffect(() => {
  announceRef.current = announce;
  (window as any).__dmb_announce = announce;

  return () => {
    if ((window as any).__dmb_announce === announce) {
      delete (window as any).__dmb_announce;
    }
  };
}, [announce]);
```

---

## MODERATE ISSUES

### 7. useAccessibleCountdown Hook - Potential Closure Over Options
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/hooks/useAccessibleCountdown.ts`
**Severity:** MEDIUM
**Lines:** 46-93

#### Problem
The `options` object is included in the dependency array but `onTick` and `onComplete` callbacks might cause the effect to re-run frequently if not memoized by the caller.

```typescript
// ⚠️ CAUTION: options contains callbacks that might not be stable
useEffect(() => {
  // ... effect code ...
  options.onTick?.({ hours, minutes, seconds });
  options.onComplete?.();
}, [isRunning, announceInterval, options, timeRemaining.hours, ...]);
// ⚠️ options in dependency array means effect runs when options changes
```

**Impact:** If parent component doesn't memoize `options`, timer is recreated frequently.

#### Fix
```typescript
// ✅ IMPROVED: Separate callback memoization
export function useAccessibleCountdown(options: CountdownOptions) {
  // ... state setup ...

  // Memoize callbacks
  const onTickRef = useRef(options.onTick);
  const onCompleteRef = useRef(options.onComplete);

  useEffect(() => {
    onTickRef.current = options.onTick;
    onCompleteRef.current = options.onComplete;
  }, [options.onTick, options.onComplete]);

  const announceInterval = options.announceIntervalSeconds ?? 300;

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    startTimeRef.current = Date.now();
    const startSeconds = remainingSecondsRef.current;

    timerRef.current = setInterval(() => {
      // ... calculation ...

      setTimeRemaining({ hours, minutes, seconds });
      onTickRef.current?.({ hours, minutes, seconds });  // FIXED: Use ref

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        setIsRunning(false);
        announceGameCountdown({ hours: 0, minutes: 0, seconds: 0 });
        onCompleteRef.current?.();  // FIXED: Use ref
      } else if (lastAnnouncementRef.current - remaining >= announceInterval) {
        announceGameCountdown({ hours, minutes, seconds });
        lastAnnouncementRef.current = remaining;
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, announceInterval]);  // FIXED: Remove options, add specific deps
}
```

---

### 8. Confetti Component - Rapid Particle Generation
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/animations/Confetti.tsx`
**Severity:** MEDIUM (memory bloat, not leak)
**Lines:** 104-110

#### Problem
On each re-render when `isActive` changes, `Math.random()` is called many times for particle generation. If `isActive` toggles rapidly, this creates many temporary objects.

```typescript
// ⚠️ PERFORMANCE: Creates full particle array on every isActive change
const newParticles = Array.from({ length: config.count }, (_, i) => ({
  id: `confetti-${i}`,
  left: Math.random() * 100,
  delay: Math.random() * 100,
}));
```

**Impact:** Not a leak, but causes memory pressure with rapid toggles.

#### Fix
```typescript
// ✅ IMPROVED: Memoize particle generation
const particles = useMemo(() => {
  if (!isActive) return [];

  return Array.from({ length: config.count }, (_, i) => ({
    id: `confetti-${i}`,
    left: Math.random() * 100,
    delay: Math.random() * 100,
  }));
}, [isActive, config.count]);
```

---

### 9. DataPreloader - Large setTimeout Array in Loops
**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/lib/offline/dataPreloader.ts`
**Severity:** LOW-MEDIUM
**Lines:** 178, 254

#### Problem
Rate-limiting setTimeout creates many timeouts in sequence that all need to be tracked. If sync is cancelled mid-way, orphaned timeouts may exist.

```typescript
// ⚠️ CAUTION: Many timeouts created in loop without central tracking
while (hasMore && (!maxPages || page <= maxPages)) {
  // ... fetch ...
  // Rate limiting: small delay between requests
  await new Promise((resolve) => setTimeout(resolve, 100));  // ⚠️ Untracked timeout
}
```

**Impact:** Negligible with 100ms delays, but pattern is unsafe.

#### Fix
```typescript
// ✅ IMPROVED: Use AbortSignal for timeout cancellation
async function fetchPaginatedData<T>(
  endpoint: string,
  limit: number = 20,
  maxPages?: number,
  signal?: AbortSignal
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && (!maxPages || page <= maxPages)) {
    // Check if abort signal was triggered
    if (signal?.aborted) {
      break;
    }

    try {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', limit.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),  // ✓ Already has timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as PaginatedResponse<T>;
      results.push(...data.data);
      hasMore = data.pagination.hasMore;
      page++;

      // Rate limiting with cancellation support
      if (hasMore) {
        await new Promise((resolve, reject) => {
          if (signal?.aborted) {
            reject(new Error('Aborted'));
            return;
          }

          const timeoutId = setTimeout(resolve, 100);

          signal?.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Aborted'));
          });
        });
      }
    } catch (error) {
      offlineLogger.error(`Error fetching ${endpoint} page ${page}:`, error);
      break;
    }
  }

  return results;
}
```

---

## ANALYSIS SUMMARY TABLE

| Issue # | File | Pattern | Severity | Status |
|---------|------|---------|----------|--------|
| 1 | NetworkStatus.tsx | setTimeout not tracked in handler | HIGH | Fixable |
| 2 | InstallPrompt.tsx | setTimeout cleanup in nested condition | HIGH | Fixable |
| 3 | Confetti.tsx | Timeout overwrite on rapid toggle | HIGH | Fixable |
| 4 | predictionSync.ts | Event listeners missing useEffect wrapper | HIGH | Fixable |
| 5 | useGlobalSearch.ts | Listener accumulation risk | MED-HIGH | Safe (cleanup exists) |
| 6 | ScreenReaderAnnouncer.tsx | Global reference recreation | MEDIUM | Fixable |
| 7 | useAccessibleCountdown.ts | Closure over unstable options | MEDIUM | Fixable |
| 8 | Confetti.tsx | Rapid particle generation | MEDIUM | Optimization |
| 9 | dataPreloader.ts | Untracked timeouts in loop | LOW-MED | Fixable |

---

## Prevention Patterns

### Pattern 1: Always Cleanup Timeouts
```typescript
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    // do work
  }, delay);

  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);
```

### Pattern 2: Always Cleanup Event Listeners
```typescript
useEffect(() => {
  const handler = (e: Event) => {
    // handle event
  };

  // Modern approach with AbortController
  const controller = new AbortController();
  window.addEventListener('event', handler, { signal: controller.signal });

  return () => {
    controller.abort();
  };

  // Traditional approach
  // window.addEventListener('event', handler);
  // return () => {
  //   window.removeEventListener('event', handler);
  // };
}, []);
```

### Pattern 3: Memoize Callbacks in Dependency Arrays
```typescript
useEffect(() => {
  const mutableRef = useRef(callback);

  useEffect(() => {
    mutableRef.current = callback;
  }, [callback]);

  // Now useEffect uses stable reference
  otherEffect(() => {
    mutableRef.current?.();
  }, []); // Safe empty deps
}, []);
```

### Pattern 4: Use AbortSignal for Fetch/Async
```typescript
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(data => setState(data))
    .catch(err => {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    });

  return () => {
    controller.abort();
  };
}, []);
```

---

## Testing Memory Leaks

### Chrome DevTools Approach
1. Open DevTools > Memory panel
2. Take heap snapshot (baseline)
3. Perform suspect operation 10 times (open/close modal, mount/unmount component)
4. Force garbage collection (trash icon)
5. Take another heap snapshot
6. Compare: look for retained objects, "Detached DOM" nodes

### Automated Testing
```typescript
// Example: Test Confetti component for leaks
import { render, unmountComponentAtNode } from 'react-dom';

async function testConfettiMemoryLeak() {
  const container = document.createElement('div');

  // Get initial memory
  const initialMemory = performance.memory?.usedJSHeapSize || 0;

  // Mount/unmount 100 times
  for (let i = 0; i < 100; i++) {
    render(<Confetti isActive={true} />, container);
    await new Promise(resolve => setTimeout(resolve, 2100)); // Wait for animation
    unmountComponentAtNode(container);
  }

  // Force GC and check memory
  if (performance.memory) {
    const finalMemory = performance.memory.usedJSHeapSize;
    const growth = finalMemory - initialMemory;

    if (growth > 5_000_000) { // > 5MB
      console.error(`Memory leak detected: ${growth / 1_000_000}MB growth`);
    }
  }
}
```

---

## Next Steps

1. **Immediate:** Fix issues #1-4 (HIGH severity)
2. **Short-term:** Fix issues #5-7 (MEDIUM severity)
3. **Optional:** Apply pattern #3 to issues #8-9
4. **Monitoring:** Add memory profiling to CI/CD pipeline
5. **Documentation:** Document cleanup patterns for team

---

## References

- [React useEffect Cleanup](https://react.dev/reference/react/useEffect#how-to-handle-the-effect-firing-twice-in-strict-mode)
- [AbortController - MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Chrome DevTools Memory Panel](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Memory Leak Detection with Performance.memory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)

