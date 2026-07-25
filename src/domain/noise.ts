import { createRng } from "./rng";

/** A 2D scalar field sampler returning values in [-1, 1]. */
export type Noise2D = (x: number, y: number) => number;

const PERMUTATION_SIZE = 256;
const PERMUTATION_MASK = PERMUTATION_SIZE - 1;

/**
 * Classic Perlin gradient noise in 2D, seeded for deterministic worlds.
 *
 * Properties relied upon elsewhere: deterministic per seed, smooth/continuous,
 * range [-1, 1], and exactly 0 at integer lattice points.
 */
export function createPerlinNoise2D(seed: number): Noise2D {
  const perm = buildPermutation(seed);

  return (x: number, y: number): number => {
    const xi = Math.floor(x) & PERMUTATION_MASK;
    const yi = Math.floor(y) & PERMUTATION_MASK;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const permX0 = perm[xi] as number;
    const permX1 = perm[xi + 1] as number;
    const aa = perm[permX0 + yi] as number;
    const ab = perm[permX0 + yi + 1] as number;
    const ba = perm[permX1 + yi] as number;
    const bb = perm[permX1 + yi + 1] as number;

    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);

    return lerp(x1, x2, v);
  };
}

/** Builds a doubled, seed-shuffled permutation table of gradient indices. */
function buildPermutation(seed: number): number[] {
  const rng = createRng(seed);
  const base = Array.from({ length: PERMUTATION_SIZE }, (_, i) => i);

  for (let i = PERMUTATION_SIZE - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = base[i] as number;
    base[i] = base[j] as number;
    base[j] = tmp;
  }

  // Duplicate so index math never overflows the table.
  return [...base, ...base];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/** Maps a hash to one of four unit gradient directions and dots it with (x, y). */
function grad(hash: number, x: number, y: number): number {
  switch (hash & 3) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    default:
      return -x - y;
  }
}
