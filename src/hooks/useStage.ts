import { createContext, useContext } from 'react';
import type { FieldParams } from '../engine/field';

/**
 * The bridge between the React tree and the imperative engine.
 *
 * Deliberately all functions and no instances. The renderer and the audio
 * engine are created in effects, i.e. *after* the first render, so anything
 * holding a direct reference would capture null and never see the real
 * object. Every method here reads its ref at call time instead, which keeps
 * the context value stable and the 60fps loop entirely outside React.
 */
export interface Stage {
  soundOn: boolean;
  reducedMotion: boolean;
  toggleSound: () => void;
  /** Play a UI tick. No-op when sound is off. */
  tick: (freq?: number, level?: number) => void;
  /** Temporarily re-tune the field, e.g. while a genre tile is focused. */
  tune: (params: Partial<FieldParams> | null, accent?: string) => void;
  /** How far the portrait has resolved out of the noise, 0..1. */
  setReveal: (v: number) => void;
}

export const StageContext = createContext<Stage | null>(null);

export const useStage = (): Stage => {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error('useStage must be used inside <StageContext.Provider>');
  return ctx;
};
