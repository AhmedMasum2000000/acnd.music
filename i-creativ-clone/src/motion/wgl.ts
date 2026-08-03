/**
 * The WebGL layer.
 *
 * One Pixi application on one fixed canvas behind the whole document. A soft
 * field of drifting light that leans toward the pointer and settles when it
 * stops — enough to make the background feel alive without competing with
 * the type in front of it.
 *
 * Everything here is decorative. Initialisation is best-effort: if WebGL is
 * unavailable, blocked, or the context is lost, the site is exactly the site
 * minus this file, so failures are swallowed rather than surfaced.
 */

import { Application, BlurFilter, Container, Graphics } from 'pixi.js';
import { damp } from '../lib/lerp';
import { prefersReducedMotion } from '../lib/viewport';

interface Blob {
  view: Graphics;
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  speed: number;
  phase: number;
  depth: number;
}

export interface WglHandle {
  destroy: () => void;
}

const BLOB_COLORS = [0xd7d5c6, 0x8e93a8, 0x4a5068];

export async function initWebGL(): Promise<WglHandle> {
  const canvas = document.getElementById('wgl_canvas') as HTMLCanvasElement | null;
  const noop: WglHandle = { destroy: () => {} };
  if (!canvas) return noop;

  const app = new Application();

  try {
    await app.init({
      canvas,
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: false,
      // Retina is imperceptible on a blurred field and doubles the fill cost,
      // so the ratio is capped well below what the display may report.
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      autoDensity: true,
      powerPreference: 'low-power',
    });
  } catch {
    // No WebGL, or the context was refused. The canvas stays empty.
    return noop;
  }

  const stage = new Container();
  app.stage.addChild(stage);

  // A single large blur over the container is one pass; blurring each blob
  // separately would be one pass per blob for the same result.
  stage.filters = [new BlurFilter({ strength: 60, quality: 3 })];

  const { width, height } = app.screen;

  const blobs: Blob[] = Array.from({ length: 5 }, (_, i) => {
    const view = new Graphics();
    const radius = Math.max(width, height) * (0.18 + (i % 3) * 0.06);
    view.circle(0, 0, radius).fill({
      color: BLOB_COLORS[i % BLOB_COLORS.length]!,
      alpha: 0.1,
    });

    const baseX = width * (0.15 + 0.18 * i);
    const baseY = height * (i % 2 === 0 ? 0.32 : 0.68);
    view.position.set(baseX, baseY);
    stage.addChild(view);

    return {
      view,
      baseX,
      baseY,
      driftX: baseX,
      driftY: baseY,
      speed: 0.00012 + i * 0.00004,
      phase: i * 1.7,
      // Nearer blobs answer the pointer more strongly, which reads as depth.
      depth: 0.3 + i * 0.16,
    };
  });

  let pointerX = width / 2;
  let pointerY = height / 2;
  let smoothX = pointerX;
  let smoothY = pointerY;

  const onPointerMove = (event: PointerEvent): void => {
    pointerX = event.clientX;
    pointerY = event.clientY;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  const reduced = prefersReducedMotion();

  // Reduced motion still gets the composition, just held still — one frame
  // rendered, then the ticker stopped.
  if (reduced) {
    app.render();
    app.ticker.stop();
    return {
      destroy: () => {
        window.removeEventListener('pointermove', onPointerMove);
        app.destroy(false, { children: true });
      },
    };
  }

  app.ticker.add((ticker) => {
    // Seconds, and capped: a backgrounded tab resumes with a large delta that
    // would otherwise teleport everything across the screen in one frame.
    const dt = Math.min(ticker.deltaMS, 50) / 1000;
    const time = performance.now();

    smoothX = damp(smoothX, pointerX, 2.2, dt);
    smoothY = damp(smoothY, pointerY, 2.2, dt);

    const offsetX = (smoothX - app.screen.width / 2) / app.screen.width;
    const offsetY = (smoothY - app.screen.height / 2) / app.screen.height;

    for (const blob of blobs) {
      const wanderX = Math.sin(time * blob.speed + blob.phase) * app.screen.width * 0.06;
      const wanderY = Math.cos(time * blob.speed * 1.3 + blob.phase) * app.screen.height * 0.05;

      const targetX = blob.baseX + wanderX + offsetX * 140 * blob.depth;
      const targetY = blob.baseY + wanderY + offsetY * 140 * blob.depth;

      blob.driftX = damp(blob.driftX, targetX, 1.6, dt);
      blob.driftY = damp(blob.driftY, targetY, 1.6, dt);
      blob.view.position.set(blob.driftX, blob.driftY);
    }
  });

  const onVisibility = (): void => {
    if (document.hidden) app.ticker.stop();
    else app.ticker.start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  // Blob anchors are absolute pixels, so they need re-deriving when the
  // viewport changes or the composition drifts off-screen.
  const onResize = (): void => {
    const w = app.screen.width;
    const h = app.screen.height;
    blobs.forEach((blob, i) => {
      blob.baseX = w * (0.15 + 0.18 * i);
      blob.baseY = h * (i % 2 === 0 ? 0.32 : 0.68);
    });
  };
  window.addEventListener('resize', onResize, { passive: true });

  return {
    destroy: () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      app.destroy(false, { children: true });
    },
  };
}
