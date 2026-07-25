import { describe, expect, it } from "vitest";
import { createPerlinNoise2D } from "./noise";

describe("createPerlinNoise2D", () => {
  it("is deterministic for the same seed", () => {
    const a = createPerlinNoise2D(2024);
    const b = createPerlinNoise2D(2024);
    for (let i = 0; i < 20; i++) {
      const x = i * 0.37;
      const y = i * 0.91;
      expect(a(x, y)).toBe(b(x, y));
    }
  });

  it("produces different fields for different seeds", () => {
    const a = createPerlinNoise2D(1);
    const b = createPerlinNoise2D(2);
    const sampleA = Array.from({ length: 20 }, (_, i) => a(i * 0.33, i * 0.77));
    const sampleB = Array.from({ length: 20 }, (_, i) => b(i * 0.33, i * 0.77));
    expect(sampleA).not.toEqual(sampleB);
  });

  it("returns values within [-1, 1]", () => {
    const noise = createPerlinNoise2D(7);
    for (let i = 0; i < 500; i++) {
      const v = noise(i * 0.13, i * 0.29);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("is zero at integer lattice points (Perlin property)", () => {
    const noise = createPerlinNoise2D(42);
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        expect(Math.abs(noise(x, y))).toBeLessThan(1e-9);
      }
    }
  });

  it("is continuous: nearby samples change only slightly", () => {
    const noise = createPerlinNoise2D(99);
    const step = 0.01;
    for (let i = 0; i < 100; i++) {
      const x = i * 0.05 + 0.123;
      const y = i * 0.07 + 0.456;
      expect(Math.abs(noise(x, y) - noise(x + step, y))).toBeLessThan(0.1);
    }
  });
});
