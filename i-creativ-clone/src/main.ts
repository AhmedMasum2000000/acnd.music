/**
 * Boot sequence.
 *
 * Order matters: viewport units before anything measures, scroll before the
 * curtain (which locks it), and the WebGL layer last because it is the only
 * part that is allowed to fail.
 */

import '@fontsource/bebas-neue/400.css';
import '@fontsource-variable/inter';

import './styles/tokens.css';
import './styles/grid.css';
import './styles/typography.css';
import './styles/global.css';
import './styles/components.css';

import { initViewport } from './lib/viewport';
import { initBarba, mountPage } from './motion/barba';
import { playIntro } from './motion/curtain';
import { initMenu } from './motion/menu';
import { initScroll } from './motion/scroll';
import { initWebGL } from './motion/wgl';
import { initCookieNotice } from './ui/cookieNotice';

function boot(): void {
  initViewport();
  initScroll();

  // Shell-level modules live for the session; only page modules are remounted
  // by Barba.
  initMenu();
  initCookieNotice();
  initBarba();

  mountPage(document);

  void playIntro();

  // Decorative, and the heaviest thing on the page — kicked off without
  // blocking the intro, and its failure is not the site's failure.
  void initWebGL().catch(() => undefined);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
