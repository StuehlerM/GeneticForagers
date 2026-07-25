import { describe, expect, it } from "vitest";
import type { Forager } from "../domain/forager";
import { createInnovationTracker } from "../domain/neat/innovation";
import {
  createMinimalGenome,
  firstHiddenNodeId,
  type NeatGenome,
} from "../domain/neat/neatGenome";
import { createRng } from "../domain/rng";
import { layoutNetwork, pickForagerAt } from "./inspector";

function foragerAt(id: number, x: number, y: number): Forager {
  return { agent: { id, x, y } } as unknown as Forager;
}

function minimalGenome(inputs = 2, outputs = 2): NeatGenome {
  const tracker = createInnovationTracker(firstHiddenNodeId(inputs, outputs));
  return createMinimalGenome(createRng(1), tracker, inputs, outputs);
}

describe("pickForagerAt", () => {
  const foragers = [foragerAt(1, 3, 4), foragerAt(2, 7, 1)];

  it("returns the forager occupying the tile", () => {
    expect(pickForagerAt(foragers, 7, 1)?.agent.id).toBe(2);
  });

  it("returns undefined when the tile is empty", () => {
    expect(pickForagerAt(foragers, 0, 0)).toBeUndefined();
  });
});

describe("layoutNetwork", () => {
  const size = { width: 200, height: 100 };

  it("places inputs on the left edge and outputs on the right edge", () => {
    const laid = layoutNetwork(minimalGenome(), size);
    const inputs = laid.filter((n) => n.type === "input");
    const outputs = laid.filter((n) => n.type === "output");
    expect(inputs.every((n) => n.x === 0)).toBe(true);
    expect(outputs.every((n) => n.x === size.width)).toBe(true);
  });

  it("keeps every node inside the drawing box", () => {
    const laid = layoutNetwork(minimalGenome(3, 3), size);
    for (const node of laid) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(size.width);
      expect(node.y).toBeGreaterThan(0);
      expect(node.y).toBeLessThan(size.height);
    }
  });

  it("places a hidden node between inputs and outputs", () => {
    const genome: NeatGenome = {
      inputs: 1,
      outputs: 1,
      nodes: [
        { id: 0, type: "input" },
        { id: 1, type: "bias" },
        { id: 2, type: "output" },
        { id: 3, type: "hidden" },
      ],
      connections: [
        { innovation: 0, from: 0, to: 3, weight: 1, enabled: true },
        { innovation: 1, from: 3, to: 2, weight: 1, enabled: true },
      ],
    };
    const laid = layoutNetwork(genome, size);
    const hidden = laid.find((n) => n.type === "hidden");
    const output = laid.find((n) => n.type === "output");
    expect(hidden?.x).toBeGreaterThan(0);
    expect(hidden?.x).toBeLessThan(output?.x as number);
  });

  it("is deterministic", () => {
    const g = minimalGenome(3, 2);
    expect(layoutNetwork(g, size)).toEqual(layoutNetwork(g, size));
  });
});
