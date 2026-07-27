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
        <span
          key={i}
          className="word-reveal__w"
          style={{ transitionDelay: `${delay + i * stagger}s` }}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
};
