/**
 * Signed shortest offset from `a` to `b` on a wrapped axis of length `size`.
 * The result lies in [-size/2, size/2), so movement/perception take the short
 * way around the seam instead of the long way across the grid.
 */
export function toroidalDelta(a: number, b: number, size: number): number {
  let delta = (b - a) % size;
  if (delta < -size / 2) {
    delta += size;
  } else if (delta >= size / 2) {
    delta -= size;
  }
  return delta;
}
