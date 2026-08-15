import { artist, isUpcoming, platformLabel, playlists, releases, socials } from '../data/acnd';

/**
 * Everything a crawler needs, generated from `src/data/acnd.ts`.
 *
 * This module runs at *build* time (from the Vite plugin in vite.config.ts),
 * not in the browser. The head tags, the JSON-LD and the no-JS fallback are
 * baked into the shipped `index.html`, which means the site is fully
 * indexable without executing a line of JavaScript — and it can never drift
 * out of sync with the visible content, because both read the same file.
 */

/**
 * The canonical origin, without a trailing slash.
 *
 * Defaults to whatever `acnd.ts` declares, but the deploy workflow can
 * override it — a GitHub Pages project site lives at a URL the content file
 * has no way of knowing. This module only ever runs in Node, at build time,
 * so reading the environment here is safe.
 */
const SITE = (process.env.SITE_URL || artist.siteUrl).replace(/\/$/, '');

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const abs = (path: string): string => `${SITE}${path}`;

export const pageTitle = `${artist.name} (${artist.legalName}) — ${artist.role}`;

/* ── JSON-LD ─────────────────────────────────────────────────────────── */

export const buildStructuredData = (): unknown => {
  const musicGroup = {
    '@type': 'MusicGroup',
    '@id': `${SITE}/#artist`,
    name: artist.name,
    alternateName: artist.legalName,
    description: artist.tagline,
    url: SITE,
    image: abs(artist.portrait.src),
    foundingLocation: {
      '@type': 'Place',
      name: artist.origin,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dhaka',
      addressCountry: 'BD',
    },
    ...(artist.bookingEmail ? { email: `mailto:${artist.bookingEmail}` } : {}),
    sameAs: socials.filter((s) => s.platform !== 'email').map((s) => s.url),
  };

  const albums = releases.map((r) => ({
    '@type': r.type === 'Album' || r.type === 'EP' ? 'MusicAlbum' : 'MusicRecording',
    '@id': `${SITE}/#${r.id}`,
    name: r.title,
    byArtist: { '@id': `${SITE}/#artist` },
    // A record that is not out yet has no publication date. Guessing one and
    // being wrong is worse for rich results than leaving it off.
    ...(isUpcoming(r) ? {} : { datePublished: r.date ?? String(r.year) }),
    description: r.blurb,
    ...(r.cover ? { image: abs(r.cover) } : {}),
    ...(r.durationSec ? { duration: `PT${Math.floor(r.durationSec / 60)}M${r.durationSec % 60}S` } : {}),
    ...(Object.values(r.links).length ? { sameAs: Object.values(r.links) } : {}),
  }));

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    url: SITE,
    name: pageTitle,
    description: artist.tagline,
    inLanguage: 'en',
    publisher: { '@id': `${SITE}/#artist` },
  };

  return { '@context': 'https://schema.org', '@graph': [musicGroup, website, ...albums] };
};

/* ── <head> ──────────────────────────────────────────────────────────── */

