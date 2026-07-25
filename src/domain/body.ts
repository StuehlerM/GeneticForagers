import type { Rng } from "./rng";

export const BODY_GENE_COUNT = 4;

const GENE_MAX_SPEED = 0;
const GENE_SIGHT_RADIUS = 1;
const GENE_METABOLISM = 2;
const GENE_SIZE = 3;

export interface TraitRange {
  readonly min: number;
  readonly max: number;
}

/** Value ranges each normalized gene (0..1) is mapped into. */
export const TRAIT_RANGES = {
  maxSpeed: { min: 0.5, max: 2.5 },
  sightRadius: { min: 3, max: 12 },
  metabolism: { min: 0.6, max: 1.6 },
  size: { min: 0.5, max: 1.5 },
} as const satisfies Record<string, TraitRange>;

export interface BodyTraits {
  readonly maxSpeed: number;
  readonly sightRadius: number;
  readonly metabolism: number;
  readonly size: number;
}

/** A body genome: a fixed-length vector of genes, each in [0, 1]. */
export type BodyGenome = number[];

export function createRandomBody(rng: Rng): BodyGenome {
  return Array.from({ length: BODY_GENE_COUNT }, () => rng.next());
}

/** Expresses a body genome into concrete trait values (genes clamped to [0,1]). */
export function expressBody(genes: BodyGenome): BodyTraits {
  return {
    maxSpeed: mapGene(genes[GENE_MAX_SPEED], TRAIT_RANGES.maxSpeed),
    sightRadius: mapGene(genes[GENE_SIGHT_RADIUS], TRAIT_RANGES.sightRadius),
    metabolism: mapGene(genes[GENE_METABOLISM], TRAIT_RANGES.metabolism),
    size: mapGene(genes[GENE_SIZE], TRAIT_RANGES.size),
  };
}

function mapGene(gene: number | undefined, range: TraitRange): number {
  const clamped = Math.min(1, Math.max(0, gene ?? 0));
  return range.min + clamped * (range.max - range.min);
}
