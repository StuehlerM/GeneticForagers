import { describe, expect, it } from "vitest";
import { createInnovationTracker } from "./innovation";

const FIRST_NODE_ID = 10; // e.g. inputs + bias + outputs already reserved

describe("InnovationTracker connection innovations", () => {
  it("assigns the same innovation to the same (from,to) within a batch", () => {
    const tracker = createInnovationTracker(FIRST_NODE_ID);
    const first = tracker.connectionInnovation(1, 5);
    expect(tracker.connectionInnovation(1, 5)).toBe(first);
  });

  it("assigns sequential innovations to distinct connections", () => {
    const tracker = createInnovationTracker(FIRST_NODE_ID);
    const a = tracker.connectionInnovation(1, 5);
    const b = tracker.connectionInnovation(2, 5);
    const c = tracker.connectionInnovation(1, 6);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(b).toBe(a + 1);
    expect(c).toBe(b + 1);
  });

  it("starts a fresh history after resetBatch (classic per-generation reset)", () => {
    const tracker = createInnovationTracker(FIRST_NODE_ID);
    const before = tracker.connectionInnovation(1, 5);
    tracker.resetBatch();
    const after = tracker.connectionInnovation(1, 5);
    expect(after).toBeGreaterThan(before); // same edge, new generation -> new number
  });
});

describe("InnovationTracker node splits", () => {
  it("gives the same new node id for splitting the same connection within a batch", () => {
    const tracker = createInnovationTracker(FIRST_NODE_ID);
    const conn = tracker.connectionInnovation(1, 5);
    const nodeId = tracker.nodeIdForSplit(conn);
    expect(tracker.nodeIdForSplit(conn)).toBe(nodeId);
  });

  it("starts node ids at the reserved boundary and increments per distinct split", () => {
    const tracker = createInnovationTracker(FIRST_NODE_ID);
    const first = tracker.nodeIdForSplit(0);
    const second = tracker.nodeIdForSplit(1);
    expect(first).toBe(FIRST_NODE_ID);
    expect(second).toBe(FIRST_NODE_ID + 1);
  });

  it("assigns new node ids again after resetBatch", () => {
    const tracker = createInnovationTracker(FIRST_NODE_ID);
    const before = tracker.nodeIdForSplit(0);
    tracker.resetBatch();
    const after = tracker.nodeIdForSplit(0);
    expect(after).toBeGreaterThan(before);
  });
});
