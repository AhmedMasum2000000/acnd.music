import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/viewport';
import { setPageLoading } from '../lib/dom';

export function initCurtain() {
  const curtain = document.querySelector('[data-curtain]');
  if (!curtain) return;

  const items = Array.from(curtain.querySelectorAll('.curtain-item'));
  const logo = curtain.querySelector('.curtain-logo');

  if (prefersReducedMotion()) {
    setPageLoading(false);
    gsap.to(curtain, { duration: 0, opacity: 0, pointerEvents: 'none' });
    return;
  }

  const tl = gsap.timeline();

  // Stagger retract of the four panels
  tl.to(items, {
    height: 0,
    duration: 0.8,
    stagger: 0.12,
    ease: 'power2.inOut',
  });

  // Scale out the logo
  if (logo) {
    tl.to(
      logo,
      {
        scale: 1.2,
        opacity: 0,
        duration: 0.6,
        ease: 'back.in',
      },
      '<0.3'
    );
  }

  // Fade out curtain and clear loading state
  tl.to(
    curtain,
    {
      opacity: 0,
      pointerEvents: 'none',
      duration: 0.4,
      onComplete: () => {
        setPageLoading(false);
      },
    },
    '<0.2'
  );

  // Fade in main content
  const main = document.querySelector('main');
  if (main) {
    tl.to(main, { opacity: 1, duration: 0.6 }, '<0.1');
  }
}

export function hideCurtain() {
  const curtain = document.querySelector('[data-curtain]');
  if (curtain) {
    gsap.to(curtain, { opacity: 0, pointerEvents: 'none', duration: 0.2 });
  }
}
