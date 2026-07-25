import { describe, expect, it } from "vitest";
import { compatibilityDistance, DEFAULT_COMPAT_COEFFICIENTS } from "./neatDistance";
import type { ConnectionGene, NeatGenome } from "./neatGenome";

function conn(innovation: number, weight = 0): ConnectionGene {
  return { innovation, from: 0, to: 2, weight, enabled: true };
}

function genome(connections: ConnectionGene[]): NeatGenome {
  return {
    inputs: 1,
    outputs: 1,
    nodes: [
      { id: 0, type: "input" },
      { id: 1, type: "bias" },
      { id: 2, type: "output" },
    ],
    connections,
  };
}

const { excess: c1, disjoint: c2, weight: c3 } = DEFAULT_COMPAT_COEFFICIENTS;

describe("compatibilityDistance", () => {
  it("is zero for identical genomes", () => {
    const g = genome([conn(0, 0.3), conn(1, -0.2)]);
    expect(compatibilityDistance(g, g)).toBe(0);
  });

  it("reflects only the mean weight difference when structure matches", () => {
    const a = genome([conn(0, 1), conn(1, 1)]);
    const b = genome([conn(0, 0), conn(1, 2)]); // diffs 1 and 1 -> mean 1
    expect(compatibilityDistance(a, b)).toBeCloseTo(c3 * 1);
  });

  it("counts disjoint genes", () => {
    const a = genome([conn(0), conn(2)]);
    const b = genome([conn(0), conn(1), conn(2)]); // innov 1 is disjoint (within a's range)
    expect(compatibilityDistance(a, b)).toBeCloseTo(c2 * 1);
  });

  it("counts excess genes beyond the other genome's range", () => {
    const a = genome([conn(0), conn(1)]);
    const b = genome([conn(0), conn(1), conn(2), conn(3)]); // 2,3 exceed a's max innov
    expect(compatibilityDistance(a, b)).toBeCloseTo(c1 * 2);
  });

  it("is symmetric", () => {
    const a = genome([conn(0, 0.5), conn(2, 0.1)]);
    const b = genome([conn(0, -0.5), conn(1, 0.2), conn(3, 0.9)]);
    expect(compatibilityDistance(a, b)).toBeCloseTo(compatibilityDistance(b, a));
  });
});
