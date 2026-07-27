import { useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Interactive elements lean toward the pointer as it approaches.
 *
 * The pull is small — a few pixels — and that is the point: it registers as
 * the interface noticing you rather than as things sliding around. It reads
 * as responsiveness, not decoration.
 *
 * Attached once at the root by delegation rather than per component, so
 * adding a button anywhere on the site gets the behaviour for free and no
 * component carries a listener it did not ask for.
 */
export const useMagnetic = (selector = '[data-magnetic]', strength = 0.28) => {
  const reduced = useReducedMotion();

  useEffect(() => {
    // Pointless without a hovering pointer, and on touch it would leave
    // elements stuck off-centre after a tap.
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

    let raf = 0;
    let pending: PointerEvent | null = null;
    const active = new Set<HTMLElement>();

    const apply = () => {
      raf = 0;
      const e = pending;
      if (!e) return;

      const els = document.querySelectorAll<HTMLElement>(selector);
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        // The field of influence scales with the element, so a big card pulls
        // from further away than a small link without needing its own tuning.
        const reach = Math.max(r.width, r.height) * 0.9 + 40;
        const d = Math.hypot(dx, dy);

        if (d < reach) {
          const k = (1 - d / reach) * strength;
          el.style.transform = `translate(${(dx * k).toFixed(2)}px, ${(dy * k).toFixed(2)}px)`;
          active.add(el);
        } else if (active.has(el)) {
          el.style.transform = '';
          active.delete(el);
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      pending = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const reset = () => {
      for (const el of active) el.style.transform = '';
      active.clear();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', reset);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', reset);
      if (raf) cancelAnimationFrame(raf);
      reset();
    };
  }, [selector, strength, reduced]);
};
