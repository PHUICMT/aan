// Per-series novel reader overrides. A series can stash its own
// snapshot of the novel prefs; when NovelReader mounts for that series,
// the snapshot is applied and the menu writes go to it instead of the
// global. Unmount restores the global from localStorage.

import { app } from './state.svelte';
import { loadNovelPrefs, type NovelLayout, type NovelTheme } from './novel-reader.svelte';
import {
  getSeriesReaderPrefs, setSeriesReaderPrefs, clearSeriesReaderPrefs,
} from '../api';

export type NovelPrefsSnapshot = {
  layout: NovelLayout;
  theme: NovelTheme;
  lineHeight: number;
  maxWidth: number;
  spread: boolean;
};

function snapshot(): NovelPrefsSnapshot {
  return {
    layout: app.novelLayout,
    theme: app.novelTheme,
    lineHeight: app.novelLineHeight,
    maxWidth: app.novelMaxWidth,
    spread: app.novelSpread,
  };
}

function apply(s: Partial<NovelPrefsSnapshot>) {
  if (s.layout) app.novelLayout = s.layout;
  if (s.theme) app.novelTheme = s.theme;
  if (typeof s.lineHeight === 'number') app.novelLineHeight = s.lineHeight;
  if (typeof s.maxWidth === 'number') app.novelMaxWidth = s.maxWidth;
  if (typeof s.spread === 'boolean') app.novelSpread = s.spread;
}

/** Try to load + apply a series override. Returns true if one existed. */
export async function loadSeriesOverride(pid: number): Promise<boolean> {
  let json: string | null;
  try {
    json = await getSeriesReaderPrefs(pid);
  } catch {
    return false;
  }
  if (!json) {
    app.novelOverridePid = null;
    return false;
  }
  try {
    const parsed = JSON.parse(json) as Partial<NovelPrefsSnapshot>;
    apply(parsed);
    app.novelOverridePid = pid;
    return true;
  } catch {
    return false;
  }
}

/** Restore the global defaults from localStorage and drop the active
 *  override marker. Called on reader unmount. */
export function unloadSeriesOverride(): void {
  if (app.novelOverridePid == null) return;
  const g = loadNovelPrefs();
  apply({
    layout: g.layout,
    theme: g.theme,
    lineHeight: g.lineHeight,
    maxWidth: g.maxWidth,
    spread: g.spread,
  });
  app.novelOverridePid = null;
}

/** Snapshot current visible settings into the series row. */
export async function saveOverrideForCurrentSeries(): Promise<void> {
  const pid = app.readerChapter?.pid;
  if (pid == null) return;
  const snap = snapshot();
  await setSeriesReaderPrefs(pid, JSON.stringify(snap));
  app.novelOverridePid = pid;
}

/** Drop the override for the active series and snap back to global. */
export async function clearOverrideForCurrentSeries(): Promise<void> {
  const pid = app.readerChapter?.pid;
  if (pid == null) return;
  await clearSeriesReaderPrefs(pid);
  unloadSeriesOverride();
}
