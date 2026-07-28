/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ACND — SITE CONTENT
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  This is the only file you need to edit to update the site's content.
 *  Every string, link, release and playlist lives here. No component
 *  reads content from anywhere else.
 *
 *  Anything marked `TODO` is a placeholder — replace it with the real
 *  thing. The site builds and runs fine with the placeholders in place.
 *
 *  After editing: `npm run build`. That's it.
 */

export type Platform =
  | 'spotify'
  | 'soundcloud'
  | 'youtube'
  | 'apple'
  | 'bandcamp'
  | 'beatport'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'x'
  | 'email';

export interface SocialLink {
  /** Platform key — drives the label and the ASCII icon. */
  platform: Platform;
  /** Displayed handle, e.g. "@acnd". */
  handle: string;
  /** Full URL. Use a mailto: URL for `email`. */
  url: string;
}

export interface Release {
  /** Stable slug, used for anchors and JSON-LD ids. Keep it URL-safe. */
  id: string;
  title: string;
  /** Release year, used for sorting and for `datePublished` in JSON-LD. */
  year: number;
  /** ISO date (YYYY-MM-DD) if you know it — improves rich results. */
  date?: string;
  type: 'Single' | 'EP' | 'Album' | 'Remix' | 'Collab';
  /**
   * Short descriptors shown on the card. Deliberately empty — the music is
   * meant to arrive without being labelled first.
   */
  tags?: string[];
  /** One line of copy. Optional — omit it rather than inventing one. */
  blurb?: string;
  /**
   * Cover artwork, relative to /public. Leave both undefined and the site
   * generates a deterministic ASCII cover from the release id instead.
   */
  cover?: string;
  coverLow?: string;
  /** Alt text for the artwork. Required whenever `cover` is set. */
  coverAlt?: string;
  /** Streaming links. Omit any platform you're not on. */
  links: Partial<Record<Platform, string>>;
  /** Duration in seconds, if known. Feeds JSON-LD. */
  durationSec?: number;
}

export interface Playlist {
  id: string;
  title: string;
  /** Short description shown next to the title in the directory listing. */
  note: string;
  /** How many tracks, roughly. Displayed as metadata. */
  trackCount: number;
  /** Total runtime, human-readable, e.g. "1h 12m". */
  runtime: string;
  url: string;
  platform: Platform;
}

/* ───────────────────────────────────────────────────────────────────────
   IDENTITY
   ─────────────────────────────────────────────────────────────────────── */

export const artist = {
  name: 'ACND',
  legalName: 'A H Al Masum',
  role: 'Producer · DJ · Composer',
  origin: 'Dhaka, Bangladesh',
  /** Used in the <title>, OG tags and JSON-LD description. Keep under ~155 chars. */
  tagline:
    'Producer, DJ and composer from Dhaka, Bangladesh. Debut single "Her..." out now on Spotify, Apple Music and YouTube Music.',
  /** Short punch line for the hero. Two or three words per line reads best. */
  heroLines: ['EUPHORIA', 'ENGINEERED', 'FROM NOISE'],
  /**
   * The bio, as paragraphs. Act 02 types these out over the ASCII portrait.
   * Two to four paragraphs is the sweet spot — beyond that people scroll past.
   */
  bio: [
    'ACND is the recording name of A H Al Masum, a producer, DJ and composer working out of Dhaka, Bangladesh.',
    'Nothing here is going to tell you what the next record sounds like. That is the point. What holds the work together is not a category but a feeling — built to be felt in the chest before it is understood in the head.',
    'It starts the same way every time: a room, a late hour, and a sound that will not leave. Everything released so far is linked below.',
  ],
  /**
   * Booking / business enquiries, shown in Act 06.
   * Leave empty and the whole booking block is hidden — better than
   * publishing an address that bounces.
   */
  bookingEmail: '',
  /**
   * Canonical site URL — used for the canonical tag, OG url, sitemap
   * and JSON-LD @id. Change this the moment you know your domain.
   */
  siteUrl: 'https://acnd.live', // TODO: real domain
  /** Portrait shown (dithered) in Act 02. */
  portrait: {
    src: '/portrait-1200.webp',
    lowSrc: '/portrait-480.webp',
    alt: 'ACND — A H Al Masum — standing on a rain-slicked street in Dhaka at night, lit by neon billboards.',
  },
} as const;

/* ───────────────────────────────────────────────────────────────────────
   SOCIALS
   Order matters — this is the order they appear in the marquee and footer.
   ─────────────────────────────────────────────────────────────────────── */

