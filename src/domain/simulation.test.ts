import { describe, expect, it } from "vitest";
import { type BiomeType, getBiomeConfig } from "./biome";
import { DEFAULT_TOPOLOGY } from "./brain";
import { createForager, type Forager } from "./forager";
import { createRandomGenome } from "./genome";
import { createInnovationTracker, type InnovationTracker } from "./neat/innovation";
import { firstHiddenNodeId } from "./neat/neatGenome";
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

/** Old enough to parent, no capacity pressure: a minimal birth-friendly config. */
const BIRTH_CONFIG: Partial<SimulationConfig> = {
  minParentAge: 0,
  birthsPerTick: 1,
  carryingCapacity: 10,
};

/** A brain that always outputs the given fixed action vector. */
function fixedBrain(outputs: number[]): { decide: () => number[] } {
  return { decide: () => outputs };
}

function newTracker(): InnovationTracker {
  return createInnovationTracker(
    firstHiddenNodeId(DEFAULT_TOPOLOGY.inputs, DEFAULT_TOPOLOGY.outputs),
  );
}

/** An idle forager (no movement/actions) at a given age, for reproduction tests. */
function idleForager(id: number, x: number, y: number, age = 0): Forager {
  const genome = createRandomGenome(createRng(id), newTracker(), DEFAULT_TOPOLOGY);
  const base = createForager({ id, x, y, genome });
  base.agent.age = age;
  return { ...base, brain: fixedBrain([0, 0, 0, 0, 0, 0]) };
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

  it("keeps a living, breeding population over a long run (no early extinction)", () => {
    const sim = createSimulation({
      seed: 7,
      width: 32,
      height: 32,
      population: 15,
      config: { carryingCapacity: 40 },
    });
    for (let i = 0; i < 400; i++) {
      sim.tick();
    }
    // Random brains no longer go extinct before breeding: the birth manager
    // filled the world toward carrying capacity and it is still alive.
    expect(sim.foragers.length).toBeGreaterThanOrEqual(30);
    expect(sim.totalBirths).toBeGreaterThan(20);
    expect(sim.speciesCount).toBeGreaterThanOrEqual(1);
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
    const dead = idleForager(1, 2, 2);
    dead.agent.health = 0;
    dead.agent.energy = 0; // starved: no health regen keeps it dead
    dead.agent.hydration = 0;
    const sim = new Simulation({
      world,
      foragers: [dead],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      startId: 2,
    });

    sim.tick();
    expect(sim.foragers).toHaveLength(0);
    expect(sim.totalDeaths).toBe(1);
  });

  it("breeds offspring from fitness-selected parents once they are old enough", () => {
    const world = grasslandWorld(6, 6);
    const a = idleForager(1, 2, 2, 60);
    const b = idleForager(2, 4, 4, 60);
    const sim = new Simulation({
      world,
      foragers: [a, b],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: BIRTH_CONFIG,
      startId: 3,
    });

    sim.tick();
    expect(sim.foragers.length).toBe(3); // birthsPerTick = 1
    expect(sim.totalBirths).toBe(1);
    expect(a.offspring + b.offspring).toBe(2); // one child, two parents credited
  });

  it("does not breed before parents reach the minimum parent age", () => {
    const world = grasslandWorld(6, 6);
    const young = [idleForager(1, 2, 2, 0), idleForager(2, 4, 4, 0)];
    const sim = new Simulation({
      world,
      foragers: young,
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: { ...BIRTH_CONFIG, minParentAge: 100 },
      startId: 3,
    });

    sim.tick();
    expect(sim.totalBirths).toBe(0);
    expect(sim.foragers.length).toBe(2);
  });

  it("stops breeding at the carrying capacity", () => {
    const world = grasslandWorld(6, 6);
    const pair = [idleForager(1, 2, 2, 60), idleForager(2, 4, 4, 60)];
    const sim = new Simulation({
      world,
      foragers: pair,
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: { ...BIRTH_CONFIG, carryingCapacity: 2 },
      startId: 3,
    });

    sim.tick();
    expect(sim.foragers.length).toBe(2);
    expect(sim.totalBirths).toBe(0);
  });

  it("lets a lone survivor reproduce by self-cross", () => {
    const world = grasslandWorld(6, 6);
    const sim = new Simulation({
      world,
      foragers: [idleForager(1, 2, 2, 60)],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: BIRTH_CONFIG,
      startId: 2,
    });

    sim.tick();
    expect(sim.foragers.length).toBe(2);
    expect(sim.totalBirths).toBe(1);
  });

  it("lets an attacking forager damage an adjacent one", () => {
    const world = grasslandWorld(8, 8);
    const genome = () => createRandomGenome(createRng(1), newTracker(), DEFAULT_TOPOLOGY);
    const attacker = createForager({ id: 1, x: 4, y: 4, genome: genome() });
    const victim = createForager({ id: 2, x: 5, y: 4, genome: genome() }); // adjacent
    // Attack output (index 5) high, no movement.
    const predator: Forager = { ...attacker, brain: fixedBrain([0, 0, 0, 0, 0, 1]) };
    const prey: Forager = { ...victim, brain: fixedBrain([0, 0, 0, 0, 0, 0]) };
    const before = prey.agent.health;

    const sim = new Simulation({
      world,
      foragers: [predator, prey],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: { minParentAge: 999 },
      startId: 3,
    });

    sim.tick();
    expect(prey.agent.health).toBeLessThan(before);
  });

  it("drains energy when a forager moves", () => {
    const world = grasslandWorld(8, 8);
    const build = (id: number, outputs: number[]): Forager => {
      const genome = createRandomGenome(createRng(id), newTracker(), DEFAULT_TOPOLOGY);
      const base = createForager({ id, x: 4, y: 4, genome });
      base.agent.energy = 80;
      return { ...base, brain: fixedBrain(outputs), traits: { ...base.traits, maxSpeed: 1, size: 1 } };
    };
    const mover = build(1, [1, 0, 0, 0, 0]); // drive +x
    const idle = build(2, [0, 0, 0, 0, 0]); // stay put

    const sim = new Simulation({
      world,
      foragers: [mover, idle],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: { minParentAge: 999, moveEnergyCost: 0.5 },
      startId: 3,
    });

    sim.tick();
    // The mover pays the move cost on top of base metabolism; the idle agent doesn't.
    expect(mover.agent.energy).toBeLessThan(idle.agent.energy);
  });

  it("reports the highest-fitness forager as champion and can inject a genome", () => {
    const world = grasslandWorld(6, 6);
    const young = idleForager(1, 2, 2, 10);
    const old = idleForager(2, 4, 4, 80); // older => fitter
    const sim = new Simulation({
      world,
      foragers: [young, old],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: { minParentAge: 999 },
      startId: 3,
    });

    expect(sim.champion?.agent.id).toBe(2);
    sim.inject(createRandomGenome(createRng(9), newTracker(), DEFAULT_TOPOLOGY));
    expect(sim.foragers.length).toBe(3);
  });

  it("tracks at least one species once a population exists", () => {
    const world = grasslandWorld(6, 6);
    const sim = new Simulation({
      world,
      foragers: [idleForager(1, 2, 2, 60), idleForager(2, 4, 4, 60)],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: BIRTH_CONFIG,
      startId: 3,
    });

    sim.tick();
    expect(sim.speciesCount).toBeGreaterThanOrEqual(1);
  });

  it("reseeds fresh foragers when the population dies out", () => {
    const world = grasslandWorld(8, 8);
    const sim = new Simulation({
      world,
      foragers: [],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: { ...BIRTH_CONFIG, reseedCount: 5 },
      startId: 1,
    });

    sim.tick();
    expect(sim.foragers.length).toBe(5);
  });

  it("wraps an agent that steps off an edge to the opposite edge", () => {
    const world = grasslandWorld(6, 6);
    const walker = createForager({
      id: 1,
      x: 5,
      y: 0,
      genome: createRandomGenome(createRng(1), newTracker(), DEFAULT_TOPOLOGY),
    });
    // Always drive +x at exactly one tile/tick: [moveX, moveY, eat, drink, mate].
    const mover: Forager = {
      ...walker,
      brain: fixedBrain([1, 0, 0, 0, 0, 0]),
      traits: { ...walker.traits, maxSpeed: 1 },
    };
    const sim = new Simulation({
      world,
      foragers: [mover],
      rng: createRng(1),
      tracker: newTracker(),
      topology: DEFAULT_TOPOLOGY,
      config: { minParentAge: 999 }, // keep the birth manager out of this test
      startId: 2,
    });

    sim.tick();
    expect(mover.agent.x).toBe(0); // wrapped from x=5 (width 6) past the right edge
    expect(mover.agent.y).toBe(0);
  });
});
