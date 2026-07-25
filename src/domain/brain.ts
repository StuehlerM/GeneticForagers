import { PERCEPTION_SIZE } from "./perception";

const OUTPUT_SIZE = 6; // moveX, moveY, eatDesire, drinkDesire, mateDesire, attackDesire

/** The input/output shape a brain must satisfy; NEAT grows the hidden structure. */
export interface Topology {
  readonly inputs: number;
  readonly outputs: number;
}

export const DEFAULT_TOPOLOGY: Topology = {
  inputs: PERCEPTION_SIZE,
  outputs: OUTPUT_SIZE,
};

/** A brain turns a perception vector into action outputs. */
export interface Brain {
  decide(inputs: number[]): number[];
}
