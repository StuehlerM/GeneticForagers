import { describe, expect, it } from "vitest";
import { DEFAULT_FITNESS_WEIGHTS, fitness, rouletteSelect } from "./fitness";
import type { Forager } from "./forager";
import { createRng } from "./rng";

function forager(age: number, foodEaten: number, offspring: number): Forager {
  return {
    agent: {
      id: 1,
      x: 0,
      y: 0,
      energy: 0,
      hydration: 0,
      health: 0,
      age,
      mateCooldown: 0,
      metabolism: 1,
    },
    genome: { body: [], brain: { inputs: 0, outputs: 0, nodes: [], connections: [] } },
    traits: { maxSpeed: 1, sightRadius: 1, metabolism: 1, size: 1 },
    brain: { decide: () => [] },
    moveAccumulator: 0,
    foodEaten,
    offspring,
  };
}

describe("fitness", () => {
  it("equals age when nothing was eaten and no offspring", () => {
    expect(fitness(forager(120, 0, 0), { foodWeight: 0.1, offspringWeight: 5 })).toBe(120);
  });

  it("adds the weighted food and offspring bonuses to age", () => {
    const weights = { foodWeight: 0.1, offspringWeight: 5 };
    expect(fitness(forager(100, 50, 2), weights)).toBeCloseTo(100 + 0.1 * 50 + 5 * 2);
  });

  it("lets age dominate under the default weights", () => {
    const survivor = fitness(forager(400, 0, 0), DEFAULT_FITNESS_WEIGHTS);
    const idler = fitness(forager(50, 100, 0), DEFAULT_FITNESS_WEIGHTS);
    expect(survivor).toBeGreaterThan(idler);
  });
});

describe("rouletteSelect", () => {
  it("returns the only candidate", () => {
    expect(rouletteSelect(createRng(1), ["solo"], () => 1)).toBe("solo");
  });

  it("favours higher-weight candidates over many draws", () => {
    const rng = createRng(7);
    const items = ["low", "high"];
    const weight = (x: string) => (x === "high" ? 9 : 1);
    let highCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (rouletteSelect(rng, items, weight) === "high") {
        highCount += 1;
      }
    }
    expect(highCount).toBeGreaterThan(750); // ~90% expected
  });

  it("falls back to a uniform pick when all weights are zero", () => {
    const picked = rouletteSelect(createRng(3), ["a", "b"], () => 0);
    expect(["a", "b"]).toContain(picked);
  });

  it("throws on an empty list", () => {
    expect(() => rouletteSelect(createRng(1), [] as string[], () => 1)).toThrow();
  });
});
