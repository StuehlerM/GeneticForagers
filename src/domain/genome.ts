import { type BodyGenome, createRandomBody } from "./body";
import { createRandomBrainWeights, type Topology } from "./brain";
import type { Rng } from "./rng";

/** An agent's full heritable genome: body traits plus brain weights. */
export interface Genome {
  readonly body: BodyGenome;
  readonly brainWeights: number[];
}

export const WEIGHT_CLAMP = 4;
export const DEFAULT_MUTATION_RATE = 0.1;
export const DEFAULT_MUTATION_STRENGTH = 0.3;

const CROSSOVER_PROBABILITY = 0.5;

export function createRandomGenome(rng: Rng, topology: Topology): Genome {
  return {
    body: createRandomBody(rng),
    brainWeights: createRandomBrainWeights(rng, topology),
  };
}

/** Uniform crossover: each gene is inherited from parent A or B at random. */
export function crossover(rng: Rng, a: Genome, b: Genome): Genome {
  return {
    body: pickGenes(rng, a.body, b.body),
    brainWeights: pickGenes(rng, a.brainWeights, b.brainWeights),
  };
}

/**
 * Returns a mutated copy of the genome. Each gene is perturbed with probability
 * `rate` by a value in [-strength, strength]. Body genes are clamped to [0, 1];
 * brain weights to [-WEIGHT_CLAMP, WEIGHT_CLAMP]. The input is not modified.
 */
export function mutate(
  rng: Rng,
  genome: Genome,
  rate: number,
  strength: number,
): Genome {
  return {
    body: genome.body.map((g) => mutateGene(rng, g, rate, strength, 0, 1)),
    brainWeights: genome.brainWeights.map((w) =>
      mutateGene(rng, w, rate, strength, -WEIGHT_CLAMP, WEIGHT_CLAMP),
    ),
  };
}

/** Crossover followed by mutation, using the default mutation parameters. */
export function reproduce(
  rng: Rng,
  a: Genome,
  b: Genome,
  rate: number = DEFAULT_MUTATION_RATE,
  strength: number = DEFAULT_MUTATION_STRENGTH,
): Genome {
  return mutate(rng, crossover(rng, a, b), rate, strength);
}

function pickGenes(rng: Rng, a: readonly number[], b: readonly number[]): number[] {
  return a.map((gene, i) =>
    rng.next() < CROSSOVER_PROBABILITY ? gene : (b[i] as number),
  );
}

function mutateGene(
  rng: Rng,
  gene: number,
  rate: number,
  strength: number,
  min: number,
  max: number,
): number {
  if (rng.next() >= rate) {
    return gene;
  }
  const perturbed = gene + rng.range(-strength, strength);
  return Math.min(max, Math.max(min, perturbed));
}
