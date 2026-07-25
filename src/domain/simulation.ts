import { type Agent, drink, eat, isDead, metabolize, spendEnergy } from "./agent";
import { DEFAULT_TOPOLOGY, type Topology } from "./brain";
import { createForager, type Forager } from "./forager";
import type { Genome } from "./genome";
import {
  createRandomGenome,
  DEFAULT_MUTATION_RATE,
  DEFAULT_MUTATION_STRENGTH,
  reproduce,
} from "./genome";
import { type FitnessWeights, fitness, rouletteSelect } from "./fitness";
import {
  createInnovationTracker,
  type InnovationTracker,
} from "./neat/innovation";
import { firstHiddenNodeId } from "./neat/neatGenome";
import { SpeciesRegistry } from "./neat/speciation";
import { nearestKPerception } from "./perception";
import { createRng, type Rng } from "./rng";
import { generateWorld, World } from "./world";

const OUT_MOVE_X = 0;
const OUT_MOVE_Y = 1;
const OUT_EAT = 2;
const OUT_DRINK = 3;

const MAX_SPAWN_TRIES = 1000;

export interface SimulationConfig {
  readonly actionThreshold: number;
  readonly moveThreshold: number;
  /** Energy spent per tile moved, before body-size scaling. */
  readonly moveEnergyCost: number;
  /** Minimum age before a forager may be chosen as a parent. */
  readonly minParentAge: number;
  /** Population the birth manager tops the world up toward. */
  readonly carryingCapacity: number;
  /** Maximum offspring created per tick. */
  readonly birthsPerTick: number;
  readonly foodFitnessWeight: number;
  readonly offspringFitnessWeight: number;
  /** How many random foragers to inject if the population dies out entirely. */
  readonly reseedCount: number;
  /** Initial NEAT compatibility threshold for speciation. */
  readonly speciationThreshold: number;
  /** Species count the dynamic threshold aims for. */
  readonly targetSpeciesCount: number;
  readonly mutationRate: number;
  readonly mutationStrength: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  actionThreshold: 0.5,
  moveThreshold: 0.3,
  moveEnergyCost: 0.05,
  minParentAge: 50,
  carryingCapacity: 300,
  birthsPerTick: 2,
  foodFitnessWeight: 0.1,
  offspringFitnessWeight: 5,
  reseedCount: 8,
  speciationThreshold: 3,
  targetSpeciesCount: 6,
  mutationRate: DEFAULT_MUTATION_RATE,
  mutationStrength: DEFAULT_MUTATION_STRENGTH,
};

export interface SimulationInit {
  readonly world: World;
  readonly foragers: Forager[];
  readonly rng: Rng;
  readonly tracker: InnovationTracker;
  readonly topology: Topology;
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
    topology,
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
  private readonly topology: Topology;
  private readonly rng: Rng;
  private readonly species: SpeciesRegistry;
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
    this.topology = init.topology;
    this.nextId = init.startId;
    this.config = { ...DEFAULT_CONFIG, ...init.config };
    this.species = new SpeciesRegistry(this.config.speciationThreshold);
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

  get speciesCount(): number {
    return this.species.count;
  }

  /** Species id currently assigned to an agent, or undefined if unspeciated. */
  speciesOf(agentId: number): number | undefined {
    return this.species.assignmentOf(agentId);
  }

  /** The living forager with the highest fitness, or undefined if none. */
  get champion(): Forager | undefined {
    let best: Forager | undefined;
    let bestFitness = Number.NEGATIVE_INFINITY;
    for (const forager of this.population) {
      const value = this.fitnessOf(forager);
      if (value > bestFitness) {
        bestFitness = value;
        best = forager;
      }
    }
    return best;
  }

  /** Adds a forager built from an imported genome at a random passable tile. */
  inject(genome: Genome): void {
    const spot = randomPassable(this.world, this.rng);
    this.population.push(createForager({ id: this.nextId++, ...spot, genome }));
  }

