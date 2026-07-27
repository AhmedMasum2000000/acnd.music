import { acts, platformLabel, releases, type Release } from '../../data/acnd';
import { AsciiCover } from '../AsciiCover';
import { GlitchText } from '../GlitchText';
import { useStage } from '../../hooks/useStage';

const ReleaseCard = ({ release, featured }: { release: Release; featured: boolean }) => {
  const { tick } = useStage();
  const platforms = Object.entries(release.links) as [keyof typeof platformLabel, string][];

  return (
    <li
      className={`release ${featured ? 'is-featured' : ''}`}
      data-cover-host
      onPointerEnter={() => tick(1900, 0.07)}
    >
      <article>
        <div className="release__art">
          <AsciiCover
            id={release.id}
            cols={featured ? 44 : 30}
            rows={featured ? 20 : 14}
            className="release__cover"
          />
          <span className="release__type label">{release.type}</span>
        </div>

        <div className="release__meta">
          <h3 className="display release__title">{release.title}</h3>

          <p className="release__sub label">
            <time dateTime={release.date ?? String(release.year)}>{release.year}</time>
            <span aria-hidden="true"> · </span>
            {release.tags.join(' / ')}
          </p>

          {release.blurb ? <p className="release__blurb">{release.blurb}</p> : null}

          <ul className="release__links">
            {platforms.map(([p, url]) => (
              <li key={p}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => tick(820, 0.16)}
                >
                  {platformLabel[p]}
                  <span aria-hidden="true"> ↗</span>
                  <span className="visually-hidden"> — listen to {release.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </li>
  );
};

/**
 * Act 04 — THE CATALOG.
 *
 * Every release renders its own generated cover from its id, so the grid is
 * complete on day one without waiting on artwork, and a real image can be
 * dropped in per release later.
 *
 * Streaming links sit in the markup unconditionally rather than behind a
 * modal — they are the single most valuable thing on the page for both a
 * visitor and a crawler, so nothing should stand between them and either.
 */
export const Catalog = () => {
  const sorted = [...releases].sort((a, b) => b.year - a.year);
  const act = acts.find((a) => a.id === 'catalog');
  const single = releases.length === 1;

  return (
    <section id="catalog" className="act act--catalog" aria-labelledby="catalog-h">
      <div className="shell">
        <p className="label">{act?.index} — THE CATALOG</p>
        <GlitchText as="h2" className="display act__h" duration={0.7}>
          {single ? 'THE RECORD' : 'THE RECORDS'}
        </GlitchText>
        <p className="act__lede">
          {single
            ? 'Where it starts. Out now on every platform below.'
            : `${releases.length} releases, out now on every platform below.`}
        </p>

        <ul className="catalog__grid">
          {sorted.map((r, i) => (
            <ReleaseCard key={r.id} release={r} featured={i === 0} />
          ))}
        </ul>
      </div>
    </section>
  );
};
