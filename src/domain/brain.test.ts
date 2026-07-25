import { describe, expect, it } from "vitest";
import { DEFAULT_TOPOLOGY } from "./brain";
import { PERCEPTION_SIZE } from "./perception";

describe("DEFAULT_TOPOLOGY", () => {
  it("matches the perception vector width so any brain can consume it", () => {
    expect(DEFAULT_TOPOLOGY.inputs).toBe(PERCEPTION_SIZE);
  });

  it("exposes the five agent actions as outputs", () => {
    expect(DEFAULT_TOPOLOGY.outputs).toBe(5);
  });
});
