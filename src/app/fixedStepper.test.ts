import { describe, expect, it } from "vitest";
import { FixedStepper } from "./fixedStepper";

const STEP = 10; // ms per tick for tests

describe("FixedStepper", () => {
  it("returns zero until a full step has accumulated", () => {
    const stepper = new FixedStepper(STEP);
    expect(stepper.advance(4, 1)).toBe(0);
    expect(stepper.advance(4, 1)).toBe(0);
    expect(stepper.advance(4, 1)).toBe(1); // 12ms >= one 10ms step
  });

  it("carries the remainder across frames", () => {
    const stepper = new FixedStepper(STEP);
    expect(stepper.advance(25, 1)).toBe(2); // 25ms -> 2 ticks, 5ms left
    expect(stepper.advance(6, 1)).toBe(1); // 5 + 6 = 11ms -> 1 tick
  });

  it("scales elapsed time by speed", () => {
    const stepper = new FixedStepper(STEP);
    expect(stepper.advance(10, 3)).toBe(3); // 30ms of sim time
  });

  it("caps ticks per frame to avoid a spiral of death", () => {
    const stepper = new FixedStepper(STEP);
    expect(stepper.advance(1_000_000, 1)).toBeLessThanOrEqual(240);
  });
});
