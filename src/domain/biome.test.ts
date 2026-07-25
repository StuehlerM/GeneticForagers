import { describe, expect, it } from "vitest";
import {
  BIOME_TYPES,
  type BiomeType,
  classifyBiome,
  getBiomeConfig,
} from "./biome";

describe("biome config", () => {
  it("defines config for every biome type", () => {
    for (const type of BIOME_TYPES) {
      expect(getBiomeConfig(type)).toBeDefined();
    }
  });

  it("makes water impassable and all land biomes passable", () => {
    expect(getBiomeConfig("water").passable).toBe(false);
    const land: BiomeType[] = [
      "desert",
      "grassland",
      "forest",
      "jungle",
      "mountains",
    ];
    for (const type of land) {
      expect(getBiomeConfig(type).passable).toBe(true);
    }
  });

  it("orders food capacity jungle > forest/grassland > desert/mountains > water", () => {
    const food = (t: BiomeType) => getBiomeConfig(t).maxFood;
    expect(food("jungle")).toBeGreaterThan(food("forest"));
    expect(food("forest")).toBeGreaterThanOrEqual(food("grassland"));
    expect(food("grassland")).toBeGreaterThan(food("desert"));
    expect(food("grassland")).toBeGreaterThan(food("mountains"));
    expect(food("water")).toBe(0);
  });
});

describe("classifyBiome", () => {
  it("returns water below the water level regardless of moisture", () => {
    expect(classifyBiome(0.05, 0)).toBe("water");
    expect(classifyBiome(0.05, 1)).toBe("water");
  });

  it("returns mountains above the mountain level regardless of moisture", () => {
    expect(classifyBiome(0.98, 0)).toBe("mountains");
    expect(classifyBiome(0.98, 1)).toBe("mountains");
  });

  it("maps mid elevation from dry->wet as desert -> jungle", () => {
    const mid = 0.5;
    expect(classifyBiome(mid, 0.02)).toBe("desert");
    expect(classifyBiome(mid, 0.98)).toBe("jungle");
  });

  it("always returns a known biome for inputs in [0,1]", () => {
    for (let e = 0; e <= 1.0001; e += 0.1) {
      for (let m = 0; m <= 1.0001; m += 0.1) {
        expect(BIOME_TYPES).toContain(classifyBiome(e, m));
      }
    }
  });
});
