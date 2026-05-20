// Svelte action: reparents node to document.body. Required because
// .page-wrap's `will-change: transform` creates a containing block that
// breaks backdrop-filter for descendants.

export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}

/// Fixed-position coords below a trigger button. Returns both left and
/// right anchors; caller picks which one to use.
export function anchorBelow(
  triggerEl: HTMLElement,
  opts: { gap?: number; align?: 'left' | 'right' } = {},
): { top: number; left: number; right: number } {
  const gap = opts.gap ?? 8;
  const r = triggerEl.getBoundingClientRect();
  return {
    top: Math.round(r.bottom + gap),
    left: Math.round(r.left),
    right: Math.round(window.innerWidth - r.right),
  };
}
