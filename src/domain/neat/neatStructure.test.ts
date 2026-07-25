import { describe, expect, it } from "vitest";
import { createRng, type Rng } from "../rng";
import { createInnovationTracker, type InnovationTracker } from "./innovation";
import { createMinimalGenome, firstHiddenNodeId, type NeatGenome } from "./neatGenome";
import { expressNetwork } from "./neatNetwork";
import { addConnection, addNode } from "./neatStructure";

const INPUTS = 3;
const OUTPUTS = 2;

function setup(seed = 1): { rng: Rng; tracker: InnovationTracker; genome: NeatGenome } {
  const tracker = createInnovationTracker(firstHiddenNodeId(INPUTS, OUTPUTS));
  const genome = createMinimalGenome(createRng(seed), tracker, INPUTS, OUTPUTS);
  return { rng: createRng(seed + 100), tracker, genome };
}

describe("addNode", () => {
  it("splits one enabled connection into a node plus two connections", () => {
    const { rng, tracker, genome } = setup();
    const out = addNode(rng, tracker, genome);
    expect(out.nodes.filter((n) => n.type === "hidden")).toHaveLength(1);
    expect(out.connections).toHaveLength(genome.connections.length + 2);
    expect(out.connections.filter((c) => !c.enabled)).toHaveLength(1);
  });

  it("wires in->new at weight 1 and new->out at the old weight", () => {
    const { rng, tracker, genome } = setup();
    const out = addNode(rng, tracker, genome);
    const disabled = out.connections.find((c) => !c.enabled);
    const newNode = out.nodes.find((n) => n.type === "hidden");
    const inbound = out.connections.find(
      (c) => c.to === newNode?.id && c.from === disabled?.from,
    );
    const outbound = out.connections.find(
      (c) => c.from === newNode?.id && c.to === disabled?.to,
    );
    expect(inbound?.weight).toBe(1);
    expect(outbound?.weight).toBe(disabled?.weight);
  });

  it("is deterministic and leaves the input genome untouched", () => {
    const one = setup();
    const two = setup(); // identical fresh rng + tracker + genome
    const a = addNode(one.rng, one.tracker, one.genome);
    const b = addNode(two.rng, two.tracker, two.genome);
    expect(a).toEqual(b);
    expect(one.genome.nodes.some((n) => n.type === "hidden")).toBe(false);
  });
});

describe("addConnection", () => {
  it("returns the genome unchanged when the network is fully connected", () => {
    const { rng, tracker, genome } = setup();
    const out = addConnection(rng, tracker, genome); // minimal = inputs+bias fully wired to outputs
    expect(out.connections).toHaveLength(genome.connections.length);
  });

  it("adds a single new valid, acyclic connection when a slot exists", () => {
    const { rng, tracker, genome } = setup();
    const withHidden = addNode(rng, tracker, genome); // creates a hidden node to wire to/from
    const out = addConnection(rng, tracker, withHidden);
    expect(out.connections.length).toBe(withHidden.connections.length + 1);
    const added = out.connections[out.connections.length - 1];
    const byId = new Map(out.nodes.map((n) => [n.id, n.type] as const));
    expect(byId.get(added?.from as number)).not.toBe("output");
    expect(["hidden", "output"]).toContain(byId.get(added?.to as number));
  });

  it("never produces a genome the network cannot express (no cycles)", () => {
    let { rng, tracker, genome } = setup(42);
    for (let i = 0; i < 40; i++) {
      genome = i % 3 === 0 ? addNode(rng, tracker, genome) : addConnection(rng, tracker, genome);
    }
    const out = expressNetwork(genome).decide([0.1, -0.2, 0.3]);
    expect(out).toHaveLength(OUTPUTS);
  });
});
