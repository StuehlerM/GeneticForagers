import { describe, expect, it } from "vitest";
import {
  BODY_GENE_COUNT,
  createRandomBody,
  expressBody,
  TRAIT_RANGES,
} from "./body";
import { createRng } from "./rng";

describe("expressBody", () => {
  it("maps all-zero genes to the minimum of every trait", () => {
    const traits = expressBody([0, 0, 0, 0]);
    expect(traits.maxSpeed).toBeCloseTo(TRAIT_RANGES.maxSpeed.min);
    expect(traits.sightRadius).toBeCloseTo(TRAIT_RANGES.sightRadius.min);
    expect(traits.metabolism).toBeCloseTo(TRAIT_RANGES.metabolism.min);
    expect(traits.size).toBeCloseTo(TRAIT_RANGES.size.min);
  });

  it("maps all-one genes to the maximum of every trait", () => {
    const traits = expressBody([1, 1, 1, 1]);
    expect(traits.maxSpeed).toBeCloseTo(TRAIT_RANGES.maxSpeed.max);
    expect(traits.sightRadius).toBeCloseTo(TRAIT_RANGES.sightRadius.max);
    expect(traits.metabolism).toBeCloseTo(TRAIT_RANGES.metabolism.max);
    expect(traits.size).toBeCloseTo(TRAIT_RANGES.size.max);
  });

  it("clamps out-of-range genes into [0, 1]", () => {
    const low = expressBody([-5, -5, -5, -5]);
    const high = expressBody([5, 5, 5, 5]);
    expect(low.maxSpeed).toBeCloseTo(TRAIT_RANGES.maxSpeed.min);
    expect(high.maxSpeed).toBeCloseTo(TRAIT_RANGES.maxSpeed.max);
  });
});

describe("createRandomBody", () => {
  it("produces the expected number of genes, all within [0, 1]", () => {
    const genes = createRandomBody(createRng(1));
    expect(genes).toHaveLength(BODY_GENE_COUNT);
    for (const g of genes) {
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThan(1);
    }
  });

  it("is deterministic for the same seed", () => {
    expect(createRandomBody(createRng(7))).toEqual(createRandomBody(createRng(7)));
  });
});