/*
  Only real, working links live here — nothing invented. These currently point
  at the "Her..." release rather than artist profile pages, because that is
  what exists today; swap each `url` for the profile page when you have it and
  nothing else needs to change.

  To add a platform, uncomment a line below and drop in the real URL. Anything
  in this array automatically appears in the header dropdown, in the footer
  grid, in the marquee, and in the page's structured data.
*/
export const socials: SocialLink[] = [
  {
    platform: 'spotify',
    handle: 'ACND',
    url: 'https://open.spotify.com/track/1728ckXv0wfIEBhUsGP7TN',
  },
  {
    platform: 'youtube',
    handle: 'ACND',
    url: 'https://music.youtube.com/watch?v=s_b17eFeZgM',
  },
  {
    platform: 'apple',
    handle: 'ACND',
    url: 'https://music.apple.com/us/song/her/6794554132',
  },

  // { platform: 'instagram', handle: '@youhandle', url: 'https://instagram.com/…' },
  // { platform: 'soundcloud', handle: '@yourhandle', url: 'https://soundcloud.com/…' },
  // { platform: 'tiktok', handle: '@yourhandle', url: 'https://tiktok.com/@…' },
  // { platform: 'bandcamp', handle: 'acnd', url: 'https://acnd.bandcamp.com' },
  // { platform: 'beatport', handle: 'ACND', url: 'https://beatport.com/artist/…' },
  // { platform: 'email', handle: 'you@example.com', url: 'mailto:you@example.com' },
];

/* ───────────────────────────────────────────────────────────────────────
   RELEASES — Act 04, THE CATALOG
   Newest first. The site sorts by year anyway, but keeping the file
   ordered makes it easier to maintain by hand.
   ─────────────────────────────────────────────────────────────────────── */

export const releases: Release[] = [
  {
    id: 'her',
    title: 'Her...',
    year: 2026,
    date: '2026-07-24',
    type: 'Single',
    // Metadata taken from the release pages themselves. Add a `blurb` here
    // when you want one — better to say nothing than to say something invented.
    durationSec: 697,
    cover: '/cover-her-900.webp',
    coverLow: '/cover-her-420.webp',
    coverAlt:
      'Cover art for Her... by ACND — a screen showing a pale coastline and dune grass, photographed at an angle above an open book.',
    links: {
      spotify: 'https://open.spotify.com/track/1728ckXv0wfIEBhUsGP7TN',
      youtube: 'https://music.youtube.com/watch?v=s_b17eFeZgM',
      apple: 'https://music.apple.com/us/song/her/6794554132',
    },
  },
];

/* ───────────────────────────────────────────────────────────────────────
   PLAYLISTS & SETS — Act 05, THE SETS
   ─────────────────────────────────────────────────────────────────────── */

/*
  Empty on purpose. Act 05 removes itself entirely — from the page, the HUD
  and the progress rail — until there is a real playlist or DJ set to link to.
  Add one and the act reappears, renumbered automatically.
*/
export const playlists: Playlist[] = [];

/* ───────────────────────────────────────────────────────────────────────
   THE JOURNEY — act metadata driving the HUD and the field modes.
   Editing labels here updates the HUD indicator and the progress rail.
   ─────────────────────────────────────────────────────────────────────── */

export type FieldMode = 'NOISE' | 'RAIN' | 'PORTRAIT' | 'WAVE' | 'GRID' | 'TUNNEL';

export interface Act {
  id: string;
  index: string;
  label: string;
  mode: FieldMode;
  /** Accent the whole page shifts to while this act is in view. */
  accent: string;
}

/**
 * The journey.
 *
 * An act with nothing to show removes itself — no empty section, no dead entry
 * in the progress rail. Numbering is derived from position rather than written
 * down, so the HUD always reads "02 / 05" and never disagrees with reality.
 */
const actDefs: (Omit<Act, 'index'> & { when?: () => boolean })[] = [
  { id: 'signal', label: 'SIGNAL', mode: 'RAIN', accent: '#ff2e4d' },
  { id: 'artist', label: 'THE ARTIST', mode: 'PORTRAIT', accent: '#ff5c2b' },
  { id: 'catalog', label: 'THE CATALOG', mode: 'GRID', accent: '#7b5cff', when: () => releases.length > 0 },
  { id: 'sets', label: 'THE SETS', mode: 'TUNNEL', accent: '#37ff8b', when: () => playlists.length > 0 },
  { id: 'transmission', label: 'TRANSMISSION', mode: 'NOISE', accent: '#ff2e4d' },
];

export const acts: Act[] = actDefs
  .filter((a) => (a.when ? a.when() : true))
  .map(({ when: _when, ...a }, i) => ({ ...a, index: String(i + 1).padStart(2, '0') }));

/** True when an act is present in this build — components use it to render. */
export const hasAct = (id: string): boolean => acts.some((a) => a.id === id);

/** An act's displayed number. Never hard-code these — they shift as acts drop out. */
export const actIndex = (id: string): string => acts.find((a) => a.id === id)?.index ?? '';

/* ───────────────────────────────────────────────────────────────────────
   BOOT SEQUENCE — Act 00, the gate.
   Lines print one at a time. Keep them short; they are monospaced.
   ─────────────────────────────────────────────────────────────────────── */

export const bootLines: string[] = [
  'ACND SOUND SYSTEM v1.0',
  'DHAKA / BANGLADESH / 23.8103°N 90.4125°E',
  '',
  'loading oscillators .......... OK',
  'loading low end .............. OK',
  'loading reverb tail .......... OK',
  'calibrating euphoria ......... OK',
  '',
  'SIGNAL ACQUIRED.',
];

/** Platform display names — used for link labels and screen-reader text. */
export const platformLabel: Record<Platform, string> = {
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  youtube: 'YouTube Music',
  apple: 'Apple Music',
  bandcamp: 'Bandcamp',
  beatport: 'Beatport',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  x: 'X',
  email: 'Email',
};
