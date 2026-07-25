import type { World } from "./world";

export const MAX_ENERGY = 100;
export const MAX_HYDRATION = 100;
export const MAX_HEALTH = 100;
export const MAX_AGE = 5000;

const BASE_ENERGY_DRAIN = 0.2;
const BASE_HYDRATION_DRAIN = 0.15;
const STARVATION_HEALTH_DRAIN = 1;
const HEALTH_REGEN = 0.2;
const SATISFACTION_THRESHOLD = 0.8;
const DEFAULT_METABOLISM = 1;
const EAT_RATE = 10;
const DRINK_RATE = 15;

const NEIGHBOUR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export interface Agent {
  readonly id: number;
  x: number;
  y: number;
  energy: number;
  hydration: number;
  health: number;
  age: number;
  /** Multiplier on energy drain; part of the body genome (Step 5). */
  metabolism: number;
}

export interface AgentInit {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly energy?: number;
  readonly hydration?: number;
  readonly health?: number;
  readonly age?: number;
  readonly metabolism?: number;
}

export function createAgent(init: AgentInit): Agent {
  return {
    id: init.id,
    x: init.x,
    y: init.y,
    energy: init.energy ?? MAX_ENERGY,
    hydration: init.hydration ?? MAX_HYDRATION,
    health: init.health ?? MAX_HEALTH,
    age: init.age ?? 0,
    metabolism: init.metabolism ?? DEFAULT_METABOLISM,
  };
}

export function isDead(agent: Agent): boolean {
  return agent.health <= 0 || agent.age >= MAX_AGE;
}

/** Spends up to `amount` energy (e.g. the cost of moving or acting). */
export function spendEnergy(agent: Agent, amount: number): void {
  agent.energy = clampLow(agent.energy - amount);
}

/** Advances an agent's passive needs by one tick (drain, health, ageing). */
export function metabolize(agent: Agent): void {
  agent.energy = clampLow(agent.energy - BASE_ENERGY_DRAIN * agent.metabolism);
  agent.hydration = clampLow(agent.hydration - BASE_HYDRATION_DRAIN);
  agent.age += 1;
  updateHealth(agent);
}

/** Eats food at the agent's tile, converting it to energy; returns amount eaten. */
export function eat(agent: Agent, world: World): number {
  const room = MAX_ENERGY - agent.energy;
  if (room <= 0) {
    return 0;
  }
  const eaten = world.consumeFood(agent.x, agent.y, Math.min(EAT_RATE, room));
  agent.energy += eaten;
  return eaten;
}

/** Drinks if the agent is on or next to water; returns hydration gained. */
export function drink(agent: Agent, world: World): number {
  if (!isNearWater(agent, world)) {
    return 0;
  }
  const amount = Math.min(DRINK_RATE, MAX_HYDRATION - agent.hydration);
  agent.hydration += amount;
  return amount;
}

function updateHealth(agent: Agent): void {
  if (agent.energy <= 0 || agent.hydration <= 0) {
    agent.health = clampLow(agent.health - STARVATION_HEALTH_DRAIN);
    return;
  }
  if (isSatisfied(agent)) {
    agent.health = Math.min(MAX_HEALTH, agent.health + HEALTH_REGEN);
  }
}

function isSatisfied(agent: Agent): boolean {
  return (
    agent.energy >= MAX_ENERGY * SATISFACTION_THRESHOLD &&
    agent.hydration >= MAX_HYDRATION * SATISFACTION_THRESHOLD
  );
}

function isNearWater(agent: Agent, world: World): boolean {
  for (const [dx, dy] of NEIGHBOUR_OFFSETS) {
    // tileAt wraps, so water across the seam is reachable on the torus.
    if (world.tileAt(agent.x + dx, agent.y + dy).biome === "water") {
      return true;
    }
  }
  return false;
}

function clampLow(value: number): number {
  return value < 0 ? 0 : value;
}
