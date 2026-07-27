import { useEffect, useId, useRef, useState } from 'react';
import { platformLabel, socials } from '../data/acnd';
import { useStage } from '../hooks/useStage';
import './SocialMenu.css';

/**
 * The header dropdown.
 *
 * Every streaming and social link in one place, reachable from any point in
 * the journey — the visitor should never have to scroll to the end of the
 * site to find out where to listen.
 *
 * Built as a real disclosure rather than a hover menu: hover menus are
 * unusable on touch, and this is a phone-first audience. It closes on Escape,
 * on outside click, and on selection, and it returns focus to the trigger so
 * keyboard users are not dropped at the top of the document.
 */
export const SocialMenu = () => {
  const { tick } = useStage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    // Focus leaving the menu entirely closes it — tabbing past the last link
    // should not leave an open panel floating over the page.
    const onFocusIn = (e: FocusEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  if (socials.length === 0) return null;

  const toggle = () => {
    tick(open ? 900 : 1600, 0.13);
    setOpen((o) => !o);
  };

  return (
    <div className="smenu" ref={rootRef}>
      <button
        ref={buttonRef}
        className={`smenu__trigger ${open ? 'is-open' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-controls={menuId}
      >
        LISTEN
        <span className="smenu__caret" aria-hidden="true">
          ▼
        </span>
      </button>

      <div className={`smenu__panel ${open ? 'is-open' : ''}`} id={menuId} hidden={!open}>
        <ul>
          {socials.map((s) => (
            <li key={s.platform}>
              <a
                href={s.url}
                target={s.platform === 'email' ? undefined : '_blank'}
                rel={s.platform === 'email' ? undefined : 'noopener noreferrer'}
                onClick={() => {
                  tick(820, 0.16);
                  setOpen(false);
                }}
                onPointerEnter={() => tick(2100, 0.05)}
              >
                <span className="smenu__plat">{platformLabel[s.platform]}</span>
                <span className="smenu__go" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
