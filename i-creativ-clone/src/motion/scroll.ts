import Lenis from 'lenis';
import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/viewport';

let lenis: Lenis | null = null;

export function initScroll() {
  if (prefersReducedMotion()) {
    return;
  }

  lenis = new Lenis({
    prevent: (node: Element) => node.hasAttribute('data-lenis-prevent'),
  });

  const onRAF = (time: number) => {
    if (lenis) {
      (lenis as any).raf(time * 1000);
    }
  };

  gsap.ticker.add(onRAF);

  // Update --scrollY custom property
  if (lenis) {
    lenis.on('scroll', (e: any) => {
      document.documentElement.style.setProperty('--scrollY', `${e.scroll}px`);
    });
  }
}

export function getScroll(): number {
  if (lenis) {
    return (lenis as any).scroll || 0;
  }
  return window.scrollY || 0;
}

export function scrollTo(target: number | Element, options?: any) {
  if (lenis) {
    const offset = typeof target === 'number' ? target : (target as HTMLElement).offsetTop;
    (lenis as any).scrollTo(offset, options);
  } else {
    const offset = typeof target === 'number' ? target : (target as HTMLElement).offsetTop;
    window.scrollTo({ top: offset, behavior: 'smooth', ...options });
  }
}

export function resetScroll() {
  if (lenis) {
    (lenis as any).scrollTo(0, { immediate: true });
  } else {
    window.scrollTo(0, 0);
  }
}
