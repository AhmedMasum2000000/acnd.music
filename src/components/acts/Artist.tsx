import { useCallback } from 'react';
import { artist } from '../../data/acnd';
import { GlitchText } from '../GlitchText';
import { WordReveal } from '../WordReveal';
import { useSectionProgress } from '../../hooks/useSectionProgress';
import { useStage } from '../../hooks/useStage';
import { clamp, smoothstep } from '../../lib/lerp';
import { asset } from '../../lib/asset';

/**
 * Act 02 — THE ARTIST.
 *
 * The emotional centre. As the visitor scrolls, the background field
 * resolves from pure static into a dithered photograph of ACND, holds while
 * the bio is read, then dissolves again on the way out.
 *
 * The visitor's own scrolling is what develops the image — which is why the
 * reveal is driven straight off scroll position instead of being an
 * animation that plays at them.
 */
export const Artist = () => {
  const { setReveal } = useStage();

  const onProgress = useCallback(
    (p: number) => {
      // Rise, hold, dissolve. The hold is the long middle where the face is
      // fully formed and the copy is actually being read.
      const rise = smoothstep(0.1, 0.44, p);
      const fall = smoothstep(0.82, 1, p);
      setReveal(clamp(rise - fall));
    },
    [setReveal],
  );

  const ref = useSectionProgress<HTMLElement>(onProgress);

  return (
    <section id="artist" className="act act--artist" ref={ref} aria-labelledby="artist-h">
      <div className="shell artist__grid">
        <div className="artist__lead">
          <p className="label">02 — THE ARTIST</p>
          <GlitchText as="h2" className="display act__h" duration={0.7}>
            WHO IS ACND
          </GlitchText>
        </div>

        <div className="artist__body">
          {artist.bio.map((para, i) => (
            <WordReveal key={i} className="artist__para" delay={i * 0.12}>
              {para}
            </WordReveal>
          ))}

          <dl className="artist__facts">
            <div>
              <dt className="label">NAME</dt>
              <dd>{artist.legalName}</dd>
            </div>
            <div>
              <dt className="label">BASED</dt>
              <dd>{artist.origin}</dd>
            </div>
            <div>
              <dt className="label">DISCIPLINE</dt>
              <dd>{artist.role}</dd>
            </div>
          </dl>
        </div>

        {/*
          A contact-sheet plate of the source photograph. The dithered version
          on the canvas is the art, but this is the real <img> — it carries the
          alt text, it is what image search indexes, and it quietly tells the
          visitor what they have been looking at for the last few seconds.
        */}
        <figure className="artist__plate">
          <img
            src={asset(artist.portrait.src)}
            srcSet={`${asset(artist.portrait.lowSrc)} 480w, ${asset(artist.portrait.src)} 1200w`}
            sizes="(max-width: 767px) 45vw, 260px"
            alt={artist.portrait.alt}
            width="260"
            height="347"
            loading="lazy"
            decoding="async"
          />
          <figcaption className="label">SOURCE PLATE — DHAKA</figcaption>
        </figure>
      </div>
    </section>
  );
};
