/**
 * The fullscreen overlay menu.
 *
 * This module owns state, not motion: it toggles `body.menu-open`, locks
 * scroll, traps focus and restores it on close. The panel unfold and the
 * staggered link reveal are both CSS transitions keyed off that one class, so
 * they cannot drift out of step with each other.
 */

import { qs, qsa, trapFocus } from '../lib/dom';
import { startScroll, stopScroll } from './scroll';

interface MenuHandle {
  close: () => void;
  destroy: () => void;
}

export function initMenu(): MenuHandle {
  const wrapper = qs('#menu_wrapper');
  const toggle = qs<HTMLButtonElement>('#menu_toggle');
  const panel = qs('.js-main-navigation');
  const links = qsa('.menu-link');

  const noop: MenuHandle = { close: () => {}, destroy: () => {} };
  if (!wrapper || !toggle || !panel) return noop;

  let open = false;
  let releaseFocus: (() => void) | null = null;
  let lastFocused: HTMLElement | null = null;

  const setOpen = (next: boolean): void => {
    if (next === open) return;
    open = next;

    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    wrapper.setAttribute('aria-hidden', String(!open));

    if (open) {
      lastFocused = document.activeElement as HTMLElement | null;
      stopScroll();
      releaseFocus = trapFocus(panel);

      // The link reveal is CSS, keyed off `body.menu-open` — see the
      // `.menu-link` rules. Nothing to drive from here.

      // Focus the panel itself rather than the first link: announcing the
      // region before its contents is less abrupt for a screen reader.
      panel.setAttribute('tabindex', '-1');
      (panel as HTMLElement).focus({ preventScroll: true });
    } else {
      startScroll();
      releaseFocus?.();
      releaseFocus = null;
      lastFocused?.focus({ preventScroll: true });
    }
  };

  const onToggle = (): void => setOpen(!open);

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  // A link click during a Barba navigation must close the menu, otherwise the
  // panel stays over the page that just loaded.
  const onLinkClick = (): void => setOpen(false);

  toggle.addEventListener('click', onToggle);
  document.addEventListener('keydown', onKeydown);
  links.forEach((link) => link.addEventListener('click', onLinkClick));

  return {
    close: () => setOpen(false),
    destroy: () => {
      toggle.removeEventListener('click', onToggle);
      document.removeEventListener('keydown', onKeydown);
      links.forEach((link) => link.removeEventListener('click', onLinkClick));
      releaseFocus?.();
    },
  };
}
