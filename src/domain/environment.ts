const TWO_PI = Math.PI * 2;

export interface EnvironmentConfig {
  /** Ticks in one full day→night→day cycle. */
  readonly dayLength: number;
  /** Ticks in one full seasonal cycle (modulates plant regrowth). */
  readonly seasonLength: number;
  /** Plant regrowth multiplier at the leanest point of the year. */
  readonly minRegrow: number;
  /** Plant regrowth multiplier at the most fertile point of the year. */
  readonly maxRegrow: number;
  /** Fraction of sight radius available at midnight (1 = unaffected). */
  readonly minSight: number;
}

export const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  dayLength: 600,
  seasonLength: 6000,
  minRegrow: 0.5,
  maxRegrow: 1.5,
  minSight: 0.5,
};

export interface EnvironmentState {
  /** Daylight level, 0 (midnight) … 1 (noon). */
  readonly light: number;
  /** Seasonal multiplier applied to plant regrowth. */
  readonly regrowMultiplier: number;
  /** Multiplier applied to sight radius (lower at night). */
  readonly sightMultiplier: number;
  readonly isDay: boolean;
}

/** Deterministic time-of-day + season state derived purely from the tick count. */
export function environmentAt(tick: number, config: EnvironmentConfig): EnvironmentState {
  const light = unitSine(tick, config.dayLength);
  const season = unitSine(tick, config.seasonLength);
  return {
    light,
    regrowMultiplier: config.minRegrow + (config.maxRegrow - config.minRegrow) * season,
    sightMultiplier: config.minSight + (1 - config.minSight) * light,
    isDay: light >= 0.5,
  };
}

/** A sine wave over `period` remapped from [-1, 1] to [0, 1]. */
function unitSine(tick: number, period: number): number {
  return (Math.sin((TWO_PI * tick) / period) + 1) / 2;
}
