export const MIN_SPEED = 0.25;
export const MAX_SPEED = 16;
export const DEFAULT_SPEED = 1;

const PAUSED_SPEED = 0;

/**
 * UI-facing run state (pause + speed). Kept out of the DOM layer so it is
 * unit-testable; the browser layer only reads/toggles it.
 */
export class RunState {
  private paused = false;
  private currentSpeed = DEFAULT_SPEED;

  get isPaused(): boolean {
    return this.paused;
  }

  get speed(): number {
    return this.currentSpeed;
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  setSpeed(value: number): void {
    this.currentSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
  }

  /** Speed applied to the clock, i.e. zero while paused. */
  effectiveSpeed(): number {
    return this.paused ? PAUSED_SPEED : this.currentSpeed;
  }
}
