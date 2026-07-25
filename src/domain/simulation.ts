import { type Agent, drink, eat, isDead, metabolize } from "./agent";
import { DEFAULT_TOPOLOGY, type Topology } from "./brain";
import { createForager, type Forager } from "./forager";
import {
  createRandomGenome,
  DEFAULT_MUTATION_RATE,
  DEFAULT_MUTATION_STRENGTH,
  reproduce,
} from "./genome";
import {
  createInnovationTracker,
  type InnovationTracker,
} from "./neat/innovation";
import { firstHiddenNodeId } from "./neat/neatGenome";
import { nearestKPerception } from "./perception";
import { createRng, type Rng } from "./rng";
import { toroidalDelta } from "./torus";
import { generateWorld, World } from "./world";

const OUT_MOVE_X = 0;
const OUT_MOVE_Y = 1;
const OUT_EAT = 2;
const OUT_DRINK = 3;
const OUT_MATE = 4;

const MATE_RANGE = 1; // Chebyshev distance at which two agents can mate.
const MAX_SPAWN_TRIES = 1000;

export interface SimulationConfig {
  readonly adultAge: number;
  readonly mateEnergyMin: number;
  readonly mateHydrationMin: number;
  readonly mateEnergyCost: number;
  readonly mateCooldown: number;
  readonly actionThreshold: number;
  readonly moveThreshold: number;
  readonly maxPopulation: number;
  readonly mutationRate: number;
  readonly mutationStrength: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  adultAge: 100,
  mateEnergyMin: 60,
  mateHydrationMin: 40,
  mateEnergyCost: 30,
  mateCooldown: 200,
  actionThreshold: 0.5,
  moveThreshold: 0.3,
  maxPopulation: 400,
  mutationRate: DEFAULT_MUTATION_RATE,
  mutationStrength: DEFAULT_MUTATION_STRENGTH,
};

export interface SimulationInit {
  readonly world: World;
  readonly foragers: Forager[];
  readonly rng: Rng;
  readonly tracker: InnovationTracker;
  readonly startId: number;
  readonly config?: Partial<SimulationConfig>;
}

export interface CreateSimulationOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly population: number;
  readonly topology?: Topology;
  readonly config?: Partial<SimulationConfig>;
}

/** Decides a single-tile step from movement outputs and a dead-zone threshold. */
export function chooseStep(
  moveX: number,
  moveY: number,
  threshold: number,
): { dx: number; dy: number } {
  return {
    dx: Math.abs(moveX) > threshold ? Math.sign(moveX) : 0,
    dy: Math.abs(moveY) > threshold ? Math.sign(moveY) : 0,
  };
}

/** Builds a world and a random starting population from a seed. */
export function createSimulation(options: CreateSimulationOptions): Simulation {
  const topology = options.topology ?? DEFAULT_TOPOLOGY;
  const rng = createRng(options.seed);
  const tracker = createInnovationTracker(
    firstHiddenNodeId(topology.inputs, topology.outputs),
  );
  const world = generateWorld({
    seed: options.seed,
    width: options.width,
    height: options.height,
  });

  const foragers: Forager[] = [];
  let nextId = 1;
  for (let i = 0; i < options.population; i++) {
    const spot = randomPassable(world, rng);
    const genome = createRandomGenome(rng, tracker, topology);
    foragers.push(createForager({ id: nextId++, ...spot, genome }));
  }

  const init: SimulationInit = {
    world,
    foragers,
    rng,
    tracker,
    startId: nextId,
    ...(options.config ? { config: options.config } : {}),
  };
  return new Simulation(init);
}

/** Owns the world and population, advancing them one deterministic tick at a time. */
export class Simulation {
  readonly world: World;
  private readonly config: SimulationConfig;
  private readonly tracker: InnovationTracker;
  private readonly rng: Rng;
  private population: Forager[];
  private nextId: number;
  private ticks = 0;
  private births = 0;
  private deaths = 0;

  constructor(init: SimulationInit) {
    this.world = init.world;
    this.population = init.foragers;
    this.rng = init.rng;
    this.tracker = init.tracker;
    this.nextId = init.startId;
    this.config = { ...DEFAULT_CONFIG, ...init.config };
  }

  get foragers(): readonly Forager[] {
    return this.population;
  }

  get tickCount(): number {
    return this.ticks;
  }

  get totalBirths(): number {
    return this.births;
  }

  get totalDeaths(): number {
    return this.deaths;
  }

  tick(): void {
    this.tracker.resetBatch();
    this.world.regrow();
    const agents = this.population.map((f) => f.agent);

    for (const forager of this.population) {
      this.decrementCooldown(forager.agent);
      this.act(forager, agents);
      metabolize(forager.agent);
    }

    this.reproduceStep();
    this.cullDead();
    this.ticks += 1;
  }

