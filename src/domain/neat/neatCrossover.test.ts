import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { crossoverNeat } from "./neatCrossover";
import type { ConnectionGene, NeatGenome, NodeGene } from "./neatGenome";

const IN = { id: 0, type: "input" } as const;
const BIAS = { id: 1, type: "bias" } as const;
const OUT = { id: 2, type: "output" } as const;
const HID = { id: 3, type: "hidden" } as const;

function conn(innovation: number, from: number, to: number, weight = 0, enabled = true): ConnectionGene {
  return { innovation, from, to, weight, enabled };
}

function genome(nodes: NodeGene[], connections: ConnectionGene[]): NeatGenome {
  return { inputs: 1, outputs: 1, nodes, connections };
}

/** A carries extra structure (hidden node 3 + innovations 2,3) beyond B. */
function parentA(): NeatGenome {
  return genome(
    [IN, BIAS, OUT, HID],
    [conn(0, 0, 2, 0.5), conn(1, 1, 2, 0.1), conn(2, 0, 3, 0.7), conn(3, 3, 2, 0.9)],
  );
}
function parentB(): NeatGenome {
  return genome([IN, BIAS, OUT], [conn(0, 0, 2, -0.5), conn(1, 1, 2, -0.1)]);
}

const innovations = (g: NeatGenome) => g.connections.map((c) => c.innovation).sort((x, y) => x - y);

describe("crossoverNeat", () => {
  it("reproduces an identical parent exactly", () => {
    const a = parentA();
    const child = crossoverNeat(createRng(1), a, 1, structuredClone(a), 1);
    expect(innovations(child)).toEqual(innovations(a));
    expect(child.nodes.map((n) => n.id).sort()).toEqual(a.nodes.map((n) => n.id).sort());
  });

  it("inherits each matching gene's weight from one of the two parents", () => {
    const a = parentA();
    const b = parentB();
    const child = crossoverNeat(createRng(3), a, 2, b, 1);
    const w0 = child.connections.find((c) => c.innovation === 0)?.weight;
    expect([0.5, -0.5]).toContain(w0);
  });

  it("takes disjoint/excess genes from the fitter parent (A)", () => {
    const child = crossoverNeat(createRng(2), parentA(), 5, parentB(), 1);
    expect(innovations(child)).toEqual([0, 1, 2, 3]);
    expect(child.nodes.some((n) => n.id === HID.id)).toBe(true);
  });

  it("drops the fitter-only genes when the other parent is fitter (B)", () => {
    const child = crossoverNeat(createRng(2), parentA(), 1, parentB(), 5);
    expect(innovations(child)).toEqual([0, 1]);
    expect(child.nodes.some((n) => n.id === HID.id)).toBe(false);
  });

  it("keeps disjoint/excess from both parents when fitness is equal", () => {
    const child = crossoverNeat(createRng(2), parentA(), 3, parentB(), 3);
    expect(innovations(child)).toEqual([0, 1, 2, 3]);
  });

  it("is deterministic for the same seed and does not mutate parents", () => {
    const a = parentA();
    const b = parentB();
    const before = JSON.stringify(a);
    const first = crossoverNeat(createRng(9), a, 2, b, 1);
    const second = crossoverNeat(createRng(9), a, 2, b, 1);
    expect(first).toEqual(second);
    expect(JSON.stringify(a)).toBe(before);
  });
});
