import type { Simulation } from "../domain/simulation";

/** Draws a simulation frame. Implementations own their target (canvas, etc.). */
export interface Renderer {
  render(sim: Simulation): void;
}
