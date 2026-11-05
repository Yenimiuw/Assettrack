import { useEffect, useState } from 'react';
import { SLOW_AFTER_MS } from '../config';

/**
 * 0 = fine, 1 = "taking longer than usual", 2 = "still working, connection may be slow".
 * Pass the time the request started (or undefined when idle).
 */
export function useSlowLevel(startedAt: number | undefined): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    setLevel(0);
    if (!startedAt) return;
    const elapsed = Date.now() - startedAt;
    const timers = SLOW_AFTER_MS.map((after, i) => {
      const wait = after - elapsed;
      if (wait <= 0) { setLevel((l) => Math.max(l, i + 1)); return null; }
      return setTimeout(() => setLevel((l) => Math.max(l, i + 1)), wait);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [startedAt]);
  return level;
}
