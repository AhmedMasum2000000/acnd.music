import barba from '@barba/core';
import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/viewport';
import { resetScroll } from './scroll';

const pageNamespaces: Record<string, string> = {
  '/': 'home',
  '/projects': 'projects',
  '/project': 'project-detail',
  '/services': 'services',
  '/about': 'about',
  '/vision': 'vision',
  '/contact': 'contact',
};

export function initBarba() {
  barba.init({
    prefetchIgnore: true,
    timeout: 10000,
  });

  barba.on('before', (data: any) => {
    const namespace = getNamespaceFromUrl(data.next.url.pathname);
    setNamespace(namespace);
  });

  barba.on('leave', (data: any) => {
    return new Promise((resolve) => {
      if (prefersReducedMotion()) {
        resolve(undefined);
        return;
      }

      const container = data.current.container;
      gsap.to(container, {
        opacity: 0,
        duration: 0.4,
        onComplete: resolve,
      });
    });
  });

  barba.on('enter', (data: any) => {
    if (!prefersReducedMotion()) {
      data.next.container.style.opacity = '0';
      gsap.to(data.next.container, { opacity: 1, duration: 0.4 });
    }
    resetScroll();
  });

  barba.on('after', () => {
    // Page-specific init hooks would be called here
    reinitializeScripts();
  });
}

function getNamespaceFromUrl(pathname: string): string {
  for (const [path, namespace] of Object.entries(pageNamespaces)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return namespace;
    }
  }
  return 'home';
}

function setNamespace(namespace: string) {
  const container = document.querySelector('[data-barba="container"]');
  if (container) {
    container.setAttribute('data-barba-namespace', namespace);
  }
}

function reinitializeScripts() {
  // This would be where page-specific scripts get re-initialized
  // after a Barba transition
  const namespace = document.querySelector('[data-barba="container"]')?.getAttribute('data-barba-namespace');

  switch (namespace) {
    case 'projects':
      // Re-init projects filter
      break;
    case 'home':
      // Re-init hero slideshow
      break;
  }
}
