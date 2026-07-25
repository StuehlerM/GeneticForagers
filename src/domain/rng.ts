/**
 * Deterministic, seedable pseudo-random number generator.
 *
 * The whole simulation draws randomness from an injected `Rng` so that runs are
 * reproducible (same seed -> same world and behaviour) and unit-testable.
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Uniformly picks one element; throws on an empty array. */
  pick<T>(items: readonly T[]): T;
}

const UINT32_RANGE = 0x100000000; // 2^32
const HASH_MULTIPLIER = 0x6d2b79f5;
const MIX_SHIFT_A = 15;
const MIX_SHIFT_B = 7;
const MIX_SHIFT_C = 14;

/** Creates an `Rng` from a numeric seed using the mulberry32 algorithm. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + HASH_MULTIPLIER) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> MIX_SHIFT_A), t | 1);
    t ^= t + Math.imul(t ^ (t >>> MIX_SHIFT_B), t | MIX_SHIFT_C);
    return ((t ^ (t >>> MIX_SHIFT_C)) >>> 0) / UINT32_RANGE;
  };

  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);

  const range = (min: number, max: number): number => min + next() * (max - min);

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error("Rng.pick: cannot pick from an empty array");
    }
    return items[int(items.length)] as T;
  };

  return { next, int, range, pick };
}
