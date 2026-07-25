import type { Rng } from "../rng";
import {
  cloneGenome,
  INITIAL_WEIGHT_RANGE,
  type NeatGenome,
} from "./neatGenome";

/** Maximum absolute connection weight; perturbations are clamped to it. */
export const NEAT_WEIGHT_CLAMP = 4;

export interface WeightMutationParams {
  /** Probability each connection's weight is touched. */
  readonly rate: number;
  /** Given a touch, probability of a full random replace (vs. small perturb). */
  readonly replaceProbability: number;
  /** Half-range of a perturbation step. */
  readonly perturbStrength: number;
}

export const DEFAULT_WEIGHT_MUTATION: WeightMutationParams = {
  rate: 0.8,
  replaceProbability: 0.1,
  perturbStrength: 0.5,
};

/**
 * Returns a copy of the genome with connection weights mutated: each weight is,
 * with probability `rate`, either replaced by a fresh random value or nudged by
 * a small perturbation, then clamped. Nodes and topology are untouched.
 */
export function mutateWeights(
  rng: Rng,
  genome: NeatGenome,
  params: Partial<WeightMutationParams> = {},
): NeatGenome {
  const { rate, replaceProbability, perturbStrength } = {
    ...DEFAULT_WEIGHT_MUTATION,
    ...params,
  };
  const copy = cloneGenome(genome);
  for (const conn of copy.connections) {
    if (rng.next() >= rate) {
      continue;
    }
    conn.weight =
      rng.next() < replaceProbability
        ? rng.range(-INITIAL_WEIGHT_RANGE, INITIAL_WEIGHT_RANGE)
        : clampWeight(conn.weight + rng.range(-perturbStrength, perturbStrength));
  }
  return copy;
}

function clampWeight(weight: number): number {
  return Math.min(NEAT_WEIGHT_CLAMP, Math.max(-NEAT_WEIGHT_CLAMP, weight));
}