export const buildHeadTags = (): string => {
  const desc = esc(artist.tagline);
  const title = esc(pageTitle);
  const ogImage = abs('/og.jpg');

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${SITE}/" />`,
    `<meta name="author" content="${esc(artist.legalName)}" />`,
    `<meta name="keywords" content="ACND, ${esc(artist.legalName)}, Observateur d’étoiles, Observateur d'etoiles ACND, ACND pre-save, Her ACND, ACND Her, Bangladeshi producer, Dhaka producer, DJ, composer, listen, Spotify, Apple Music, YouTube Music" />`,

    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="${esc(artist.name)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${SITE}/" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(artist.name)} — ${esc(artist.role)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="profile:first_name" content="A H" />`,
    `<meta property="profile:last_name" content="Al Masum" />`,

    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,

    `<script type="application/ld+json">${JSON.stringify(buildStructuredData())}</script>`,
  ].join('\n    ');
};

/* ── no-JS fallback ──────────────────────────────────────────────────── */

/**
 * A plain, complete, readable version of the site.
 *
 * React removes this the moment it mounts, so a visitor never sees it — but
 * a crawler that does not execute JavaScript, a text browser, or anyone on a
 * failed bundle load gets the bio, every release, every set and every link.
 */
export const buildFallback = (): string => {
  const releaseItems = releases
    .map((r) => {
      const links = Object.entries(r.links)
        .map(([p, url]) => `<a href="${esc(url)}" rel="noopener">${esc(p)}</a>`)
        .join(' · ');
      const blurb = r.blurb ? `<br />${esc(r.blurb)}` : '';
      const when = isUpcoming(r) ? 'Out soon — pre-save' : String(r.year);
      return `<li><strong>${esc(r.title)}</strong> — ${when} · ${esc(r.type)}${blurb}${links ? `<br />${links}` : ''}</li>`;
    })
    .join('\n        ');

  const setItems = playlists
    .map(
      (p) =>
        `<li><a href="${esc(p.url)}" rel="noopener">${esc(p.title)}</a> — ${esc(p.note)} (${
          p.trackCount
        } tracks, ${esc(p.runtime)})</li>`,
    )
    .join('\n        ');

  const socialItems = socials
    .map((s) => `<li><a href="${esc(s.url)}" rel="me noopener">${esc(s.handle)}</a></li>`)
    .join('\n        ');

  return `<div id="fallback">
      <h1>${esc(artist.name)}</h1>
      <p><strong>${esc(artist.legalName)}</strong> — ${esc(artist.role)}, ${esc(artist.origin)}</p>
      ${artist.bio.map((b) => `<p>${esc(b)}</p>`).join('\n      ')}

      <h2>Releases</h2>
      <ul>
        ${releaseItems}
      </ul>

      ${setItems ? `<h2>Playlists &amp; Sets</h2>\n      <ul>${setItems}</ul>` : ''}

      <h2>Follow</h2>
      <ul>
        ${socialItems}
      </ul>

      ${artist.bookingEmail ? `<h2>Bookings</h2>\n      <p><a href="mailto:${esc(artist.bookingEmail)}">${esc(artist.bookingEmail)}</a></p>` : ''}
    </div>`;
};

/* ── 404 ─────────────────────────────────────────────────────────────── */

/**
 * The page GitHub Pages serves for any unknown path under the site.
 *
 * Deliberately standalone: inline styles, no bundle, no fonts, one request.
 * Someone who has landed here has already had one thing go wrong, and the
 * only job left is to put every real destination in front of them — so the
 * whole link list is on the page rather than a lone "go home" button.
 *
 * It does not redirect on a timer. A silent bounce hides the broken link from
 * whoever shared it and breaks the back button for whoever followed it.
 */
export const build404 = (): string => {
  const links = socials
    .map(
      (s) =>
        `<li><a href="${esc(s.url)}" rel="noopener"><b>${esc(platformLabel[s.platform])}${
          s.note ? `<i>${esc(s.note)}</i>` : ''
        }</b><span>↗</span></a></li>`,
    )
    .join('\n      ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#07070a" />
    <title>Not found — ${esc(artist.name)}</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; padding: 8vh 24px;
        background: #07070a; color: #e8e4dc;
        font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        font-size: 16px; line-height: 1.6;
        display: flex; flex-direction: column; align-items: center;
      }
      main { width: 100%; max-width: 560px; }
      .code { color: #ff2e4d; letter-spacing: 0.3em; font-size: 13px; margin: 0 0 28px; }
      h1 { font-size: clamp(38px, 12vw, 68px); letter-spacing: 0.16em; margin: 0 0 18px; }
      p { color: #8b8798; margin: 0 0 34px; }
      a { color: inherit; text-decoration: none; }
      .home {
        display: block; text-align: center; padding: 18px;
        border: 1px solid #ff2e4d; color: #ff2e4d; letter-spacing: 0.22em;
        font-size: 13px; margin-bottom: 34px;
      }
      .home:hover, .home:focus-visible { background: #ff2e4d; color: #07070a; }
      h2 { font-size: 11px; letter-spacing: 0.3em; color: #55525f; margin: 0 0 12px; font-weight: 400; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
      li a {
        display: flex; justify-content: space-between; gap: 16px; align-items: center;
        min-height: 58px; padding: 12px 16px;
        border: 1px solid #22222c; background: #0e0e14;
      }
      li a:hover, li a:focus-visible { border-color: #ff2e4d; color: #ff2e4d; }
      b { font-weight: 400; letter-spacing: 0.08em; }
      i { display: block; font-style: normal; font-size: 14px; color: #8b8798; }
      li a:hover i, li a:focus-visible i { color: inherit; }
      span { color: #ff2e4d; }
    </style>
  </head>
  <body>
    <main>
      <p class="code">ERROR 404 — SIGNAL LOST</p>
      <h1>${esc(artist.name)}</h1>
      <p>That page does not exist. Everything that does is one tap away.</p>

      <a class="home" href="${SITE}/">ENTER THE SITE ↗</a>

      <h2>OR GO STRAIGHT THERE</h2>
      <ul>
      ${links}
      </ul>
    </main>
  </body>
</html>
`;
};

/* ── sitemap ─────────────────────────────────────────────────────────── */

export const buildSitemap = (): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

export const buildRobots = (): string =>
  `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
