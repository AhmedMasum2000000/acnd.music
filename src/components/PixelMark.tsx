import { useEffect, useMemo, useRef } from 'react';
import { useStage } from '../hooks/useStage';
import './PixelMark.css';

/**
 * The ACND wordmark, drawn as an SVG pixel grid.
 *
 * The previous version set block characters (█) in a monospace face inside a
 * <pre>. That looked fine at desktop size and fell apart on a phone: every
 * font carries its own side bearings, so the blocks never tile — the gaps
 * between them are uneven and the letterforms dissolve into a dot-matrix
 * smear at small sizes.
 *
 * Rectangles in an SVG have no bearings. They tile exactly, stay razor sharp
 * at any size on any DPI, and — because each cell is its own element — can be
 * animated and lit individually, which is what makes the mark feel alive
 * rather than like a pasted image.
 *
 * 5×7 cells per letter, one column of air between them. 23×7 overall.
 */
const GLYPHS = [
  '.###. .#### #...# ####.',
  '#...# #.... ##..# #...#',
  '#...# #.... ##..# #...#',
  '##### #.... #.#.# #...#',
  '#...# #.... #..## #...#',
  '#...# #.... #..## #...#',
  '#...# .#### #...# ####.',
];

const COLS = 23;
const ROWS = 7;

interface Cell {
  x: number;
  y: number;
  /** Order the cell arrives in during the intro. */
  order: number;
}

interface Props {
  /** Seconds before the first cell lands. */
  delay?: number;
  /** Cells light up and lift under the pointer. */
  reactive?: boolean;
  className?: string;
}

export const PixelMark = ({ delay = 0, reactive = true, className }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { reducedMotion } = useStage();

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (GLYPHS[y][x] === '#') out.push({ x, y, order: 0 });
      }
    }
    // A stable shuffle: the mark condenses out of nothing rather than wiping
    // in from one edge, but it does it the same way on every load.
    let seed = 0x5eed;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const shuffled = [...out];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    shuffled.forEach((c, i) => (c.order = i));
    return out;
  }, []);

  /* Cells lift and brighten near the pointer. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !reactive || reducedMotion) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const rects = Array.from(svg.querySelectorAll<SVGRectElement>('rect[data-x]'));
    let raf = 0;
    let px = -99;
    let py = -99;
    let dirty = false;

    const paint = () => {
      raf = 0;
      for (const r of rects) {
        const cx = Number(r.dataset.x) + 0.5;
        const cy = Number(r.dataset.y) + 0.5;
        const d = Math.hypot(cx - px, (cy - py) * 1.6);
        // Tight falloff — a wide one just brightens the whole mark uniformly
        // and stops reading as a response to where the hand actually is.
        const k = Math.max(0, 1 - d / 5);
        r.style.setProperty('--lit', k.toFixed(3));
      }
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const onMove = (e: PointerEvent) => {
      const b = svg.getBoundingClientRect();
      px = ((e.clientX - b.left) / b.width) * COLS;
      py = ((e.clientY - b.top) / b.height) * ROWS;
      dirty = true;
      schedule();
    };

    const onLeave = () => {
      px = -99;
      py = -99;
      if (dirty) schedule();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reactive, reducedMotion]);

  return (
    <span className={`pmark-wrap ${className ?? ''}`}>
      <svg
        ref={svgRef}
        className={`pmark ${reducedMotion ? '' : 'is-animating'}`}
        viewBox={`0 0 ${COLS} ${ROWS}`}
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="crispEdges"
        role="img"
        aria-label="ACND"
        focusable="false"
      >
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            data-x={c.x}
            data-y={c.y}
            x={c.x}
            y={c.y}
            width="1"
            height="1"
            style={{ animationDelay: `${delay + c.order * 0.011}s` }}
          />
        ))}
      </svg>
    </span>
  );
};
