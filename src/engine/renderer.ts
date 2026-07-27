import { createAtlas, paintAtlas, RAMP, RAMP_MAX, TINT_MAX, type Atlas } from './glyphAtlas';
import { MODES, cloneParams, easeParams, sampleField, type FieldEnv, type FieldParams } from './field';
import { loadPortrait, portraitReady, samplePortrait, type PortraitRegion } from './portrait';
import { approach, clamp } from '../lib/lerp';
import type { FieldMode } from '../data/acnd';

/**
 * The animation loop.
 *
 * One canvas, one rAF, everything drawn as glyph blits from the atlas.
 * React never re-renders because of this — the whole thing lives outside
 * the component tree and is driven by imperative setters, which is the only
 * way to run a 60fps loop without fighting the reconciler.
 */

const MAX_DPR = 1.5;

export interface RendererConfig {
  portraitSrc: string;
  /** Hex accent to start on. */
  accent: string;
  reducedMotion: boolean;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' +
  [r, g, b]
    .map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0'))
    .join('');

export class AsciiRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private atlas: Atlas;
  private cfg: RendererConfig;

  private cols = 0;
  private rows = 0;
  private cellW = 0;
  private cellH = 0;
  private dpr = 1;

  private params: FieldParams;
  private target: FieldParams;
  private override: Partial<FieldParams> | null = null;

  private accentRgb: [number, number, number];
  private accentTarget: [number, number, number];

  private env: FieldEnv = {
    cols: 0, rows: 0, time: 0,
    px: -999, py: -999, pointerStrength: 0,
    scrollVel: 0, audio: 0,
    portrait: null, portraitCols: 0, portraitRows: 0, reveal: 0,
  };

  private pointerTargetStrength = 0;
  private scrollVelTarget = 0;
  private audioTarget = 0;

  private raf = 0;
  private running = false;
  private lastTs = 0;
  private frameBudget = 1000 / 60;
  private acc = 0;

  private ro: ResizeObserver | null = null;
  private onVisibility: () => void;

  constructor(canvas: HTMLCanvasElement, cfg: RendererConfig) {
    this.canvas = canvas;
    this.cfg = cfg;
    this.ctx = canvas.getContext('2d', { alpha: true })!;

    this.params = cloneParams(MODES.NOISE);
    this.target = cloneParams(MODES.NOISE);
    this.accentRgb = hexToRgb(cfg.accent);
    this.accentTarget = hexToRgb(cfg.accent);

    this.atlas = createAtlas(1, 1);
    this.measure();

    this.onVisibility = () => {
      // A hidden tab must cost nothing. rAF already throttles, but stopping
      // outright also frees the timer and keeps phones from heating up when
      // the site is backgrounded.
      if (document.hidden) this.stop();
      else if (!this.cfg.reducedMotion) this.start();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(document.documentElement);
    } else {
      window.addEventListener('resize', this.measureBound);
    }

    void this.initPortrait();
  }

  private measureBound = () => this.measure();

  // ── sizing ───────────────────────────────────────────────────────────

