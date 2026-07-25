import { type Agent, MAX_AGE, MAX_ENERGY, MAX_HEALTH, MAX_HYDRATION } from "./agent";
import { toroidalDelta } from "./torus";
import type { World } from "./world";

/** Length of the input vector produced by {@link nearestKPerception}. */
export const PERCEPTION_SIZE = 13;

interface Bearing {
  /** Unit direction toward the target (0,0 if none/here). */
  dirX: number;
  dirY: number;
  /** Distance normalized to [0, 1] by sight radius; 1 when nothing is found. */
  distance: number;
}

const NOT_FOUND: Bearing = { dirX: 0, dirY: 0, distance: 1 };

/**
 * Default perception: the agent's own needs plus the bearing to the nearest
 * food tile, water tile, and other agent, all within its sight radius.
 * Returns a fixed-length vector so it can drive a fixed-topology brain.
 */
export function nearestKPerception(
  agent: Agent,
  world: World,
  others: readonly Agent[],
  sightRadius: number,
): number[] {
  const food = nearestTile(world, agent.x, agent.y, sightRadius, (t) => t.food > 0);
  const water = nearestTile(
    world,
    agent.x,
    agent.y,
    sightRadius,
    (t) => t.biome === "water",
  );
  const other = nearestAgent(agent, world, others, sightRadius);

  return [
    agent.energy / MAX_ENERGY,
    agent.hydration / MAX_HYDRATION,
    agent.health / MAX_HEALTH,
    agent.age / MAX_AGE,
    food.dirX,
    food.dirY,
    food.distance,
    water.dirX,
    water.dirY,
    water.distance,
    other.dirX,
    other.dirY,
    other.distance,
  ];
}

function nearestTile(
  world: World,
  x: number,
  y: number,
  sightRadius: number,
  predicate: (tile: { biome: string; food: number }) => boolean,
): Bearing {
  // On a torus, never scan past half the world or the same tile is seen twice.
  const radius = Math.floor(sightRadius);
  const maxDx = Math.min(radius, Math.floor(world.width / 2));
  const maxDy = Math.min(radius, Math.floor(world.height / 2));
  let best: Bearing = NOT_FOUND;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let dy = -maxDy; dy <= maxDy; dy++) {
    for (let dx = -maxDx; dx <= maxDx; dx++) {
      if (!predicate(world.tileAt(x + dx, y + dy))) {
        continue;
      }
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = toBearing(dx, dy, dist, sightRadius);
      }
    }
  }
  return best;
}

function nearestAgent(
  self: Agent,
  world: World,
  others: readonly Agent[],
  sightRadius: number,
): Bearing {
  let best: Bearing = NOT_FOUND;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const other of others) {
    if (other.id === self.id) {
      continue;
    }
    const dx = toroidalDelta(self.x, other.x, world.width);
    const dy = toroidalDelta(self.y, other.y, world.height);
    const dist = Math.hypot(dx, dy);
    if (dist <= sightRadius && dist < bestDist) {
      bestDist = dist;
      best = toBearing(dx, dy, dist, sightRadius);
    }
  }
  return best;
}

function toBearing(dx: number, dy: number, dist: number, sightRadius: number): Bearing {
  if (dist === 0) {
    return { dirX: 0, dirY: 0, distance: 0 };
  }
  return {
    dirX: dx / dist,
    dirY: dy / dist,
    distance: Math.min(1, dist / sightRadius),
  };
}
