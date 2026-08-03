/**
 * Every string in the site, in one file.
 *
 * The studio below is invented — a placeholder tenant for the template. The
 * layout, grid and motion system are the deliverable; this content exists to
 * give every slot something of a realistic length and register so the
 * typography is exercised honestly. Replace this file to rebrand the site;
 * no module elsewhere hard-codes copy.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  tag: string;
  label: string;
  links: NavLink[];
}

export interface Slide {
  eyebrow: string;
  title: string;
  lede: string;
  caption: string;
}

export type ProjectCategory =
  | 'Web'
  | 'Identity'
  | 'Corporative'
  | 'Art. Culture'
  | 'Design. Architecture';

export interface Project {
  slug: string;
  title: string;
  categories: ProjectCategory[];
  year: number;
}

export interface Service {
  title: string;
  subtitle: string;
  body: string;
  linkLabel: string;
  href: string;
}

export interface Principle {
  num: string;
  title: string;
  body: string;
}

export const studio = {
  name: 'Meridian',
  wordmark: 'Meridian',
  tagline: 'Design & Web Development by independent makers',
  founded: 2006,
  city: 'Rotterdam',
  country: 'Netherlands',
  email: 'studio@meridian.example',
  addressLine: 'Rotterdam, Netherlands',
  mapUrl: 'https://www.openstreetmap.org/search?query=Rotterdam',
  siteUrl: 'https://example.com',
} as const;

export const nav: NavGroup[] = [
  {
    tag: 'works',
    label: 'What',
    links: [
      { label: 'Selected Works', href: 'projects.html' },
      { label: 'Services', href: 'services.html' },
    ],
  },
  {
    tag: 'who',
    label: 'Who',
    links: [
      { label: 'About', href: 'about.html' },
      { label: 'Vision', href: 'vision.html' },
    ],
  },
  {
    tag: 'how',
    label: 'How',
    links: [{ label: 'Start a project', href: 'contact.html' }],
  },
];

export const socials: NavLink[] = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'Behance', href: 'https://behance.net' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
  { label: 'Are.na', href: 'https://are.na' },
];

export const slides: Slide[] = [
  {
    eyebrow: 'Studio',
    title: 'We build the slow web',
    lede: 'Sites made one at a time, by people who will still answer the phone in three years.',
    caption: 'Meridian — independent since 2006',
  },
  {
    eyebrow: 'Selected work',
    title: 'Harbour Archive',
    lede: 'Sixty years of port photography, catalogued and made navigable in a browser.',
    caption: 'Web · Art. Culture — 2025',
  },
  {
    eyebrow: 'Selected work',
    title: 'Vessel Type Foundry',
    lede: 'A specimen site where every heading is set live in the typeface it is selling.',
    caption: 'Web · Identity — 2024',
  },
];

export const homeIntro = {
  heading: 'Twenty years of custom-made craft',
  body: [
    'We are a small studio that takes on a limited number of projects each year. Every site we make is designed and written from scratch for the organisation it belongs to — no themes, no page builders, no templates dressed up as bespoke work.',
    'That constraint is the point. It means the people who scoped your project are the ones who build it, and the ones you talk to when something needs to change.',
  ],
  ctas: [
    { label: 'Selected works', href: 'projects.html' },
    { label: 'About the studio', href: 'about.html' },
  ],
};

export const highlight = {
  eyebrow: 'Studio highlight',
  title: 'Harbour Archive',
  body: 'A public archive of sixty years of port photography. The interface had to make half a million uncatalogued negatives feel finite: a WebGL grid that stays responsive at any zoom, and a search that answers before you finish typing.',
  meta: 'Web · Art. Culture — 2025',
  href: 'project.html',
};

export const cards = [
  {
    label: 'Approach',
    title: 'Built to be handed over',
    body: 'Every project ships with the reasoning written down. You should not need us to change a heading, and you should not be locked in when you outgrow us.',
    href: 'services.html',
    linkLabel: 'What we do',
  },
  {
    label: 'Craft',
    title: 'Performance is a design decision',
    body: 'Motion, type and image budgets are agreed at the sketch stage, not retrofitted after a Lighthouse score comes back red.',
    href: 'vision.html',
    linkLabel: 'How we think',
  },
];

export const marqueeItems = [
  'Brand identity',
  'Web design',
  'Development',
  'Art direction',
  'Motion',
  'Strategy',
];

export const services: Service[] = [
  {
    title: 'Brand Identity',
    subtitle: "A brand's first language",
    body: 'Naming, marks, type systems and the rules that hold them together. We deliver identities as working systems — a set of decisions your team can apply without calling us, documented in plain language rather than a sixty-page PDF nobody opens.',
    linkLabel: 'See identity work',
    href: 'projects.html',
  },
  {
    title: 'Custom Web Design & Development',
    subtitle: 'Developed individually',
    body: 'Design and front-end build, done by the same pair of hands. We write our own HTML, CSS and JavaScript, which is why our sites load quickly on a bad connection and stay maintainable after we hand them over.',
    linkLabel: 'See selected works',
    href: 'projects.html',
  },
  {
    title: 'Product Design & Advertising',
    subtitle: 'Effective visual solutions',
    body: 'Campaign systems, editorial layouts and product surfaces. The work starts from what a person is actually trying to do, and stops when that is easier than it was.',
    linkLabel: 'Discuss a project',
    href: 'contact.html',
  },
  {
    title: 'Strategic Consulting',
    subtitle: 'Before anything is drawn',
    body: 'Sometimes the honest answer is that you do not need a new site. We take on short engagements to work out what the actual problem is — audits, content strategy, scoping — with no obligation to build what we recommend.',
    linkLabel: 'Get in touch',
    href: 'contact.html',
  },
];

export const principles: Principle[] = [
  {
    num: '01',
    title: 'Truth',
    body: 'We show real content at the first design review. Placeholder text hides problems, and every problem it hides gets more expensive the later it surfaces.',
  },
  {
    num: '02',
    title: 'Simplicity',
    body: 'The best version of most features is the one we talked you out of. What remains should be obvious enough to need no explanation.',
  },
  {
    num: '03',
    title: 'Creativity',
    body: 'Craft is not decoration. A site earns attention by being unmistakably itself, and that comes from judgement applied consistently, not effects applied liberally.',
  },
];

export const awards = [
  'Awwwards — Site of the Day (×4)',
  'FWA — Site of the Day (×2)',
  'CSS Design Awards — Website of the Day',
  'European Design Awards — Shortlist',
];

export const founders = [
  {
    name: 'Ada Lindqvist',
    role: 'Design & art direction',
    body: 'Twenty years of identity and editorial work. Ada leads art direction and does most of the typesetting, and is the reason nothing leaves the studio with a widow in a headline.',
  },
  {
    name: 'Tomas Weir',
    role: 'Development & motion',
    body: 'Front-end and WebGL. Tomas builds the motion systems and keeps a stubborn interest in how sites behave on a five-year-old phone with two bars of signal.',
  },
];

export const vision = {
  heading: 'What we are trying to make',
  sections: [
    {
      title: 'Against the disposable web',
      body: 'Most sites are replaced within four years, not because they stopped working but because nobody could maintain them. We build so that the second owner of a project has a chance — plain markup, few dependencies, and comments that explain why rather than what.',
    },
    {
      title: 'Motion with a reason',
      body: 'Animation should tell you where you are and what just happened. When it does neither, it is noise, and it is the first thing we cut. Every transition in our work survives the question of what it would cost the visitor to remove it.',
    },
    {
      title: 'Small on purpose',
      body: 'We have turned down more work than we have taken. Staying small is what lets the people who sold the project build it, and it is the only reason we can promise the same two names for the length of an engagement.',
    },
  ],
};

export const contact = {
  heading: 'Start a project',
  lede: 'or simply drop us a line.',
  intro:
    'We are an independent design and development studio working on fully custom projects. We take on a handful each year, which means we are selective — and it means we answer every enquiry properly, including the ones we turn down.',
  checklistTitle: 'What helps in a first email',
  checklist: [
    'What the project is, in a sentence or two',
    'What you are trying to change, and for whom',
    'Two or three sites whose work you admire',
    'Roughly when you need it live',
    'A budget range, even a wide one',
    'How best to reach you',
  ],
  process:
    'One of us will reply within a few days to arrange a call. If the fit looks right we will follow up with preliminary parameters and a scope, and only then a formal proposal.',
};

/**
 * Project list. Categories drive the filter counts on the projects page, so
 * they are typed rather than free strings — a typo would otherwise silently
 * produce a filter that matches nothing.
 */
