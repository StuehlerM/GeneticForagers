import { describe, expect, it } from "vitest";
import { DEFAULT_ENVIRONMENT, environmentAt } from "./environment";

const CFG = DEFAULT_ENVIRONMENT;

describe("environmentAt", () => {
  it("keeps light, regrow and sight multipliers within their bounds", () => {
    for (let tick = 0; tick < CFG.seasonLength; tick += 37) {
      const env = environmentAt(tick, CFG);
      expect(env.light).toBeGreaterThanOrEqual(0);
      expect(env.light).toBeLessThanOrEqual(1);
      expect(env.regrowMultiplier).toBeGreaterThanOrEqual(CFG.minRegrow);
      expect(env.regrowMultiplier).toBeLessThanOrEqual(CFG.maxRegrow);
      expect(env.sightMultiplier).toBeGreaterThanOrEqual(CFG.minSight);
      expect(env.sightMultiplier).toBeLessThanOrEqual(1);
    }
  });

  it("is periodic over a day for the light level", () => {
    const a = environmentAt(123, CFG).light;
    const b = environmentAt(123 + CFG.dayLength, CFG).light;
    expect(b).toBeCloseTo(a);
  });

  it("flags day when light is at least half and is deterministic", () => {
    const env = environmentAt(200, CFG);
    expect(env.isDay).toBe(env.light >= 0.5);
    expect(environmentAt(200, CFG)).toEqual(env);
  });

  it("dims sight at night relative to midday", () => {
    let brightest = 0;
    let darkest = 1;
    for (let tick = 0; tick < CFG.dayLength; tick += 5) {
      const s = environmentAt(tick, CFG).sightMultiplier;
      brightest = Math.max(brightest, s);
      darkest = Math.min(darkest, s);
    }
    expect(brightest).toBeGreaterThan(darkest);
  });
});
