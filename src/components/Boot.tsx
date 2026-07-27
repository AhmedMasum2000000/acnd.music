import { useCallback, useEffect, useRef, useState } from 'react';
import { bootLines } from '../data/acnd';
import { useStage } from '../hooks/useStage';
import './Boot.css';

/** ACND rendered in a 5-row block face. Decorative — the real <h1> is in the hero. */
const LOGO = [
  ' ███   ████ █   █ ████ ',
  '█   █ █     ██  █ █   █',
  '█████ █     █ █ █ █   █',
  '█   █ █     █  ██ █   █',
  '█   █  ████ █   █ ████ ',
];

const SCRAMBLE = '▓▒░#%*+=-·';

interface Props {
  onEnter: (withSound: boolean) => void;
}

/**
 * Act 00 — the gate.
 *
 * A boot sequence buys two things: it sets the tone before a single word of
 * copy is read, and it gives the renderer a moment to warm up behind the
 * overlay. It is also the one place where asking for audio consent is
 * natural rather than intrusive.
 *
 * It is skippable at any moment, and it does not run twice in a session.
 * A gate that makes returning visitors wait is a gate that loses them.
 */
export const Boot = ({ onEnter }: Props) => {
  const { reducedMotion, tick } = useStage();
  const [line, setLine] = useState(reducedMotion ? bootLines.length : 0);
  const [ready, setReady] = useState(reducedMotion);
  const [leaving, setLeaving] = useState(false);
  const logoRef = useRef<HTMLPreElement>(null);

  const finish = useCallback(
    (withSound: boolean) => {
      setLeaving(true);
      // Let the wipe play out before the overlay leaves the tree.
      window.setTimeout(() => onEnter(withSound), reducedMotion ? 0 : 460);
    },
    [onEnter, reducedMotion],
  );

  /* Print the boot log, one line at a time. */
  useEffect(() => {
    if (reducedMotion || line >= bootLines.length) {
      if (line >= bootLines.length) setReady(true);
      return;
    }
    const blank = bootLines[line] === '';
    const t = window.setTimeout(
      () => {
        if (!blank) tick(1500 + Math.random() * 1200, 0.05);
        setLine((n) => n + 1);
      },
      blank ? 60 : 118,
    );
    return () => window.clearTimeout(t);
  }, [line, reducedMotion, tick]);

  /* Assemble the logo out of static once the log has finished. */
  useEffect(() => {
    const el = logoRef.current;
    if (!el || !ready || reducedMotion) return;

    const target = LOGO.join('\n');
    let raf = 0;
    let start = 0;

    const frame = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 620);
      let out = '';
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (ch === '\n') { out += ch; continue; }
        // Cells resolve in a random-but-stable order, so the logo materialises
        // as a cloud condensing rather than a left-to-right wipe.
        out += Math.random() < p * p ? ch : (ch === ' ' && Math.random() > 0.12)
          ? ' '
          : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
      }
      el.textContent = out;
      if (p < 1) raf = requestAnimationFrame(frame);
      else el.textContent = target;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ready, reducedMotion]);

  /* Any key skips ahead. Enter/Space commits. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finish(false);
        return;
      }
      if (!ready) {
        setLine(bootLines.length);
        setReady(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, finish]);

  return (
    <div className={`boot ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-label="Enter the site">
      <div className="boot__inner">
        <pre className="boot__log" aria-hidden="true">
          {bootLines.slice(0, line).join('\n')}
          {!ready && <span className="boot__caret">█</span>}
        </pre>

        <pre
          ref={logoRef}
          className={`boot__logo ${ready ? 'is-on' : ''}`}
          aria-label="ACND"
          role="img"
        >
          {LOGO.join('\n')}
        </pre>

        <div className={`boot__actions ${ready ? 'is-on' : ''}`}>
          <button className="boot__btn is-primary" onClick={() => finish(false)} disabled={!ready}>
            [ ENTER ]
          </button>
          <button className="boot__btn" onClick={() => finish(true)} disabled={!ready}>
            [ ENTER WITH SOUND ]
          </button>
          <p className="boot__hint">
            {ready ? 'Move your cursor. The page listens.' : 'Booting…'}
          </p>
        </div>
      </div>

      <button className="boot__skip" onClick={() => finish(false)}>
        SKIP
      </button>
    </div>
  );
};
