// Mapping between Range objects (live DOM Selections) and the plain-text
// offsets we persist. The chapter HTML is static on disk, so concatenating
// every text node in order gives a stable string we can index into.
//
// Caveats:
//  - Whitespace is taken as-is from the DOM (no collapsing). The same
//    bodyEl is walked at save time and at restore time, so they agree.
//  - Inline elements (em/strong/a) don't add to the offset — only text
//    nodes contribute, mirroring the model used by Range.

export type TextOffsets = { start: number; end: number };

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
      // Skip nodes inside our own highlight marks so re-applying doesn't
      // double-count them. Marks wrap a slice of an existing text node;
      // the wrapper carries the same text either way.
      if (p.classList && p.classList.contains('nv-anno')) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

/** Convert a live Range into start/end character offsets relative to
 *  the text content of `root`. Returns null if the range escapes root. */
export function rangeToOffsets(root: HTMLElement, range: Range): TextOffsets | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const nodes = textNodes(root);
  let charCount = 0;
  let start = -1;
  let end = -1;
  for (const n of nodes) {
    const len = n.nodeValue?.length ?? 0;
    if (n === range.startContainer) start = charCount + range.startOffset;
    if (n === range.endContainer) end = charCount + range.endOffset;
    charCount += len;
    if (start >= 0 && end >= 0) break;
  }
  if (start < 0 || end < 0 || end <= start) return null;
  return { start, end };
}

/** Walk text nodes counting characters until we hit `offset`, then return
 *  the (node, localOffset) pair the caller can feed to a Range. */
function locate(nodes: Text[], offset: number): { node: Text; local: number } | null {
  let acc = 0;
  for (const n of nodes) {
    const len = n.nodeValue?.length ?? 0;
    if (offset <= acc + len) return { node: n, local: Math.max(0, offset - acc) };
    acc += len;
  }
  if (nodes.length === 0) return null;
  const last = nodes[nodes.length - 1];
  return { node: last, local: last.nodeValue?.length ?? 0 };
}

/** Construct a live Range that spans `[start, end)` character offsets
 *  in the plain-text projection of `root`. */
export function offsetsToRange(root: HTMLElement, start: number, end: number): Range | null {
  const nodes = textNodes(root);
  const a = locate(nodes, start);
  const b = locate(nodes, end);
  if (!a || !b) return null;
  const r = document.createRange();
  try {
    r.setStart(a.node, a.local);
    r.setEnd(b.node, b.local);
  } catch {
    return null;
  }
  return r;
}

/** Wrap the contents of the range in a span with the given attributes.
 *  surroundContents would throw if the range crosses element boundaries,
 *  so we extract → wrap → insert instead. Safe across nested inlines. */
export function wrapRange(range: Range, className: string, dataset: Record<string, string>): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = className;
  for (const [k, v] of Object.entries(dataset)) wrapper.dataset[k] = v;
  // extractContents pulls the slice out (potentially across element
  // boundaries), then we drop the wrapper at the start of the range and
  // move the extracted content inside it.
  const frag = range.extractContents();
  wrapper.appendChild(frag);
  range.insertNode(wrapper);
  return wrapper;
}
