const cache = new Map<string, string>();

/**
 * Read a CSS custom property off :root, memoised.
 *
 * The palette lives in tokens.css so designers can retune the whole site
 * from one place, but the canvas renderer needs real hex values. Reading
 * through `getComputedStyle` keeps a single source of truth; caching keeps
 * it from forcing a style recalculation on every hover.
 */
export const readVar = (name: string, fallback = '#ffffff'): string => {
  const cached = cache.get(name);
  if (cached) return cached;
  if (typeof window === 'undefined') return fallback;

  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const out = v || fallback;
  cache.set(name, out);
  return out;
};

/** Set the live accent that the whole interface tracks. */
export const setAccent = (hex: string): void => {
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-soft', `${hex}33`);
};
