import { describe, expect, it } from "vitest";
import { DEFAULT_TOPOLOGY } from "./brain";
import { createRandomGenome } from "./genome";
import { deserializeGenome, serializeGenome } from "./genomeIo";
import { createInnovationTracker } from "./neat/innovation";
import { firstHiddenNodeId } from "./neat/neatGenome";
import { expressNetwork } from "./neat/neatNetwork";
import { createRng } from "./rng";

function sampleGenome() {
  const tracker = createInnovationTracker(
    firstHiddenNodeId(DEFAULT_TOPOLOGY.inputs, DEFAULT_TOPOLOGY.outputs),
  );
  return createRandomGenome(createRng(1), tracker, DEFAULT_TOPOLOGY);
}

describe("serializeGenome / deserializeGenome", () => {
  it("round-trips a genome exactly", () => {
    const genome = sampleGenome();
    expect(deserializeGenome(serializeGenome(genome))).toEqual(genome);
  });

  it("produces JSON that still expresses to a working brain", () => {
    const genome = deserializeGenome(serializeGenome(sampleGenome()));
    const out = expressNetwork(genome.brain).decide(
      Array.from({ length: DEFAULT_TOPOLOGY.inputs }, () => 0.1),
    );
    expect(out).toHaveLength(DEFAULT_TOPOLOGY.outputs);
  });

  it("rejects non-JSON input", () => {
    expect(() => deserializeGenome("not json {")).toThrow();
  });

  it("rejects a payload missing the brain", () => {
    expect(() => deserializeGenome(JSON.stringify({ version: 1, body: [0.1] }))).toThrow();
  });

  it("rejects a connection with a bad node type", () => {
    const bad = {
      version: 1,
      body: [0.1],
      brain: {
        inputs: 1,
        outputs: 1,
        nodes: [{ id: 0, type: "banana" }],
        connections: [],
      },
    };
    expect(() => deserializeGenome(JSON.stringify(bad))).toThrow();
  });

  it("rejects a malformed connection", () => {
    const bad = {
      version: 1,
      body: [0.1],
      brain: {
        inputs: 1,
        outputs: 1,
        nodes: [{ id: 0, type: "input" }],
        connections: [{ innovation: 0, from: 0 }],
      },
    };
    expect(() => deserializeGenome(JSON.stringify(bad))).toThrow();
  });
});
