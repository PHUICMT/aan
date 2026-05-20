import { cubicOut } from 'svelte/easing';
import { app } from './store.svelte';

// Outgoing page disappears instantly; only the incoming page animates.
// Avoids overlapping-pages feel.
const DURATION = 180;
const DISTANCE = 40; // px

export function pageSlide(_node: Element, opts: { mode: 'in' | 'out' } = { mode: 'in' }) {
  const enter = opts.mode === 'in';
  if (!enter) {
    return { duration: 0, css: () => 'opacity: 0;' };
  }
  const sign = app.navDir === 'forward' ? 1 : -1;
  return {
    duration: DURATION,
    easing: cubicOut,
    css: (t: number, u: number) => {
      const x = sign * DISTANCE * u;
      return `transform: translate3d(${x}px, 0, 0); opacity: ${t};`;
    },
  };
}
