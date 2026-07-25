import { getBiomeConfig } from "../domain/biome";
import type { Simulation } from "../domain/simulation";
import { FORAGER_RGB, rgbToCss, tileColor } from "./colors";
import type { Renderer } from "./renderer";

const MIN_FORAGER_PX = 2;

/** Renders the world tiles and foragers onto a 2D canvas context. */
export class Canvas2DRenderer implements Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tileSize: number;

  constructor(ctx: CanvasRenderingContext2D, tileSize: number) {
    this.ctx = ctx;
    this.tileSize = tileSize;
  }

  render(sim: Simulation): void {
    this.drawTiles(sim);
    this.drawForagers(sim);
  }

  private drawTiles(sim: Simulation): void {
    const { world } = sim;
    const tileSize = this.tileSize;
    const ctx = this.ctx;
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.tileAt(x, y);
        const cap = getBiomeConfig(tile.biome).maxFood;
        const ratio = cap > 0 ? tile.food / cap : 0;
        ctx.fillStyle = tileColor(tile.biome, ratio);
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  private drawForagers(sim: Simulation): void {
    const ctx = this.ctx;
    ctx.fillStyle = rgbToCss(FORAGER_RGB);
    for (const forager of sim.foragers) {
      const size = Math.max(MIN_FORAGER_PX, forager.traits.size * this.tileSize);
      const px = forager.agent.x * this.tileSize + (this.tileSize - size) / 2;
      const py = forager.agent.y * this.tileSize + (this.tileSize - size) / 2;
      ctx.fillRect(px, py, size, size);
    }
  }
}
