import type { Forager } from "./forager";

/** The minimal view of a simulation that statistics are derived from. */
export interface StatsSource {
  readonly tickCount: number;
  readonly totalBirths: number;
  readonly totalDeaths: number;
  readonly speciesCount: number;
  readonly foragers: readonly Forager[];
}

/** One point in the recorded time series. */
export interface StatsSample {
  readonly tick: number;
  readonly population: number;
  readonly births: number;
  readonly deaths: number;
  readonly species: number;
  readonly avgEnergy: number;
  readonly avgHydration: number;
  readonly avgHealth: number;
  readonly avgAge: number;
  readonly avgSpeed: number;
  readonly avgSize: number;
  readonly avgSightRadius: number;
}

const DEFAULT_CAPACITY = 2000;

/** Computes a single statistics sample from the current simulation state. */
export function sampleStats(source: StatsSource): StatsSample {
  const foragers = source.foragers;
  const n = foragers.length;
  const mean = (total: number): number => (n === 0 ? 0 : total / n);

  let energy = 0;
  let hydration = 0;
  let health = 0;
  let age = 0;
  let speed = 0;
  let size = 0;
  let sight = 0;
  for (const f of foragers) {
    energy += f.agent.energy;
    hydration += f.agent.hydration;
    health += f.agent.health;
    age += f.agent.age;
    speed += f.traits.maxSpeed;
    size += f.traits.size;
    sight += f.traits.sightRadius;
  }

  return {
    tick: source.tickCount,
    population: n,
    births: source.totalBirths,
    deaths: source.totalDeaths,
    species: source.speciesCount,
    avgEnergy: mean(energy),
    avgHydration: mean(hydration),
    avgHealth: mean(health),
    avgAge: mean(age),
    avgSpeed: mean(speed),
    avgSize: mean(size),
    avgSightRadius: mean(sight),
  };
}

/** Records a bounded history of statistics samples for charting. */
export class StatsCollector {
  private readonly capacity: number;
  private readonly samples: StatsSample[] = [];

  constructor(capacity: number = DEFAULT_CAPACITY) {
    this.capacity = capacity;
  }

  get history(): readonly StatsSample[] {
    return this.samples;
  }

  get latest(): StatsSample | undefined {
    return this.samples[this.samples.length - 1];
  }

  record(source: StatsSource): void {
    this.samples.push(sampleStats(source));
    if (this.samples.length > this.capacity) {
      this.samples.shift();
    }
  }
}
