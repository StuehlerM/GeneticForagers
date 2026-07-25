import type { Forager } from "../domain/forager";
import type { NeatGenome, NodeType } from "../domain/neat/neatGenome";
import { biasNodeId } from "../domain/neat/neatGenome";

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface LaidOutNode {
  readonly id: number;
  readonly type: NodeType;
  readonly x: number;
  readonly y: number;
}

/** The forager occupying a tile, or undefined. First match wins if several share it. */
export function pickForagerAt(
  foragers: readonly Forager[],
  tileX: number,
  tileY: number,
): Forager | undefined {
  return foragers.find((f) => f.agent.x === tileX && f.agent.y === tileY);
}

/**
 * Positions a NEAT genome's nodes for drawing: inputs/bias on the left, outputs
 * on the right, hidden nodes in columns by their longest-path depth. Nodes in a
 * column are spread evenly down the height. Pure and deterministic.
 */
export function layoutNetwork(genome: NeatGenome, size: Size): LaidOutNode[] {
  const column = assignColumns(genome);
  const maxColumn = Math.max(1, ...column.values());
  const rows = groupRowsByColumn(genome, column);

  return genome.nodes.map((node) => {
    const col = column.get(node.id) ?? 0;
    const rowsHere = rows.get(col) as number[];
    const rowIndex = rowsHere.indexOf(node.id);
    return {
      id: node.id,
      type: node.type,
      x: (col / maxColumn) * size.width,
      y: ((rowIndex + 1) / (rowsHere.length + 1)) * size.height,
    };
  });
}

function assignColumns(genome: NeatGenome): Map<number, number> {
  const incoming = enabledIncoming(genome);
  const typeById = new Map(genome.nodes.map((n) => [n.id, n.type] as const));
  const depthCache = new Map<number, number>();

  const depthOf = (id: number, guard: Set<number>): number => {
    const cached = depthCache.get(id);
    if (cached !== undefined) {
      return cached;
    }
    const preds = incoming.get(id) ?? [];
    let depth = 0;
    if (!guard.has(id)) {
      guard.add(id);
      for (const from of preds) {
        depth = Math.max(depth, 1 + depthOf(from, guard));
      }
      guard.delete(id);
    }
    depthCache.set(id, depth);
    return depth;
  };

  const hiddenDepths = genome.nodes
    .filter((n) => n.type === "hidden")
    .map((n) => depthOf(n.id, new Set()));
  const outputColumn = Math.max(1, ...hiddenDepths, 0) + (hiddenDepths.length > 0 ? 1 : 0);

  const columns = new Map<number, number>();
  for (const node of genome.nodes) {
    if (typeById.get(node.id) === "output") {
      columns.set(node.id, Math.max(1, outputColumn));
    } else if (node.type === "hidden") {
      columns.set(node.id, depthOf(node.id, new Set()));
    } else {
      columns.set(node.id, 0); // inputs and bias
    }
  }
  return columns;
}

function groupRowsByColumn(
  genome: NeatGenome,
  column: ReadonlyMap<number, number>,
): Map<number, number[]> {
  const rows = new Map<number, number[]>();
  for (const node of genome.nodes) {
    const col = column.get(node.id) ?? 0;
    const list = rows.get(col);
    if (list) {
      list.push(node.id);
    } else {
      rows.set(col, [node.id]);
    }
  }
  return rows;
}

function enabledIncoming(genome: NeatGenome): Map<number, number[]> {
  const incoming = new Map<number, number[]>();
  const bias = biasNodeId(genome.inputs);
  for (const conn of genome.connections) {
    if (!conn.enabled || conn.from === bias) {
      continue; // bias handled as a source column-0 node, not a depth driver
    }
    const list = incoming.get(conn.to);
    if (list) {
      list.push(conn.from);
    } else {
      incoming.set(conn.to, [conn.from]);
    }
  }
  return incoming;
}
