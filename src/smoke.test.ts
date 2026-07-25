import { describe, expect, it } from "vitest";

// Smoke test: proves the TS + Vitest toolchain runs. Replaced by real domain
// tests as Milestone A progresses.
describe("toolchain", () => {
  it("runs a trivial test", () => {
    expect(1 + 1).toBe(2);
  });
});
