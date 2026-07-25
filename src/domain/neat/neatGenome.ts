import type { Rng } from "../rng";
import type { InnovationTracker } from "./innovation";

/** Random weights for a fresh connection are drawn from [-range, range]. */
export const INITIAL_WEIGHT_RANGE = 1;

export type NodeType = "input" | "bias" | "output" | "hidden";

export interface NodeGene {
  readonly id: number;
  readonly type: NodeType;
}

export interface ConnectionGene {
  readonly innovation: number;
  readonly from: number;
  readonly to: number;
  weight: number;
  enabled: boolean;
}

/** A NEAT brain genome: typed nodes plus innovation-numbered connections. */
export interface NeatGenome {
  readonly inputs: number;
  readonly outputs: number;
  readonly nodes: NodeGene[];
  readonly connections: ConnectionGene[];
}

/**
 * Node-id layout is fixed so the same structural role always maps to the same id:
 * inputs `0..inputs-1`, bias `inputs`, outputs `inputs+1 .. inputs+outputs`.
 * Hidden nodes created later start right after, which this returns.
 */
export function firstHiddenNodeId(inputs: number, outputs: number): number {
  return inputs + 1 + outputs;
}

/** Id of the single bias node (value fixed to 1 during activation). */
export function biasNodeId(inputs: number): number {
  return inputs;
}

/**
 * Builds the initial fully-connected, hidden-less genome: every input and the
 * bias node wired to every output with a random weight. Connections take their
 * innovation numbers from the shared tracker so sibling genomes align.
 */
export function createMinimalGenome(
  rng: Rng,
  tracker: InnovationTracker,
  inputs: number,
  outputs: number,
): NeatGenome {
  const nodes = createInitialNodes(inputs, outputs);
  const outputIds = nodes.filter((n) => n.type === "output").map((n) => n.id);
  const sourceIds = nodes.filter((n) => n.type !== "output").map((n) => n.id);

  const connections: ConnectionGene[] = [];
  for (const to of outputIds) {
    for (const from of sourceIds) {
      connections.push({
        innovation: tracker.connectionInnovation(from, to),
        from,
        to,
        weight: rng.range(-INITIAL_WEIGHT_RANGE, INITIAL_WEIGHT_RANGE),
        enabled: true,
      });
    }
  }

  return { inputs, outputs, nodes, connections };
}

/** Deep copy so mutation/crossover never alter a parent genome in place. */
export function cloneGenome(genome: NeatGenome): NeatGenome {
  return {
    inputs: genome.inputs,
    outputs: genome.outputs,
    nodes: genome.nodes.map((n) => ({ ...n })),
    connections: genome.connections.map((c) => ({ ...c })),
  };
}

function createInitialNodes(inputs: number, outputs: number): NodeGene[] {
  const nodes: NodeGene[] = [];
  for (let i = 0; i < inputs; i++) {
    nodes.push({ id: i, type: "input" });
  }
  nodes.push({ id: biasNodeId(inputs), type: "bias" });
  for (let o = 0; o < outputs; o++) {
    nodes.push({ id: inputs + 1 + o, type: "output" });
  }
  return nodes;
}
