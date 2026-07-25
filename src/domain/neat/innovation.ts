/**
 * Hands out the global historical markings (innovation numbers) NEAT uses to
 * align genes across genomes. Within one reproduction batch, identical
 * structural mutations receive identical numbers so they line up at crossover;
 * `resetBatch` starts a fresh history for the next batch (classic per-generation
 * reset), while the underlying counters only ever grow.
 */
export interface InnovationTracker {
  /** Stable innovation number for a connection (from -> to) within the batch. */
  connectionInnovation(from: number, to: number): number;
  /** Stable new node id created by splitting the given connection, per batch. */
  nodeIdForSplit(splitConnectionInnovation: number): number;
  /** Clears the per-batch dedup history; counters keep growing. */
  resetBatch(): void;
}

/**
 * @param firstNodeId first id available for new (hidden) nodes; must be past the
 *   ids already reserved for input/bias/output nodes.
 * @param firstInnovation first connection innovation number to hand out.
 */
export function createInnovationTracker(
  firstNodeId: number,
  firstInnovation = 0,
): InnovationTracker {
  let nextInnovation = firstInnovation;
  let nextNodeId = firstNodeId;
  let connectionHistory = new Map<string, number>();
  let splitHistory = new Map<number, number>();

  return {
    connectionInnovation(from: number, to: number): number {
      const key = `${from}->${to}`;
      const existing = connectionHistory.get(key);
      if (existing !== undefined) {
        return existing;
      }
      const innovation = nextInnovation++;
      connectionHistory.set(key, innovation);
      return innovation;
    },

    nodeIdForSplit(splitConnectionInnovation: number): number {
      const existing = splitHistory.get(splitConnectionInnovation);
      if (existing !== undefined) {
        return existing;
      }
      const nodeId = nextNodeId++;
      splitHistory.set(splitConnectionInnovation, nodeId);
      return nodeId;
    },

    resetBatch(): void {
      connectionHistory = new Map<string, number>();
      splitHistory = new Map<number, number>();
    },
  };
}
