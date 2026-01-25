# Quick Fixes for Memory Leaks
## Ready-to-Apply Code Patches

---

## FIX #1: NetworkStatus.tsx - Auto-Dismiss Toast Timeout

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/pwa/NetworkStatus.tsx`

**Replace lines 1-49 with:**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const wasOfflineRef = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);

      if (wasOfflineRef.current) {
        setShowOnlineToast(true);

        // FIXED: Clear any existing timeout before setting new one
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }

        // FIXED: Store timeout ID for cleanup
        toastTimeoutRef.current = setTimeout(() => {
          setShowOnlineToast(false);
          toastTimeoutRef.current = null;
        }, 3000);
      }

      wasOfflineRef.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
      setShowOnlineToast(false);
      wasOfflineRef.current = true;

      // FIXED: Clear timeout when going offline
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      // FIXED: Clean up timeout on unmount
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleDismissOfflineBanner = () => {
    setShowOfflineBanner(false);
  };

  // ... rest of component (lines 54+ unchanged)
```

---

## FIX #2: InstallPrompt.tsx - BeforeInstallPrompt Timer

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/pwa/InstallPrompt.tsx`

**Replace lines 62-113 with:**

```typescript
export function InstallPrompt({
  autoShow = true,
  autoShowDelay = 3000,
  onInstalled,
  onDismissed,
  className = '',
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(0);
  const autoShowTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        // FIXED: Store timer in ref for cleanup
        autoShowTimerRef.current = setTimeout(() => {
          setShowPrompt(true);
          offlineLogger.log('Showing install prompt');
        }, autoShowDelay);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (dismissed && dismissedUntil && Date.now() >= dismissedUntil) {
      setDismissed(false);
    }

    return () => {
      // FIXED: Always clear timer on cleanup
      if (autoShowTimerRef.current) {
        clearTimeout(autoShowTimerRef.current);
        autoShowTimerRef.current = null;
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [autoShow, autoShowDelay, dismissed, dismissedUntil]);

  // ... rest of component (lines 115+ unchanged)
```

---

## FIX #3: Confetti.tsx - Timeout Cleanup on Rapid Toggle

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/animations/Confetti.tsx`

**Replace lines 85-125 with:**

```typescript
  const [particles, setParticles] = useState<Array<{ id: string; left: number; delay: number }>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const shouldReduceMotion = prefersReducedMotion();

  useEffect(() => {
    // FIXED: Always clear existing timeout first before setting new one
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

    // FIXED: Set new timeout
    timeoutRef.current = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, config.duration + 100);

    return () => {
      // FIXED: Clear timeout on cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [isActive, colors, count, intensity, duration, onComplete]);

  // ... rest of component (lines 126+ unchanged)
```

---

## FIX #4: predictionSync.ts - Event Listeners via useEffect Hook

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/lib/sync/predictionSync.ts`

**Add new hook export at end of file (before the export default):**

```typescript
// ============================================
// REACT HOOKS FOR PROPER CLEANUP
// ============================================

/**
 * React hook for online event listener with auto-sync
 * Ensures proper cleanup on unmount
 */
export function usePredictionSyncOnOnline(
  onSync?: (_status: PredictionSyncStatus) => void
) {
  const callbackRef = useRef(onSync);

  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    const handleOnline = async () => {
      offlineLogger.log('Connection restored, syncing predictions...');
      const status = await syncPredictionQueue({
        onProgress: callbackRef.current
      });
      callbackRef.current?.(status);
    };

    // Use AbortController for modern cleanup
    const controller = new AbortController();
    window.addEventListener('online', handleOnline, {
      signal: controller.signal
    });

    return () => {
      controller.abort();
    };
  }, []);
}

/**
 * React hook for service worker sync listener
 * Ensures proper cleanup on unmount
 */
export function usePredictionSyncServiceWorkerListener(
  onSync?: (_status: PredictionSyncStatus) => void
) {
  const callbackRef = useRef(onSync);

  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PREDICTION_SYNC_COMPLETE') {
        const status: PredictionSyncStatus = {
          type: event.data.success ? 'synced' : 'error',
          pendingCount: event.data.pendingCount ?? 0,
          syncedCount: event.data.syncedCount ?? 0,
          failedCount: event.data.failedCount ?? 0,
          message: event.data.message,
        };
        callbackRef.current?.(status);
      }
    };

    const controller = new AbortController();

    // Use AbortController for modern cleanup
    navigator.serviceWorker?.addEventListener('message', handleMessage, {
      signal: controller.signal
    });

    // Send initial sync request
    navigator.serviceWorker?.controller?.postMessage?.({
      type: 'SYNC_PREDICTIONS',
    });

    return () => {
      controller.abort();
    };
  }, []);
}
```

**Then replace the standalone functions with deprecation notices:**

```typescript
/**
 * DEPRECATED: Use usePredictionSyncOnOnline hook instead
 * This function requires manual cleanup
 */
