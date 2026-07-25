import { describe, expect, it } from "vitest";
import { BODY_GENE_COUNT } from "./body";
import { DEFAULT_TOPOLOGY } from "./brain";
import { createRandomGenome, reproduce } from "./genome";
import { createInnovationTracker } from "./neat/innovation";
import { firstHiddenNodeId } from "./neat/neatGenome";
import { expressNetwork } from "./neat/neatNetwork";
import { createRng } from "./rng";

const T = DEFAULT_TOPOLOGY;

function tracker() {
  return createInnovationTracker(firstHiddenNodeId(T.inputs, T.outputs));
}

function inputs(): number[] {
  return Array.from({ length: T.inputs }, () => 0.1);
}

describe("createRandomGenome", () => {
  it("has a body vector and an expressible minimal brain", () => {
    const g = createRandomGenome(createRng(1), tracker(), T);
    expect(g.body).toHaveLength(BODY_GENE_COUNT);
    expect(g.brain.inputs).toBe(T.inputs);
    expect(g.brain.outputs).toBe(T.outputs);
    expect(g.brain.nodes.some((n) => n.type === "hidden")).toBe(false);
    expect(expressNetwork(g.brain).decide(inputs())).toHaveLength(T.outputs);
  });

  it("is deterministic for the same seed", () => {
    expect(createRandomGenome(createRng(5), tracker(), T)).toEqual(
      createRandomGenome(createRng(5), tracker(), T),
    );
  });
});

describe("reproduce", () => {
  it("produces a valid child genome from two parents", () => {
    const t = tracker();
    const a = createRandomGenome(createRng(1), t, T);
    const b = createRandomGenome(createRng(2), t, T);
    const child = reproduce(createRng(3), t, a, b);
    expect(child.body).toHaveLength(BODY_GENE_COUNT);
    expect(expressNetwork(child.brain).decide(inputs())).toHaveLength(T.outputs);
  });

  it("keeps body genes within [0, 1] under strong mutation", () => {
    const t = tracker();
    const a = createRandomGenome(createRng(1), t, T);
    const b = createRandomGenome(createRng(2), t, T);
    const child = reproduce(createRng(3), t, a, b, 1, 1, 1, 5);
    for (const gene of child.body) {
      expect(gene).toBeGreaterThanOrEqual(0);
      expect(gene).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic and does not mutate parents", () => {
    const t1 = tracker();
    const a1 = createRandomGenome(createRng(1), t1, T);
    const b1 = createRandomGenome(createRng(2), t1, T);
    const snapshot = JSON.stringify(a1);
    const t2 = tracker();
    const a2 = createRandomGenome(createRng(1), t2, T);
    const b2 = createRandomGenome(createRng(2), t2, T);
    expect(reproduce(createRng(9), t1, a1, b1)).toEqual(reproduce(createRng(9), t2, a2, b2));
    expect(JSON.stringify(a1)).toBe(snapshot);
  });
});
