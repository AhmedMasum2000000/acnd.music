import { useEffect, useRef, type RefObject } from 'react';
import { clamp } from '../lib/lerp';

/**
 * Reports how far the visitor has travelled through a section, 0 → 1,
 * measured from the moment its top reaches the bottom of the viewport to the
 * moment its bottom leaves the top.
 *
 * The value is delivered through a callback rather than React state on
 * purpose: this fires on every scroll frame, and routing that through a
 * `setState` would re-render the tree ~60 times a second. Consumers push the
 * number straight into the renderer instead.
 */
export const useSectionProgress = <T extends HTMLElement>(
  onProgress: (p: number) => void,
): RefObject<T> => {
  const ref = useRef<T>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;
    let active = true;

    const compute = () => {
      ticking = false;
      const el2 = ref.current;
      if (!el2 || !active) return;
      const r = el2.getBoundingClientRect();
      const vh = window.innerHeight;
      const span = r.height + vh;
      if (span <= 0) return;
      cb.current(clamp((vh - r.top) / span));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    // Only listen while the section is anywhere near the viewport. Six
    // sections each running a scroll handler for the whole page is six times
    // the work for no benefit.
    const io = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        if (active) compute();
      },
      { rootMargin: '50% 0px 50% 0px' },
    );
    io.observe(el);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    compute();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return ref;
};
