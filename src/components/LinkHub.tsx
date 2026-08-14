import { linkGroups, linksInGroup, platformLabel, type SocialLink } from '../data/acnd';
import { useStage } from '../hooks/useStage';
import './LinkHub.css';

/**
 * The link hub — every destination, in one stack.
 *
 * This is the part of the site that behaves like a link tree: one tall column
 * of large, unambiguous targets, grouped by what the visitor actually wants
 * to do. It renders twice — once on the first screen so nobody has to scroll
 * to reach the music, and once at the end as the closing directory.
 *
 * Rows are full-width and at least 60px tall because the majority of traffic
 * to a link like this arrives from a phone bio, one-handed. A row that needs
 * aiming at is a row that does not get tapped.
 */

const Row = ({ link, index }: { link: SocialLink; index: number }) => {
  const { tick } = useStage();
  const isMail = link.platform === 'email';

  return (
    <li className="hub__item">
      <a
        data-magnetic
        className="hub__link"
        href={link.url}
        target={isMail ? undefined : '_blank'}
        rel={isMail ? undefined : 'noopener noreferrer'}
        onPointerEnter={() => tick(1800 + index * 140, 0.06)}
        onClick={() => tick(820, 0.18)}
      >
        <span className="hub__idx" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>

        <span className="hub__body">
          <span className="hub__plat display">{platformLabel[link.platform]}</span>
          {link.note ? <span className="hub__note">{link.note}</span> : null}
        </span>

        <span className="hub__handle mono" aria-hidden="true">
          {link.handle}
        </span>

        <span className="hub__go" aria-hidden="true">
          ↗
        </span>

        {/* The visible label is the platform name; this spells out the whole
            action for anyone listening rather than looking. */}
        <span className="visually-hidden">
          {link.note ? `${link.note} on ${platformLabel[link.platform]}` : platformLabel[link.platform]}
          {isMail ? '' : ' — opens in a new tab'}
        </span>
      </a>
    </li>
  );
};

interface Props {
  /** Heading level to use for the group labels, so the outline stays sane. */
  headingId?: string;
  className?: string;
}

export const LinkHub = ({ className }: Props) => {
  // Numbering runs across the whole hub rather than restarting per group, so
  // the column reads as one list of destinations.
  let n = -1;

  const groups = linkGroups
    .map((g) => ({ ...g, links: linksInGroup(g.id) }))
    .filter((g) => g.links.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className={`hub ${className ?? ''}`}>
      {groups.map((g) => (
        <div className="hub__group" key={g.id}>
          <p className="label hub__group-label">{g.label}</p>
          <ul className="hub__list">
            {g.links.map((link) => {
              n += 1;
              return <Row key={`${link.platform}-${link.url}`} link={link} index={n} />;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};
