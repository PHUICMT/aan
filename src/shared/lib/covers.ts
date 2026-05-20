// Shared cover blob-URL cache with in-flight coalescing and LRU eviction.
// Consumers MUST NOT call URL.revokeObjectURL() on returned URLs — the
// cache owns the lifecycle.

import { readCover } from './api';

const MAX_ENTRIES = 200;

// Map preserves insertion order → delete+re-set bumps to MRU, front is oldest.
const cache = new Map<number, string>();
const inflight = new Map<number, Promise<string | null>>();

function evictOldest() {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    const url = cache.get(oldest);
    if (url) URL.revokeObjectURL(url);
    cache.delete(oldest);
  }
}

/** Blob URL for a series cover. Returns null when the file is missing. */
export async function getCoverUrl(pid: number): Promise<string | null> {
  const hit = cache.get(pid);
  if (hit) {
    cache.delete(pid);
    cache.set(pid, hit);
    return hit;
  }
  const pending = inflight.get(pid);
  if (pending) return pending;
  const p = (async () => {
    try {
      const bytes = await readCover(pid);
      if (!bytes) return null;
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/jpeg' }));
      cache.set(pid, url);
      evictOldest();
      return url;
    } finally {
      inflight.delete(pid);
    }
  })();
  inflight.set(pid, p);
  return p;
}

/** Force-evict a single entry. */
export function invalidateCover(pid: number) {
  const url = cache.get(pid);
  if (url) URL.revokeObjectURL(url);
  cache.delete(pid);
}
