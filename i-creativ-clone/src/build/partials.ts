/**
 * Build-time HTML generation.
 *
 * Barba needs seven real documents, but the shell — head, menu, header,
 * curtain, canvas, footer — is identical across all of them. Rather than
 * maintaining seven copies, each page file carries only its own content plus
 * placeholder comments, and the Vite plugin in vite.config.ts substitutes
 * these fragments at build time.
 *
 * The project list is generated from the same `src/data/site.ts` the runtime
 * reads, so the filter counts in the markup can never disagree with the rows
 * they filter.
 */

import {
  categories,
  countFor,
  nav,
  projects,
  socials,
  studio,
  marqueeItems,
} from '../data/site';

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface PageMeta {
  title: string;
  description: string;
  namespace: string;
}

export function buildHead(meta: PageMeta): string {
  return `
    <title>${esc(meta.title)} — ${esc(studio.name)}</title>
    <meta name="description" content="${esc(meta.description)}" />
    <meta property="og:title" content="${esc(meta.title)} — ${esc(studio.name)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />`.trim();
}

/** Fullscreen menu, fixed header and the decorative canvas. */
export function buildShell(): string {
  // A running index across all groups drives the reveal stagger in CSS
  // (`transition-delay: calc(var(--i) * ...)`), so the links cascade in one
  // sequence rather than restarting per column.
  let linkIndex = 0;

  const groups = nav
    .map(
      (group) => `
        <div class="grid-item grid-33 xsm-grid-100 links_group" data-tag="${esc(group.tag)}">
          <span class="links_group__label">${esc(group.label)}</span>
          <ul>
            ${group.links
              .map(
                (link) => `
              <li><span class="menu-link__mask"><a class="menu-link" style="--i:${linkIndex++}" href="${esc(link.href)}">${esc(link.label)}</a></span></li>`,
              )
              .join('')}
          </ul>
        </div>`,
    )
    .join('');

  return `
  <a class="skip-link" href="#main">Skip to content</a>

  <canvas aria-hidden="true" class="wgl-canvas" id="wgl_canvas"></canvas>

  <div class="menu-wrapper" id="menu_wrapper" aria-hidden="true">
    <div class="main-navigation js-main-navigation" id="main_navigation_wrapper" data-lenis-prevent>
      <div class="menu-header">
        <a class="brand" href="index.html">${esc(studio.wordmark)}</a>
      </div>
      <nav class="main__nav css-grid-wrapper" aria-label="Main">
        ${groups}
      </nav>
    </div>
  </div>

  <div class="main-nav-wrapper flex-wrapper space-between" id="main_nav_wrapper">
    <a class="brand" href="index.html">${esc(studio.wordmark)}</a>
    <nav class="main-links-wrapper flex-wrapper" aria-label="Shortcuts">
      <a class="text-link nav-link" href="projects.html">Works</a>
      <a class="text-link nav-link" href="contact.html">Contact</a>
      <button class="menu-toggle addHover" id="menu_toggle" type="button"
              aria-expanded="false" aria-controls="main_navigation_wrapper">
        <span class="menu-toggle__label">Menu</span>
        <span class="menu-toggle__bars" aria-hidden="true"><span></span><span></span></span>
      </button>
    </nav>
  </div>

  <div class="fixed__cover fixed__cover___intro flex-wrapper flex-center z-on-top js-fixed__cover visible">
    <div class="cover_curtain_wrapper js-cover_curtain_wrapper" id="curtains">
      <div class="curtain-item" aria-hidden="true"></div>
      <div class="curtain-item" aria-hidden="true"></div>
      <div class="curtain-item" aria-hidden="true"></div>
      <div class="curtain-item" aria-hidden="true"></div>
    </div>
    <div class="intro_logo____wrapper" id="logo_wrapper" aria-hidden="true">
      <div class="intro_logo____placeholder">${esc(studio.wordmark)}</div>
    </div>
  </div>`;
}

export function buildFooter(): string {
  const social = socials
    .map(
      (s) =>
        `<a class="text-link" href="${esc(s.href)}" rel="noopener noreferrer" target="_blank">${esc(s.label)}</a>`,
    )
    .join('');

  return `
  <footer class="css-grid-wrapper" id="footer">
    <div class="grid-item grid-100 gl-padding">
      <div class="css-grid-wrapper footer-grid">
        <div class="grid-item grid-50 xsm-grid-100">
          <h2 class="footer-heading">Start a project</h2>
          <a class="text-link" href="mailto:${esc(studio.email)}">${esc(studio.email)}</a>
        </div>
        <div class="grid-item grid-50 xsm-grid-100 text-right">
          <p class="text-muted">
            <a class="text-link" href="${esc(studio.mapUrl)}" rel="noopener noreferrer" target="_blank">${esc(studio.addressLine)}</a>
          </p>
          <div class="social-links margin-left-auto">${social}</div>
        </div>
      </div>
      <div class="footer-meta">
        <span>© ${new Date().getFullYear()} ${esc(studio.name)}. Placeholder content.</span>
        <span>Independent since ${studio.founded}</span>
      </div>
    </div>
  </footer>

  <div class="cookie-alert-wrapper" id="cookie-alert-wrapper" hidden>
    <div class="alert-content">
      <p>This template sets no cookies and loads no third-party scripts. The notice is here so the slot exists.</p>
      <button class="btn" id="hide-alert" type="button">Understood</button>
    </div>
  </div>`;
}

export function buildMarquee(): string {
  const items = marqueeItems
    .map((item) => `<span class="marquee__item">${esc(item)}</span>`)
    .join('');
  return `
  <div class="marquee" aria-label="Studio disciplines">
    <div class="marquee__track">${items}</div>
  </div>`;
}

/** Filter bar plus every project row, both derived from the same array. */
export function buildProjectList(): string {
  const buttons = [
    `<button class="filter-btn" type="button" data-filter="all" aria-pressed="true">All<span class="filter-btn__count">${projects.length}</span></button>`,
    ...categories.map(
      (category) =>
        `<button class="filter-btn" type="button" data-filter="${esc(category)}" aria-pressed="false">${esc(category)}<span class="filter-btn__count">${countFor(category)}</span></button>`,
    ),
  ].join('');

  const rows = projects
    .map(
      (project) => `
      <a class="project-row" href="project.html?p=${esc(project.slug)}"
         data-categories="${esc(project.categories.join('|'))}" data-reveal>
        <span class="project-row__title">${esc(project.title)}</span>
        <span class="project-row__tags">${esc(project.categories.join(' | '))}</span>
        <span class="project-row__year">${project.year}</span>
      </a>`,
    )
    .join('');

  return `
  <div class="filter-bar" role="group" aria-label="Filter projects by category">${buttons}</div>
  <p class="visually-hidden" id="filter_status" role="status" aria-live="polite">${projects.length} projects shown.</p>
  <div class="project-list">${rows}</div>`;
}
