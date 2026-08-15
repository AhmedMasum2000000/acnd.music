import { actIndex, artist, linksInGroup, releasesInOrder } from '../../data/acnd';
import { GlitchText } from '../GlitchText';
import { LinkHub } from '../LinkHub';
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
  /*
    A static line naming the newest record, but only when the hub below is not
    already leading with its own block for it. Two announcements of the same
    release, two lines apart, read as a bug rather than as emphasis — and of
    the two the hub wins, because that one can be tapped.
  */
  const latest = linksInGroup('new').length ? undefined : releasesInOrder[0];

  return (
    <section id="signal" className="act act--hero" aria-labelledby="hero-name">
      <div className="shell hero__grid">
        <div className="hero__id">
          <p className="label hero__eyebrow">{actIndex('signal')} — SIGNAL</p>

          {/*
            The visible mark is a graphic, so the heading carries the real text
            for crawlers and screen readers and the SVG is decorative beside it.
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

        {/*
          The link hub, on the very first screen. Most visitors arrive from a
          bio link wanting exactly one thing — somewhere to press play — and
          they should never have to scroll or hunt to find it.
        */}
        <div className="hero__hub">
          {latest ? (
            <p className="label hero__out">
              OUT NOW — <span className="hero__out-title">{latest.title}</span>
            </p>
          ) : null}
          <LinkHub />
        </div>
      </div>
    </section>
  );
};
