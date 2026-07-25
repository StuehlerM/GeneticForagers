import type { StatsSample } from "../domain/stats";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PolylineOptions {
  readonly width: number;
  readonly height: number;
  /** Explicit value range; defaults to the data's own min/max. */
  readonly min?: number;
  readonly max?: number;
}

/**
 * Maps a numeric series to evenly-spaced points fitting a `width`×`height` box,
 * with the largest value at the top (y = 0) and the smallest at the bottom. A
 * flat series (or a single value) is drawn along the vertical midline.
 */
export function seriesToPolyline(
  values: readonly number[],
  options: PolylineOptions,
): Point[] {
  const n = values.length;
  if (n === 0) {
    return [];
  }
  const min = options.min ?? Math.min(...values);
  const max = options.max ?? Math.max(...values);
  const range = max - min;
  const stepX = n === 1 ? 0 : options.width / (n - 1);

  return values.map((value, i) => ({
    x: i * stepX,
    y:
      range === 0
        ? options.height / 2
        : options.height - ((value - min) / range) * options.height,
  }));
}

/** Pulls one numeric field out of a sample history into a plain series. */
export function extractSeries(
  samples: readonly StatsSample[],
  key: NumericSampleKey,
): number[] {
  return samples.map((sample) => sample[key]);
}

/** Keys of StatsSample whose values are numbers (all of them, currently). */
export type NumericSampleKey = {
  [K in keyof StatsSample]: StatsSample[K] extends number ? K : never;
}[keyof StatsSample];
