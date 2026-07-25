import type { Forager } from "../domain/forager";
import { biasNodeId } from "../domain/neat/neatGenome";
import { type LaidOutNode, layoutNetwork } from "./inspector";

const BACKGROUND = "#11151c";
const TEXT = "#cdd6e0";
const TEXT_FONT = "11px monospace";
const LINE_HEIGHT = 14;
const TEXT_TOP = 16;
const NODE_RADIUS = 5;
const NET_MARGIN = 16;
const NET_TOP_FRACTION = 0.45; // network occupies the lower part of the panel

const NODE_COLORS: Record<string, string> = {
  input: "#5a9ad1",
  bias: "#8a8f98",
  output: "#5ad15a",
  hidden: "#d1a95a",
};

/** Draws the selected forager's needs, traits, species, and NEAT network. */
export function drawInspector(
  ctx: CanvasRenderingContext2D,
  forager: Forager | undefined,
  speciesId: number | undefined,
): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  if (!forager) {
    drawText(ctx, ["click an agent to inspect"], 0);
    return;
  }

  const { agent, traits } = forager;
  drawText(
    ctx,
    [
      `id ${agent.id}  species ${speciesId ?? "-"}`,
      `energy ${agent.energy.toFixed(0)}  hydration ${agent.hydration.toFixed(0)}`,
      `health ${agent.health.toFixed(0)}  age ${agent.age}`,
      `speed ${traits.maxSpeed.toFixed(2)}  size ${traits.size.toFixed(2)}`,
      `sight ${traits.sightRadius.toFixed(1)}  metab ${traits.metabolism.toFixed(2)}`,
    ],
    0,
  );

  drawNetwork(ctx, forager, width, height);
}

function drawNetwork(
  ctx: CanvasRenderingContext2D,
  forager: Forager,
  width: number,
  height: number,
): void {
  const netTop = height * NET_TOP_FRACTION;
  const box = { width: width - NET_MARGIN * 2, height: height - netTop - NET_MARGIN };
  const nodes = layoutNetwork(forager.genome.brain, box);
  const position = new Map(nodes.map((n) => [n.id, n] as const));
  const offsetX = NET_MARGIN;
  const offsetY = netTop;
  const bias = biasNodeId(forager.genome.brain.inputs);

  for (const conn of forager.genome.brain.connections) {
    if (!conn.enabled) {
      continue;
    }
    const from = position.get(conn.from);
    const to = position.get(conn.to);
    if (!from || !to) {
      continue;
    }
    ctx.strokeStyle = conn.weight >= 0 ? "#3f6d3f" : "#6d3f3f";
    ctx.beginPath();
    ctx.moveTo(offsetX + from.x, offsetY + from.y);
    ctx.lineTo(offsetX + to.x, offsetY + to.y);
    ctx.stroke();
  }

  for (const node of nodes) {
    drawNode(ctx, node, offsetX, offsetY, node.id === bias);
  }
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: LaidOutNode,
  offsetX: number,
  offsetY: number,
  _isBias: boolean,
): void {
  ctx.fillStyle = NODE_COLORS[node.type] ?? TEXT;
  ctx.beginPath();
  ctx.arc(offsetX + node.x, offsetY + node.y, NODE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function drawText(ctx: CanvasRenderingContext2D, lines: string[], startIndex: number): void {
  ctx.fillStyle = TEXT;
  ctx.font = TEXT_FONT;
  lines.forEach((line, i) => {
    ctx.fillText(line, 8, TEXT_TOP + LINE_HEIGHT * (startIndex + i));
  });
}