  private act(forager: Forager, agents: readonly Agent[]): void {
    const outputs = forager.brain.decide(
      nearestKPerception(forager.agent, this.world, agents, forager.traits.sightRadius),
    );
    this.move(forager, outputs[OUT_MOVE_X] as number, outputs[OUT_MOVE_Y] as number);
    if ((outputs[OUT_EAT] as number) > this.config.actionThreshold) {
      eat(forager.agent, this.world);
    }
    if ((outputs[OUT_DRINK] as number) > this.config.actionThreshold) {
      drink(forager.agent, this.world);
    }
    forager.wantsMate = (outputs[OUT_MATE] as number) > this.config.actionThreshold;
  }

  private move(forager: Forager, moveX: number, moveY: number): void {
    forager.moveAccumulator += forager.traits.maxSpeed;
    let steps = Math.floor(forager.moveAccumulator);
    forager.moveAccumulator -= steps;

    const { dx, dy } = chooseStep(moveX, moveY, this.config.moveThreshold);
    if (dx === 0 && dy === 0) {
      return;
    }
    while (steps-- > 0) {
      const { x: nx, y: ny } = this.world.wrap(forager.agent.x + dx, forager.agent.y + dy);
      if (!this.world.isPassable(nx, ny)) {
        break;
      }
      forager.agent.x = nx;
      forager.agent.y = ny;
    }
  }

  private reproduceStep(): void {
    const fertile = this.population.filter((f) => f.wantsMate && this.isFertile(f.agent));
    const paired = new Set<number>();
    const newborns: Forager[] = [];

    for (const parentA of fertile) {
      if (paired.has(parentA.agent.id)) {
        continue;
      }
      if (this.population.length + newborns.length >= this.config.maxPopulation) {
        break;
      }
      const parentB = fertile.find(
        (candidate) =>
          candidate.agent.id !== parentA.agent.id &&
          !paired.has(candidate.agent.id) &&
          this.areAdjacent(parentA.agent, candidate.agent),
      );
      if (!parentB) {
        continue;
      }
      paired.add(parentA.agent.id);
      paired.add(parentB.agent.id);
      newborns.push(this.makeChild(parentA, parentB));
      this.payMatingCost(parentA.agent);
      this.payMatingCost(parentB.agent);
      this.births += 1;
    }

    this.population.push(...newborns);
  }

  private makeChild(parentA: Forager, parentB: Forager): Forager {
    const genome = reproduce(
      this.rng,
      this.tracker,
      parentA.genome,
      parentB.genome,
      parentA.agent.age,
      parentB.agent.age,
      this.config.mutationRate,
      this.config.mutationStrength,
    );
    const spot = this.spawnNear(parentA.agent);
    return createForager({ id: this.nextId++, ...spot, genome });
  }

  private cullDead(): void {
    const survivors: Forager[] = [];
    for (const forager of this.population) {
      if (isDead(forager.agent)) {
        this.deaths += 1;
      } else {
        survivors.push(forager);
      }
    }
    this.population = survivors;
  }

  private isFertile(agent: Agent): boolean {
    return (
      agent.age >= this.config.adultAge &&
      agent.energy >= this.config.mateEnergyMin &&
      agent.hydration >= this.config.mateHydrationMin &&
      agent.mateCooldown === 0
    );
  }

  private payMatingCost(agent: Agent): void {
    agent.energy = Math.max(0, agent.energy - this.config.mateEnergyCost);
    agent.mateCooldown = this.config.mateCooldown;
  }

  private decrementCooldown(agent: Agent): void {
    if (agent.mateCooldown > 0) {
      agent.mateCooldown -= 1;
    }
  }

  private areAdjacent(a: Agent, b: Agent): boolean {
    const dx = toroidalDelta(a.x, b.x, this.world.width);
    const dy = toroidalDelta(a.y, b.y, this.world.height);
    return Math.max(Math.abs(dx), Math.abs(dy)) <= MATE_RANGE;
  }

  private spawnNear(agent: Agent): { x: number; y: number } {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const spot = this.world.wrap(agent.x + dx, agent.y + dy);
        if (this.world.isPassable(spot.x, spot.y)) {
          return spot;
        }
      }
    }
    return { x: agent.x, y: agent.y };
  }
}

function randomPassable(world: World, rng: Rng): { x: number; y: number } {
  for (let tries = 0; tries < MAX_SPAWN_TRIES; tries++) {
    const x = rng.int(world.width);
    const y = rng.int(world.height);
    if (world.isPassable(x, y)) {
      return { x, y };
    }
  }
  throw new Error("randomPassable: no passable tile found");
}
