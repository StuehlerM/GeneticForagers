import { type BodyGenome, createRandomBody } from "./body";
import type { Topology } from "./brain";
import type { InnovationTracker } from "./neat/innovation";
import { createMinimalGenome, type NeatGenome } from "./neat/neatGenome";
import { type NeatMutationParams, neatOffspring } from "./neat/neatReproduce";
import type { Rng } from "./rng";

/** An agent's full heritable genome: body traits plus a NEAT brain genome. */
export interface Genome {
  readonly body: BodyGenome;
  readonly brain: NeatGenome;
}

export const DEFAULT_MUTATION_RATE = 0.1;
export const DEFAULT_MUTATION_STRENGTH = 0.3;

const BODY_GENE_MIN = 0;
const BODY_GENE_MAX = 1;
const CROSSOVER_PROBABILITY = 0.5;

/** Builds a fresh genome: random body plus a minimal (hidden-less) NEAT brain. */
export function createRandomGenome(
  rng: Rng,
  tracker: InnovationTracker,
  topology: Topology,
): Genome {
  return {
    body: createRandomBody(rng),
    brain: createMinimalGenome(rng, tracker, topology.inputs, topology.outputs),
  };
}

/**
 * Crossover + mutation of two parents. The body uses uniform crossover + jitter;
 * the brain uses innovation-aligned NEAT crossover + structural/weight mutation,
 * biased toward the fitter parent. Parents are not modified.
 */
export function reproduce(
  rng: Rng,
  tracker: InnovationTracker,
  a: Genome,
  b: Genome,
  fitnessA = 1,
  fitnessB = 1,
  rate: number = DEFAULT_MUTATION_RATE,
  strength: number = DEFAULT_MUTATION_STRENGTH,
  brainParams: NeatMutationParams = {},
): Genome {
  return {
    body: mutateBody(rng, crossoverBody(rng, a.body, b.body), rate, strength),
    brain: neatOffspring(rng, tracker, a.brain, fitnessA, b.brain, fitnessB, brainParams),
  };
}

function crossoverBody(rng: Rng, a: BodyGenome, b: BodyGenome): BodyGenome {
  return a.map((gene, i) =>
    rng.next() < CROSSOVER_PROBABILITY ? gene : (b[i] as number),
  );
}

function mutateBody(
  rng: Rng,
  body: BodyGenome,
  rate: number,
  strength: number,
): BodyGenome {
  return body.map((gene) => {
    if (rng.next() >= rate) {
      return gene;
    }
    const perturbed = gene + rng.range(-strength, strength);
    return Math.min(BODY_GENE_MAX, Math.max(BODY_GENE_MIN, perturbed));
  });
}