export const projects: Project[] = [
  { slug: 'harbour-archive', title: 'Harbour Archive', categories: ['Web', 'Art. Culture'], year: 2025 },
  { slug: 'vessel-type', title: 'Vessel Type Foundry', categories: ['Web', 'Identity'], year: 2024 },
  { slug: 'north-quay', title: 'North Quay Development', categories: ['Web', 'Design. Architecture'], year: 2024 },
  { slug: 'kestrel-lab', title: 'Kestrel Lab', categories: ['Web', 'Corporative'], year: 2024 },
  { slug: 'atlas-ceramics', title: 'Atlas Ceramics', categories: ['Identity', 'Web'], year: 2023 },
  { slug: 'meridian-press', title: 'Meridian Press', categories: ['Web', 'Art. Culture'], year: 2023 },
  { slug: 'orbit-festival', title: 'Orbit Festival', categories: ['Identity', 'Art. Culture'], year: 2023 },
  { slug: 'salt-house', title: 'Salt House Residency', categories: ['Web', 'Art. Culture'], year: 2023 },
  { slug: 'pellon-group', title: 'Pellon Group', categories: ['Corporative', 'Web'], year: 2022 },
  { slug: 'linden-architects', title: 'Linden Architects', categories: ['Web', 'Design. Architecture'], year: 2022 },
  { slug: 'foundry-row', title: 'Foundry Row', categories: ['Identity', 'Corporative'], year: 2022 },
  { slug: 'basalt-studio', title: 'Basalt Studio', categories: ['Web', 'Identity'], year: 2022 },
  { slug: 'coastal-survey', title: 'Coastal Survey', categories: ['Web', 'Corporative'], year: 2021 },
  { slug: 'anchor-books', title: 'Anchor Books', categories: ['Identity', 'Art. Culture'], year: 2021 },
  { slug: 'tessera-tiles', title: 'Tessera Tiles', categories: ['Web', 'Design. Architecture'], year: 2021 },
  { slug: 'northwind-energy', title: 'Northwind Energy', categories: ['Corporative', 'Web'], year: 2021 },
  { slug: 'glasshouse', title: 'Glasshouse Gallery', categories: ['Web', 'Art. Culture'], year: 2020 },
  { slug: 'rivet-supply', title: 'Rivet Supply Co.', categories: ['Identity', 'Web'], year: 2020 },
  { slug: 'harbourmaster', title: 'Harbourmaster', categories: ['Web', 'Corporative'], year: 2020 },
  { slug: 'aperture-fest', title: 'Aperture Festival', categories: ['Art. Culture', 'Identity'], year: 2019 },
  { slug: 'stone-yard', title: 'Stone Yard', categories: ['Web', 'Design. Architecture'], year: 2019 },
  { slug: 'ferro-works', title: 'Ferro Works', categories: ['Corporative', 'Identity'], year: 2019 },
  { slug: 'lantern-trust', title: 'Lantern Trust', categories: ['Web', 'Corporative'], year: 2018 },
  { slug: 'paper-mill', title: 'Paper Mill Editions', categories: ['Identity', 'Art. Culture'], year: 2018 },
  { slug: 'quarter-house', title: 'Quarter House', categories: ['Web', 'Design. Architecture'], year: 2018 },
  { slug: 'signal-radio', title: 'Signal Radio', categories: ['Web', 'Art. Culture'], year: 2017 },
  { slug: 'brace-partners', title: 'Brace & Partners', categories: ['Corporative', 'Web'], year: 2017 },
  { slug: 'copper-lane', title: 'Copper Lane', categories: ['Identity', 'Web'], year: 2016 },
  { slug: 'wavelength', title: 'Wavelength Collective', categories: ['Web', 'Art. Culture'], year: 2016 },
  { slug: 'terrace-co', title: 'Terrace & Co.', categories: ['Identity', 'Corporative'], year: 2015 },
  { slug: 'open-atlas', title: 'Open Atlas', categories: ['Web', 'Corporative'], year: 2015 },
  { slug: 'kiln-society', title: 'Kiln Society', categories: ['Art. Culture', 'Identity'], year: 2014 },
  { slug: 'marlow-estate', title: 'Marlow Estate', categories: ['Web', 'Design. Architecture'], year: 2014 },
  { slug: 'union-print', title: 'Union Print', categories: ['Identity', 'Corporative'], year: 2013 },
  { slug: 'first-light', title: 'First Light', categories: ['Web', 'Art. Culture'], year: 2012 },
];

/** Filter categories, ordered as they appear in the bar. */
export const categories: ProjectCategory[] = [
  'Web',
  'Identity',
  'Corporative',
  'Art. Culture',
  'Design. Architecture',
];

export const countFor = (category: ProjectCategory): number =>
  projects.filter((p) => p.categories.includes(category)).length;

/** Detail-page stand-in, reused for every project slug. */
export const projectDetail = {
  eyebrow: 'Selected work',
  role: 'Design, front-end development, motion',
  body: [
    'A public archive of sixty years of port photography, opened to the city for the first time. The brief was navigation: half a million negatives, catalogued unevenly, most of them undated.',
    'We built the browse view on a WebGL grid so that zooming through thousands of thumbnails stays at frame rate on a laptop, and paired it with a search that resolves as you type against a pre-built index shipped with the page.',
    'The type system carries the rest. Captions are set in the same face as the archive stamps, which makes the interface feel like part of the collection rather than a layer on top of it.',
  ],
  credits: [
    { label: 'Client', value: 'Harbour Archive Foundation' },
    { label: 'Year', value: '2025' },
    { label: 'Scope', value: 'Identity, site design, build' },
    { label: 'Recognition', value: 'Awwwards — Site of the Day' },
  ],
};
