import type { ConnectionGene, NeatGenome } from "./neatGenome";

export interface CompatibilityCoefficients {
  readonly excess: number;
  readonly disjoint: number;
  readonly weight: number;
}

/** Stanley's defaults: excess and disjoint weighted equally, weights softer. */
export const DEFAULT_COMPAT_COEFFICIENTS: CompatibilityCoefficients = {
  excess: 1,
  disjoint: 1,
  weight: 0.4,
};

/** Below this gene count, the size normaliser N is pinned to 1 (classic NEAT). */
const SMALL_GENOME_THRESHOLD = 20;

/**
 * NEAT compatibility distance `c1*E/N + c2*D/N + c3*W̄`, where E/D are excess and
 * disjoint gene counts, W̄ the mean weight difference of matching genes, and N the
 * larger genome's gene count (pinned to 1 for small genomes). Used by Milestone C
 * speciation; symmetric in its arguments.
 */
export function compatibilityDistance(
  a: NeatGenome,
  b: NeatGenome,
  coefficients: CompatibilityCoefficients = DEFAULT_COMPAT_COEFFICIENTS,
): number {
  const aByInnovation = byInnovation(a);
  const bByInnovation = byInnovation(b);
  const maxA = maxInnovation(a);
  const maxB = maxInnovation(b);

  let excess = 0;
  let disjoint = 0;
  let matching = 0;
  let weightDiffSum = 0;

  for (const innovation of new Set([...aByInnovation.keys(), ...bByInnovation.keys()])) {
    const geneA = aByInnovation.get(innovation);
    const geneB = bByInnovation.get(innovation);
    if (geneA && geneB) {
      matching += 1;
      weightDiffSum += Math.abs(geneA.weight - geneB.weight);
    } else if (innovation > Math.min(maxA, maxB)) {
      excess += 1;
    } else {
      disjoint += 1;
    }
  }

  const size = Math.max(a.connections.length, b.connections.length);
  const n = size < SMALL_GENOME_THRESHOLD ? 1 : size;
  const meanWeightDiff = matching === 0 ? 0 : weightDiffSum / matching;

  return (
    (coefficients.excess * excess) / n +
    (coefficients.disjoint * disjoint) / n +
    coefficients.weight * meanWeightDiff
  );
}

function byInnovation(genome: NeatGenome): Map<number, ConnectionGene> {
  return new Map(genome.connections.map((c) => [c.innovation, c]));
}

function maxInnovation(genome: NeatGenome): number {
  return genome.connections.reduce((max, c) => Math.max(max, c.innovation), -1);
}
