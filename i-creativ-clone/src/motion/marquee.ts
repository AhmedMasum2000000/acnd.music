import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/viewport';

export function initMarquee() {
  const marquees = Array.from(document.querySelectorAll('[data-marquee]'));

  marquees.forEach((marquee) => {
    const track = marquee.querySelector('[data-marquee-track]') as HTMLElement | null;
    if (!track) return;

    // Clone the content for seamless loop
    const original = track.innerHTML;
    track.innerHTML = original + original;

    const styles = getComputedStyle(marquee as HTMLElement);
    const moveInitial = parseFloat(styles.getPropertyValue('--move-initial'));
    const moveFinal = parseFloat(styles.getPropertyValue('--move-final'));

    if (!prefersReducedMotion()) {
      gsap.to(track, {
        x: -moveFinal,
        duration: 20,
        ease: 'none',
        repeat: -1,
        onRepeat: () => {
          gsap.set(track, { x: moveInitial });
        },
      });
    }
  });
}
