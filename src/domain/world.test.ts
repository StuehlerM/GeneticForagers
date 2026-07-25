import { describe, expect, it } from "vitest";
import { BIOME_TYPES, getBiomeConfig } from "./biome";
import { generateWorld, type World } from "./world";

const WIDTH = 48;
const HEIGHT = 48;

function makeWorld(seed = 1): World {
  return generateWorld({ seed, width: WIDTH, height: HEIGHT });
}

function findLandTile(world: World): { x: number; y: number } {
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      if (world.isPassable(x, y)) {
        return { x, y };
      }
    }
  }
  throw new Error("test world has no land tiles");
}

describe("generateWorld", () => {
  it("produces the given dimensions", () => {
    const world = makeWorld();
    expect(world.width).toBe(WIDTH);
    expect(world.height).toBe(HEIGHT);
  });

  it("is deterministic for the same seed", () => {
    const a = makeWorld(2024);
    const b = makeWorld(2024);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        expect(a.tileAt(x, y).biome).toBe(b.tileAt(x, y).biome);
        expect(a.tileAt(x, y).food).toBe(b.tileAt(x, y).food);
      }
    }
  });

  it("differs for different seeds", () => {
    const a = makeWorld(1);
    const b = makeWorld(2);
    const biomesA = a.tiles.map((t) => t.biome).join();
    const biomesB = b.tiles.map((t) => t.biome).join();
    expect(biomesA).not.toBe(biomesB);
  });

  it("assigns only known biomes and food within the biome cap", () => {
    const world = makeWorld();
    for (const tile of world.tiles) {
      expect(BIOME_TYPES).toContain(tile.biome);
      expect(tile.food).toBeGreaterThanOrEqual(0);
      expect(tile.food).toBeLessThanOrEqual(getBiomeConfig(tile.biome).maxFood);
    }
  });

  it("makes water impassable with no food", () => {
    const world = makeWorld();
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (world.tileAt(x, y).biome === "water") {
          expect(world.isPassable(x, y)).toBe(false);
          expect(world.tileAt(x, y).food).toBe(0);
        }
      }
    }
  });

  it("throws when reading out of bounds", () => {
    const world = makeWorld();
    expect(() => world.tileAt(-1, 0)).toThrow();
    expect(() => world.tileAt(WIDTH, 0)).toThrow();
  });
});

describe("World.regrow", () => {
  it("increases depleted food toward the biome cap without exceeding it", () => {
    const world = makeWorld();
    const { x, y } = findLandTile(world);
    const cap = getBiomeConfig(world.tileAt(x, y).biome).maxFood;
    world.tileAt(x, y).food = 0;

    world.regrow();
    expect(world.tileAt(x, y).food).toBeGreaterThan(0);
    expect(world.tileAt(x, y).food).toBeLessThanOrEqual(cap);
  });

  it("never pushes food above the cap", () => {
    const world = makeWorld();
    const { x, y } = findLandTile(world);
    const cap = getBiomeConfig(world.tileAt(x, y).biome).maxFood;
    world.tileAt(x, y).food = cap;

    world.regrow();
    expect(world.tileAt(x, y).food).toBe(cap);
  });
});

describe("World.consumeFood", () => {
  it("removes up to the requested amount and returns what was eaten", () => {
    const world = makeWorld();
    const { x, y } = findLandTile(world);
    world.tileAt(x, y).food = 4;

    const eaten = world.consumeFood(x, y, 3);
    expect(eaten).toBe(3);
    expect(world.tileAt(x, y).food).toBe(1);
  });

  it("cannot eat more than is present and never goes negative", () => {
    const world = makeWorld();
    const { x, y } = findLandTile(world);
    world.tileAt(x, y).food = 2;

    const eaten = world.consumeFood(x, y, 10);
    expect(eaten).toBe(2);
    expect(world.tileAt(x, y).food).toBe(0);
  });
});
