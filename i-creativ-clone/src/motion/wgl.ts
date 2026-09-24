import * as PIXI from 'pixi.js';
import { prefersReducedMotion } from '../lib/viewport';
import { lerp } from '../lib/lerp';

interface WGLState {
  app: PIXI.Application | null;
  pointerX: number;
  pointerY: number;
  targetPointerX: number;
  targetPointerY: number;
}

const state: WGLState = {
  app: null,
  pointerX: 0,
  pointerY: 0,
  targetPointerX: 0,
  targetPointerY: 0,
};

export async function initWGL() {
  if (prefersReducedMotion()) return;

  const canvas = document.querySelector<HTMLCanvasElement>('#wgl_canvas');
  if (!canvas) return;

  try {
    const app = new PIXI.Application();
    await app.init({
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
    } as any);

    state.app = app;

    // Listen to pointer movement
    document.addEventListener('mousemove', (e) => {
      state.targetPointerX = e.clientX;
      state.targetPointerY = e.clientY;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (state.app) {
        (state.app.renderer as any).resize(window.innerWidth, window.innerHeight);
      }
    });

    // Animation loop
    app.ticker.add(() => {
      state.pointerX = lerp(state.pointerX, state.targetPointerX, 0.1);
      state.pointerY = lerp(state.pointerY, state.targetPointerY, 0.1);
    });
  } catch (error) {
    console.warn('WebGL initialization failed:', error);
  }
}

export function disposeWGL() {
  if (state.app) {
    state.app.destroy();
    state.app = null;
  }
}
