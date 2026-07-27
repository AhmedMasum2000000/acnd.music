export const clamp = (v: number, min = 0, max = 1): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Frame-rate independent approach toward a target.
 *
 * A naive `lerp(current, target, 0.1)` per frame moves twice as fast at
 * 120fps as it does at 60fps, which makes the whole site feel different on
 * different hardware. This scales the step by elapsed time so the visual
 * pace is identical everywhere.
 *
 * @param halfLife seconds for the gap to close by half.
 */
export const approach = (
  current: number,
  target: number,
  halfLife: number,
  dt: number,
): number => lerp(target, current, Math.pow(2, -dt / halfLife));

/** Smooth 0→1 ramp; the classic smoothstep. */
export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Map a value from one range to another, clamped. */
export const remap = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => lerp(outMin, outMax, clamp((v - inMin) / (inMax - inMin)));
