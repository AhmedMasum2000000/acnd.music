import { actIndex, artist, platformLabel, socials } from '../../data/acnd';
import { GlitchText } from '../GlitchText';
import { LinkHub } from '../LinkHub';
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

        {/* The same hub as the first screen. Someone who read all the way down
            should not have to scroll back up to find where to listen. */}
        <LinkHub className="hub--wide" />

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
