import { actIndex, platformLabel, playlists } from '../../data/acnd';
import { GlitchText } from '../GlitchText';
import { useStage } from '../../hooks/useStage';

/**
 * Act 05 — THE SETS.
 *
 * Playlists and DJ sets as a terminal directory listing. The format does the
 * design work: a monospaced table of runtimes and track counts reads as an
 * archive being browsed, which is exactly the feeling a set list should have.
 */
export const Sets = () => {
  const { tick } = useStage();

  return (
    <section id="sets" className="act act--sets" aria-labelledby="sets-h">
      <div className="shell">
        <p className="label">{actIndex('sets')} — THE SETS</p>
        <GlitchText as="h2" className="display act__h" duration={0.7}>
          PLAYLISTS &amp; SETS
        </GlitchText>
        <p className="act__lede">
          Long-form listening. Put it on and leave it on.
        </p>

        <div className="sets__terminal">
          <p className="sets__prompt mono" aria-hidden="true">
            <span className="sets__caret">›</span> ls -l /acnd/sets
          </p>

          <ul className="sets__list">
            {playlists.map((p) => (
              <li key={p.id} className="sets__row">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sets__link"
                  onPointerEnter={() => tick(1500, 0.07)}
                  onClick={() => tick(820, 0.16)}
                >
                  <span className="sets__glyph" aria-hidden="true">
                    ▸
                  </span>
                  <span className="sets__title display">{p.title}</span>
                  <span className="sets__note">{p.note}</span>
                  {/* One wrapper rather than three loose spans: the stats need
                      to sit in a single grid cell, and targeting them
                      individually by position is fragile once other spans
                      share the row. */}
                  <span className="sets__stats">
                    <span className="sets__stat label">
                      {p.trackCount} {p.trackCount === 1 ? 'TRACK' : 'TRACKS'}
                    </span>
                    <span className="sets__stat label">{p.runtime}</span>
                    <span className="sets__stat label">{platformLabel[p.platform]}</span>
                  </span>
                  <span className="sets__go" aria-hidden="true">
                    ↗
                  </span>
                  <span className="visually-hidden">— opens on {platformLabel[p.platform]}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
