import { describe, expect, it } from "vitest";
import { BIOME_TYPES } from "../domain/biome";
import { biomeRgb, rgbToCss, tileColor } from "./colors";

describe("colors", () => {
  it("defines an RGB triple in range for every biome", () => {
    for (const biome of BIOME_TYPES) {
      const rgb = biomeRgb(biome);
      expect(rgb).toHaveLength(3);
      for (const channel of rgb) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("formats an rgb() css string", () => {
    expect(rgbToCss([10, 20, 30])).toBe("rgb(10, 20, 30)");
  });

  it("tints toward the food colour as the food ratio rises", () => {
    const empty = tileColor("grassland", 0);
    const full = tileColor("grassland", 1);
    expect(empty).toBe(rgbToCss(biomeRgb("grassland")));
    expect(full).not.toBe(empty);
  });
});
