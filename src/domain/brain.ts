import { PERCEPTION_SIZE } from "./perception";
import type { Rng } from "./rng";

/** Shape of a fixed feed-forward network: input -> one hidden layer -> output. */
export interface Topology {
  readonly inputs: number;
  readonly hidden: number;
  readonly outputs: number;
}

const HIDDEN_SIZE = 8;
const OUTPUT_SIZE = 5; // moveX, moveY, eatDesire, drinkDesire, mateDesire
const INITIAL_WEIGHT_RANGE = 1; // random weights drawn from [-1, 1]

export const DEFAULT_TOPOLOGY: Topology = {
  inputs: PERCEPTION_SIZE,
  hidden: HIDDEN_SIZE,
  outputs: OUTPUT_SIZE,
};

/** A brain turns a perception vector into action outputs. */
export interface Brain {
  decide(inputs: number[]): number[];
}

/** Total number of weights (incl. bias per neuron) for a topology. */
export function weightCount(topology: Topology): number {
  const { inputs, hidden, outputs } = topology;
  return (inputs + 1) * hidden + (hidden + 1) * outputs;
}

/** Draws a fresh random weight vector for the given topology. */
export function createRandomBrainWeights(rng: Rng, topology: Topology): number[] {
  return Array.from({ length: weightCount(topology) }, () =>
    rng.range(-INITIAL_WEIGHT_RANGE, INITIAL_WEIGHT_RANGE),
  );
}

/**
 * A fixed-topology feed-forward network with tanh activations. Its weights are
 * the brain genome; there is no training here — evolution mutates the weights.
 */
export class FeedForwardBrain implements Brain {
  private readonly weights: readonly number[];
  private readonly topology: Topology;

  constructor(weights: readonly number[], topology: Topology) {
    if (weights.length !== weightCount(topology)) {
      throw new Error(
        `FeedForwardBrain: expected ${weightCount(topology)} weights, got ${weights.length}`,
      );
    }
    this.weights = weights;
    this.topology = topology;
  }

  decide(inputs: number[]): number[] {
    if (inputs.length !== this.topology.inputs) {
      throw new Error(
        `FeedForwardBrain.decide: expected ${this.topology.inputs} inputs, got ${inputs.length}`,
      );
    }
    const hidden = this.layer(inputs, this.topology.inputs, this.topology.hidden, 0);
    const hiddenOffset = (this.topology.inputs + 1) * this.topology.hidden;
    return this.layer(hidden, this.topology.hidden, this.topology.outputs, hiddenOffset);
  }

  private layer(
    input: readonly number[],
    inSize: number,
    outSize: number,
    weightOffset: number,
  ): number[] {
    const output = new Array<number>(outSize);
    let w = weightOffset;
    for (let o = 0; o < outSize; o++) {
      let sum = this.weights[w++] as number; // bias
      for (let i = 0; i < inSize; i++) {
        sum += (this.weights[w++] as number) * (input[i] as number);
      }
      output[o] = Math.tanh(sum);
    }
    return output;
  }
}
