import {
  acts,
  artist,
  isUpcoming,
  platformLabel,
  releases,
  releasesInOrder,
  type Release,
} from '../../data/acnd';
import { AsciiCover } from '../AsciiCover';
import { GlitchText } from '../GlitchText';
import { useStage } from '../../hooks/useStage';
import { asset } from '../../lib/asset';

const ReleaseCard = ({ release, featured }: { release: Release; featured: boolean }) => {
  const { tick } = useStage();
  const platforms = Object.entries(release.links) as [keyof typeof platformLabel, string][];
  const soon = isUpcoming(release);

  return (
    <li
      className={`release ${featured ? 'is-featured' : ''} ${soon ? 'is-soon' : ''}`}
      data-cover-host
      onPointerEnter={() => tick(1900, 0.07)}
      // Light follows the cursor across the artwork. Written straight to the
      // element as custom properties — routing this through state would
      // re-render the card on every pointer move.
      onPointerMove={(e) => {
        const el = e.currentTarget.querySelector<HTMLElement>('.release__art');
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      <article>
        <div className="release__art">
          {release.cover ? (
            <img
              className="release__img"
              src={asset(release.cover)}
              srcSet={
                release.coverLow
                  ? `${asset(release.coverLow)} 420w, ${asset(release.cover)} 900w`
                  : undefined
              }
              sizes="(max-width: 899px) 90vw, 560px"
              alt={release.coverAlt ?? `Cover art for ${release.title} by ${artist.name}`}
              width={release.coverW ?? 900}
              height={release.coverH ?? 900}
              // Covers are not all square. The card takes its shape from the
              // artwork rather than cropping the artwork to fit the card.
              style={{ aspectRatio: `${release.coverW ?? 900} / ${release.coverH ?? 900}` }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            // No artwork supplied — fall back to a cover generated from the id.
            <AsciiCover
              id={release.id}
              cols={featured ? 44 : 30}
              rows={featured ? 20 : 14}
              className="release__cover"
            />
          )}
          <span className="release__type label">
            {soon ? 'Out soon' : release.type}
          </span>
        </div>

        <div className="release__meta">
          <h3 className="display release__title">{release.title}</h3>

          <p className="release__sub label">
            <time dateTime={release.date ?? String(release.year)}>{release.year}</time>
            {/* The corner badge is carrying "Out soon", so the format moves here
                rather than being dropped. */}
            {soon ? (
              <>
                <span aria-hidden="true"> · </span>
                {release.type}
              </>
            ) : null}
            {release.tags?.length ? (
              <>
                <span aria-hidden="true"> · </span>
                {release.tags.join(' / ')}
              </>
            ) : null}
          </p>

          {release.blurb ? <p className="release__blurb">{release.blurb}</p> : null}

          {/* The links are the point of the whole section, so they are full
              buttons rather than a row of small text links. */}
          <ul className="release__links">
            {platforms.map(([p, url]) => (
              <li key={p}>
                <a
                  data-magnetic
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => tick(820, 0.16)}
                  onPointerEnter={() => tick(2000, 0.06)}
                >
                  <span className="release__plat">{soon ? 'Pre-save' : platformLabel[p]}</span>
                  <span className="release__cta">
                    {soon ? 'ALL PLATFORMS' : 'PLAY'}
                    <span aria-hidden="true"> ↗</span>
                  </span>
                  <span className="visually-hidden">
                    {soon
                      ? ` — pre-save ${release.title} on your streaming platform`
                      : ` — listen to ${release.title} on ${platformLabel[p]}`}
                  </span>
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
  const act = acts.find((a) => a.id === 'catalog');
  const single = releases.length === 1;
  const soon = releases.filter(isUpcoming);
  const out = releases.filter((r) => !isUpcoming(r));

  // Written from what is actually in the catalog, so it stays true on release
  // day when the pre-save flips over to a normal record.
  const lede = soon.length
    ? `${soon[0].title} lands any day now — pre-save it below.${
        out.length ? ` Everything already out is there too.` : ''
      }`
    : single
      ? 'Where it starts. Every link below.'
      : // Not "on every platform" — a new record does not reach them all on the
        // same day, and the copy should not promise more than the links deliver.
        `${releases.length} releases so far. Everywhere they are out, linked below.`;

  return (
    <section id="catalog" className="act act--catalog" aria-labelledby="catalog-h">
      <div className="shell">
        <p className="label">{act?.index} — THE CATALOG</p>
        <GlitchText as="h2" className="display act__h" duration={0.7}>
          {single ? 'THE RECORD' : 'THE RECORDS'}
        </GlitchText>
        <p className="act__lede">{lede}</p>

        <ul className="catalog__grid">
          {releasesInOrder.map((r, i) => (
            <ReleaseCard key={r.id} release={r} featured={i === 0} />
          ))}
        </ul>
      </div>
    </section>
  );
};
