const TICKS_PER_SECOND = 30;
const DEFAULT_STEP_MS = 1000 / TICKS_PER_SECOND;
const MAX_TICKS_PER_FRAME = 240; // guards against the "spiral of death"

/**
 * Converts variable frame durations into a whole number of fixed simulation
 * ticks, carrying the remainder so the sim advances at a constant rate
 * independent of render framerate.
 */
export class FixedStepper {
  private readonly stepMs: number;
  private accumulatorMs = 0;

  constructor(stepMs: number = DEFAULT_STEP_MS) {
    this.stepMs = stepMs;
  }

  /** Adds elapsed (scaled) time and returns how many ticks to run now. */
  advance(elapsedMs: number, speed: number): number {
    this.accumulatorMs += elapsedMs * speed;
    let ticks = Math.floor(this.accumulatorMs / this.stepMs);
    if (ticks <= 0) {
      return 0;
    }
    if (ticks > MAX_TICKS_PER_FRAME) {
      ticks = MAX_TICKS_PER_FRAME;
      this.accumulatorMs = 0;
      return ticks;
    }
    this.accumulatorMs -= ticks * this.stepMs;
    return ticks;
  }
}
