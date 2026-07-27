import { Fragment } from 'react';
import { useInView } from '../hooks/useInView';
import './WordReveal.css';

interface Props {
  children: string;
  className?: string;
  /** Seconds between each word landing. */
  stagger?: number;
  delay?: number;
}

/**
 * Reveals prose one word at a time.
 *
 * Deliberately not a typewriter that mutates `textContent`: every word is a
 * real text node in the document from the first paint, so the bio is fully
 * readable to crawlers and to anyone with JavaScript disabled. The animation
 * is pure CSS on top of markup that is already correct.
 */
export const WordReveal = ({ children, className, stagger = 0.028, delay = 0 }: Props) => {
  const [ref, inView] = useInView<HTMLParagraphElement>();
  const words = children.split(' ');

  return (
    <p ref={ref} className={`word-reveal ${inView ? 'is-in' : ''} ${className ?? ''}`}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span
            className="word-reveal__w"
            style={{ transitionDelay: `${delay + i * stagger}s` }}
          >
            {w}
          </span>
          {/*
            The separating space has to sit *outside* the span. Each word is an
            inline-block for the transform to work, and whitespace at the end of
            an inline-block is collapsed away — put the space inside and every
            word in the paragraph runs together.
          */}
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </p>
  );
};
