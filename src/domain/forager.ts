import { type Agent, createAgent } from "./agent";
import { type BodyTraits, expressBody } from "./body";
import type { Brain } from "./brain";
import type { Genome } from "./genome";
import { expressNetwork } from "./neat/neatNetwork";

/**
 * A living individual: its mutable {@link Agent} state bundled with the
 * genome-derived body traits and brain that drive it.
 */
export interface Forager {
  readonly agent: Agent;
  readonly genome: Genome;
  readonly traits: BodyTraits;
  readonly brain: Brain;
  /** Accumulates fractional movement so `maxSpeed` yields whole tile steps. */
  moveAccumulator: number;
  /** Total food eaten over this forager's life (a fitness term). */
  foodEaten: number;
  /** Number of children this forager has parented (a fitness term). */
  offspring: number;
}

export interface ForagerInit {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly genome: Genome;
}

export function createForager(init: ForagerInit): Forager {
  const traits = expressBody(init.genome.body);
  const brain = expressNetwork(init.genome.brain);
  const agent = createAgent({
    id: init.id,
    x: init.x,
    y: init.y,
    metabolism: traits.metabolism,
  });
  return {
    agent,
    genome: init.genome,
    traits,
    brain,
    moveAccumulator: 0,
    foodEaten: 0,
    offspring: 0,
  };
}
