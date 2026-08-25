export function updateViewportUnits() {
  const vh = window.innerHeight / 100;
  const vw = window.innerWidth / 100;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.style.setProperty('--vw', `${vw}px`);
}

export function getScrollY(): number {
  return window.scrollY || window.pageYOffset;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
