import type { Rng } from "../rng";
import type { InnovationTracker } from "./innovation";
import {
  cloneGenome,
  type ConnectionGene,
  INITIAL_WEIGHT_RANGE,
  type NeatGenome,
  type NodeGene,
} from "./neatGenome";

const SPLIT_INBOUND_WEIGHT = 1; // classic NEAT: in->new keeps signal, new->out keeps old weight

/**
 * Add-node mutation: pick an enabled connection, disable it, and route it through
 * a fresh hidden node (in->new weight 1, new->out the old weight). Preserves the
 * network's function at birth while creating room for new behaviour to evolve.
 * Returns the genome unchanged if nothing is enabled.
 */
export function addNode(
  rng: Rng,
  tracker: InnovationTracker,
  genome: NeatGenome,
): NeatGenome {
  const copy = cloneGenome(genome);
  const enabled = copy.connections.filter((c) => c.enabled);
  if (enabled.length === 0) {
    return copy;
  }
  const split = rng.pick(enabled);
  split.enabled = false;

  const newNode: NodeGene = { id: tracker.nodeIdForSplit(split.innovation), type: "hidden" };
  copy.nodes.push(newNode);
  copy.connections.push(
    connection(tracker, split.from, newNode.id, SPLIT_INBOUND_WEIGHT),
    connection(tracker, newNode.id, split.to, split.weight),
  );
  return copy;
}

/**
 * Add-connection mutation: wire two currently-unconnected nodes with a random
 * weight, respecting the feed-forward rule (source is never an output, target is
 * never an input/bias, and the edge must not close a cycle). Returns the genome
 * unchanged when no legal slot remains.
 */
export function addConnection(
  rng: Rng,
  tracker: InnovationTracker,
  genome: NeatGenome,
): NeatGenome {
  const copy = cloneGenome(genome);
  const candidate = pickCandidate(rng, copy);
  if (!candidate) {
    return copy;
  }
  copy.connections.push(
    connection(
      tracker,
      candidate.from,
      candidate.to,
      rng.range(-INITIAL_WEIGHT_RANGE, INITIAL_WEIGHT_RANGE),
    ),
  );
  return copy;
}

function pickCandidate(rng: Rng, genome: NeatGenome): { from: number; to: number } | null {
  const sources = genome.nodes.filter((n) => n.type !== "output").map((n) => n.id);
  const targets = genome.nodes
    .filter((n) => n.type !== "input" && n.type !== "bias")
    .map((n) => n.id);
  const existing = new Set(genome.connections.map((c) => `${c.from}->${c.to}`));

  const candidates: { from: number; to: number }[] = [];
  for (const from of sources) {
    for (const to of targets) {
      if (from === to || existing.has(`${from}->${to}`) || createsCycle(genome, from, to)) {
        continue;
      }
      candidates.push({ from, to });
    }
  }
  return candidates.length === 0 ? null : rng.pick(candidates);
}

/** True if adding from->to would close a loop, i.e. `to` can already reach `from`. */
function createsCycle(genome: NeatGenome, from: number, to: number): boolean {
  const stack = [to];
  const seen = new Set<number>();
  while (stack.length > 0) {
    const node = stack.pop() as number;
    if (node === from) {
      return true;
    }
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);
    for (const conn of genome.connections) {
      if (conn.from === node) {
        stack.push(conn.to);
      }
    }
  }
  return false;
}

function connection(
  tracker: InnovationTracker,
  from: number,
  to: number,
  weight: number,
): ConnectionGene {
  return {
    innovation: tracker.connectionInnovation(from, to),
    from,
    to,
    weight,
    enabled: true,
  };
}
