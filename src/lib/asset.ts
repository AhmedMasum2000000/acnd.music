/**
 * Resolve a path in `public/` against the deployment base.
 *
 * Vite rewrites absolute asset URLs it can see in the HTML and in imports,
 * but not strings that only exist at runtime — the portrait handed to the
 * renderer, the `src` on an `<img>` built from data. On a root deploy the
 * difference is invisible; on a GitHub Pages project site, where everything
 * lives under `/<repo>/`, those paths 404 without this.
 */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