export function setupOnlineListener(onSync?: (_status: PredictionSyncStatus) => void): () => void {
  console.warn('setupOnlineListener is deprecated, use usePredictionSyncOnOnline hook instead');
  const handleOnline = async () => {
    offlineLogger.log('Connection restored, syncing predictions...');
    const status = await syncPredictionQueue({ onProgress: onSync });
    onSync?.(status);
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * DEPRECATED: Use usePredictionSyncServiceWorkerListener hook instead
 * This function requires manual cleanup
 */
export function setupServiceWorkerListener(
  onSync?: (_status: PredictionSyncStatus) => void
): () => void {
  console.warn('setupServiceWorkerListener is deprecated, use usePredictionSyncServiceWorkerListener hook instead');
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PREDICTION_SYNC_COMPLETE') {
      const status: PredictionSyncStatus = {
        type: event.data.success ? 'synced' : 'error',
        pendingCount: event.data.pendingCount ?? 0,
        syncedCount: event.data.syncedCount ?? 0,
        failedCount: event.data.failedCount ?? 0,
        message: event.data.message,
      };
      onSync?.(status);
    }
  };

  navigator.serviceWorker?.controller?.postMessage?.({
    type: 'SYNC_PREDICTIONS',
  });

  navigator.serviceWorker?.addEventListener('message', handleMessage);

  return () => {
    navigator.serviceWorker?.removeEventListener('message', handleMessage);
  };
}
```

**Add import at top of file:**

```typescript
import { useEffect, useRef } from 'react';
```

---

## FIX #5: ScreenReaderAnnouncer.tsx - Global Reference

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/components/a11y/ScreenReaderAnnouncer.tsx`

**Replace lines 28-71 with:**

```typescript
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
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

  // Handle initial announcements prop
  useEffect(() => {
    announcements.forEach((announcement) => {
      announce(announcement, { priority: 'polite' });
    });
  }, [announcements, announce]);

  // FIXED: Safely manage global reference
  useEffect(() => {
    announceRef.current = announce;
    (window as any).__dmb_announce = announce;

    return () => {
      // FIXED: Only delete if it's still our reference
      if ((window as any).__dmb_announce === announce) {
        delete (window as any).__dmb_announce;
      }
      announceRef.current = null;
    };
  }, [announce]);

  // ... rest of component (lines 72+ unchanged)
```

---

## FIX #6: useAccessibleCountdown.ts - Callback Memoization

**File:** `/Users/louisherman/Documents/dmbalmanac-v2/apps/web/src/hooks/useAccessibleCountdown.ts`

**Replace lines 31-93 with:**

```typescript
export function useAccessibleCountdown(options: CountdownOptions) {
  const [timeRemaining, setTimeRemaining] = useState<TimeComponents>({
    hours: Math.floor(options.totalSeconds / 3600),
    minutes: Math.floor((options.totalSeconds % 3600) / 60),
    seconds: options.totalSeconds % 60,
  });

  const [isRunning, setIsRunning] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastAnnouncementRef = useRef<number>(options.totalSeconds);
  const remainingSecondsRef = useRef<number>(options.totalSeconds);

  // FIXED: Memoize callbacks using refs
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
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, startSeconds - elapsed);
      remainingSecondsRef.current = remaining;

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

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

    announceGameCountdown({
      hours: timeRemaining.hours,
      minutes: timeRemaining.minutes,
      seconds: timeRemaining.seconds,
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, announceInterval]);  // FIXED: Removed options, added specific deps

  // ... rest of hook (lines 95+ unchanged)
```

---

## How to Apply These Fixes

1. **Backup current files first**
2. **Apply one fix at a time**
3. **Test each component after fix**
4. **Run memory profiler to confirm improvement**

### Quick Test Script
```bash
# After each fix, run memory test
cd /Users/louisherman/Documents/dmbalmanac-v2/apps/web
npm run test -- --testPathPattern="ComponentName.test"
```

### Memory Test with Chrome DevTools
1. Open DevTools > Memory
2. Take baseline snapshot
3. Perform operation 10 times (mount/unmount component)
4. Take second snapshot
5. Compare heap sizes - should show no significant growth

---

