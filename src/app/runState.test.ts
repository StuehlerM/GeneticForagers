import { describe, expect, it } from "vitest";
import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED, RunState } from "./runState";

describe("RunState", () => {
  it("starts running at the default speed", () => {
    const state = new RunState();
    expect(state.isPaused).toBe(false);
    expect(state.speed).toBe(DEFAULT_SPEED);
    expect(state.effectiveSpeed()).toBe(DEFAULT_SPEED);
  });

  it("toggles and sets pause", () => {
    const state = new RunState();
    state.togglePause();
    expect(state.isPaused).toBe(true);
    expect(state.effectiveSpeed()).toBe(0);
    state.resume();
    expect(state.isPaused).toBe(false);
  });

  it("clamps speed within the allowed range", () => {
    const state = new RunState();
    state.setSpeed(1000);
    expect(state.speed).toBe(MAX_SPEED);
    state.setSpeed(0);
    expect(state.speed).toBe(MIN_SPEED);
  });
});
