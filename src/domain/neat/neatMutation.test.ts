import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { createInnovationTracker } from "./innovation";
import { createMinimalGenome, firstHiddenNodeId } from "./neatGenome";
import { mutateWeights, NEAT_WEIGHT_CLAMP } from "./neatMutation";

const INPUTS = 3;
const OUTPUTS = 2;

function minimal(seed = 1) {
  const tracker = createInnovationTracker(firstHiddenNodeId(INPUTS, OUTPUTS));
  return createMinimalGenome(createRng(seed), tracker, INPUTS, OUTPUTS);
}

describe("mutateWeights", () => {
  it("is deterministic for the same seed", () => {
    const g = minimal();
    const a = mutateWeights(createRng(9), g);
    const b = mutateWeights(createRng(9), g);
    expect(a).toEqual(b);
  });

  it("leaves weights untouched when the mutation rate is zero", () => {
    const g = minimal();
    const out = mutateWeights(createRng(3), g, { rate: 0 });
    expect(out.connections.map((c) => c.weight)).toEqual(
      g.connections.map((c) => c.weight),
    );
  });

  it("does not mutate the input genome (returns a copy)", () => {
    const g = minimal();
    const before = g.connections.map((c) => c.weight);
    mutateWeights(createRng(5), g, { rate: 1, perturbStrength: 2 });
    expect(g.connections.map((c) => c.weight)).toEqual(before);
  });

  it("keeps weights within the clamp even under strong perturbation", () => {
    const g = minimal();
    const out = mutateWeights(createRng(2), g, {
      rate: 1,
      replaceProbability: 0,
      perturbStrength: 100,
    });
    for (const c of out.connections) {
      expect(Math.abs(c.weight)).toBeLessThanOrEqual(NEAT_WEIGHT_CLAMP);
    }
  });

  it("preserves structure (nodes, innovations, enabled flags)", () => {
    const g = minimal();
    const out = mutateWeights(createRng(4), g, { rate: 1 });
    expect(out.nodes).toEqual(g.nodes);
    expect(out.connections.map((c) => c.innovation)).toEqual(
      g.connections.map((c) => c.innovation),
    );
    expect(out.connections.every((c) => c.enabled)).toBe(true);
  });
});
