import { describe, expect, it } from "vitest";
import {
  createRandomBrainWeights,
  DEFAULT_TOPOLOGY,
  FeedForwardBrain,
  weightCount,
} from "./brain";
import { PERCEPTION_SIZE } from "./perception";
import { createRng } from "./rng";

const T = DEFAULT_TOPOLOGY;

function zeros(n: number): number[] {
  return new Array(n).fill(0);
}

describe("topology", () => {
  it("has an input layer matching the perception vector", () => {
    expect(T.inputs).toBe(PERCEPTION_SIZE);
  });

  it("computes the weight count including biases for two layers", () => {
    const expected = (T.inputs + 1) * T.hidden + (T.hidden + 1) * T.outputs;
    expect(weightCount(T)).toBe(expected);
  });
});

describe("FeedForwardBrain", () => {
  it("rejects a weight vector of the wrong length", () => {
    expect(() => new FeedForwardBrain(zeros(weightCount(T) - 1), T)).toThrow();
  });

  it("rejects an input vector of the wrong length", () => {
    const brain = new FeedForwardBrain(zeros(weightCount(T)), T);
    expect(() => brain.decide(zeros(T.inputs - 1))).toThrow();
  });

  it("produces one output per output node, each in [-1, 1]", () => {
    const weights = createRandomBrainWeights(createRng(1), T);
    const brain = new FeedForwardBrain(weights, T);
    const outputs = brain.decide(zeros(T.inputs).fill(0.5));
    expect(outputs).toHaveLength(T.outputs);
    for (const o of outputs) {
      expect(o).toBeGreaterThanOrEqual(-1);
      expect(o).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic for the same weights and inputs", () => {
    const weights = createRandomBrainWeights(createRng(2), T);
    const a = new FeedForwardBrain(weights, T);
    const b = new FeedForwardBrain(weights, T);
    const inputs = zeros(T.inputs).fill(0.3);
    expect(a.decide(inputs)).toEqual(b.decide(inputs));
  });

  it("gives all-zero outputs from all-zero weights (tanh(0) = 0)", () => {
    const brain = new FeedForwardBrain(zeros(weightCount(T)), T);
    const outputs = brain.decide(zeros(T.inputs).fill(0.9));
    for (const o of outputs) {
      expect(o).toBeCloseTo(0);
    }
  });

  it("reacts to different weights with different outputs", () => {
    const inputs = zeros(T.inputs).fill(0.7);
    const a = new FeedForwardBrain(createRandomBrainWeights(createRng(1), T), T);
    const b = new FeedForwardBrain(createRandomBrainWeights(createRng(2), T), T);
    expect(a.decide(inputs)).not.toEqual(b.decide(inputs));
  });
});
