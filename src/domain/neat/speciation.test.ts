import { describe, expect, it } from "vitest";
import type { ConnectionGene, NeatGenome } from "./neatGenome";
import { SpeciesRegistry } from "./speciation";

function conn(innovation: number, weight = 0): ConnectionGene {
  return { innovation, from: 0, to: 2, weight, enabled: true };
}

function genome(connections: ConnectionGene[]): NeatGenome {
  return {
    inputs: 1,
    outputs: 1,
    nodes: [
      { id: 0, type: "input" },
      { id: 1, type: "bias" },
      { id: 2, type: "output" },
    ],
    connections,
  };
}

/** Two genomes far apart in innovation space (many disjoint/excess genes). */
const FAMILY_A = [genome([conn(0), conn(1)]), genome([conn(0), conn(1, 0.05)])];
const FAMILY_B = [genome([conn(10), conn(11), conn(12), conn(13)])];

function items(genomes: NeatGenome[], startId = 1) {
  return genomes.map((g, i) => ({ id: startId + i, genome: g, fitness: 1 }));
}

describe("SpeciesRegistry.speciate", () => {
  it("groups near-identical genomes into one species", () => {
    const registry = new SpeciesRegistry(1);
    registry.speciate(items(FAMILY_A));
    expect(registry.count).toBe(1);
  });

  it("splits clearly different genomes into separate species", () => {
    const registry = new SpeciesRegistry(1);
    registry.speciate(items([...FAMILY_A, ...FAMILY_B]));
    expect(registry.count).toBe(2);
  });

  it("assigns every member to exactly one species", () => {
    const registry = new SpeciesRegistry(1);
    const all = items([...FAMILY_A, ...FAMILY_B]);
    registry.speciate(all);
    const assigned = all.map((i) => registry.assignmentOf(i.id));
    expect(assigned.every((s) => s !== undefined)).toBe(true);
    const sizes = registry.list.reduce((sum, s) => sum + s.members.length, 0);
    expect(sizes).toBe(all.length);
  });

  it("drops species that become empty on a later speciation", () => {
    const registry = new SpeciesRegistry(1);
    registry.speciate(items([...FAMILY_A, ...FAMILY_B]));
    expect(registry.count).toBe(2);
    registry.speciate(items(FAMILY_A)); // family B gone
    expect(registry.count).toBe(1);
  });

  it("is deterministic", () => {
    const a = new SpeciesRegistry(1);
    const b = new SpeciesRegistry(1);
    const input = items([...FAMILY_A, ...FAMILY_B]);
    a.speciate(input);
    b.speciate(input);
    expect(a.count).toBe(b.count);
  });
});

describe("SpeciesRegistry.adjustThreshold", () => {
  it("raises the threshold when there are too many species", () => {
    const registry = new SpeciesRegistry(1);
    registry.speciate(items([...FAMILY_A, ...FAMILY_B]));
    const before = registry.threshold;
    registry.adjustThreshold(1); // want fewer species than the 2 present
    expect(registry.threshold).toBeGreaterThan(before);
  });

  it("lowers the threshold when there are too few species, but not below zero", () => {
    const registry = new SpeciesRegistry(0.05);
    registry.speciate(items(FAMILY_A)); // 1 species
    registry.adjustThreshold(5); // want more species
    expect(registry.threshold).toBeLessThan(0.05);
    expect(registry.threshold).toBeGreaterThanOrEqual(0);
  });
});
