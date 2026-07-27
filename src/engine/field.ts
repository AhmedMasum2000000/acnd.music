import { fbm2, hash, noise2 } from './noise';
import { approach, clamp } from '../lib/lerp';
import type { FieldMode } from '../data/acnd';

/**
 * The field is one scalar surface over a character grid. Every act does not
 * get its own renderer — it gets its own set of *weights*, and those weights
 * are eased toward continuously.
 *
 * That single decision is what makes the site feel alive rather than
 * sectioned: the world is always mid-transformation between two states, so
 * no two moments ever look quite the same, and moving between acts reads as
 * the world *changing* rather than a hard cut between two backgrounds.
 */
export interface FieldParams {
  /** How fast the field evolves in time. */
  speed: number;
  /** Spatial frequency. Low is wide and smooth, high is tight and grainy. */
  scale: number;
  /** Displacement and glitch amount. */
  turbulence: number;

  /* Layer weights — these are what actually differ between modes. */
  noiseW: number;
  rainW: number;
  waveW: number;
  gridW: number;
  tunnelW: number;
  portraitW: number;

  /** Overall brightness multiplier for the act. */
  gain: number;
  /** Vertical drift, cells per second. */
  driftY: number;
}

export const MODES: Record<FieldMode, FieldParams> = {
  // Formless static. The gate, and the dissolve at the end.
  NOISE: {
    speed: 0.9, scale: 0.11, turbulence: 0.5,
    noiseW: 1, rainW: 0, waveW: 0, gridW: 0, tunnelW: 0, portraitW: 0,
    gain: 0.82, driftY: 0,
  },
  // Falling glyph columns. Rain on a Dhaka street, and a signal arriving.
  RAIN: {
    speed: 1.15, scale: 0.08, turbulence: 0.22,
    noiseW: 0.28, rainW: 1, waveW: 0, gridW: 0, tunnelW: 0, portraitW: 0,
    gain: 0.95, driftY: 0,
  },
  // The photograph, dithered. Noise resolves into a face.
  PORTRAIT: {
    speed: 0.35, scale: 0.05, turbulence: 0.08,
    noiseW: 0.16, rainW: 0.06, waveW: 0, gridW: 0, tunnelW: 0, portraitW: 1,
    // Weight and gain multiply, so their product has to stay near 1. Push it
    // past that and every mid-tone clips to solid white, which erases exactly
    // the tonal range a face is made of.
    gain: 1.02, driftY: 0,
  },
  // Broad horizontal bands — a spectrum analyser stretched across the page.
  WAVE: {
    speed: 0.75, scale: 0.06, turbulence: 0.3,
    noiseW: 0.3, rainW: 0, waveW: 1, gridW: 0, tunnelW: 0, portraitW: 0,
    gain: 0.9, driftY: 0,
  },
  // Lattice. Order asserting itself over the noise — the catalogue.
  GRID: {
    speed: 0.5, scale: 0.07, turbulence: 0.15,
    noiseW: 0.25, rainW: 0, waveW: 0, gridW: 1, tunnelW: 0, portraitW: 0,
    gain: 0.78, driftY: 0,
  },
  // Radial rings pulling toward the centre. Forward motion, a mix building.
  TUNNEL: {
    speed: 0.85, scale: 0.09, turbulence: 0.25,
    noiseW: 0.22, rainW: 0, waveW: 0, gridW: 0, tunnelW: 1, portraitW: 0,
    gain: 0.88, driftY: 0,
  },
};

export const cloneParams = (p: FieldParams): FieldParams => ({ ...p });

/** Ease every parameter toward the target set. Frame-rate independent. */
export const easeParams = (
  current: FieldParams,
  target: FieldParams,
  halfLife: number,
  dt: number,
): void => {
  const keys = Object.keys(current) as (keyof FieldParams)[];
  for (const k of keys) current[k] = approach(current[k], target[k], halfLife, dt);
};

/** Everything the field needs to know about the outside world this frame. */
export interface FieldEnv {
  cols: number;
  rows: number;
  time: number;
  /** Pointer position in grid coordinates. */
  px: number;
  py: number;
  /** 0 when the pointer is idle or absent, 1 while actively moving. */
  pointerStrength: number;
  /** Signed scroll velocity, normalised to roughly -1..1. */
  scrollVel: number;
  /** Live audio amplitude 0..1. Zero unless the visitor enabled sound. */
  audio: number;
  /** Portrait luminance, cols*rows, or null when not loaded. */
  portrait: Float32Array | null;
  /** Portrait grid dimensions — may lag a resize by a frame. */
  portraitCols: number;
  portraitRows: number;
  /**
   * How far the portrait has resolved out of the noise, 0..1. Driven
   * directly by scroll position rather than eased, because the whole point
   * is that the visitor's scrolling is what develops the image.
   */
  reveal: number;
}

/**
 * Sample the field at one cell. Returns 0..1.
 *
 * Called cols*rows times per frame, so this is the hottest function on the
 * site. Layers are gated on their weight being non-trivial — the branches
 * are perfectly predictable because a weight is the same for every cell in
 * a frame, so the cost of skipping an inactive layer is effectively zero.
 */
