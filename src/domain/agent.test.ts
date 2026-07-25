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
  metabolize,
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
