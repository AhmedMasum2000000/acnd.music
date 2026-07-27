import { useEffect, useRef } from 'react';
import { useStage } from '../hooks/useStage';
import './Overlays.css';

/**
 * Scanlines, vignette and grain.
 *
 * All three are CSS on a single fixed layer, not extra canvas work. They do
 * a disproportionate amount of the aesthetic lifting: the vignette focuses
 * attention on the centre of the page, and the scanlines are what make a
 * character grid read as a CRT rather than as a web page in a mono font.
 */
export const Overlays = () => (
  <div className="fx" aria-hidden="true">
    <div className="fx__scan" />
    <div className="fx__vignette" />
  </div>
);

/**
 * A custom cursor: a bracketed reticle that snaps onto interactive elements.
 *
 * Driven by direct style writes rather than React state — a cursor that
 * re-rendered the tree on every pointer move would be the single most
 * expensive thing on the page.
 */
export const Cursor = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useStage();

  useEffect(() => {
    // Touch devices have no cursor to replace, and coarse pointers would
    // just leave a stale reticle sitting wherever the last tap landed.
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const el = ref.current;
    if (!el) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        el.classList.add('is-on');
      }
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('a, button, [data-cursor="grab"]');
      el.classList.toggle('is-hot', Boolean(interactive));
    };

    const onLeave = () => {
      visible = false;
      el.classList.remove('is-on');
    };

    // A trailing cursor (rather than a pinned one) is what gives it weight.
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const k = reducedMotion ? 1 : 0.22;
      x += (tx - x) * k;
      y += (ty - y) * k;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <div className="cursor" ref={ref} aria-hidden="true">
      <span className="cursor__b">[</span>
      <span className="cursor__dot">+</span>
      <span className="cursor__b">]</span>
    </div>
  );
};
