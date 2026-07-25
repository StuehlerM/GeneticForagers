import { describe, expect, it } from "vitest";
import { MAX_ENERGY } from "./agent";
import { DEFAULT_TOPOLOGY } from "./brain";
import { createForager, type Forager } from "./forager";
import { createRandomGenome } from "./genome";
import { createInnovationTracker } from "./neat/innovation";
import { firstHiddenNodeId } from "./neat/neatGenome";
import { createRng } from "./rng";
import { sampleStats, type StatsSource, StatsCollector } from "./stats";

function forager(id: number): Forager {
  const tracker = createInnovationTracker(
    firstHiddenNodeId(DEFAULT_TOPOLOGY.inputs, DEFAULT_TOPOLOGY.outputs),
  );
  const genome = createRandomGenome(createRng(id), tracker, DEFAULT_TOPOLOGY);
  return createForager({ id, x: 0, y: 0, genome });
}

function source(foragers: Forager[], overrides: Partial<StatsSource> = {}): StatsSource {
  return {
    tickCount: 0,
    totalBirths: 0,
    totalDeaths: 0,
    foragers,
    ...overrides,
  };
}

describe("sampleStats", () => {
  it("reports zeros for an empty population", () => {
    const sample = sampleStats(source([], { tickCount: 7 }));
    expect(sample.tick).toBe(7);
    expect(sample.population).toBe(0);
    expect(sample.avgEnergy).toBe(0);
    expect(sample.avgSpeed).toBe(0);
  });

  it("averages needs across the population", () => {
    const a = forager(1);
    const b = forager(2);
    a.agent.energy = MAX_ENERGY;
    b.agent.energy = MAX_ENERGY / 2;
    const sample = sampleStats(source([a, b]));
    expect(sample.population).toBe(2);
    expect(sample.avgEnergy).toBeCloseTo((MAX_ENERGY + MAX_ENERGY / 2) / 2);
  });

  it("carries cumulative birth and death counts", () => {
    const sample = sampleStats(source([forager(1)], { totalBirths: 5, totalDeaths: 3 }));
    expect(sample.births).toBe(5);
    expect(sample.deaths).toBe(3);
  });
});

describe("StatsCollector", () => {
  it("appends samples and exposes the latest", () => {
    const collector = new StatsCollector();
    collector.record(source([forager(1)], { tickCount: 1 }));
    collector.record(source([forager(1), forager(2)], { tickCount: 2 }));
    expect(collector.history).toHaveLength(2);
    expect(collector.latest?.tick).toBe(2);
    expect(collector.latest?.population).toBe(2);
  });

  it("drops the oldest samples beyond its capacity", () => {
    const collector = new StatsCollector(3);
    for (let t = 1; t <= 5; t++) {
      collector.record(source([forager(1)], { tickCount: t }));
    }
    expect(collector.history).toHaveLength(3);
    expect(collector.history[0]?.tick).toBe(3);
    expect(collector.latest?.tick).toBe(5);
  });
});
