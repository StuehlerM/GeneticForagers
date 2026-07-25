import { describe, expect, it } from "vitest";
import { toroidalDelta } from "./torus";

const SIZE = 10;

describe("toroidalDelta", () => {
  it("matches the raw delta when it does not cross the seam", () => {
    expect(toroidalDelta(2, 5, SIZE)).toBe(3);
    expect(toroidalDelta(5, 2, SIZE)).toBe(-3);
  });

  it("takes the short way around the seam", () => {
    expect(toroidalDelta(1, 9, SIZE)).toBe(-2);
    expect(toroidalDelta(9, 1, SIZE)).toBe(2);
  });

  it("returns 0 for the same coordinate", () => {
    expect(toroidalDelta(4, 4, SIZE)).toBe(0);
  });

  it("stays within [-size/2, size/2)", () => {
    for (let a = 0; a < SIZE; a++) {
      for (let b = 0; b < SIZE; b++) {
        const delta = toroidalDelta(a, b, SIZE);
        expect(delta).toBeGreaterThanOrEqual(-SIZE / 2);
        expect(delta).toBeLessThan(SIZE / 2);
      }
    }
  });
});
