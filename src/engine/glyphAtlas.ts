/**
 * Pre-rendered glyph atlas.
 *
 * The renderer draws up to ~7000 cells per frame. Calling `fillText` that
 * many times at 60fps means ~420,000 text rasterisations per second, which
 * will pin a desktop CPU and simply will not run on a phone.
 *
 * Instead every glyph is rasterised once, in every tint we use, into an
 * offscreen canvas. The hot loop then does nothing but `drawImage` — a
 * straight blit the GPU is happy with. Rebuilding only happens on resize,
 * DPR change, or when the accent colour changes between acts.
 *
 * Atlas layout: glyphs run left→right, tints run top→bottom.
 *
 *        ' '   '.'   ':'   ...   '█'
 *   t0 [     ][     ][     ]...[     ]   dimmest
 *   t1 [     ][     ][     ]...[     ]
 *   ..
 *   t5 [     ][     ][     ]...[     ]   full accent
 */

/**
 * Light → heavy. Sixteen entries so the field value maps to an index with
 * a single multiply-and-floor, and so the density curve has enough steps to
 * read as a gradient rather than a set of bands.
 *
 * The tail uses Unicode block elements for the pixel-art weight; every
 * monospace face we fall back to (DejaVu Mono on Linux, Menlo on Apple,
 * Consolas on Windows) carries U+2591–2593 and U+2588.
 */
export const RAMP = [
  ' ',
  '.',
  "'",
  ':',
  '-',
  '~',
  '=',
  '+',
  'o',
  '*',
  'x',
  '#',
  '%',
  '▒',
  '▓',
  '█',
] as const;

export const RAMP_MAX = RAMP.length - 1;

/** Number of brightness steps baked into the atlas. */
export const TINTS = 6;
export const TINT_MAX = TINTS - 1;

export interface Atlas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Tile size in device pixels. */
  tileW: number;
  tileH: number;
  /** The accent this atlas currently carries, so we know when to repaint. */
  accent: string;
}

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.trim().replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
};

const mix = (a: [number, number, number], b: [number, number, number], t: number): string => {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
};

/**
 * Build the tint ladder: near-invisible at the bottom, saturated accent in
 * the middle, blown out toward bone at the top. That curve is what makes
 * the field look lit rather than flat — the brightest cells read as the
 * light source and everything else falls away into the dark.
 */
const buildTints = (accent: string): string[] => {
  const base = parseHex('#12121a');
  const acc = parseHex(accent);
  const hot = parseHex('#ffffff');
  const out: string[] = [];
  for (let i = 0; i < TINTS; i++) {
    const t = i / TINT_MAX;
    out.push(t < 0.72 ? mix(base, acc, t / 0.72) : mix(acc, hot, (t - 0.72) / 0.28));
  }
  return out;
};

/**
 * Allocate the atlas surface. Only called on resize or DPR change.
 *
 * @param cellW cell width in device pixels
 * @param cellH cell height in device pixels
 */
export const createAtlas = (cellW: number, cellH: number): Atlas => {
  const tileW = Math.max(1, Math.ceil(cellW));
  const tileH = Math.max(1, Math.ceil(cellH));

  const canvas = document.createElement('canvas');
  canvas.width = tileW * RAMP.length;
  canvas.height = tileH * TINTS;

  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Slightly larger than the cell so heavy glyphs fill it edge to edge and
  // the field reads as a continuous surface rather than a dotted grid.
  const fontPx = Math.round(tileH * 0.92);
  ctx.font = `${fontPx}px "VT323", ui-monospace, "DejaVu Sans Mono", Menlo, Consolas, monospace`;

  return { canvas, ctx, tileW, tileH, accent: '' };
};

/**
 * Repaint the ramp in a new accent. Separate from allocation because the
 * accent eases continuously between acts, so this runs many times per
 * transition while the surface itself never changes size.
 */
export const paintAtlas = (atlas: Atlas, accent: string): void => {
  const { ctx, tileW, tileH } = atlas;
  ctx.clearRect(0, 0, atlas.canvas.width, atlas.canvas.height);

  const tints = buildTints(accent);
  for (let t = 0; t < TINTS; t++) {
    ctx.fillStyle = tints[t];
    for (let g = 0; g < RAMP.length; g++) {
      if (RAMP[g] === ' ') continue; // blank tile stays transparent
      ctx.fillText(RAMP[g], g * tileW + tileW / 2, t * tileH + tileH / 2);
    }
  }
  atlas.accent = accent;
};

export const buildAtlas = (cellW: number, cellH: number, accent: string): Atlas => {
  const atlas = createAtlas(cellW, cellH);
  paintAtlas(atlas, accent);
  return atlas;
};
