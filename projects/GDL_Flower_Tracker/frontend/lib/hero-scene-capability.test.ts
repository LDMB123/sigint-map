import { describe, expect, it } from "vitest";

import { canLoadHeroScene } from "@/lib/hero-scene-capability";

const BASELINE = {
  isDesktop: true,
  prefersReducedMotion: false,
  saveData: false,
  effectiveType: null,
  deviceMemory: null,
} as const;

describe("hero scene capability", () => {
  it("allows capable desktop devices", () => {
    expect(canLoadHeroScene(BASELINE)).toBe(true);
  });

  it("blocks mobile, reduced motion, save-data, slow connections, and low-memory devices", () => {
    expect(canLoadHeroScene({ ...BASELINE, isDesktop: false })).toBe(false);
    expect(canLoadHeroScene({ ...BASELINE, prefersReducedMotion: true })).toBe(false);
    expect(canLoadHeroScene({ ...BASELINE, saveData: true })).toBe(false);
    expect(canLoadHeroScene({ ...BASELINE, effectiveType: "3g" })).toBe(false);
    expect(canLoadHeroScene({ ...BASELINE, effectiveType: "slow-2g" })).toBe(false);
    expect(canLoadHeroScene({ ...BASELINE, deviceMemory: 2 })).toBe(false);
  });
});
