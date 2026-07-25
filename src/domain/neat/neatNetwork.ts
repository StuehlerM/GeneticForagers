import type { Brain } from "../brain";
import { biasNodeId, type ConnectionGene, type NeatGenome } from "./neatGenome";

const BIAS_VALUE = 1;

/**
 * Expresses a NEAT genome into a feed-forward {@link Brain}. The genome is
 * assumed acyclic (add-connection mutation forbids cycles); nodes are evaluated
 * in a precomputed topological order so each `decide` call is a single pass.
 */
export function expressNetwork(genome: NeatGenome): Brain {
  const biasId = biasNodeId(genome.inputs);
  const inputIds = genome.nodes.filter((n) => n.type === "input").map((n) => n.id);
  const outputIds = genome.nodes
    .filter((n) => n.type === "output")
    .map((n) => n.id)
    .sort((a, b) => a - b);
  const incoming = groupEnabledByTarget(genome.connections);
  const order = topologicalOrder(genome, incoming);

  return new NeatNetwork(genome.inputs, inputIds, biasId, outputIds, incoming, order);
}

/** A compiled feed-forward NEAT network. */
class NeatNetwork implements Brain {
  constructor(
    private readonly inputSize: number,
    private readonly inputIds: readonly number[],
    private readonly biasId: number,
    private readonly outputIds: readonly number[],
    private readonly incoming: ReadonlyMap<number, ConnectionGene[]>,
    private readonly order: readonly number[],
  ) {}

  decide(inputs: number[]): number[] {
    if (inputs.length !== this.inputSize) {
      throw new Error(
        `NeatNetwork.decide: expected ${this.inputSize} inputs, got ${inputs.length}`,
      );
    }
    const values = new Map<number, number>();
    this.inputIds.forEach((id, i) => values.set(id, inputs[i] as number));
    values.set(this.biasId, BIAS_VALUE);

    for (const id of this.order) {
      values.set(id, this.activate(id, values));
    }
    return this.outputIds.map((id) => values.get(id) ?? 0);
  }

  private activate(id: number, values: ReadonlyMap<number, number>): number {
    let sum = 0;
    for (const conn of this.incoming.get(id) ?? []) {
      sum += conn.weight * (values.get(conn.from) ?? 0);
    }
    return Math.tanh(sum);
  }
}

function groupEnabledByTarget(
  connections: readonly ConnectionGene[],
): Map<number, ConnectionGene[]> {
  const incoming = new Map<number, ConnectionGene[]>();
  for (const conn of connections) {
    if (!conn.enabled) {
      continue;
    }
    const list = incoming.get(conn.to);
    if (list) {
      list.push(conn);
    } else {
      incoming.set(conn.to, [conn]);
    }
  }
  return incoming;
}

/**
 * Kahn topological sort over enabled edges, returning only the nodes that must be
 * computed (hidden + output), in dependency order. Throws if a cycle is present.
 */
function topologicalOrder(
  genome: NeatGenome,
  incoming: ReadonlyMap<number, ConnectionGene[]>,
): number[] {
  const inDegree = new Map<number, number>();
  const dependents = new Map<number, number[]>();
  for (const node of genome.nodes) {
    inDegree.set(node.id, 0);
  }
  for (const [target, conns] of incoming) {
    inDegree.set(target, conns.length);
    for (const conn of conns) {
      const list = dependents.get(conn.from);
      if (list) {
        list.push(target);
      } else {
        dependents.set(conn.from, [target]);
      }
    }
  }

  const ready = genome.nodes.map((n) => n.id).filter((id) => (inDegree.get(id) ?? 0) === 0);
  const computed: number[] = [];
  const computable = new Set(incoming.keys());
  while (ready.length > 0) {
    const id = ready.shift() as number;
    if (computable.has(id)) {
      computed.push(id);
    }
    for (const target of dependents.get(id) ?? []) {
      const remaining = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, remaining);
      if (remaining === 0) {
        ready.push(target);
      }
    }
  }

  if (computed.length !== computable.size) {
    throw new Error("expressNetwork: genome contains a cycle");
  }
  return computed;
}
