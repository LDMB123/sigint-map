"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import {
  canLoadHeroScene,
  getNavigatorConnection,
  readHeroSceneCapability,
} from "@/lib/hero-scene-capability";
import { useDeferredActivation } from "@/lib/use-deferred-activation";

const LazyHeroScene = dynamic(() => import("@/components/hero-scene").then((module) => module.HeroScene), {
  ssr: false,
  loading: () => null,
});

export function HeroSceneShell({ active }: { active: boolean }) {
  const [eligible, setEligible] = useState(false);
  const [hasLoadedScene, setHasLoadedScene] = useState(false);
  const { activated, ref } = useDeferredActivation<HTMLDivElement>({
    enabled: eligible && active && !hasLoadedScene,
    minimumDelayMs: 900,
    mode: "visible-after-idle",
    rootMargin: "0px",
  });

  useEffect(() => {
    if (activated) {
      setHasLoadedScene(true);
    }
  }, [activated]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = getNavigatorConnection(window.navigator);

    const updateEligibility = () => {
      setEligible(canLoadHeroScene(readHeroSceneCapability(window)));
    };

    updateEligibility();
    window.addEventListener("resize", updateEligibility);
    media.addEventListener("change", updateEligibility);
    connection?.addEventListener?.("change", updateEligibility);

    return () => {
      window.removeEventListener("resize", updateEligibility);
      media.removeEventListener("change", updateEligibility);
      connection?.removeEventListener?.("change", updateEligibility);
    };
  }, []);

  return (
    <div ref={ref} className="hero-scene-shell" aria-hidden="true">
      <div className="hero-fallback" data-testid="hero-scene-fallback" />
      {(activated || hasLoadedScene) && eligible ? <LazyHeroScene active={active} /> : null}
    </div>
  );
}
