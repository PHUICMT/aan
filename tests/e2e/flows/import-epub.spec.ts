import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Drive import_epub directly — the native file dialog can't be observed
// from Playwright. Mirrors the import.spec.ts pattern.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EPUB_PATH = path.resolve(HERE, '../../fixtures/build/import-samples/sample.epub');

type ImportedEpub = {
  pid: number;
  created_series: boolean;
  chapters_added: number;
  duplicate?: boolean;
};

type ChapterRow = { chapter_id: string; chapter_no: number; title: string };

let createdPid: number | null = null;

test.afterEach(async ({ app }) => {
  if (createdPid != null) {
    try { await invokeCmd(app, 'delete_series_force', { pid: createdPid }); } catch { /* ok */ }
    createdPid = null;
  }
});

test('import_epub adds a novel series visible in Library', async ({ app }) => {
  const out = await invokeCmd<ImportedEpub>(app, 'import_epub', {
    args: {
      src_path: EPUB_PATH,
      series_name_override: null,
      kind: 'novel',
    },
  });
  expect(out.pid).toBeGreaterThan(0);
  expect(out.created_series).toBe(true);
  expect(out.chapters_added).toBe(2);
  createdPid = out.pid;

  const lib = new LibraryPage(app);
  await lib.open();
  // Force a refetch so the freshly-inserted row shows up.
  await app.click('[data-test="nav-library"]');
  await lib.setType('novel');
  await expect(lib.card(out.pid)).toBeVisible({ timeout: 5000 });
});

test('import_epub unpacks both chapters into the series', async ({ app }) => {
  const out = await invokeCmd<ImportedEpub>(app, 'import_epub', {
    args: {
      src_path: EPUB_PATH,
      series_name_override: null,
      kind: 'novel',
    },
  });
  createdPid = out.pid;

  const chapters = await invokeCmd<ChapterRow[]>(app, 'list_chapters', { pid: out.pid });
  expect(chapters).toHaveLength(2);
  // list_chapters returns rows ORDER BY chapter_no DESC — sort ascending for
  // an order-independent assertion against the fixture's nav.xhtml labels.
  const asc = [...chapters].sort((a, b) => a.chapter_no - b.chapter_no);
  expect(asc[0].chapter_no).toBeLessThan(asc[1].chapter_no);
  expect(asc.map((c) => c.title)).toEqual(['Chapter 1', 'Chapter 2']);
});

test('importing the same EPUB twice flags the second as duplicate', async ({ app }) => {
  const first = await invokeCmd<ImportedEpub>(app, 'import_epub', {
    args: {
      src_path: EPUB_PATH,
      series_name_override: null,
      kind: 'novel',
    },
  });
  expect(first.duplicate).toBeFalsy();
  expect(first.chapters_added).toBe(2);
  createdPid = first.pid;

  const second = await invokeCmd<ImportedEpub>(app, 'import_epub', {
    args: {
      src_path: EPUB_PATH,
      series_name_override: 'A Different Name',
      kind: 'novel',
    },
  });
  expect(second.duplicate).toBe(true);
  expect(second.pid).toBe(first.pid);
  // Dedupe short-circuit: no new chapters written under the existing pid.
  expect(second.chapters_added).toBe(0);

  const chapters = await invokeCmd<ChapterRow[]>(app, 'list_chapters', { pid: first.pid });
  expect(chapters).toHaveLength(2);
});

test('import_epub with a missing file path errors gracefully', async ({ app }) => {
  const bogus = path.resolve(HERE, '../../fixtures/build/import-samples/does-not-exist.epub');
  let threw = false;
  try {
    await invokeCmd<ImportedEpub>(app, 'import_epub', {
      args: {
        src_path: bogus,
        series_name_override: null,
        kind: 'novel',
      },
    });
  } catch {
    threw = true;
  }
  expect(threw).toBe(true);
});
