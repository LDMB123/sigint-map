"use client";

import { useEffect, useRef, useState } from "react";

type DeferredActivationMode = "idle-or-visible" | "visible-after-idle";

type DeferredActivationOptions = {
  enabled: boolean;
  idleTimeoutMs?: number;
  minimumDelayMs?: number;
  mode: DeferredActivationMode;
  rootMargin?: string;
  threshold?: number | number[];
};

export function useDeferredActivation<T extends Element>({
  enabled,
  idleTimeoutMs = 1_200,
  minimumDelayMs = 0,
  mode,
  rootMargin = "200px",
  threshold = 0,
}: DeferredActivationOptions) {
  const ref = useRef<T | null>(null);
  const [activated, setActivated] = useState(false);
  const [delayReady, setDelayReady] = useState(minimumDelayMs === 0);
  const [idleReady, setIdleReady] = useState(false);
  const [visible, setVisible] = useState(mode === "visible-after-idle");

  useEffect(() => {
    if (!enabled) {
      setActivated(false);
      setDelayReady(minimumDelayMs === 0);
      setIdleReady(false);
      setVisible(mode === "visible-after-idle");
    }
  }, [enabled, minimumDelayMs, mode]);

  useEffect(() => {
    if (!enabled || activated) return;
    if (minimumDelayMs === 0) {
      setDelayReady(true);
      return;
    }

    setDelayReady(false);
    const timerId = globalThis.setTimeout(() => {
      setDelayReady(true);
    }, minimumDelayMs);

    return () => {
      globalThis.clearTimeout(timerId);
    };
  }, [activated, enabled, minimumDelayMs]);

  useEffect(() => {
    if (!enabled || activated) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    let idleId: number | null = null;

    const markIdleReady = () => {
      if (!cancelled) {
        setIdleReady(true);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(markIdleReady, { timeout: idleTimeoutMs });
    } else if (typeof globalThis.setTimeout === "function") {
      timeoutId = globalThis.setTimeout(markIdleReady, Math.min(idleTimeoutMs, 400));
    }

    return () => {
      cancelled = true;
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [activated, enabled, idleTimeoutMs]);

  useEffect(() => {
    if (!enabled || activated) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      if (mode === "visible-after-idle") {
        setVisible(true);
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activated, enabled, mode, rootMargin, threshold]);

  useEffect(() => {
    if (!enabled || activated) return;

    const shouldActivate =
      mode === "idle-or-visible"
        ? idleReady || visible
        : idleReady && visible;

    if (delayReady && shouldActivate) {
      setActivated(true);
    }
  }, [activated, delayReady, enabled, idleReady, mode, visible]);

  return { activated, ref };
}
