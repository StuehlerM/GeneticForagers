import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { createInnovationTracker } from "./innovation";
import {
  createMinimalGenome,
  firstHiddenNodeId,
  INITIAL_WEIGHT_RANGE,
} from "./neatGenome";

const INPUTS = 3;
const OUTPUTS = 2;

function minimal(seed = 1) {
  const tracker = createInnovationTracker(firstHiddenNodeId(INPUTS, OUTPUTS));
  return createMinimalGenome(createRng(seed), tracker, INPUTS, OUTPUTS);
}

describe("createMinimalGenome", () => {
  it("records the input/output counts", () => {
    const g = minimal();
    expect(g.inputs).toBe(INPUTS);
    expect(g.outputs).toBe(OUTPUTS);
  });

  it("has input nodes, one bias node, and output nodes with typed ids", () => {
    const g = minimal();
    const inputs = g.nodes.filter((n) => n.type === "input");
    const bias = g.nodes.filter((n) => n.type === "bias");
    const outputs = g.nodes.filter((n) => n.type === "output");
    expect(inputs).toHaveLength(INPUTS);
    expect(bias).toHaveLength(1);
    expect(outputs).toHaveLength(OUTPUTS);
    expect(g.nodes.some((n) => n.type === "hidden")).toBe(false);
    expect(inputs.map((n) => n.id)).toEqual([0, 1, 2]);
    expect(bias[0]?.id).toBe(INPUTS); // bias sits right after the inputs
  });

  it("fully connects every input and the bias to every output", () => {
    const g = minimal();
    expect(g.connections).toHaveLength((INPUTS + 1) * OUTPUTS);
    expect(g.connections.every((c) => c.enabled)).toBe(true);
    const outputIds = new Set(
      g.nodes.filter((n) => n.type === "output").map((n) => n.id),
    );
    const sourceIds = new Set(
      g.nodes.filter((n) => n.type !== "output").map((n) => n.id),
    );
    expect(g.connections.every((c) => sourceIds.has(c.from) && outputIds.has(c.to))).toBe(
      true,
    );
  });

  it("draws weights within the initial range and gives connections unique innovations", () => {
    const g = minimal();
    for (const c of g.connections) {
      expect(c.weight).toBeGreaterThanOrEqual(-INITIAL_WEIGHT_RANGE);
      expect(c.weight).toBeLessThanOrEqual(INITIAL_WEIGHT_RANGE);
    }
    const innovations = g.connections.map((c) => c.innovation);
    expect(new Set(innovations).size).toBe(innovations.length);
  });

  it("is deterministic for the same seed", () => {
    expect(minimal(7)).toEqual(minimal(7));
  });

  it("gives structurally identical genomes the same innovations within a batch", () => {
    const tracker = createInnovationTracker(firstHiddenNodeId(INPUTS, OUTPUTS));
    const a = createMinimalGenome(createRng(1), tracker, INPUTS, OUTPUTS);
    const b = createMinimalGenome(createRng(2), tracker, INPUTS, OUTPUTS);
    expect(a.connections.map((c) => c.innovation)).toEqual(
      b.connections.map((c) => c.innovation),
    );
  });
});
