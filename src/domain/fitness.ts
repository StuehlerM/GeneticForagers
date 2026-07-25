import type { Forager } from "./forager";
import type { Rng } from "./rng";

export interface FitnessWeights {
  /** Multiplier on total food eaten. */
  readonly foodWeight: number;
  /** Multiplier on number of offspring parented. */
  readonly offspringWeight: number;
}

/**
 * Age dominates (survival time is the primary signal, per ADR 0001); the food
 * and offspring bonuses are small nudges toward actually foraging and breeding.
 */
export const DEFAULT_FITNESS_WEIGHTS: FitnessWeights = {
  foodWeight: 0.1,
  offspringWeight: 5,
};

/** How well a forager has done: survival age plus small food/offspring bonuses. */
export function fitness(forager: Forager, weights: FitnessWeights): number {
  return (
    forager.agent.age +
    weights.foodWeight * forager.foodEaten +
    weights.offspringWeight * forager.offspring
  );
}

/**
 * Fitness-proportional (roulette) choice from a non-empty list. Falls back to a
 * uniform pick when all weights are non-positive so selection never stalls.
 */
export function rouletteSelect<T>(
  rng: Rng,
  items: readonly T[],
  weightOf: (item: T) => number,
): T {
  if (items.length === 0) {
    throw new Error("rouletteSelect: no items to choose from");
  }
  const weights = items.map((item) => Math.max(0, weightOf(item)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return rng.pick(items as T[]);
  }
  let threshold = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i] as number;
    if (threshold < 0) {
      return items[i] as T;
    }
  }
  return items[items.length - 1] as T;
}
