import { type BiomeType, classifyBiome, getBiomeConfig } from "./biome";
import { createPerlinNoise2D, type Noise2D } from "./noise";

export interface Tile {
  biome: BiomeType;
  /** Current plant food scalar, in [0, biome.maxFood]. */
  food: number;
}

export interface WorldOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** Spatial frequency of the terrain noise; larger = smaller features. */
  readonly noiseScale?: number;
  /** Number of fractal noise octaves layered for detail. */
  readonly octaves?: number;
}

const DEFAULT_NOISE_SCALE = 0.06;
const DEFAULT_OCTAVES = 4;
const FBM_PERSISTENCE = 0.5;
const FBM_LACUNARITY = 2;
const MOISTURE_SEED_OFFSET = 0x9e3779b9;

/**
 * The tile grid the simulation runs on. Holds biome + food per tile and offers
 * the queries (tileAt/isPassable) and commands (regrow/consumeFood) the sim needs.
 */
export class World {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];

  constructor(width: number, height: number, tiles: Tile[]) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Wraps a horizontal coordinate into [0, width) (the world is a torus). */
  wrapX(x: number): number {
    return ((x % this.width) + this.width) % this.width;
  }

  /** Wraps a vertical coordinate into [0, height). */
  wrapY(y: number): number {
    return ((y % this.height) + this.height) % this.height;
  }

  /** Wraps an (x, y) pair onto the torus. Single source of truth for wrapping. */
  wrap(x: number, y: number): { x: number; y: number } {
    return { x: this.wrapX(x), y: this.wrapY(y) };
  }

  tileAt(x: number, y: number): Tile {
    const wx = this.wrapX(x);
    const wy = this.wrapY(y);
    return this.tiles[wy * this.width + wx] as Tile;
  }

  isPassable(x: number, y: number): boolean {
    return getBiomeConfig(this.tileAt(x, y).biome).passable;
  }

  /**
   * Advances plant growth on every tile by one tick, capped per biome. The
   * optional `multiplier` scales growth (e.g. seasonal fertility).
   */
  regrow(multiplier = 1): void {
    for (const tile of this.tiles) {
      const config = getBiomeConfig(tile.biome);
      if (config.regrowPerTick <= 0) {
        continue;
      }
      tile.food = Math.min(config.maxFood, tile.food + config.regrowPerTick * multiplier);
    }
  }

  /** Eats up to `amount` food at a tile; returns the amount actually eaten. */
  consumeFood(x: number, y: number, amount: number): number {
    const tile = this.tileAt(x, y);
    const eaten = Math.min(tile.food, Math.max(0, amount));
    tile.food -= eaten;
    return eaten;
  }
}

/** Builds a deterministic world from a seed using fractal Perlin terrain. */
export function generateWorld(options: WorldOptions): World {
  const { seed, width, height } = options;
  const noiseScale = options.noiseScale ?? DEFAULT_NOISE_SCALE;
  const octaves = options.octaves ?? DEFAULT_OCTAVES;

  const elevationNoise = createPerlinNoise2D(seed);
  const moistureNoise = createPerlinNoise2D((seed ^ MOISTURE_SEED_OFFSET) >>> 0);

  const tiles: Tile[] = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elevation = normalizedFbm(elevationNoise, x, y, noiseScale, octaves);
      const moisture = normalizedFbm(moistureNoise, x, y, noiseScale, octaves);
      const biome = classifyBiome(elevation, moisture);
      tiles[y * width + x] = { biome, food: getBiomeConfig(biome).maxFood };
    }
  }

  return new World(width, height, tiles);
}

/** Fractal Brownian motion over a noise field, normalized to [0, 1]. */
function normalizedFbm(
  noise: Noise2D,
  x: number,
  y: number,
  scale: number,
  octaves: number,
): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * scale * frequency, y * scale * frequency);
    maxAmplitude += amplitude;
    amplitude *= FBM_PERSISTENCE;
    frequency *= FBM_LACUNARITY;
  }

  return (sum / maxAmplitude + 1) / 2;
}