export const sampleField = (f: FieldParams, e: FieldEnv, cx: number, cy: number): number => {
  const t = e.time;
  let v = 0;

  // Turbulence displaces the sample point rather than the output, which
  // makes the surface look like it is being physically pushed around.
  const tur = f.turbulence * (0.5 + e.audio * 1.5);
  let sx = cx;
  let sy = cy;
  if (tur > 0.01) {
    const w = noise2(cx * 0.03, cy * 0.03 + t * 0.4) * tur * 6;
    sx += w;
    sy += w * 0.4;
  }

  const nx = sx * f.scale;
  const ny = sy * f.scale;
  const tz = t * f.speed;

  if (f.noiseW > 0.001) {
    // Noise recedes as the portrait resolves — the static is what the face
    // emerges *from*, so it has to get out of the way as `reveal` climbs.
    const veil = 1 - f.portraitW * e.reveal * 0.7;
    v += (fbm2(nx, ny + f.driftY * t, tz) * 0.5 + 0.5) * f.noiseW * veil;
  }

  if (f.rainW > 0.001) {
    // Each column falls at its own rate with its own phase, which is what
    // separates "rain" from "a texture scrolling downward".
    const h = hash(cx, 7);
    const speed = 0.35 + h * 0.9;
    const phase = (cy / e.rows - t * f.speed * speed * 0.5 + h) % 1;
    const d = phase < 0 ? phase + 1 : phase;
    // Bright head, exponential tail. Scaled so a head at full strength still
    // leaves headroom — rain that saturates to solid white stops reading as
    // rain and starts obliterating the copy sitting on top of it.
    const streak = Math.pow(1 - d, 9) * 0.4 + Math.pow(1 - d, 30) * 0.34;
    v += streak * f.rainW;
  }

  if (f.waveW > 0.001) {
    // Stacked sines at unrelated frequencies read as a spectrum rather than
    // a single rolling wave.
    const band =
      Math.sin(ny * 4.2 + tz * 1.6 + noise2(nx * 0.6, 0, tz) * 3) * 0.5 +
      Math.sin(ny * 9.1 - tz * 1.1 + nx * 0.8) * 0.3;
    v += (band * 0.5 + 0.5) * f.waveW;
  }

  if (f.gridW > 0.001) {
    // A lattice that breathes: lines on every 5th cell, with a slow pulse
    // travelling diagonally across the intersections.
    const gx = cx % 5 === 0 ? 1 : 0;
    const gy = cy % 5 === 0 ? 1 : 0;
    const pulse = Math.sin((cx + cy) * 0.12 - tz * 1.4) * 0.5 + 0.5;
    const node = gx && gy ? 1 : 0;
    v += ((gx | gy) * 0.34 + node * 0.42) * (0.45 + pulse * 0.55) * f.gridW;
  }

  if (f.tunnelW > 0.001) {
    const dx = (cx - e.cols * 0.5) / e.cols;
    const dy = (cy - e.rows * 0.5) / e.rows;
    const dist = Math.sqrt(dx * dx + dy * dy * 2.4);
    const ring = (dist * 6 - tz * 0.9) % 1;
    const r = ring < 0 ? ring + 1 : ring;
    const spokes = Math.sin(Math.atan2(dy, dx) * 8 + tz) * 0.5 + 0.5;
    v += (Math.pow(1 - r, 3) * 0.75 + spokes * 0.25) * clamp(dist * 2.6) * f.tunnelW;
  }

  if (f.portraitW > 0.001 && e.portrait) {
    // Grid dimensions can lag a resize by one frame; sample defensively
    // rather than risk reading past the end of the buffer.
    const ix = ((cx / e.cols) * e.portraitCols) | 0;
    const iy = ((cy / e.rows) * e.portraitRows) | 0;
    const idx = iy * e.portraitCols + ix;
    const lum = idx >= 0 && idx < e.portrait.length ? e.portrait[idx] : 0;
    // Dither: a per-cell threshold jitter that shrinks as the reveal
    // completes, so the face crystallises out of grain instead of fading in.
    const grain = (hash(cx, cy) - 0.5) * (1 - e.reveal) * 0.9;
    v += (lum + grain) * f.portraitW * e.reveal;
  }

  v = clamp(v * f.gain);

  /*
    ── interaction ──────────────────────────────────────────────────────
    Everything below is screen-blended (`v + k(1 - v)`) rather than added.

    Added, these three would stack on top of a portrait cell that is already
    near 1.0 and clip it to solid white — which is exactly what turns the
    pointer into a blown-out blob sitting over the artist's face. Screen
    blending lifts the dark parts of the field hard, barely touches the
    bright ones, and can never exceed 1.
  */

  // The pointer pushes a bright ring outward. This is the single most
  // important line for "feels alive": it ties the visitor's hand to the art.
  if (e.pointerStrength > 0.01) {
    const dx = cx - e.px;
    const dy = (cy - e.py) * 1.9; // cells are tall, correct for aspect
    const d = Math.sqrt(dx * dx + dy * dy);
    const ring = Math.exp(-Math.pow((d - 7) / 10, 2));
    const core = Math.exp(-(d * d) / 70);
    const k = clamp((ring * 0.34 + core * 0.4) * e.pointerStrength);
    v += k * (1 - v);
  }

  // Fast scrolling tears the field horizontally — motion you can feel.
  const sv = e.scrollVel < 0 ? -e.scrollVel : e.scrollVel;
  if (sv > 0.02) {
    const k = clamp(Math.abs(noise2(cy * 0.5, t * 6)) * sv * 0.6);
    v += k * (1 - v);
  }

  // Audio lifts the whole surface, so the field breathes with the music.
  if (e.audio > 0.01) v += e.audio * 0.28 * (1 - v);

  return v;
};
