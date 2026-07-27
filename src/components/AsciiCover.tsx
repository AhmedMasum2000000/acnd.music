import { useEffect, useRef } from 'react';
import { coverFor } from '../lib/asciiArt';
import { useStage } from '../hooks/useStage';

interface Props {
  id: string;
  cols?: number;
  rows?: number;
  /** Animate continuously rather than only while hovered. */
  live?: boolean;
  className?: string;
}

/**
 * Generated cover art, rendered as a single <pre>.
 *
 * One text node per cover rather than a span per cell: a grid of six covers
 * at 30×14 would otherwise be 2,500 elements for the browser to lay out and
 * style. The colour comes from a gradient clipped to the text, which costs
 * nothing extra.
 *
 * Animation only runs while a cover is hovered, so an idle catalogue costs
 * zero frames.
 */
export const AsciiCover = ({ id, cols = 30, rows = 14, live = false, className }: Props) => {
  const ref = useRef<HTMLPreElement>(null);
  const { reducedMotion } = useStage();
  const running = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = coverFor(id, cols, rows, 0);
  }, [id, cols, rows]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    let raf = 0;
    let t = 0;

    const frame = () => {
      t += 0.028;
      el.textContent = coverFor(id, cols, rows, t);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running.current) return;
      running.current = true;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running.current = false;
      cancelAnimationFrame(raf);
      el.textContent = coverFor(id, cols, rows, t);
    };

    if (live) {
      start();
      return stop;
    }

    const host = el.closest('[data-cover-host]') ?? el;
    host.addEventListener('pointerenter', start);
    host.addEventListener('pointerleave', stop);
    host.addEventListener('focusin', start);
    host.addEventListener('focusout', stop);

    return () => {
      stop();
      host.removeEventListener('pointerenter', start);
      host.removeEventListener('pointerleave', stop);
      host.removeEventListener('focusin', start);
      host.removeEventListener('focusout', stop);
    };
  }, [id, cols, rows, live, reducedMotion]);

  return <pre ref={ref} className={`ascii-cover ${className ?? ''}`} aria-hidden="true" />;
};
