import type { StatsSample } from "../domain/stats";
import { type NumericSampleKey, seriesToPolyline } from "./chart";

export interface ChartSeries {
  readonly key: NumericSampleKey;
  readonly color: string;
  readonly label: string;
}

const BACKGROUND = "#11151c";
const AXIS = "#2a3340";
const LABEL_FONT = "10px monospace";
const LABEL_PADDING = 4;
const LABEL_LINE_HEIGHT = 12;

/**
 * Draws each series as its own auto-scaled polyline over a small dark panel.
 * Series are scaled independently so every line stays visible regardless of unit.
 */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  samples: readonly StatsSample[],
  series: readonly ChartSeries[],
): void {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = AXIS;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  series.forEach((s, i) => {
    drawSeries(ctx, samples, s, width, height);
    drawLegend(ctx, s, i);
  });
}

function drawSeries(
  ctx: CanvasRenderingContext2D,
  samples: readonly StatsSample[],
  series: ChartSeries,
  width: number,
  height: number,
): void {
  const points = seriesToPolyline(
    samples.map((sample) => sample[series.key]),
    { width, height },
  );
  if (points.length < 2) {
    return;
  }
  ctx.strokeStyle = series.color;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawLegend(ctx: CanvasRenderingContext2D, series: ChartSeries, index: number): void {
  ctx.fillStyle = series.color;
  ctx.font = LABEL_FONT;
  ctx.fillText(series.label, LABEL_PADDING, LABEL_PADDING + LABEL_LINE_HEIGHT * (index + 1));
}
