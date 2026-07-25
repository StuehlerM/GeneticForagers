import type { Genome } from "./genome";
import type {
  ConnectionGene,
  NeatGenome,
  NodeGene,
  NodeType,
} from "./neat/neatGenome";

/** Bump when the on-disk shape changes incompatibly. */
export const GENOME_FORMAT_VERSION = 1;

const NODE_TYPES: readonly NodeType[] = ["input", "bias", "output", "hidden"];

/** Serializes a genome to a versioned JSON string suitable for download. */
export function serializeGenome(genome: Genome): string {
  return JSON.stringify({
    version: GENOME_FORMAT_VERSION,
    body: genome.body,
    brain: genome.brain,
  });
}

/** Parses and validates a serialized genome, throwing on any malformed field. */
export function deserializeGenome(json: string): Genome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("genome import: input is not valid JSON");
  }
  const record = asRecord(parsed, "genome");
  return {
    body: parseBody(record["body"]),
    brain: parseBrain(record["brain"]),
  };
}

function parseBody(value: unknown): number[] {
  if (!Array.isArray(value) || !value.every((g) => typeof g === "number")) {
    throw new Error("genome import: 'body' must be an array of numbers");
  }
  return value as number[];
}

function parseBrain(value: unknown): NeatGenome {
  const brain = asRecord(value, "brain");
  return {
    inputs: parseCount(brain["inputs"], "brain.inputs"),
    outputs: parseCount(brain["outputs"], "brain.outputs"),
    nodes: parseArray(brain["nodes"], "brain.nodes", parseNode),
    connections: parseArray(brain["connections"], "brain.connections", parseConnection),
  };
}

function parseNode(value: unknown): NodeGene {
  const node = asRecord(value, "node");
  const type = node["type"];
  if (typeof type !== "string" || !NODE_TYPES.includes(type as NodeType)) {
    throw new Error(`genome import: node has invalid type '${String(type)}'`);
  }
  return { id: parseCount(node["id"], "node.id"), type: type as NodeType };
}

function parseConnection(value: unknown): ConnectionGene {
  const conn = asRecord(value, "connection");
  return {
    innovation: parseNumber(conn["innovation"], "connection.innovation"),
    from: parseNumber(conn["from"], "connection.from"),
    to: parseNumber(conn["to"], "connection.to"),
    weight: parseNumber(conn["weight"], "connection.weight"),
    enabled: parseBoolean(conn["enabled"], "connection.enabled"),
  };
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`genome import: '${what}' must be an object`);
  }
  return value as Record<string, unknown>;
}

function parseArray<T>(value: unknown, what: string, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`genome import: '${what}' must be an array`);
  }
  return value.map(parse);
}

function parseNumber(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`genome import: '${what}' must be a finite number`);
  }
  return value;
}

function parseCount(value: unknown, what: string): number {
  const n = parseNumber(value, what);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`genome import: '${what}' must be a non-negative integer`);
  }
  return n;
}

function parseBoolean(value: unknown, what: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`genome import: '${what}' must be a boolean`);
  }
  return value;
}
