import {
  type CompatibilityCoefficients,
  compatibilityDistance,
  DEFAULT_COMPAT_COEFFICIENTS,
} from "./neatDistance";
import type { NeatGenome } from "./neatGenome";

/** How much the compatibility threshold moves per adjustment. */
export const DEFAULT_THRESHOLD_STEP = 0.3;

/** Anything with a genome and fitness can be speciated (foragers, in practice). */
export interface Speciatable {
  readonly id: number;
  readonly genome: NeatGenome;
  readonly fitness: number;
}

export interface Species {
  readonly id: number;
  /** Stable genome that defines this species; members compare against it. */
  readonly representative: NeatGenome;
  members: Speciatable[];
}

/**
 * Groups a population into NEAT species by compatibility distance and maintains a
 * dynamic threshold. Representatives persist across ticks so species keep their
 * identity; species left empty after a re-speciation are removed.
 */
export class SpeciesRegistry {
  private speciesList: Species[] = [];
  private nextId = 1;
  private compatThreshold: number;

  constructor(
    threshold: number,
    private readonly coefficients: CompatibilityCoefficients = DEFAULT_COMPAT_COEFFICIENTS,
    private readonly thresholdStep: number = DEFAULT_THRESHOLD_STEP,
  ) {
    this.compatThreshold = threshold;
  }

  get threshold(): number {
    return this.compatThreshold;
  }

  get count(): number {
    return this.speciesList.length;
  }

  get list(): readonly Species[] {
    return this.speciesList;
  }

  /** Species id currently assigned to a member, or undefined if not present. */
  assignmentOf(memberId: number): number | undefined {
    for (const species of this.speciesList) {
      if (species.members.some((m) => m.id === memberId)) {
        return species.id;
      }
    }
    return undefined;
  }

  /** Re-buckets every item into a species, creating/removing species as needed. */
  speciate(items: readonly Speciatable[]): void {
    for (const species of this.speciesList) {
      species.members = [];
    }
    for (const item of items) {
      const home = this.findSpecies(item.genome) ?? this.createSpecies(item.genome);
      home.members.push(item);
    }
    this.speciesList = this.speciesList.filter((s) => s.members.length > 0);
  }

  /** Nudges the threshold toward hitting `targetSpecies` next time. */
  adjustThreshold(targetSpecies: number): void {
    if (this.count > targetSpecies) {
      this.compatThreshold += this.thresholdStep;
    } else if (this.count < targetSpecies) {
      this.compatThreshold = Math.max(0, this.compatThreshold - this.thresholdStep);
    }
  }

  private findSpecies(genome: NeatGenome): Species | undefined {
    return this.speciesList.find(
      (s) =>
        compatibilityDistance(genome, s.representative, this.coefficients) <
        this.compatThreshold,
    );
  }

  private createSpecies(representative: NeatGenome): Species {
    const species: Species = { id: this.nextId++, representative, members: [] };
    this.speciesList.push(species);
    return species;
  }
}
