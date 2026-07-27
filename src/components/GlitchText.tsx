import { useEffect, useRef, type ElementType } from 'react';
import { useInView } from '../hooks/useInView';
import { useStage } from '../hooks/useStage';

const SCRAMBLE = '▓▒░#%*+=-:.ACND01/\\|<>';

interface Props {
  children: string;
  /** Element to render. Headings should pass their real tag for the outline. */
  as?: ElementType;
  className?: string;
  /** Seconds the scramble takes to resolve. */
  duration?: number;
  /** Delay before it starts, in seconds. */
  delay?: number;
}

/**
 * Text that resolves out of static the first time it scrolls into view.
 *
 * The real string is rendered into the DOM up front and the animation only
 * mutates it *after* the element is in view. That ordering is deliberate: a
 * crawler that never scrolls, or that snapshots the initial paint, always
 * reads the finished copy rather than a frame of scrambled glyphs.
 */
export const GlitchText = ({
  children,
  as: Tag = 'span',
  className,
  duration = 0.75,
  delay = 0,
}: Props) => {
  const [ref, inView] = useInView<HTMLElement>('-4% 0px -4% 0px');
  const { reducedMotion, tick } = useStage();
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || done.current) return;
    if (reducedMotion) {
      done.current = true;
      return;
    }

    done.current = true;
    const final = children;
    let raf = 0;
    let start = 0;
    let lastTick = 0;

    const frame = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000 - delay;

      if (elapsed < 0) {
        raf = requestAnimationFrame(frame);
        return;
      }

      const p = Math.min(1, elapsed / duration);
      // Characters lock in left to right; everything past the front edge is
      // still static.
      const locked = Math.floor(p * final.length);

      let out = '';
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        if (i < locked || ch === ' ') out += ch;
        else out += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      }
      el.textContent = out;

      if (ts - lastTick > 70 && p < 1) {
        lastTick = ts;
        tick(2400 + Math.random() * 900, 0.05);
      }

      if (p < 1) raf = requestAnimationFrame(frame);
      else el.textContent = final;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView, children, duration, delay, reducedMotion, ref, tick]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
};
