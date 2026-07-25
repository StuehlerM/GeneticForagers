import { BODY_GENE_COUNT } from "./body";
import { DEFAULT_TOPOLOGY, weightCount } from "./brain";
import {
  createRandomGenome,
  crossover,
  type Genome,
  mutate,
  reproduce,
  WEIGHT_CLAMP,
} from "./genome";
import { createRng } from "./rng";
import { describe, expect, it } from "vitest";

const T = DEFAULT_TOPOLOGY;

describe("createRandomGenome", () => {
  it("has body and brain vectors of the expected lengths", () => {
    const g = createRandomGenome(createRng(1), T);
    expect(g.body).toHaveLength(BODY_GENE_COUNT);
    expect(g.brainWeights).toHaveLength(weightCount(T));
  });

  it("is deterministic for the same seed", () => {
    expect(createRandomGenome(createRng(5), T)).toEqual(
      createRandomGenome(createRng(5), T),
    );
  });
});

describe("crossover", () => {
  it("takes every gene from one parent or the other", () => {
    const a: Genome = { body: [0, 0, 0, 0], brainWeights: [0, 0, 0] };
    const b: Genome = { body: [1, 1, 1, 1], brainWeights: [1, 1, 1] };
    const child = crossover(createRng(3), a, b);
    for (const g of [...child.body, ...child.brainWeights]) {
      expect([0, 1]).toContain(g);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = createRandomGenome(createRng(1), T);
    const b = createRandomGenome(createRng(2), T);
    expect(crossover(createRng(9), a, b)).toEqual(crossover(createRng(9), a, b));
  });
});

describe("mutate", () => {
  it("leaves the genome unchanged when the rate is zero", () => {
    const g = createRandomGenome(createRng(1), T);
    expect(mutate(createRng(1), g, 0, 0.3)).toEqual(g);
  });

  it("changes genes when the rate is one", () => {
    const g = createRandomGenome(createRng(1), T);
    expect(mutate(createRng(1), g, 1, 0.3)).not.toEqual(g);
  });

  it("keeps body genes within [0, 1]", () => {
    const g: Genome = { body: [0, 1, 0, 1], brainWeights: [0] };
    const mutated = mutate(createRng(4), g, 1, 5);
    for (const gene of mutated.body) {
      expect(gene).toBeGreaterThanOrEqual(0);
      expect(gene).toBeLessThanOrEqual(1);
    }
  });

  it("clamps brain weights within the allowed range", () => {
    const g: Genome = { body: [0], brainWeights: [WEIGHT_CLAMP, -WEIGHT_CLAMP] };
    const mutated = mutate(createRng(4), g, 1, 100);
    for (const w of mutated.brainWeights) {
      expect(Math.abs(w)).toBeLessThanOrEqual(WEIGHT_CLAMP);
    }
  });

  it("does not mutate the original genome", () => {
    const g = createRandomGenome(createRng(1), T);
    const copy: Genome = {
      body: [...g.body],
      brainWeights: [...g.brainWeights],
    };
    mutate(createRng(1), g, 1, 0.3);
    expect(g).toEqual(copy);
  });
});

describe("reproduce", () => {
  it("produces a valid child genome from two parents", () => {
    const a = createRandomGenome(createRng(1), T);
    const b = createRandomGenome(createRng(2), T);
    const child = reproduce(createRng(3), a, b);
    expect(child.body).toHaveLength(BODY_GENE_COUNT);
    expect(child.brainWeights).toHaveLength(weightCount(T));
  });
});
