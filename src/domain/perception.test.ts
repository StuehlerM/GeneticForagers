import { describe, expect, it } from "vitest";
import { createAgent, MAX_ENERGY } from "./agent";
import { type BiomeType, getBiomeConfig } from "./biome";
import { nearestKPerception, PERCEPTION_SIZE } from "./perception";
import { type Tile, World } from "./world";

function tile(biome: BiomeType, food?: number): Tile {
  return { biome, food: food ?? getBiomeConfig(biome).maxFood };
}

/** 5x1 strip: water at x=0, empty grass, then food at x=4. */
function makeStripWorld(): World {
  const tiles: Tile[] = [
    tile("water"),
    tile("grassland", 0),
    tile("grassland", 0),
    tile("grassland", 0),
    tile("grassland", 20),
  ];
  return new World(5, 1, tiles);
}

const SIGHT = 8;

describe("nearestKPerception", () => {
  it("produces a fixed-length input vector", () => {
    const world = makeStripWorld();
    const agent = createAgent({ id: 1, x: 2, y: 0 });
    const inputs = nearestKPerception(agent, world, [], SIGHT);
    expect(inputs).toHaveLength(PERCEPTION_SIZE);
  });

  it("normalizes own needs into [0, 1] at the front of the vector", () => {
    const world = makeStripWorld();
    const agent = createAgent({ id: 1, x: 2, y: 0, energy: MAX_ENERGY / 2 });
    const inputs = nearestKPerception(agent, world, [], SIGHT);
    expect(inputs[0]).toBeCloseTo(0.5); // energy
    expect(inputs[1]).toBeCloseTo(1); // hydration full
    expect(inputs[2]).toBeCloseTo(1); // health full
  });

  it("points toward food on the +x side", () => {
    const world = makeStripWorld();
    const agent = createAgent({ id: 1, x: 2, y: 0 });
    const inputs = nearestKPerception(agent, world, [], SIGHT);
    // food direction x (index 4) should be positive (food is to the right).
    expect(inputs[4] as number).toBeGreaterThan(0);
  });

  it("points toward water on the -x side", () => {
    const world = makeStripWorld();
    const agent = createAgent({ id: 1, x: 2, y: 0 });
    const inputs = nearestKPerception(agent, world, [], SIGHT);
    // water direction x (index 7) should be negative (water is to the left).
    expect(inputs[7] as number).toBeLessThan(0);
  });

  it("reports maximum distance and zero direction when nothing is in range", () => {
    const world = makeStripWorld();
    const agent = createAgent({ id: 1, x: 2, y: 0 });
    const inputs = nearestKPerception(agent, world, [], 1); // sight too small to see food/water
    // nearest agent block (indices 10,11,12): no others -> 0,0,1
    expect(inputs[10]).toBe(0);
    expect(inputs[11]).toBe(0);
    expect(inputs[12]).toBe(1);
  });

  it("senses the nearest other agent and ignores itself", () => {
    const world = makeStripWorld();
    const self = createAgent({ id: 1, x: 2, y: 0 });
    const other = createAgent({ id: 2, x: 3, y: 0 });
    const inputs = nearestKPerception(self, world, [self, other], SIGHT);
    expect(inputs[10] as number).toBeGreaterThan(0); // other is to the +x side
    expect(inputs[12] as number).toBeLessThan(1); // distance less than max
  });
});
