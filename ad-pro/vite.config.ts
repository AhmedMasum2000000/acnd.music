import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
  Root-relative by default, which is what Vercel, Netlify and any plain static
  host want. A GitHub Pages *project* site serves from `/<repo>/` instead, so
  BASE_PATH is read from the environment rather than hard-coded here.
*/
// Vite requires a trailing slash; `actions/configure-pages` reports the path
// without one, so normalise rather than making a workflow do string surgery.
const rawBase = process.env.BASE_PATH || '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // One vendor chunk (react) plus one app chunk keeps the request
        // waterfall to two files.
        manualChunks: (id) => (id.includes('node_modules/react') ? 'vendor' : undefined),
      },
    },
  },
});
