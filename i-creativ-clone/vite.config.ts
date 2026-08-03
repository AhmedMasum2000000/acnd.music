import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import {
  buildFooter,
  buildHead,
  buildMarquee,
  buildProjectList,
  buildShell,
  type PageMeta,
} from './src/build/partials';

/*
  A multi-page build rather than a client-side router.

  Barba fetches real documents and swaps the `[data-barba="container"]` node
  out of the response, so every route has to exist as its own HTML file. That
  is also what keeps the site readable with JavaScript disabled: without the
  transition layer, these are just seven ordinary pages.
*/
const pages = [
  'index',
  'projects',
  'services',
  'about',
  'vision',
  'contact',
  'project',
] as const;

type PageName = (typeof pages)[number];

const meta: Record<PageName, PageMeta> = {
  index: {
    title: 'Design & Web Development',
    description: 'An independent design and development studio building custom sites one at a time.',
    namespace: 'home',
  },
  projects: {
    title: 'Selected Works',
    description: 'A selection of design, development and visual storytelling.',
    namespace: 'projects',
  },
  services: {
    title: 'Services',
    description: 'Brand identity, custom web design and development, product design and consulting.',
    namespace: 'services',
  },
  about: {
    title: 'About',
    description: 'A small studio, independent since 2006, working on a limited number of projects a year.',
    namespace: 'about',
  },
  vision: {
    title: 'Vision',
    description: 'What we are trying to make, and why we stay small.',
    namespace: 'vision',
  },
  contact: {
    title: 'Start a project',
    description: 'Tell us what you are building and we will reply properly.',
    namespace: 'contact',
  },
  project: {
    title: 'Harbour Archive',
    description: 'Sixty years of port photography, catalogued and made navigable.',
    namespace: 'project',
  },
};

/**
 * Substitutes the shared shell into every page.
 *
 * The alternative is seven copies of the same header, menu, curtain and
 * footer, which drift the moment one of them is edited. Placeholders mirror
 * the `<!--@HEAD-->` convention already used elsewhere in this repository.
 */
const shellPlugin = (): Plugin => ({
  name: 'studio-shell',
  transformIndexHtml: {
    order: 'pre',
    handler(html, ctx) {
      const name = (ctx.path.split('/').pop() ?? 'index.html').replace(
        /\.html$/,
        '',
      ) as PageName;
      const page = meta[name] ?? meta.index;

      return html
        .replace('<!--@HEAD-->', buildHead(page))
        .replace('<!--@SHELL-->', buildShell())
        .replace('<!--@FOOTER-->', buildFooter())
        .replace('<!--@MARQUEE-->', buildMarquee())
        .replace('<!--@PROJECT_LIST-->', buildProjectList());
    },
  },
});

const input = Object.fromEntries(
  pages.map((name) => [name, resolve(__dirname, `${name}.html`)]),
);

// Root-relative by default, which is what any plain static host wants. A
// GitHub Pages *project* site serves from `/<repo>/`, so BASE_PATH overrides
// it. Vite requires the trailing slash; normalise rather than trusting input.
const rawBase = process.env.BASE_PATH || '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  plugins: [shellPlugin()],
  build: {
    target: 'es2020',
    rollupOptions: {
      input,
      output: {
        // pixi is by far the largest dependency and changes on its own
        // cadence; splitting it from the motion libraries means a copy tweak
        // never invalidates the WebGL chunk.
        manualChunks: (id) => {
          if (id.includes('node_modules/pixi.js')) return 'pixi';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/@barba')) {
            return 'motion';
          }
          return undefined;
        },
      },
    },
  },
});
