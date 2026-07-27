import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { buildFallback, buildHeadTags, buildRobots, buildSitemap } from './src/lib/seo';

/**
 * Bakes the SEO surface into the shipped HTML.
 *
 * `src/data/acnd.ts` is the single source of truth for content, and this is
 * what keeps the crawlable version of the site honest: head tags, JSON-LD,
 * the no-JS fallback, robots.txt and the sitemap are all generated from that
 * same file, so they can never drift from what a visitor actually sees.
 */
const seoPlugin = (): Plugin => ({
  name: 'acnd-seo',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) =>
      html.replace('<!--@HEAD-->', buildHeadTags()).replace('<!--@FALLBACK-->', buildFallback()),
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots() });
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap() });
  },
});

// Root-relative base keeps the build host-agnostic (Vercel / Netlify / any
// static host). For a GitHub Pages project site, set base to '/<repo>/'.
export default defineConfig({
  base: '/',
  plugins: [react(), seoPlugin()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // One vendor chunk (react) plus one app chunk keeps the request
        // waterfall to two files.
        manualChunks: (id) => (id.includes('node_modules/react') ? 'vendor' : undefined),
      },
    },
  },
});
