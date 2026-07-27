import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { acts, artist, hasAct } from './data/acnd';
import { AsciiRenderer } from './engine/renderer';
import { AudioEngine } from './engine/audio';
import type { FieldParams } from './engine/field';
import { StageContext, type Stage } from './hooks/useStage';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useMagnetic } from './hooks/useMagnetic';
import { setAccent as setCssAccent } from './lib/css';
import { asset } from './lib/asset';
import { clamp } from './lib/lerp';

import { ActTransition } from './components/ActTransition';
import { Boot } from './components/Boot';
import { Hud } from './components/Hud';
import { Cursor, Overlays } from './components/Overlays';
import { Hero } from './components/acts/Hero';
import { Artist } from './components/acts/Artist';
import { Spectrum } from './components/acts/Spectrum';
import { Catalog } from './components/acts/Catalog';
import { Sets } from './components/acts/Sets';
import { Transmission } from './components/acts/Transmission';

import './components/acts/acts.css';
// Loaded after the act styles so the surface treatment can layer on top.
import './styles/cyber.css';

const ENTERED_KEY = 'acnd:entered';

export const App = () => {
  const reducedMotion = useReducedMotion();
  useMagnetic();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const rendererRef = useRef<AsciiRenderer | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);

  const [booted, setBooted] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(ENTERED_KEY) === '1',
  );
  const [soundOn, setSoundOn] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);

  /* ── engine lifecycle ───────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const r = new AsciiRenderer(canvas, {
      portraitSrc: asset(artist.portrait.src),
      accent: acts[0].accent,
      reducedMotion,
    });
    rendererRef.current = r;
    r.setMode(acts[0].mode);
    r.start();

    return () => {
      r.destroy();
      rendererRef.current = null;
    };
    // Constructed once. The motion preference is pushed in below rather than
    // rebuilding the whole renderer, which would drop the decoded portrait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rendererRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => () => audioRef.current?.destroy(), []);

  /* ── pointer ────────────────────────────────────────────────────── */

  useEffect(() => {
    const onMove = (e: PointerEvent) => rendererRef.current?.setPointer(e.clientX, e.clientY);
    const onLeave = () => rendererRef.current?.clearPointer();

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  /* ── scroll: progress rail + field tearing ──────────────────────── */

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;

    const read = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      document.documentElement.style.setProperty(
        '--scroll-progress',
        String(max > 0 ? clamp(y / max) : 0),
      );

      // Normalised against a brisk wheel notch, so a flick tears the field
      // and a slow drag barely disturbs it.
      rendererRef.current?.setScrollVelocity(clamp((y - last) / 90, -1, 1));
      last = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(read);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    read();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── act tracking ───────────────────────────────────────────────── */

  useEffect(() => {
    // The narrow band means exactly one section can be "current" — whichever
    // one is crossing the middle of the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const i = acts.findIndex((a) => a.id === entry.target.id);
          if (i < 0 || i === activeIndexRef.current) continue;

          const previous = activeIndexRef.current;
          activeIndexRef.current = i;
          setActiveIndex(i);

          const act = acts[i];
          rendererRef.current?.setMode(act.mode);
          rendererRef.current?.setAccent(act.accent);
          setCssAccent(act.accent);
          audioRef.current?.sweep(i > previous);
        }
      },
      { rootMargin: '-48% 0px -48% 0px', threshold: 0 },
    );

    acts.forEach((a) => {
      const el = document.getElementById(a.id);
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  /* ── audio amplitude → field ────────────────────────────────────── */

  useEffect(() => {
    if (!soundOn) {
      rendererRef.current?.setAudioLevel(0);
      return;
    }
    // 20Hz is plenty: the renderer eases toward this value, so sampling
    // faster would cost frames without changing anything visible.
    const id = window.setInterval(() => {
      rendererRef.current?.setAudioLevel(audioRef.current?.level() ?? 0);
    }, 50);
    return () => window.clearInterval(id);
  }, [soundOn]);

  /* ── scroll lock while the gate is up ───────────────────────────── */

  useEffect(() => {
    document.body.style.overflow = booted ? '' : 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [booted]);

  /* ── stage API ──────────────────────────────────────────────────── */

  const ensureAudio = useCallback((): AudioEngine => {
    if (!audioRef.current) audioRef.current = new AudioEngine();
    return audioRef.current;
  }, []);

  const toggleSound = useCallback(() => {
    const a = ensureAudio();
    if (a.enabled) {
      a.disable();
      setSoundOn(false);
    } else {
      void a.enable().then(() => setSoundOn(true));
    }
  }, [ensureAudio]);

  const tick = useCallback((freq = 1800, level = 0.2) => {
    audioRef.current?.blip(freq, level);
  }, []);

  const tune = useCallback((params: Partial<FieldParams> | null, accent?: string) => {
    const r = rendererRef.current;
    if (!r) return;
    r.setOverride(params);
    if (params && accent) {
      r.setAccent(accent);
      setCssAccent(accent);
    } else if (!params) {
      // Back to whatever the current act asked for.
      const act = acts[activeIndexRef.current] ?? acts[0];
      r.setMode(act.mode);
      r.setAccent(act.accent);
      setCssAccent(act.accent);
    }
  }, []);

  const setReveal = useCallback((v: number) => rendererRef.current?.setReveal(v), []);

  const stage = useMemo<Stage>(
    () => ({ soundOn, reducedMotion, toggleSound, tick, tune, setReveal }),
    [soundOn, reducedMotion, toggleSound, tick, tune, setReveal],
  );

  const onEnter = useCallback(
    (withSound: boolean) => {
      sessionStorage.setItem(ENTERED_KEY, '1');
      setBooted(true);
      if (withSound) {
        const a = ensureAudio();
        void a.enable().then(() => setSoundOn(true));
      }
      // The gate behaves like a modal, so closing it has to hand focus back
      // somewhere meaningful. Without this it falls to <body> and the next
      // Tab lands wherever the removed button happened to sit in the DOM.
      requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
    },
    [ensureAudio],
  );

  return (
    <StageContext.Provider value={stage}>
      <a className="skip" href="#artist">
        Skip to content
      </a>

      {/* Purely decorative: every word on this site lives in real markup. */}
      <canvas ref={canvasRef} className="field" aria-hidden="true" />
      <Overlays />
      <Cursor />

      {!booted && <Boot onEnter={onEnter} />}

      <ActTransition activeIndex={activeIndex} />
      <Hud activeIndex={activeIndex} />

      {/* Acts render only when they have something to show — see `acts` in
          src/data/acnd.ts, which is also what drives the HUD numbering. */}
      <main id="top" ref={mainRef} tabIndex={-1}>
        <Hero />
        <Artist />
        <Spectrum />
        {hasAct('catalog') && <Catalog />}
        {hasAct('sets') && <Sets />}
        <Transmission />
      </main>
    </StageContext.Provider>
  );
};