  tick(): void {
    this.tracker.resetBatch();
    this.world.regrow();
    const agents = this.population.map((f) => f.agent);

    for (const forager of this.population) {
      this.act(forager, agents);
      metabolize(forager.agent);
    }

    this.speciatePopulation();
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
      forager.foodEaten += eat(forager.agent, this.world);
    }
    if ((outputs[OUT_DRINK] as number) > this.config.actionThreshold) {
      drink(forager.agent, this.world);
    }
  }

  private move(forager: Forager, moveX: number, moveY: number): void {
    forager.moveAccumulator += forager.traits.maxSpeed;
    let steps = Math.floor(forager.moveAccumulator);
    forager.moveAccumulator -= steps;

    const { dx, dy } = chooseStep(moveX, moveY, this.config.moveThreshold);
    if (dx === 0 && dy === 0) {
      return;
    }
    const stepCost = this.config.moveEnergyCost * forager.traits.size;
    while (steps-- > 0) {
      const { x: nx, y: ny } = this.world.wrap(forager.agent.x + dx, forager.agent.y + dy);
      if (!this.world.isPassable(nx, ny)) {
        break;
      }
      forager.agent.x = nx;
      forager.agent.y = ny;
      spendEnergy(forager.agent, stepCost);
    }
  }

  /**
   * System-driven, fitness-weighted reproduction (ADR 0001): tops the population
   * up toward the carrying capacity by breeding fitness-selected parents, and
   * reseeds fresh random brains if the world ever empties.
   */
  private reproduceStep(): void {
    if (this.population.length === 0) {
      this.reseed();
      return;
    }
    const slots = Math.min(
      this.config.birthsPerTick,
      this.config.carryingCapacity - this.population.length,
    );
    if (slots <= 0) {
      return;
    }
    const eligible = this.population.filter(
      (f) => f.agent.age >= this.config.minParentAge,
    );
    if (eligible.length === 0) {
      return;
    }

    const groups = this.eligibleGroups(eligible);
    const newborns: Forager[] = [];
    for (let i = 0; i < slots; i++) {
      const group = rouletteSelect(this.rng, groups, (g) => g.meanFitness);
      const parentA = rouletteSelect(this.rng, group.members, (f) => this.fitnessOf(f));
      const parentB = this.pickMate(group.members, parentA);
      newborns.push(this.makeChild(parentA, parentB));
      parentA.offspring += 1;
      if (parentB !== parentA) {
        parentB.offspring += 1;
      }
      this.births += 1;
    }
    this.population.push(...newborns);
  }

  private speciatePopulation(): void {
    this.species.speciate(
      this.population.map((f) => ({
        id: f.agent.id,
        genome: f.genome.brain,
        fitness: this.fitnessOf(f),
      })),
    );
    this.species.adjustThreshold(this.config.targetSpeciesCount);
  }

  /** Eligible parents grouped by species, each with its mean (shared) fitness. */
  private eligibleGroups(
    eligible: readonly Forager[],
  ): { members: Forager[]; meanFitness: number }[] {
    const bySpecies = new Map<number, Forager[]>();
    for (const forager of eligible) {
      const speciesId = this.species.assignmentOf(forager.agent.id) ?? 0;
      const members = bySpecies.get(speciesId);
      if (members) {
        members.push(forager);
      } else {
        bySpecies.set(speciesId, [forager]);
      }
    }
    return [...bySpecies.values()].map((members) => ({
      members,
      meanFitness:
        members.reduce((sum, f) => sum + this.fitnessOf(f), 0) / members.length,
    }));
  }

  /** Second parent: another fitness-selected forager, or self when alone. */
  private pickMate(eligible: readonly Forager[], parentA: Forager): Forager {
    if (eligible.length === 1) {
      return parentA;
    }
    const others = eligible.filter((f) => f !== parentA);
    return rouletteSelect(this.rng, others, (f) => this.fitnessOf(f));
  }

  private reseed(): void {
    for (let i = 0; i < this.config.reseedCount; i++) {
      const spot = randomPassable(this.world, this.rng);
      const genome = createRandomGenome(this.rng, this.tracker, this.topology);
      this.population.push(createForager({ id: this.nextId++, ...spot, genome }));
      this.births += 1;
    }
  }

  private fitnessOf(forager: Forager): number {
    return fitness(forager, this.fitnessWeights());
  }

  private fitnessWeights(): FitnessWeights {
    return {
      foodWeight: this.config.foodFitnessWeight,
      offspringWeight: this.config.offspringFitnessWeight,
    };
  }

  private makeChild(parentA: Forager, parentB: Forager): Forager {
    const genome = reproduce(
      this.rng,
      this.tracker,
      parentA.genome,
      parentB.genome,
      this.fitnessOf(parentA),
      this.fitnessOf(parentB),
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
