import { fbm2, hash } from '../engine/noise';

const RAMP = ' .:-=+*#%▒▓█';

/** Turn a string into a stable numeric seed. */
export const seedOf = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 4096;
};

/**
 * Generate cover artwork for a release as a block of characters.
 *
 * Every release gets art without anyone having to produce any: the seed is
 * derived from the release id, so a given record always looks like itself,
 * across reloads and across devices. Supplying a real image later is
 * strictly optional.
 *
 * Four seeded variants keep a grid of six covers from looking like six
 * samples of the same texture.
 */
export const coverFor = (id: string, cols: number, rows: number, t = 0): string => {
  const seed = seedOf(id);
  const variant = seed % 4;
  const sx = (seed % 97) * 0.37;
  const sy = (seed % 53) * 0.61;

  let out = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Correct for the character cell being about twice as tall as wide,
      // otherwise every pattern comes out vertically stretched.
      const nx = (x + sx) * 0.16;
      const ny = (y + sy) * 0.3;
      let v: number;

      switch (variant) {
        case 0: // soft dunes
          v = fbm2(nx, ny, t) * 0.5 + 0.5;
          break;
        case 1: { // concentric rings
          const dx = x / cols - 0.5;
          const dy = (y / rows - 0.5) * 0.9;
          const d = Math.sqrt(dx * dx + dy * dy);
          v = Math.abs(Math.sin(d * 14 - t * 2 + fbm2(nx, ny) * 2));
          break;
        }
        case 2: { // scan bands
          const band = Math.sin(ny * 3.1 + fbm2(nx, ny, t) * 4);
          v = band * 0.5 + 0.5;
          break;
        }
        default: { // dense static with drifting voids
          const n = fbm2(nx * 1.6, ny * 1.6, t);
          v = Math.abs(n) < 0.18 ? 0.1 : n * 0.5 + 0.5;
        }
      }

      // A touch of ordered dither keeps the ramp from banding into stripes.
      v = Math.max(0, Math.min(0.999, v + (hash(x + seed, y) - 0.5) * 0.12));
      out += RAMP[(v * RAMP.length) | 0];
    }
    if (y < rows - 1) out += '\n';
  }
  return out;
};
