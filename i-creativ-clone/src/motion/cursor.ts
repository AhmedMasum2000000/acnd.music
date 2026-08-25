import gsap from 'gsap';
import { lerpVector } from '../lib/lerp';
import { prefersReducedMotion } from '../lib/viewport';

interface CursorState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

let cursorState: CursorState = { x: 0, y: 0, targetX: 0, targetY: 0 };
let rafId: number | null = null;

export function initCursor() {
  if (prefersReducedMotion()) return;

  const links = Array.from(document.querySelectorAll('[data-add-hover]'));

  document.addEventListener('mousemove', (e) => {
    cursorState.targetX = e.clientX;
    cursorState.targetY = e.clientY;
  });

  links.forEach((link) => {
    link.addEventListener('mouseenter', () => {
      const rect = link.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      // Animate to link center
      gsap.to(cursorState, {
        targetX: center.x,
        targetY: center.y,
        duration: 0.3,
      });
    });

    link.addEventListener('mouseleave', () => {
      // Return to actual cursor position (this happens naturally as mouse moves)
    });
  });

  startCursorAnimation();
}

function startCursorAnimation() {
  const animate = () => {
    // Lerp towards target
    const current = lerpVector(
      { x: cursorState.x, y: cursorState.y },
      { x: cursorState.targetX, y: cursorState.targetY },
      0.15
    );

    cursorState.x = current.x;
    cursorState.y = current.y;

    rafId = requestAnimationFrame(animate);
  };

  rafId = requestAnimationFrame(animate);
}

export function disposeCursor() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