  private measure(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const mobile = w < 768;

    // Coarser cells on phones: fewer glyphs to sample and a chunkier,
    // more deliberately pixelated look at small sizes.
    const cellW = mobile ? 8 : 11;
    const cellH = cellW * 1.9;

    const cols = Math.ceil(w / cellW) + 1;
    const rows = Math.ceil(h / cellH) + 1;

    const sizeChanged = cellW !== this.cellW || cellH !== this.cellH || dpr !== this.dpr;

    this.cellW = cellW;
    this.cellH = cellH;
    this.cols = cols;
    this.rows = rows;
    this.dpr = dpr;
    this.env.cols = cols;
    this.env.rows = rows;

    this.canvas.width = Math.ceil(w * dpr);
    this.canvas.height = Math.ceil(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    if (sizeChanged) {
      this.atlas = createAtlas(cellW * dpr, cellH * dpr);
      paintAtlas(this.atlas, rgbToHex(...this.accentRgb));
    }

    // Frame budget: phones get 45fps, which is visually smooth for this kind
    // of texture and leaves real headroom for scrolling.
    this.frameBudget = 1000 / (mobile ? 45 : 60);

    this.resamplePortrait();
    if (!this.running) this.draw(0);
  }

  // ── portrait ─────────────────────────────────────────────────────────

  /**
   * On a wide screen the portrait is confined to the right of the frame,
   * leaving the left clear for the bio column. On a phone the copy sits over
   * the image anyway (there is nowhere else for it to go), so it runs full
   * width and the act's scrim carries the legibility instead.
   */
  private portraitRegion(): PortraitRegion {
    return window.innerWidth >= 900 ? { x: 0.34, w: 0.66 } : { x: 0, w: 1 };
  }

  private async initPortrait(): Promise<void> {
    try {
      const region = this.portraitRegion();
      const p = await loadPortrait(
        this.cfg.portraitSrc,
        this.cols,
        this.rows,
        this.cellH / this.cellW,
        region,
      );
      this.env.portrait = p.lum;
      this.env.portraitCols = p.cols;
      this.env.portraitRows = p.rows;
    } catch {
      // A missing portrait is not fatal — the act still works, it just stays
      // as noise. Never let a decoding failure take the whole site down.
      this.env.portrait = null;
    }
  }

  private resamplePortrait(): void {
    const img = portraitReady();
    if (!img || this.cols === 0) return;
    const region = this.portraitRegion();
    const p = samplePortrait(img, this.cols, this.rows, this.cellH / this.cellW, region);
    this.env.portrait = p.lum;
    this.env.portraitCols = p.cols;
    this.env.portraitRows = p.rows;
  }

  // ── public controls ──────────────────────────────────────────────────

  setMode(mode: FieldMode): void {
    this.target = cloneParams(MODES[mode]);
    this.applyOverride();
  }

  /** Genre hover re-tunes the field without changing the act's mode. */
  setOverride(partial: Partial<FieldParams> | null): void {
    this.override = partial;
    this.applyOverride();
  }

  private applyOverride(): void {
    if (this.override) Object.assign(this.target, this.override);
  }

  setAccent(hex: string): void {
    this.accentTarget = hexToRgb(hex);
    if (this.cfg.reducedMotion) {
      this.accentRgb = [...this.accentTarget];
      paintAtlas(this.atlas, rgbToHex(...this.accentRgb));
      this.draw(0);
    }
  }

  setReveal(v: number): void {
    this.env.reveal = clamp(v);
    if (!this.running) this.draw(0);
  }

  setPointer(clientX: number, clientY: number): void {
    this.env.px = clientX / this.cellW;
    this.env.py = clientY / this.cellH;
    this.pointerTargetStrength = 1;
  }

  clearPointer(): void {
    this.pointerTargetStrength = 0;
  }

  setScrollVelocity(v: number): void {
    this.scrollVelTarget = clamp(v, -1, 1);
  }

  setAudioLevel(v: number): void {
    this.audioTarget = clamp(v);
  }

  setReducedMotion(reduced: boolean): void {
    this.cfg.reducedMotion = reduced;
    if (reduced) {
      this.stop();
      this.params = cloneParams(this.target);
      this.accentRgb = [...this.accentTarget];
      paintAtlas(this.atlas, rgbToHex(...this.accentRgb));
      this.draw(0);
    } else {
      this.start();
    }
  }

  // ── loop ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.running || this.cfg.reducedMotion || document.hidden) return;
    this.running = true;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy(): void {
    this.stop();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.ro?.disconnect();
    window.removeEventListener('resize', this.measureBound);
  }

  private tick = (ts: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);

    // Clamp dt so a backgrounded tab or a long GC pause doesn't teleport the
    // animation forward when it resumes.
    const dt = Math.min((ts - this.lastTs) / 1000, 0.1);
    this.lastTs = ts;

    this.acc += dt * 1000;
    if (this.acc < this.frameBudget) return;
    this.acc = 0;

    this.update(dt);
    this.draw(dt);
  };

  private update(dt: number): void {
    this.env.time += dt;

    easeParams(this.params, this.target, 0.22, dt);

    this.env.pointerStrength = approach(
      this.env.pointerStrength,
      this.pointerTargetStrength,
      0.18,
      dt,
    );
    this.env.scrollVel = approach(this.env.scrollVel, this.scrollVelTarget, 0.1, dt);
    this.env.audio = approach(this.env.audio, this.audioTarget, 0.08, dt);

    // Scroll velocity decays on its own; the scroll handler only ever pushes
    // it upward, so releasing the wheel lets the tear settle out.
    this.scrollVelTarget *= Math.pow(0.02, dt);

    // Ease the accent, and only repaint the atlas when the colour has moved
    // far enough to be visible. Repainting every frame would mean 96 extra
    // fillText calls per frame for a change nobody can see.
    let moved = 0;
    for (let i = 0; i < 3; i++) {
      const next = approach(this.accentRgb[i], this.accentTarget[i], 0.2, dt);
      moved = Math.max(moved, Math.abs(next - this.accentRgb[i]));
      this.accentRgb[i] = next;
    }
    if (moved > 1.2) paintAtlas(this.atlas, rgbToHex(...this.accentRgb));
  }

  private draw(_dt: number): void {
    const { ctx, atlas, dpr, cols, rows } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const tw = atlas.tileW;
    const th = atlas.tileH;
    const stepX = this.cellW * dpr;
    const stepY = this.cellH * dpr;
    const f = this.params;
    const e = this.env;

    for (let cy = 0; cy < rows; cy++) {
      const y = cy * stepY;
      for (let cx = 0; cx < cols; cx++) {
        const v = sampleField(f, e, cx, cy);
        if (v < 0.06) continue; // empty cell — nothing to blit

        const g = Math.min(RAMP_MAX, (v * RAMP.length) | 0);
        if (g === 0) continue;

        // Brightness climbs much more slowly than density. Glyph *shape*
        // carries the texture; colour is reserved for the rare peaks, which
        // is what keeps the field reading as atmosphere behind the copy
        // instead of competing with it.
        const t = Math.min(TINT_MAX, (v * v * (TINT_MAX + 1)) | 0);

        ctx.drawImage(atlas.canvas, g * tw, t * th, tw, th, cx * stepX, y, tw, th);
      }
    }
  }
}
