// Styles
import './styles/global.css';
import './styles/components/header.css';
import './styles/components/nav.css';
import './styles/components/sections.css';
import './styles/components/ui.css';

// Motion systems
import { initCurtain } from './motion/curtain';
import { initScroll } from './motion/scroll';
import { initMenu } from './motion/menu';
import { initSlideshow } from './motion/slideshow';
import { initBarba } from './motion/barba';
import { initReveal } from './motion/reveal';
import { initMarquee } from './motion/marquee';
import { initCursor } from './motion/cursor';
import { initProjectFilter } from './motion/flipFilter';
import { initWGL } from './motion/wgl';

// Utils
import { updateViewportUnits, prefersReducedMotion } from './lib/viewport';

// Initialize on page load
function init() {
  // Set up viewport units for custom properties
  updateViewportUnits();
  window.addEventListener('resize', updateViewportUnits);

  // Initialize motion systems
  initCurtain();
  initScroll();
  initBarba();
  initMenu();
  initSlideshow();
  initReveal();
  initMarquee();
  initCursor();
  initProjectFilter();

  // Initialize WebGL
  if (!prefersReducedMotion()) {
    initWGL();
  }
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
