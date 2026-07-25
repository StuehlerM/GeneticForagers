/** All biome kinds present in the world. */
export const BIOME_TYPES = [
  "water",
  "desert",
  "grassland",
  "forest",
  "jungle",
  "mountains",
] as const;

export type BiomeType = (typeof BIOME_TYPES)[number];

export interface BiomeConfig {
  /** Whether agents can occupy tiles of this biome. */
  readonly passable: boolean;
  /** Upper bound of the per-tile food scalar for this biome. */
  readonly maxFood: number;
  /** Food regained per tile per simulation tick. */
  readonly regrowPerTick: number;
}

// Food capacities (arbitrary units) — see PROJECT.md food ordering.
const FOOD_NONE = 0;
const FOOD_MOUNTAINS = 3;
const FOOD_DESERT = 5;
const FOOD_GRASSLAND = 20;
const FOOD_FOREST = 30;
const FOOD_JUNGLE = 50;

// Regrowth per tick, scaled loosely with capacity.
const REGROW_NONE = 0;
const REGROW_MOUNTAINS = 0.005;
const REGROW_DESERT = 0.01;
const REGROW_GRASSLAND = 0.1;
const REGROW_FOREST = 0.12;
const REGROW_JUNGLE = 0.25;

const CONFIG: Readonly<Record<BiomeType, BiomeConfig>> = {
  water: { passable: false, maxFood: FOOD_NONE, regrowPerTick: REGROW_NONE },
  desert: { passable: true, maxFood: FOOD_DESERT, regrowPerTick: REGROW_DESERT },
  grassland: {
    passable: true,
    maxFood: FOOD_GRASSLAND,
    regrowPerTick: REGROW_GRASSLAND,
  },
  forest: { passable: true, maxFood: FOOD_FOREST, regrowPerTick: REGROW_FOREST },
  jungle: { passable: true, maxFood: FOOD_JUNGLE, regrowPerTick: REGROW_JUNGLE },
  mountains: {
    passable: true,
    maxFood: FOOD_MOUNTAINS,
    regrowPerTick: REGROW_MOUNTAINS,
  },
};

// Elevation/moisture thresholds for the Whittaker-style lookup. Inputs are in [0, 1].
const WATER_LEVEL = 0.32;
const MOUNTAIN_LEVEL = 0.82;
const MOISTURE_DESERT_MAX = 0.3;
const MOISTURE_GRASSLAND_MAX = 0.55;
const MOISTURE_FOREST_MAX = 0.78;

export function getBiomeConfig(type: BiomeType): BiomeConfig {
  return CONFIG[type];
}

/**
 * Maps normalized elevation and moisture (both in [0, 1]) to a biome.
 * Low elevation is water, high elevation is mountains; in between, moisture
 * separates desert -> grassland -> forest -> jungle.
 */
export function classifyBiome(elevation: number, moisture: number): BiomeType {
  if (elevation < WATER_LEVEL) {
    return "water";
  }
  if (elevation > MOUNTAIN_LEVEL) {
    return "mountains";
  }
  if (moisture < MOISTURE_DESERT_MAX) {
    return "desert";
  }
  if (moisture < MOISTURE_GRASSLAND_MAX) {
    return "grassland";
  }
  if (moisture < MOISTURE_FOREST_MAX) {
    return "forest";
  }
  return "jungle";
}
