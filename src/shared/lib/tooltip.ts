// Single shared tooltip element in document.body; the `tooltip` action
// drives it from per-target hover/focus listeners.

type Placement = 'top' | 'bottom';
type Options = string | { text: string; placement?: Placement; delay?: number };

let host: HTMLDivElement | null = null;
let hideTimer: number | null = null;
let showTimer: number | null = null;

function ensureHost(): HTMLDivElement {
  if (host) return host;
  host = document.createElement('div');
  host.className = 'nv-tooltip';
  host.setAttribute('role', 'tooltip');
  host.style.position = 'fixed';
  host.style.zIndex = '9999';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  host.style.transform = 'translateY(4px)';
  host.style.transition = 'opacity 140ms var(--ease-out, ease-out), transform 140ms var(--ease-out, ease-out)';
  host.style.padding = '6px 10px';
  host.style.borderRadius = '8px';
  host.style.fontSize = '11px';
  host.style.fontWeight = '500';
  host.style.lineHeight = '1.35';
  host.style.maxWidth = '280px';
  host.style.whiteSpace = 'pre-line';
  host.style.color = 'var(--text, #fff)';
  host.style.background = 'color-mix(in srgb, var(--menu-bg, #1a1530) 90%, transparent)';
  host.style.backdropFilter = 'blur(20px) saturate(180%)';
  (host.style as any).webkitBackdropFilter = 'blur(20px) saturate(180%)';
  host.style.border = '1px solid var(--border, rgba(255,255,255,0.12))';
  host.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
  document.body.appendChild(host);
  return host;
}

function place(trigger: HTMLElement, placement: Placement) {
  const el = ensureHost();
  const r = trigger.getBoundingClientRect();
  el.style.left = '0px';
  el.style.top = '0px';
  const tr = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Auto-flip if requested side would clip the viewport.
  let actual = placement;
  if (placement === 'top' && r.top - tr.height - 8 < 8) actual = 'bottom';
  if (placement === 'bottom' && r.bottom + tr.height + 8 > vh - 8) actual = 'top';

  const cx = r.left + r.width / 2;
  let left = Math.round(cx - tr.width / 2);
  let top: number;
  if (actual === 'top') {
    top = Math.round(r.top - tr.height - 8);
    el.style.transform = 'translateY(4px)';
  } else {
    top = Math.round(r.bottom + 8);
    el.style.transform = 'translateY(-4px)';
  }
  left = Math.max(8, Math.min(vw - tr.width - 8, left));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function show(trigger: HTMLElement, opts: { text: string; placement: Placement }) {
  if (!opts.text) return;
  const el = ensureHost();
  el.textContent = opts.text;
  el.style.display = 'block';
  // Two passes: first to measure, second to reposition with known size.
  place(trigger, opts.placement);
  requestAnimationFrame(() => {
    place(trigger, opts.placement);
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

function hide() {
  const el = host;
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(4px)';
}

export function tooltip(node: HTMLElement, options: Options) {
  let opts = normalize(options);

  function onEnter() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (showTimer) clearTimeout(showTimer);
    showTimer = window.setTimeout(() => show(node, opts), opts.delay);
  }
  function onLeave() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 60);
  }

  node.addEventListener('mouseenter', onEnter);
  node.addEventListener('mouseleave', onLeave);
  node.addEventListener('focus', onEnter);
  node.addEventListener('blur', onLeave);

  return {
    update(next: Options) {
      opts = normalize(next);
    },
    destroy() {
      node.removeEventListener('mouseenter', onEnter);
      node.removeEventListener('mouseleave', onLeave);
      node.removeEventListener('focus', onEnter);
      node.removeEventListener('blur', onLeave);
      if (showTimer) clearTimeout(showTimer);
      onLeave();
    },
  };
}

function normalize(o: Options): { text: string; placement: Placement; delay: number } {
  if (typeof o === 'string') return { text: o, placement: 'top', delay: 350 };
  return { text: o.text, placement: o.placement ?? 'top', delay: o.delay ?? 350 };
}
