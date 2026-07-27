import { actIndex, artist } from '../../data/acnd';
import { GlitchText } from '../GlitchText';
import { PixelMark } from '../PixelMark';
import { useStage } from '../../hooks/useStage';

/**
 * Act 01 — SIGNAL.
 *
 * The first screen has one job: land the name, the discipline and the place
 * in about two seconds, then point downward. Everything else is atmosphere.
 */
export const Hero = () => {
  const { tick } = useStage();

  return (
    <section id="signal" className="act act--hero" aria-labelledby="hero-name">
      <div className="shell hero__grid">
        <p className="label hero__eyebrow">{actIndex('signal')} — SIGNAL</p>

        {/*
          The visible mark is a graphic, so the heading carries the real text
          for crawlers and screen readers and the SVG is decorative alongside it.
        */}
        <h1 id="hero-name" className="hero__name">
          <span className="visually-hidden">{artist.name}</span>
          <PixelMark delay={0.1} />
        </h1>

        <p className="hero__legal mono">{artist.legalName}</p>

        <div className="hero__lines" aria-hidden="true">
          {artist.heroLines.map((line, i) => (
            <GlitchText
              key={line}
              as="span"
              className="display hero__line"
              delay={0.25 + i * 0.13}
              duration={0.6}
            >
              {line}
            </GlitchText>
          ))}
        </div>

        <p className="hero__tagline">{artist.tagline}</p>

        <ul className="hero__meta label">
          <li>{artist.role}</li>
          <li aria-hidden="true">·</li>
          <li>{artist.origin}</li>
        </ul>

        <a data-magnetic className="hero__cue" href="#artist" onClick={() => tick(700, 0.16)}>
          <span className="hero__cue-text label">BEGIN THE JOURNEY</span>
          <span className="hero__cue-arrow" aria-hidden="true">
            ▼
          </span>
        </a>
      </div>
    </section>
  );
};
