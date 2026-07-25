import { describe, expect, it } from "vitest";
import { type BiomeType, getBiomeConfig } from "./biome";
import {
  createAgent,
  drink,
  eat,
  isDead,
  MAX_AGE,
  MAX_ENERGY,
  MAX_HEALTH,
  MAX_HYDRATION,
  attack,
  metabolize,
  spendEnergy,
} from "./agent";
import { type Tile, World } from "./world";

function tile(biome: BiomeType): Tile {
  return { biome, food: getBiomeConfig(biome).maxFood };
}

/** 3x3 grassland world with a single water tile in the centre-right. */
function makeTestWorld(): World {
  const tiles: Tile[] = [
    tile("grassland"), tile("grassland"), tile("grassland"),
    tile("grassland"), tile("grassland"), tile("water"),
    tile("grassland"), tile("grassland"), tile("grassland"),
  ];
  return new World(3, 3, tiles);
}

describe("metabolize", () => {
  it("drains energy and hydration each tick and ages the agent", () => {
    const a = createAgent({ id: 1, x: 0, y: 0 });
    metabolize(a);
    expect(a.energy).toBeLessThan(MAX_ENERGY);
    expect(a.hydration).toBeLessThan(MAX_HYDRATION);
    expect(a.age).toBe(1);
  });

  it("never drops needs below zero", () => {
    const a = createAgent({ id: 1, x: 0, y: 0, energy: 0, hydration: 0 });
    metabolize(a);
    expect(a.energy).toBe(0);
    expect(a.hydration).toBe(0);
  });

  it("damages health when energy is depleted", () => {
    const a = createAgent({ id: 1, x: 0, y: 0, energy: 0, hydration: MAX_HYDRATION });
    metabolize(a);
    expect(a.health).toBeLessThan(MAX_HEALTH);
  });

  it("damages health when hydration is depleted", () => {
    const a = createAgent({ id: 1, x: 0, y: 0, energy: MAX_ENERGY, hydration: 0 });
    metabolize(a);
    expect(a.health).toBeLessThan(MAX_HEALTH);
  });

  it("regenerates health when both needs are at least 80% satisfied", () => {
    const a = createAgent({ id: 1, x: 0, y: 0, health: 50 });
    metabolize(a);
    expect(a.health).toBeGreaterThan(50);
  });

  it("does not regenerate when only one need is above 80%", () => {
    const a = createAgent({
      id: 1,
      x: 0,
      y: 0,
      health: 50,
      energy: MAX_ENERGY,
      hydration: MAX_HYDRATION * 0.5,
    });
    metabolize(a);
    expect(a.health).toBe(50);
  });

  it("never regenerates health above the maximum", () => {
    const a = createAgent({ id: 1, x: 0, y: 0, health: MAX_HEALTH });
    metabolize(a);
    expect(a.health).toBe(MAX_HEALTH);
  });

  it("drains energy faster for a higher metabolism", () => {
    const slow = createAgent({ id: 1, x: 0, y: 0, metabolism: 1 });
    const fast = createAgent({ id: 2, x: 0, y: 0, metabolism: 2 });
    metabolize(slow);
    metabolize(fast);
    expect(MAX_ENERGY - fast.energy).toBeGreaterThan(MAX_ENERGY - slow.energy);
  });
});

describe("spendEnergy", () => {
  it("reduces energy by the given amount", () => {
    const agent = createAgent({ id: 1, x: 0, y: 0, energy: 50 });
    spendEnergy(agent, 20);
    expect(agent.energy).toBe(30);
  });

  it("never drives energy below zero", () => {
    const agent = createAgent({ id: 1, x: 0, y: 0, energy: 5 });
    spendEnergy(agent, 20);
    expect(agent.energy).toBe(0);
  });
});

describe("attack", () => {
  const params = { baseDamage: 20, energyGain: 0.5, energyCost: 2 };

  it("damages the target and feeds the attacker, net of the attack cost", () => {
    const attacker = createAgent({ id: 1, x: 0, y: 0, energy: 50 });
    const target = createAgent({ id: 2, x: 1, y: 0, health: 100 });
    const damage = attack(attacker, 1, target, 1, params);
    expect(damage).toBe(20);
    expect(target.health).toBe(80);
    expect(attacker.energy).toBe(50 + 20 * 0.5 - 2);
  });

  it("hits harder against smaller targets and softer against larger ones", () => {
    const big = createAgent({ id: 1, x: 0, y: 0 });
    const small = createAgent({ id: 2, x: 0, y: 0 });
    const vsSmall = attack(big, 1.5, small, 0.5, params); // ratio 3
    const vsBig = attack(big, 0.5, small, 1.5, params); // ratio 1/3
    expect(vsSmall).toBeGreaterThan(params.baseDamage);
    expect(vsBig).toBeLessThan(params.baseDamage);
  });

  it("never drives target health below zero", () => {
    const attacker = createAgent({ id: 1, x: 0, y: 0 });
    const target = createAgent({ id: 2, x: 0, y: 0, health: 5 });
    attack(attacker, 2, target, 0.5, params); // huge damage
    expect(target.health).toBe(0);
  });
});

describe("eat", () => {
  it("converts tile food into energy and depletes the tile", () => {
    const world = makeTestWorld();
    const a = createAgent({ id: 1, x: 0, y: 0, energy: 0 });
    const before = world.tileAt(0, 0).food;

    const eaten = eat(a, world);
    expect(eaten).toBeGreaterThan(0);
    expect(a.energy).toBe(eaten);
    expect(world.tileAt(0, 0).food).toBe(before - eaten);
  });

  it("does not exceed maximum energy", () => {
    const world = makeTestWorld();
    const a = createAgent({ id: 1, x: 0, y: 0, energy: MAX_ENERGY });
    const eaten = eat(a, world);
    expect(eaten).toBe(0);
    expect(a.energy).toBe(MAX_ENERGY);
  });
});

describe("drink", () => {
  it("refills hydration when adjacent to water", () => {
    const world = makeTestWorld();
    const a = createAgent({ id: 1, x: 1, y: 1, hydration: 0 }); // left of water
    const amount = drink(a, world);
    expect(amount).toBeGreaterThan(0);
    expect(a.hydration).toBe(amount);
  });

  it("does nothing when no water is nearby", () => {
    const world = makeTestWorld();
    const a = createAgent({ id: 1, x: 0, y: 0, hydration: 0 }); // corner, no water neighbour
    const amount = drink(a, world);
    expect(amount).toBe(0);
    expect(a.hydration).toBe(0);
  });
});

describe("isDead", () => {
  it("is dead when health reaches zero", () => {
    const a = createAgent({ id: 1, x: 0, y: 0, health: 0 });
    expect(isDead(a)).toBe(true);
  });

  it("is dead at or beyond the maximum age", () => {
    const a = createAgent({ id: 1, x: 0, y: 0, age: MAX_AGE });
    expect(isDead(a)).toBe(true);
  });

  it("is alive when healthy and young", () => {
    const a = createAgent({ id: 1, x: 0, y: 0 });
    expect(isDead(a)).toBe(false);
  });
});
