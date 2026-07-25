import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { createInnovationTracker } from "./innovation";
import { createMinimalGenome, firstHiddenNodeId } from "./neatGenome";
import { expressNetwork } from "./neatNetwork";
import { mutateNeat, neatOffspring } from "./neatReproduce";

const INPUTS = 3;
const OUTPUTS = 2;

function minimal(seed = 1) {
  const tracker = createInnovationTracker(firstHiddenNodeId(INPUTS, OUTPUTS));
  return { tracker, genome: createMinimalGenome(createRng(seed), tracker, INPUTS, OUTPUTS) };
}

describe("mutateNeat", () => {
  it("is deterministic and yields an expressible network", () => {
    const a = minimal();
    const b = minimal();
    const ga = mutateNeat(createRng(2), a.tracker, a.genome);
    const gb = mutateNeat(createRng(2), b.tracker, b.genome);
    expect(ga).toEqual(gb);
    expect(expressNetwork(ga).decide([0.1, 0.2, 0.3])).toHaveLength(OUTPUTS);
  });

  it("forces structural growth when probabilities are 1", () => {
    const { tracker, genome } = minimal();
    const grown = mutateNeat(createRng(4), tracker, genome, {
      addNodeProbability: 1,
      addConnectionProbability: 1,
    });
    expect(grown.nodes.length).toBeGreaterThan(genome.nodes.length);
  });
});

describe("neatOffspring", () => {
  it("combines two parents into an expressible child without mutating them", () => {
    const a = minimal(1);
    const b = minimal(2);
    const snapshot = JSON.stringify(a.genome);
    const child = neatOffspring(createRng(7), a.tracker, a.genome, 1, b.genome, 1);
    expect(expressNetwork(child).decide([0, 0, 0])).toHaveLength(OUTPUTS);
    expect(JSON.stringify(a.genome)).toBe(snapshot);
  });
});
