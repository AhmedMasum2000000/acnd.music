/**
 * Cheap 2D value noise.
 *
 * Deliberately not simplex and deliberately not a dependency. The field
 * renderer calls this up to ~7000 times per frame, so the shape of the
 * function matters more than its mathematical elegance:
 *
 *  - a 256-entry permutation table with a doubled tail means the wrap is a
 *    bitmask (`& 255`) instead of a modulo,
 *  - gradients are baked into a lookup rather than computed,
 *  - everything is a plain number; no allocations happen per call, so the
 *    GC never runs mid-animation.
 *
 * The result is smooth enough to read as organic and fast enough to run on
 * a mid-range phone at 45fps.
 */

const PERM = new Uint8Array(512);
const GRAD_X = new Float32Array(512);
const GRAD_Y = new Float32Array(512);

/** Deterministic PRNG so the field looks identical on every load. */
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

{
  const rand = mulberry32(0xacd0);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher–Yates
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    const v = p[i & 255];
    PERM[i] = v;
    const angle = (v / 256) * Math.PI * 2;
    GRAD_X[i] = Math.cos(angle);
    GRAD_Y[i] = Math.sin(angle);
  }
}

/** Quintic fade — smoother second derivative than the cubic version. */
const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Gradient noise at (x, y). Returns roughly -1..1.
 * `z` offsets the permutation lookup, which is a cheap way to get a third
 * dimension (we use it for time) without tripling the cost.
 */
export const noise2 = (x: number, y: number, z = 0): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const X = xi & 255;
  const Y = yi & 255;
  const Z = z & 255;

  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[(PERM[(X + Z) & 255] + Y) & 255];
  const ab = PERM[(PERM[(X + Z) & 255] + Y + 1) & 255];
  const ba = PERM[(PERM[(X + 1 + Z) & 255] + Y) & 255];
  const bb = PERM[(PERM[(X + 1 + Z) & 255] + Y + 1) & 255];

  const d00 = GRAD_X[aa] * xf + GRAD_Y[aa] * yf;
  const d01 = GRAD_X[ab] * xf + GRAD_Y[ab] * (yf - 1);
  const d10 = GRAD_X[ba] * (xf - 1) + GRAD_Y[ba] * yf;
  const d11 = GRAD_X[bb] * (xf - 1) + GRAD_Y[bb] * (yf - 1);

  const x1 = d00 + u * (d10 - d00);
  const x2 = d01 + u * (d11 - d01);
  return x1 + v * (x2 - x1);
};

/**
 * Two octaves of noise. Three-plus octaves is where the frame budget starts
 * to hurt on mobile, and the visual gain past two is marginal at glyph
 * resolution — the character ramp quantises the detail away anyway.
 */
export const fbm2 = (x: number, y: number, z = 0): number =>
  noise2(x, y, z) * 0.65 + noise2(x * 2.17, y * 2.17, z + 31) * 0.35;

/** Cheap deterministic hash in 0..1 — used for per-cell jitter and glitch. */
export const hash = (x: number, y: number): number => {
  const h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
};
