import { actIndex, artist, platformLabel, socials } from '../../data/acnd';
import { GlitchText } from '../GlitchText';
import { useStage } from '../../hooks/useStage';

/**
 * Act 06 — TRANSMISSION.
 *
 * The exit. After a journey the visitor needs somewhere to put the feeling,
 * so the last screen is nothing but ways to follow, listen and book — the
 * one moment on the site where the call to action is louder than the art.
 */
export const Transmission = () => {
  const { tick } = useStage();
  const marquee = socials.map((s) => platformLabel[s.platform]).join('  ✦  ');

  return (
    <section id="transmission" className="act act--transmission" aria-labelledby="transmission-h">
      {/* Duplicated track for a seamless loop; the copy is hidden from AT. */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          <span>{marquee}&nbsp;&nbsp;✦&nbsp;&nbsp;</span>
          <span>{marquee}&nbsp;&nbsp;✦&nbsp;&nbsp;</span>
        </div>
      </div>

      <div className="shell">
        <p className="label">{actIndex('transmission')} — TRANSMISSION</p>
        <GlitchText as="h2" className="display act__h act__h--big" duration={0.8}>
          STAY ON THE SIGNAL
        </GlitchText>
        <p className="act__lede">
          New records, sets and dates go out through these channels first.
        </p>

        <ul className="socials">
          {socials.map((s) => (
            <li key={s.platform}>
              <a
                href={s.url}
                target={s.platform === 'email' ? undefined : '_blank'}
                rel={s.platform === 'email' ? undefined : 'noopener noreferrer'}
                className="socials__link"
                onPointerEnter={() => tick(1700, 0.07)}
                onClick={() => tick(820, 0.16)}
              >
                <span className="socials__plat display">{platformLabel[s.platform]}</span>
                <span className="socials__handle mono">{s.handle}</span>
                <span className="socials__go" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>

        {/* No address, no block. An email that bounces is worse than none. */}
        {artist.bookingEmail ? (
          <div className="booking">
            <p className="label">BOOKINGS &amp; ENQUIRIES</p>
            <a
              className="display booking__mail"
              href={`mailto:${artist.bookingEmail}`}
              onClick={() => tick(700, 0.18)}
            >
              {artist.bookingEmail}
            </a>
          </div>
        ) : null}

        <footer className="foot">
          <hr className="rule" />
          <div className="foot__row">
            <p className="mono foot__sig">
              {artist.name} — {artist.legalName}. {artist.origin}.
            </p>
            <p className="mono foot__sig">
              © {new Date().getFullYear()} {artist.legalName}. All rights reserved.
            </p>
          </div>
          <p className="foot__ascii mono" aria-hidden="true">
            ▓▒░ END OF TRANSMISSION ░▒▓
          </p>
        </footer>
      </div>
    </section>
  );
};
