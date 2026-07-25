import type { Rng } from "../rng";
import type { InnovationTracker } from "./innovation";
import { crossoverNeat } from "./neatCrossover";
import type { NeatGenome } from "./neatGenome";
import { mutateWeights, type WeightMutationParams } from "./neatMutation";
import { addConnection, addNode } from "./neatStructure";

/** Per-reproduction chance of each structural mutation (typical NEAT rates). */
export const ADD_NODE_PROBABILITY = 0.03;
export const ADD_CONNECTION_PROBABILITY = 0.05;

export interface NeatMutationParams {
  readonly weight?: Partial<WeightMutationParams>;
  readonly addNodeProbability?: number;
  readonly addConnectionProbability?: number;
}

/** Mutates weights, then adds a node and/or a connection with small probability. */
export function mutateNeat(
  rng: Rng,
  tracker: InnovationTracker,
  genome: NeatGenome,
  params: NeatMutationParams = {},
): NeatGenome {
  const addNodeProb = params.addNodeProbability ?? ADD_NODE_PROBABILITY;
  const addConnProb = params.addConnectionProbability ?? ADD_CONNECTION_PROBABILITY;

  let child = mutateWeights(rng, genome, params.weight);
  if (rng.next() < addNodeProb) {
    child = addNode(rng, tracker, child);
  }
  if (rng.next() < addConnProb) {
    child = addConnection(rng, tracker, child);
  }
  return child;
}

/** Full brain reproduction: innovation-aligned crossover followed by mutation. */
export function neatOffspring(
  rng: Rng,
  tracker: InnovationTracker,
  parentA: NeatGenome,
  fitnessA: number,
  parentB: NeatGenome,
  fitnessB: number,
  params: NeatMutationParams = {},
): NeatGenome {
  const child = crossoverNeat(rng, parentA, fitnessA, parentB, fitnessB);
  return mutateNeat(rng, tracker, child, params);
}
