/**
 * Projects category filter.
 *
 * Hiding rows outright makes the survivors jump to their new positions. GSAP
 * Flip records where everything was, lets the DOM change, then animates from
 * the recorded positions to the new ones — so the list reflows visibly and
 * the eye can follow a row that stayed.
 */

import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { qs, qsa } from '../lib/dom';
import { prefersReducedMotion } from '../lib/viewport';

gsap.registerPlugin(Flip);

export interface FilterHandle {
  destroy: () => void;
}

export function initFilter(scope: ParentNode = document): FilterHandle {
  const bar = qs('.filter-bar', scope);
  const list = qs('.project-list', scope);
  if (!bar || !list) return { destroy: () => {} };

  const buttons = qsa<HTMLButtonElement>('.filter-btn', bar);
  const rows = qsa<HTMLElement>('.project-row', list);
  const status = qs('#filter_status', scope);

  const apply = (category: string): void => {
    const state = Flip.getState(rows);

    let shown = 0;
    for (const row of rows) {
      const categories = (row.dataset.categories ?? '').split('|');
      const visible = category === 'all' || categories.includes(category);
      row.hidden = !visible;
      if (visible) shown += 1;
    }

    buttons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === category));
    });

    // Announced for screen readers, which get no benefit from the animation.
    if (status) {
      status.textContent = `${shown} project${shown === 1 ? '' : 's'} shown.`;
    }

    if (prefersReducedMotion()) return;

    Flip.from(state, {
      duration: 0.55,
      ease: 'power3.inOut',
      absolute: true,
      // Rows leaving and arriving cross-fade in place rather than collapsing,
      // which is what keeps the list from snapping.
      onEnter: (elements) =>
        gsap.fromTo(
          elements,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
        ),
      onLeave: (elements) =>
        gsap.to(elements, { opacity: 0, duration: 0.25, ease: 'power2.in' }),
    });
  };

  const onClick = (event: Event): void => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.filter-btn');
    if (!btn) return;
    apply(btn.dataset.filter ?? 'all');
  };

  bar.addEventListener('click', onClick);

  return { destroy: () => bar.removeEventListener('click', onClick) };
}
