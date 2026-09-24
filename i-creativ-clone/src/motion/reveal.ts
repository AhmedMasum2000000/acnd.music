import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/viewport';

export function initReveal() {
  if (prefersReducedMotion()) {
    // Just show everything immediately
    const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
    reveals.forEach((el) => {
      el.classList.add('revealed');
    });
    return;
  }

  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
  if (reveals.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = parseFloat((entry.target as HTMLElement).dataset.revealDelay || '0');
          const target = entry.target as HTMLElement;
          gsap.to(target, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay,
            ease: 'power2.out',
            onComplete: () => {
              target.classList.add('revealed');
            },
          });
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  reveals.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.opacity = '0';
    htmlEl.style.transform = 'translateY(20px)';
    observer.observe(el);
  });
}
