import type { Rng } from "../rng";
import type { ConnectionGene, NeatGenome, NodeGene } from "./neatGenome";

/** Chance a matched gene stays disabled in the child if disabled in either parent. */
const PROBABILITY_KEEP_DISABLED = 0.75;

/**
 * NEAT crossover aligned by innovation number:
 * - matching genes take their weight/enabled from a randomly chosen parent
 *   (with a chance to stay disabled if either parent had it disabled);
 * - disjoint/excess genes come from the fitter parent, or from both when the
 *   parents are equally fit.
 * Parents are never mutated.
 */
export function crossoverNeat(
  rng: Rng,
  parentA: NeatGenome,
  fitnessA: number,
  parentB: NeatGenome,
  fitnessB: number,
): NeatGenome {
  const aByInnovation = byInnovation(parentA);
  const bByInnovation = byInnovation(parentB);
  const takeAExtra = fitnessA >= fitnessB;
  const takeBExtra = fitnessB >= fitnessA;

  const connections: ConnectionGene[] = [];
  for (const innovation of unionSorted(aByInnovation, bByInnovation)) {
    const geneA = aByInnovation.get(innovation);
    const geneB = bByInnovation.get(innovation);
    if (geneA && geneB) {
      connections.push(inheritMatching(rng, geneA, geneB));
    } else if (geneA && takeAExtra) {
      connections.push({ ...geneA });
    } else if (geneB && takeBExtra) {
      connections.push({ ...geneB });
    }
  }

  return {
    inputs: parentA.inputs,
    outputs: parentA.outputs,
    nodes: mergeNodes(parentA, parentB, connections),
    connections,
  };
}

function inheritMatching(rng: Rng, a: ConnectionGene, b: ConnectionGene): ConnectionGene {
  const base = rng.next() < 0.5 ? a : b;
  const gene: ConnectionGene = { ...base };
  if (!a.enabled || !b.enabled) {
    gene.enabled = rng.next() >= PROBABILITY_KEEP_DISABLED;
  }
  return gene;
}

/** Child needs every node its inherited connections touch, plus the fixed I/O nodes. */
function mergeNodes(
  parentA: NeatGenome,
  parentB: NeatGenome,
  connections: readonly ConnectionGene[],
): NodeGene[] {
  const typeById = new Map<number, NodeGene>();
  for (const node of [...parentA.nodes, ...parentB.nodes]) {
    if (!typeById.has(node.id)) {
      typeById.set(node.id, { ...node });
    }
  }
  const needed = new Set<number>();
  for (const node of parentA.nodes) {
    if (node.type !== "hidden") {
      needed.add(node.id); // always keep inputs, bias, outputs
    }
  }
  for (const conn of connections) {
    needed.add(conn.from);
    needed.add(conn.to);
  }
  return [...needed]
    .sort((a, b) => a - b)
    .map((id) => typeById.get(id) as NodeGene);
}

function byInnovation(genome: NeatGenome): Map<number, ConnectionGene> {
  return new Map(genome.connections.map((c) => [c.innovation, c]));
}

function unionSorted(
  a: ReadonlyMap<number, ConnectionGene>,
  b: ReadonlyMap<number, ConnectionGene>,
): number[] {
  return [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x - y);
}
