"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { getInstallCapabilities } from "@/lib/platform";
import type { InstallCapabilities } from "@/lib/types";

type InstallPromptChoice = {
  outcome: string;
};

export type InstallPromptHandle = {
  prompt: () => Promise<void>;
  userChoice?: Promise<InstallPromptChoice>;
};

const DEFAULT_INSTALL_CAPABILITIES: InstallCapabilities = {
  isStandalone: false,
  isIOS: false,
  isMacOS: false,
  isSafari: false,
  canInstallPrompt: false,
};

export function useDashboardLifecycle(queryClient: QueryClient) {
  const [installCapabilities, setInstallCapabilities] = useState<InstallCapabilities>(DEFAULT_INSTALL_CAPABILITIES);
  const [isMobile, setIsMobile] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const installPromptRef = useRef<InstallPromptHandle | null>(null);

  useEffect(() => {
    setInstallCapabilities(getInstallCapabilities());
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);

    const handleOnline = () => {
      setIsOffline(false);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };
    const handleOffline = () => setIsOffline(true);
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as Event & InstallPromptHandle;
      setInstallCapabilities((current) => ({ ...current, canInstallPrompt: true }));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleOnline();
      }
    };

    handleResize();

    let registration: ServiceWorkerRegistration | null = null;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((value) => {
          registration = value;
          if (value.waiting) setUpdateReady(true);
          value.addEventListener("updatefound", () => {
            const installing = value.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (installing.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch(() => undefined);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("resize", handleResize);
    window.addEventListener("beforeinstallprompt", handlePrompt as EventListener);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("beforeinstallprompt", handlePrompt as EventListener);
      document.removeEventListener("visibilitychange", handleVisibility);
      void registration;
    };
  }, [queryClient]);

  return {
    installCapabilities,
    installPromptRef,
    isMobile,
    isOffline,
    setUpdateReady,
    updateReady,
  };
}
