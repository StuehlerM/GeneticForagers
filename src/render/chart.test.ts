import { describe, expect, it } from "vitest";
import type { StatsSample } from "../domain/stats";
import { extractSeries, seriesToPolyline } from "./chart";

describe("seriesToPolyline", () => {
  it("returns no points for an empty series", () => {
    expect(seriesToPolyline([], { width: 100, height: 50 })).toEqual([]);
  });

  it("places a single value on the vertical midline", () => {
    expect(seriesToPolyline([42], { width: 100, height: 50 })).toEqual([
      { x: 0, y: 25 },
    ]);
  });

  it("spreads points across the width with min at the bottom, max at the top", () => {
    const points = seriesToPolyline([0, 10], { width: 100, height: 50 });
    expect(points[0]).toEqual({ x: 0, y: 50 }); // min -> bottom
    expect(points[1]).toEqual({ x: 100, y: 0 }); // max -> top
  });

  it("draws a flat series along the midline", () => {
    const points = seriesToPolyline([5, 5, 5], { width: 80, height: 40 });
    expect(points.map((p) => p.y)).toEqual([20, 20, 20]);
    expect(points.map((p) => p.x)).toEqual([0, 40, 80]);
  });

  it("honours an explicit value range", () => {
    const points = seriesToPolyline([5], { width: 10, height: 100, min: 0, max: 10 });
    expect(points[0]).toEqual({ x: 0, y: 50 });
  });
});

describe("extractSeries", () => {
  it("pulls one numeric field from a sample history", () => {
    const samples = [
      { population: 3 } as StatsSample,
      { population: 7 } as StatsSample,
    ];
    expect(extractSeries(samples, "population")).toEqual([3, 7]);
  });
});
