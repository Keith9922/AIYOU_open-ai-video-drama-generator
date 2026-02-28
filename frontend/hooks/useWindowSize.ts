import { useState, useEffect } from 'react';

/**
 * Tracks the browser window dimensions.
 * Uses requestAnimationFrame to throttle resize events and avoid layout thrashing.
 *
 * @returns { width, height } of the current window
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    let rafId: number | null = null;

    const handleResize = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
        rafId = null;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return size;
}
