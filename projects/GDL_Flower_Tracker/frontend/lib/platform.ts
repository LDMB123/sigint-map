"use client";

import type { InstallCapabilities } from "@/lib/types";

export function getInstallCapabilities(): InstallCapabilities {
  if (typeof window === "undefined") {
    return {
      isStandalone: false,
      isIOS: false,
      isMacOS: false,
      isSafari: false,
      canInstallPrompt: false,
    };
  }

  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isMacOS = /Macintosh/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari standalone quirk.
    ((window.navigator as Navigator & { standalone?: boolean }).standalone === true);

  return {
    isStandalone,
    isIOS,
    isMacOS,
    isSafari,
    canInstallPrompt: false,
  };
}
