import { useEffect, useRef } from 'react';
import { acts } from '../data/acnd';
import { useStage } from '../hooks/useStage';
import './ActTransition.css';

interface Props {
  activeIndex: number;
}

/**
 * The cut between acts.
 *
 * Crossing into a new section fires a short RGB-split sweep and stamps the
 * act's name across the screen — a channel change rather than a scroll. It is
 * the moment the site announces that the world has just become something else,
 * and it is what stops six sections from feeling like one long page.
 *
 * Driven by class toggles and a CSS animation rather than React state, so a
 * transition costs no re-render of the tree it is playing over.
 */
export const ActTransition = ({ activeIndex }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const { reducedMotion } = useStage();
  const first = useRef(true);

  useEffect(() => {
    // Never play on mount — arriving at act 01 is not a transition into it.
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    const label = labelRef.current;
    if (!el || !label || reducedMotion) return;

    const act = acts[activeIndex];
    if (!act) return;
    label.textContent = `${act.index} — ${act.label}`;

    // Restart the animation even if it is already running: re-adding the class
    // in the same frame is ignored, so force a reflow between removal and add.
    el.classList.remove('is-firing');
    void el.offsetWidth;
    el.classList.add('is-firing');

    const done = () => el.classList.remove('is-firing');
    el.addEventListener('animationend', done, { once: true });
    return () => el.removeEventListener('animationend', done);
  }, [activeIndex, reducedMotion]);

  return (
    <div className="xfade" ref={ref} aria-hidden="true">
      <div className="xfade__bars" />
      <span className="xfade__label" ref={labelRef} />
    </div>
  );
};
