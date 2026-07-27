import { acts } from '../data/acnd';
import { useStage } from '../hooks/useStage';
import './Hud.css';

interface Props {
  activeIndex: number;
}

/**
 * The fixed heads-up display.
 *
 * This is what keeps a deliberately chaotic site from being a confusing one.
 * At every moment the visitor can see where they are, how much is left, and
 * how to jump anywhere — so the noise reads as atmosphere rather than as
 * being lost. Remove this and the site becomes hostile.
 */
export const Hud = ({ activeIndex }: Props) => {
  const { soundOn, toggleSound, tick } = useStage();
  const act = acts[activeIndex] ?? acts[0];

  return (
    <>
      <header className="hud">
        <a
          className="hud__mark"
          href="#top"
          aria-label="ACND — back to top"
          onClick={() => tick(900, 0.14)}
        >
          ACND
        </a>

        <p className="hud__act" aria-live="polite">
          <span className="hud__act-idx">{act.index}</span>
          <span className="hud__act-sep">/</span>
          <span className="hud__act-total">{acts.length.toString().padStart(2, '0')}</span>
          <span className="hud__act-label">{act.label}</span>
        </p>

        <button
          className={`hud__sound ${soundOn ? 'is-on' : ''}`}
          onClick={toggleSound}
          aria-pressed={soundOn}
        >
          <span className="hud__sound-bars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          SOUND {soundOn ? 'ON' : 'OFF'}
        </button>
      </header>

      {/* Vertical rail: position, and a jump target for every act. */}
      <nav className="rail" aria-label="Sections">
        <ol className="rail__list">
          {acts.map((a, i) => (
            <li key={a.id}>
              <a
                className={`rail__dot ${i === activeIndex ? 'is-active' : ''}`}
                href={`#${a.id}`}
                onClick={() => tick(1400, 0.12)}
              >
                <span className="rail__num">{a.index}</span>
                <span className="rail__name">{a.label}</span>
              </a>
            </li>
          ))}
        </ol>
        {/*
          The fill is driven by a CSS custom property that the scroll handler
          writes directly to :root. Routing scroll position through React
          state would re-render the tree on every frame of every scroll.
        */}
        <div className="rail__track" aria-hidden="true">
          <div className="rail__fill" /></div>
      </nav>
    </>
  );
};
