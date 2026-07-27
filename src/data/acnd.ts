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
  /** Genre tags shown on the card. Keep to 1–3 for layout reasons. */
  tags: string[];
  /** One line of copy. Shown in the detail panel. */
  blurb: string;
  /**
   * Cover artwork. Path relative to /public, e.g. '/covers/aurora.jpg'.
   * Leave undefined and the site generates a deterministic ASCII cover
   * from the release id — which honestly looks great, so this is optional.
   */
  cover?: string;
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

export interface Genre {
  name: string;
  /** One-line description of what this sound means to ACND. */
  line: string;
  /**
   * How the background field behaves while this genre is focused.
   *  speed     — how fast the noise evolves (0.2 slow … 2.0 frantic)
   *  scale     — spatial frequency (0.02 wide/smooth … 0.2 tight/grainy)
   *  turbulence— how much the field tears and glitches (0 … 1)
   *  accent    — CSS custom property name used for the glow
   */
  field: { speed: number; scale: number; turbulence: number; accent: string };
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
    'Bangladeshi electronic producer, DJ and composer blending melodic techno, dubstep, drum & bass, house and ambient into euphoric, emotion-driven sound.',
  /** Short punch line for the hero. Two or three words per line reads best. */
  heroLines: ['EUPHORIA', 'ENGINEERED', 'FROM NOISE'],
  /**
   * The bio, as paragraphs. Act 02 types these out over the ASCII portrait.
   * Two to four paragraphs is the sweet spot — beyond that people scroll past.
   */
  bio: [
    'ACND is the recording name of A H Al Masum, a producer, DJ and composer working out of Dhaka, Bangladesh.',
    'The work sits where melodic techno meets the weight of dubstep and the restlessness of drum & bass — with house underneath and ambient holding the edges. Euphoric, but never weightless. Built to be felt in the chest before it is understood in the head.',
    'Every record starts the same way: a room, a late hour, and a sound that will not leave. What comes out is emotion-driven electronic music for people who want to be moved, not just moved around.',
  ],
  /** Booking / business enquiries. Shown in Act 06. */
  bookingEmail: 'booking@acnd.live', // TODO: real address
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

export const socials: SocialLink[] = [
  { platform: 'spotify', handle: 'ACND', url: 'https://open.spotify.com/artist/' }, // TODO: real link
  { platform: 'soundcloud', handle: '@acnd', url: 'https://soundcloud.com/acnd' }, // TODO: real link
  { platform: 'youtube', handle: '@acnd', url: 'https://youtube.com/@acnd' }, // TODO: real link
  { platform: 'apple', handle: 'ACND', url: 'https://music.apple.com/artist/' }, // TODO: real link
  { platform: 'instagram', handle: '@acnd', url: 'https://instagram.com/acnd' }, // TODO: real link
  { platform: 'bandcamp', handle: 'acnd', url: 'https://acnd.bandcamp.com' }, // TODO: real link
  { platform: 'beatport', handle: 'ACND', url: 'https://beatport.com/artist/acnd' }, // TODO: real link
  { platform: 'email', handle: 'booking@acnd.live', url: 'mailto:booking@acnd.live' }, // TODO: real address
];

/* ───────────────────────────────────────────────────────────────────────
   RELEASES — Act 04, THE CATALOG
   Newest first. The site sorts by year anyway, but keeping the file
   ordered makes it easier to maintain by hand.
   ─────────────────────────────────────────────────────────────────────── */

export const releases: Release[] = [
  {
    id: 'nocturne-protocol',
    title: 'Nocturne Protocol',
    year: 2025,
    date: '2025-11-14',
    type: 'EP',
    tags: ['Melodic Techno', 'Ambient'],
    blurb:
      'Four tracks written between 2am and sunrise. Wide pads, a kick that refuses to quit, and the sound of a city that never fully sleeps.',
    links: {
      spotify: 'https://open.spotify.com/', // TODO
      soundcloud: 'https://soundcloud.com/', // TODO
      youtube: 'https://youtube.com/', // TODO
    },
  },
  {
    id: 'monsoon-static',
    title: 'Monsoon Static',
    year: 2025,
    date: '2025-06-02',
    type: 'Single',
    tags: ['Drum & Bass'],
    blurb:
      'Written during a week of rain that would not stop. 174 BPM, breakbeats cut like water off a tin roof.',
    links: {
      spotify: 'https://open.spotify.com/', // TODO
      soundcloud: 'https://soundcloud.com/', // TODO
    },
    durationSec: 248,
  },
  {
    id: 'weight-of-light',
    title: 'Weight of Light',
    year: 2024,
    date: '2024-10-18',
    type: 'Single',
    tags: ['Dubstep', 'Melodic'],
    blurb:
      'The heaviest thing here, and somehow the most tender. A drop that arrives like a held breath finally released.',
    links: {
      spotify: 'https://open.spotify.com/', // TODO
      youtube: 'https://youtube.com/', // TODO
      beatport: 'https://beatport.com/', // TODO
    },
    durationSec: 212,
  },
  {
    id: 'concrete-bloom',
    title: 'Concrete Bloom',
    year: 2024,
    date: '2024-04-09',
    type: 'EP',
    tags: ['House', 'Melodic Techno'],
    blurb:
      'Warm, four-to-the-floor, and unapologetically hopeful. Made for rooms where nobody is checking their phone.',
    links: {
      spotify: 'https://open.spotify.com/', // TODO
      bandcamp: 'https://bandcamp.com/', // TODO
    },
  },
  {
    id: 'signal-lost',
    title: 'Signal / Lost',
    year: 2023,
    date: '2023-08-25',
    type: 'Single',
    tags: ['Ambient', 'Downtempo'],
    blurb:
      'Two movements, no drums until the last ninety seconds. The quietest record in the catalogue and the one people write about.',
    links: {
      spotify: 'https://open.spotify.com/', // TODO
      soundcloud: 'https://soundcloud.com/', // TODO
    },
    durationSec: 386,
  },
  {
    id: 'first-transmission',
    title: 'First Transmission',
    year: 2023,
    date: '2023-01-20',
    type: 'Single',
    tags: ['Melodic Techno'],
    blurb: 'Where it started. Rougher than everything after it, and better for it.',
    links: {
      soundcloud: 'https://soundcloud.com/', // TODO
    },
    durationSec: 301,
  },
];

/* ───────────────────────────────────────────────────────────────────────
   PLAYLISTS & SETS — Act 05, THE SETS
   ─────────────────────────────────────────────────────────────────────── */

export const playlists: Playlist[] = [
  {
    id: 'after-hours',
    title: 'AFTER HOURS',
    note: 'Melodic techno for the drive home at 4am.',
    trackCount: 32,
    runtime: '2h 41m',
    url: 'https://open.spotify.com/playlist/', // TODO
    platform: 'spotify',
  },
  {
    id: 'heavy-water',
    title: 'HEAVY WATER',
    note: 'Dubstep and DnB. Loud rooms only.',
    trackCount: 24,
    runtime: '1h 38m',
    url: 'https://open.spotify.com/playlist/', // TODO
    platform: 'spotify',
  },
  {
    id: 'live-dhaka',
    title: 'LIVE IN DHAKA',
    note: 'Full DJ set, recorded live. One take, no edits.',
    trackCount: 1,
    runtime: '1h 04m',
    url: 'https://soundcloud.com/', // TODO
    platform: 'soundcloud',
  },
  {
    id: 'ambient-works',
    title: 'AMBIENT WORKS',
    note: 'No kick drums. For working, or for not working.',
    trackCount: 18,
    runtime: '1h 55m',
    url: 'https://open.spotify.com/playlist/', // TODO
    platform: 'spotify',
  },
];

/* ───────────────────────────────────────────────────────────────────────
   THE SPECTRUM — Act 03
   Hovering a genre re-tunes the background field in real time.
   ─────────────────────────────────────────────────────────────────────── */

export const genres: Genre[] = [
  {
    name: 'MELODIC TECHNO',
    line: 'The spine. Relentless, but it always resolves somewhere beautiful.',
    field: { speed: 1.0, scale: 0.09, turbulence: 0.35, accent: '--cyan' },
  },
  {
    name: 'DUBSTEP',
    line: 'Weight as an emotion. The low end does the talking.',
    field: { speed: 0.55, scale: 0.05, turbulence: 0.95, accent: '--signal' },
  },
  {
    name: 'DRUM & BASS',
    line: '174 BPM of forward motion. No time to think, only to move.',
    field: { speed: 2.0, scale: 0.14, turbulence: 0.6, accent: '--ember' },
  },
  {
    name: 'HOUSE',
    line: 'Warmth, groove, and a room full of people who came to dance.',
    field: { speed: 0.8, scale: 0.07, turbulence: 0.15, accent: '--acid' },
  },
  {
    name: 'AMBIENT',
    line: 'The space between the records. Where the feeling actually lives.',
    field: { speed: 0.2, scale: 0.025, turbulence: 0.0, accent: '--haze' },
  },
];

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

export const acts: Act[] = [
  { id: 'signal', index: '01', label: 'SIGNAL', mode: 'RAIN', accent: '#ff2e4d' },
  { id: 'artist', index: '02', label: 'THE ARTIST', mode: 'PORTRAIT', accent: '#ff5c2b' },
  { id: 'spectrum', index: '03', label: 'THE SPECTRUM', mode: 'WAVE', accent: '#22e0ff' },
  { id: 'catalog', index: '04', label: 'THE CATALOG', mode: 'GRID', accent: '#7b5cff' },
  { id: 'sets', index: '05', label: 'THE SETS', mode: 'TUNNEL', accent: '#37ff8b' },
  { id: 'transmission', index: '06', label: 'TRANSMISSION', mode: 'NOISE', accent: '#ff2e4d' },
];

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
  youtube: 'YouTube',
  apple: 'Apple Music',
  bandcamp: 'Bandcamp',
  beatport: 'Beatport',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  x: 'X',
  email: 'Email',
};
