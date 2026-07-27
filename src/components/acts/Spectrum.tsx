import { useState } from 'react';
import { actIndex, genres } from '../../data/acnd';
import { GlitchText } from '../GlitchText';
import { useStage } from '../../hooks/useStage';
import { readVar } from '../../lib/css';

/**
 * Act 03 — THE SPECTRUM.
 *
 * Five genres, five different behaviours for the entire background. Hovering
 * "AMBIENT" makes the whole world go slow and wide; "DRUM & BASS" makes it
 * frantic. It is the clearest demonstration on the site that the visitor is
 * driving the thing, and it teaches the interaction model for everything
 * that follows.
 */
export const Spectrum = () => {
  const { tune, tick } = useStage();
  const [active, setActive] = useState<number | null>(null);

  const focus = (i: number) => {
    const g = genres[i];
    setActive(i);
    tune(
      { speed: g.field.speed, scale: g.field.scale, turbulence: g.field.turbulence },
      readVar(g.field.accent),
    );
    tick(1200 + i * 260, 0.1);
  };

  const blur = () => {
    setActive(null);
    tune(null);
  };

  return (
    <section
      id="spectrum"
      className="act act--spectrum"
      aria-labelledby="spectrum-h"
      onPointerLeave={blur}
    >
      <div className="shell">
        <p className="label">{actIndex('spectrum')} — THE SPECTRUM</p>
        <GlitchText as="h2" className="display act__h" duration={0.7}>
          FIVE WAYS TO FEEL IT
        </GlitchText>
        <p className="act__lede">
          The sound moves between five rooms. Touch one and the whole page moves with it.
        </p>

        <ul className="spectrum__list">
          {genres.map((g, i) => (
            <li key={g.name}>
              <button
                type="button"
                className={`spectrum__item ${active === i ? 'is-active' : ''}`}
                onPointerEnter={() => focus(i)}
                onFocus={() => focus(i)}
                onBlur={blur}
                aria-describedby={`genre-line-${i}`}
              >
                <span className="spectrum__idx label">{String(i + 1).padStart(2, '0')}</span>
                <span className="display spectrum__name">{g.name}</span>
                <span id={`genre-line-${i}`} className="spectrum__line">
                  {g.line}
                </span>
                <span className="spectrum__bar" aria-hidden="true">
                  {'█'.repeat(Math.round(g.field.speed * 6) + 2)}
                  {'░'.repeat(14 - Math.round(g.field.speed * 6))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
