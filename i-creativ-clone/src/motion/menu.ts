import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/viewport';

let isMenuOpen = false;

export function initMenu() {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menuClose = document.querySelector('[data-menu-close]');
  const menuOverlay = document.querySelector('[data-menu-overlay]');
  const menuLinks = Array.from(document.querySelectorAll('[data-menu-link]'));

  if (!menuToggle || !menuClose || !menuOverlay) return;

  menuToggle.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);

  menuLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      closeMenu();
    }
  });
}

function openMenu() {
  isMenuOpen = true;
  const menuOverlay = document.querySelector('[data-menu-overlay]');
  if (!menuOverlay) return;

  document.body.style.overflow = 'hidden';

  if (prefersReducedMotion()) {
    menuOverlay.classList.add('is-open');
    return;
  }

  menuOverlay.classList.add('is-open');

  const menuLinks = Array.from(document.querySelectorAll('[data-menu-link]'));
  gsap.from(menuLinks, {
    y: 20,
    opacity: 0,
    duration: 0.4,
    stagger: 0.05,
    ease: 'power2.out',
  });
}

function closeMenu() {
  isMenuOpen = false;
  const menuOverlay = document.querySelector('[data-menu-overlay]') as HTMLElement | null;
  if (!menuOverlay) return;

  document.body.style.overflow = '';

  if (prefersReducedMotion()) {
    menuOverlay.classList.remove('is-open');
    return;
  }

  gsap.to(menuOverlay, {
    opacity: 0,
    pointerEvents: 'none',
    duration: 0.3,
    onComplete: () => {
      menuOverlay.classList.remove('is-open');
      menuOverlay.style.opacity = '';
      menuOverlay.style.pointerEvents = '';
    },
  });
}

export function closeMenuIfOpen() {
  if (isMenuOpen) {
    closeMenu();
  }
}
