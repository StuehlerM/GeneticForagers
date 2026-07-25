import { describe, expect, it } from "vitest";
import { type BiomeType, getBiomeConfig } from "./biome";
import { DEFAULT_TOPOLOGY } from "./brain";
import { createForager, type Forager } from "./forager";
import { createRandomGenome } from "./genome";
import { createRng } from "./rng";
import {
  chooseStep,
  createSimulation,
  Simulation,
  type SimulationConfig,
} from "./simulation";
import { type Tile, World } from "./world";

function grasslandWorld(w: number, h: number): World {
  const tiles: Tile[] = Array.from({ length: w * h }, () => ({
    biome: "grassland" as BiomeType,
    food: getBiomeConfig("grassland").maxFood,
  }));
  return new World(w, h, tiles);
}

const MATE_CONFIG: Partial<SimulationConfig> = {
  adultAge: 0,
  mateEnergyMin: 0,
  mateHydrationMin: 0,
  mateEnergyCost: 10,
  mateCooldown: 5,
};

/** A brain that always outputs the given fixed action vector. */
function fixedBrain(outputs: number[]): { decide: () => number[] } {
  return { decide: () => outputs };
}

function mateForager(id: number, x: number, y: number): Forager {
  const genome = createRandomGenome(createRng(id), DEFAULT_TOPOLOGY);
  const base = createForager({ id, x, y, genome, topology: DEFAULT_TOPOLOGY });
  // No movement, always want to mate: [moveX, moveY, eat, drink, mate].
  return { ...base, brain: fixedBrain([0, 0, 0, 0, 1]) };
}

describe("chooseStep", () => {
  it("returns no step when both axes are below threshold", () => {
    expect(chooseStep(0.1, -0.1, 0.3)).toEqual({ dx: 0, dy: 0 });
  });

  it("steps in the sign direction of axes above threshold", () => {
    expect(chooseStep(0.9, -0.9, 0.3)).toEqual({ dx: 1, dy: -1 });
    expect(chooseStep(-0.9, 0.0, 0.3)).toEqual({ dx: -1, dy: 0 });
  });
});

describe("createSimulation", () => {
  it("creates the requested population on passable tiles", () => {
    const sim = createSimulation({ seed: 1, width: 24, height: 24, population: 20 });
    expect(sim.foragers).toHaveLength(20);
    for (const f of sim.foragers) {
      expect(sim.world.isPassable(f.agent.x, f.agent.y)).toBe(true);
    }
  });

  it("is deterministic: same seed yields identical state after ticks", () => {
    const a = createSimulation({ seed: 42, width: 24, height: 24, population: 20 });
    const b = createSimulation({ seed: 42, width: 24, height: 24, population: 20 });
    for (let i = 0; i < 15; i++) {
      a.tick();
      b.tick();
    }
    const snapshot = (s: Simulation) =>
      s.foragers.map((f) => [f.agent.x, f.agent.y, f.agent.energy]);
    expect(snapshot(a)).toEqual(snapshot(b));
  });
});

describe("Simulation.tick", () => {
  it("advances the tick count and ages agents", () => {
    const sim = createSimulation({ seed: 3, width: 16, height: 16, population: 5 });
    sim.tick();
    expect(sim.tickCount).toBe(1);
    expect(sim.foragers.every((f) => f.agent.age === 1)).toBe(true);
  });

  it("removes dead agents and counts the deaths", () => {
    const world = grasslandWorld(6, 6);
    const dead = mateForager(1, 2, 2);
    dead.agent.health = 0;
    dead.agent.energy = 0; // starved: no health regen keeps it dead
    dead.agent.hydration = 0;
    const sim = new Simulation({
      world,
      foragers: [dead],
      rng: createRng(1),
      topology: DEFAULT_TOPOLOGY,
      startId: 2,
    });

    sim.tick();
    expect(sim.foragers).toHaveLength(0);
    expect(sim.totalDeaths).toBe(1);
  });

  it("produces offspring when two fertile agents mate", () => {
    const world = grasslandWorld(6, 6);
    const a = mateForager(1, 2, 2);
    const b = mateForager(2, 3, 2); // adjacent
    const sim = new Simulation({
      world,
      foragers: [a, b],
      rng: createRng(1),
      topology: DEFAULT_TOPOLOGY,
      config: MATE_CONFIG,
      startId: 3,
    });

    sim.tick();
    expect(sim.foragers.length).toBe(3);
    expect(sim.totalBirths).toBe(1);
    expect(a.agent.mateCooldown).toBe(5);
    expect(b.agent.mateCooldown).toBe(5);
  });

  it("does not exceed the maximum population", () => {
    const world = grasslandWorld(6, 6);
    const a = mateForager(1, 2, 2);
    const b = mateForager(2, 3, 2);
    const sim = new Simulation({
      world,
      foragers: [a, b],
      rng: createRng(1),
      topology: DEFAULT_TOPOLOGY,
      config: { ...MATE_CONFIG, maxPopulation: 2 },
      startId: 3,
    });

    sim.tick();
    expect(sim.foragers.length).toBe(2);
    expect(sim.totalBirths).toBe(0);
  });
});
