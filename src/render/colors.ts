import { BIOME_TYPES, type BiomeType } from "../domain/biome";

export type Rgb = readonly [number, number, number];

const BIOME_RGB: Record<BiomeType, Rgb> = {
  water: [40, 90, 160],
  desert: [200, 180, 120],
  grassland: [110, 170, 80],
  forest: [50, 110, 60],
  jungle: [28, 90, 42],
  mountains: [120, 120, 120],
};

/** Colour that a fully grown food tile blends toward. */
export const FOOD_RGB: Rgb = [150, 230, 100];
export const FORAGER_RGB: Rgb = [235, 80, 80];

/** How strongly a full-food tile is tinted toward {@link FOOD_RGB}. */
const MAX_FOOD_TINT = 0.55;

export function biomeRgb(biome: BiomeType): Rgb {
  return BIOME_RGB[biome];
}

export function rgbToCss(rgb: Rgb): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** Blends a biome's base colour toward the food colour by a 0..1 fill ratio. */
export function tileColor(biome: BiomeType, foodRatio: number): string {
  const base = BIOME_RGB[biome];
  const t = Math.min(1, Math.max(0, foodRatio)) * MAX_FOOD_TINT;
  return rgbToCss([
    Math.round(base[0] + (FOOD_RGB[0] - base[0]) * t),
    Math.round(base[1] + (FOOD_RGB[1] - base[1]) * t),
    Math.round(base[2] + (FOOD_RGB[2] - base[2]) * t),
  ]);
}

export { BIOME_TYPES };
