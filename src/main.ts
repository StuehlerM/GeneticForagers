import { FixedStepper } from "./app/fixedStepper";
import { MAX_SPEED, MIN_SPEED, RunState } from "./app/runState";
import { createSimulation } from "./domain/simulation";
import { deserializeGenome, serializeGenome } from "./domain/genomeIo";
import { StatsCollector } from "./domain/stats";
import { Canvas2DRenderer } from "./render/canvasRenderer";
import { type ChartSeries, drawChart } from "./render/chartRenderer";
import { pickForagerAt } from "./render/inspector";
import { drawInspector } from "./render/inspectorRenderer";
import type { Forager } from "./domain/forager";

const WORLD_WIDTH = 128;
const WORLD_HEIGHT = 128;
const TILE_SIZE = 5;
const POPULATION = 150;
const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const INSPECTOR_WIDTH = 320;
const INSPECTOR_HEIGHT = 220;

const CHART_SERIES: ChartSeries[] = [
  { key: "population", color: "#5ad15a", label: "population" },
  { key: "species", color: "#d1a95a", label: "species" },
  { key: "avgAge", color: "#5a9ad1", label: "avg age" },
];

const runState = new RunState();
const stepper = new FixedStepper();
const stats = new StatsCollector();

let seed = 1;
let sim = createSimulation({
  seed,
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  population: POPULATION,
});

const canvas = createCanvas();
const renderer = new Canvas2DRenderer(canvas.getContext("2d")!, TILE_SIZE);
const chartCanvas = createChartCanvas();
const chartCtx = chartCanvas.getContext("2d")!;
const inspectorCanvas = createInspectorCanvas();
const inspectorCtx = inspectorCanvas.getContext("2d")!;
let selectedId: number | undefined;
const readout = mountUi();

let lastTime = performance.now();
requestAnimationFrame(frame);

function frame(now: number): void {
  const elapsed = now - lastTime;
  lastTime = now;

  const ticks = stepper.advance(elapsed, runState.effectiveSpeed());
  for (let i = 0; i < ticks; i++) {
    sim.tick();
  }
  if (ticks > 0) {
    stats.record(sim);
  }

  renderer.render(sim);
  drawChart(chartCtx, stats.history, CHART_SERIES);
  const selected = selectedForager();
  drawInspector(inspectorCtx, selected, selected ? sim.speciesOf(selected.agent.id) : undefined);
  updateReadout(readout);
  requestAnimationFrame(frame);
}


function regenerate(newSeed: number): void {
  seed = newSeed;
  sim = createSimulation({
    seed,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    population: POPULATION,
  });
}

function createCanvas(): HTMLCanvasElement {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = WORLD_WIDTH * TILE_SIZE;
  canvasEl.height = WORLD_HEIGHT * TILE_SIZE;
  return canvasEl;
}

function createChartCanvas(): HTMLCanvasElement {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = CHART_WIDTH;
  canvasEl.height = CHART_HEIGHT;
  return canvasEl;
}

function createInspectorCanvas(): HTMLCanvasElement {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = INSPECTOR_WIDTH;
  canvasEl.height = INSPECTOR_HEIGHT;
  return canvasEl;
}

function selectedForager(): Forager | undefined {
  return selectedId === undefined
    ? undefined
    : sim.foragers.find((f) => f.agent.id === selectedId);
}

function mountUi(): HTMLPreElement {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("missing #app container");
  }
  app.textContent = "";

  const panel = document.createElement("div");

  const pauseButton = document.createElement("button");
  pauseButton.textContent = "Pause";
  pauseButton.addEventListener("click", () => {
    runState.togglePause();
    pauseButton.textContent = runState.isPaused ? "Resume" : "Pause";
  });

  const speed = document.createElement("input");
  speed.type = "range";
  speed.min = String(MIN_SPEED);
  speed.max = String(MAX_SPEED);
  speed.step = "0.25";
  speed.value = String(runState.speed);
  speed.addEventListener("input", () => runState.setSpeed(Number(speed.value)));

  const seedInput = document.createElement("input");
  seedInput.type = "number";
  seedInput.value = String(seed);
  seedInput.style.width = "6em";

  const regenButton = document.createElement("button");
  regenButton.textContent = "Regenerate";
  regenButton.addEventListener("click", () => regenerate(Number(seedInput.value) || 0));

  const exportButton = document.createElement("button");
  exportButton.textContent = "Export champion";
  exportButton.addEventListener("click", exportChampion);

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json";
  importInput.addEventListener("change", () => importGenome(importInput));

  const readout = document.createElement("pre");

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const tileX = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const tileY = Math.floor((event.clientY - rect.top) / TILE_SIZE);
    selectedId = pickForagerAt(sim.foragers, tileX, tileY)?.agent.id;
  });

  const controls = [pauseButton, speed, seedInput, regenButton, exportButton, importInput];
  for (const el of [...controls, readout, chartCanvas, inspectorCanvas]) {
    panel.appendChild(el);
  }
  app.appendChild(canvas);
  app.appendChild(panel);
  return readout;
}

function exportChampion(): void {
  const champion = sim.champion;
  if (!champion) {
    return;
  }
  const blob = new Blob([serializeGenome(champion.genome)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `champion-seed${seed}-tick${sim.tickCount}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importGenome(input: HTMLInputElement): void {
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  file.text().then((json) => {
    try {
      sim.inject(deserializeGenome(json));
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(String(error));
    }
    input.value = "";
  });
}

function updateReadout(readout: HTMLPreElement): void {
  const s = stats.latest;
  const line = (label: string, value: string): string => `${label}: ${value}`;
  readout.textContent = [
    line("tick", String(sim.tickCount)),
    line("population", String(sim.foragers.length)),
    line("births", String(sim.totalBirths)),
    line("deaths", String(sim.totalDeaths)),
    line("species", String(sim.speciesCount)),
    line("phase", `${sim.environment.isDay ? "day" : "night"} (light ${sim.environment.light.toFixed(2)})`),
    line("avg energy", s ? s.avgEnergy.toFixed(1) : "-"),
    line("avg speed", s ? s.avgSpeed.toFixed(2) : "-"),
    line("speed x", runState.speed.toFixed(2)),
  ].join("\n");
}
