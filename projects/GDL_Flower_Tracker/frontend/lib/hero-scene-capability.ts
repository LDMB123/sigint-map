"use client";

type ConnectionLike = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

type NavigatorWithPerfHints = Navigator & {
  connection?: ConnectionLike;
  deviceMemory?: number;
};

export type HeroSceneCapabilitySnapshot = {
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  effectiveType: string | null;
  deviceMemory: number | null;
  webglSupported: boolean;
};

const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

export function canLoadHeroScene(snapshot: HeroSceneCapabilitySnapshot) {
  if (!snapshot.isDesktop) return false;
  if (snapshot.prefersReducedMotion) return false;
  if (snapshot.saveData) return false;
  if (snapshot.effectiveType && SLOW_CONNECTIONS.has(snapshot.effectiveType)) return false;
  if (snapshot.deviceMemory != null && snapshot.deviceMemory < 4) return false;
  if (!snapshot.webglSupported) return false;
  return true;
}

export function getNavigatorConnection(navigatorLike: Navigator): ConnectionLike | undefined {
  return (navigatorLike as NavigatorWithPerfHints).connection;
}

function detectWebGLSupport(win: Window): boolean {
  try {
    const canvas = win.document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2", { powerPreference: "low-power" }) ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function readHeroSceneCapability(win: Window = window): HeroSceneCapabilitySnapshot {
  const navigatorLike = win.navigator as NavigatorWithPerfHints;

  return {
    isDesktop: win.innerWidth > 640,
    prefersReducedMotion: win.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: Boolean(navigatorLike.connection?.saveData),
    effectiveType: navigatorLike.connection?.effectiveType || null,
    deviceMemory: typeof navigatorLike.deviceMemory === "number" ? navigatorLike.deviceMemory : null,
    webglSupported: detectWebGLSupport(win),
  };
}
