import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Fires once when an element first enters the viewport. Used to trigger
 * entrance animations without keeping an observer alive for the whole
 * session — everything on this page animates in exactly once.
 */
export const useInView = <T extends HTMLElement>(
  rootMargin = '-12% 0px -12% 0px',
): [RefObject<T>, boolean] => {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, inView];
};
