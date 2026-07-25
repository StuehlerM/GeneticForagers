import { describe, expect, it } from "vitest";
import type { NeatGenome } from "./neatGenome";
import { expressNetwork } from "./neatNetwork";

/** input(0) + bias(1) -> output(2), weights given. */
function singleOutputGenome(
  inWeight: number,
  biasWeight: number,
  inputEnabled = true,
): NeatGenome {
  return {
    inputs: 1,
    outputs: 1,
    nodes: [
      { id: 0, type: "input" },
      { id: 1, type: "bias" },
      { id: 2, type: "output" },
    ],
    connections: [
      { innovation: 0, from: 0, to: 2, weight: inWeight, enabled: inputEnabled },
      { innovation: 1, from: 1, to: 2, weight: biasWeight, enabled: true },
    ],
  };
}

describe("expressNetwork", () => {
  it("returns one value per output node", () => {
    const net = expressNetwork(singleOutputGenome(0.5, 0.2));
    expect(net.decide([1])).toHaveLength(1);
  });

  it("computes tanh of the weighted sum including the bias", () => {
    const net = expressNetwork(singleOutputGenome(0.5, 0.2));
    expect(net.decide([1])[0]).toBeCloseTo(Math.tanh(0.5 * 1 + 0.2 * 1));
    expect(net.decide([2])[0]).toBeCloseTo(Math.tanh(0.5 * 2 + 0.2 * 1));
  });

  it("still contributes the bias when the input weight path is disabled", () => {
    const net = expressNetwork(singleOutputGenome(999, 0.3, false));
    expect(net.decide([1])[0]).toBeCloseTo(Math.tanh(0.3)); // disabled input ignored
  });

  it("evaluates hidden nodes in dependency order (composed activations)", () => {
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
    const net = expressNetwork(genome);
    expect(net.decide([0.5])[0]).toBeCloseTo(Math.tanh(Math.tanh(0.5)));
  });

  it("orders outputs by ascending node id", () => {
    const genome: NeatGenome = {
      inputs: 1,
      outputs: 2,
      nodes: [
        { id: 0, type: "input" },
        { id: 1, type: "bias" },
        { id: 2, type: "output" },
        { id: 3, type: "output" },
      ],
      connections: [
        { innovation: 0, from: 0, to: 2, weight: 1, enabled: true },
        { innovation: 1, from: 0, to: 3, weight: -1, enabled: true },
      ],
    };
    const out = expressNetwork(genome).decide([0.4]);
    expect(out[0]).toBeCloseTo(Math.tanh(0.4)); // node 2
    expect(out[1]).toBeCloseTo(Math.tanh(-0.4)); // node 3
  });

  it("throws when the input vector length does not match", () => {
    const net = expressNetwork(singleOutputGenome(0.5, 0.2));
    expect(() => net.decide([1, 2])).toThrow();
  });
});
