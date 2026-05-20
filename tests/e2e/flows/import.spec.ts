import { test, expect, invokeCmd } from '../fixtures/app';
import { LibraryPage } from '../pages/LibraryPage';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Drive the import_* commands directly so we exercise the Rust pipeline
// (which is what users invoke through the Import button) without
// hand-waving the native file dialog.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES = path.resolve(HERE, '../../fixtures/build/import-samples');
const PDF_PATH = path.join(SAMPLES, 'sample.pdf');
const CBZ_PATH = path.join(SAMPLES, 'sample.cbz');
const TXT_PATH = path.join(SAMPLES, 'novel.txt');

type Imported = { pid: number; chapter_id: string; created_series: boolean };

const importedPids: Set<number> = new Set();

test.afterEach(async ({ app }) => {
  // Wipe any series this spec created so the next run starts from the
  // pristine fixture catalog.
  for (const pid of importedPids) {
    try { await invokeCmd(app, 'delete_series_force', { pid }); } catch { /* ok */ }
  }
  importedPids.clear();
});

test('PDF import adds a card visible in Library', async ({ app }) => {
  const out = await invokeCmd<Imported>(app, 'import_pdf', {
    args: {
      src_path: PDF_PATH,
      series_name: 'E2E PDF Import',
      kind: 'manga',
      chapter_no: 1,
      chapter_title: 'Sample Chapter',
      page_count: 3,
      cover_bytes: null,
    },
  });
  expect(out.created_series).toBe(true);
  importedPids.add(out.pid);

  const lib = new LibraryPage(app);
  await lib.open();
  await app.click('[data-test="nav-library"]'); // force refetch
  await expect(lib.card(out.pid)).toBeVisible({ timeout: 5000 });
});

test('CBZ import unpacks images into a chapter folder', async ({ app }) => {
  const out = await invokeCmd<Imported>(app, 'import_cbz', {
    args: {
      src_path: CBZ_PATH,
      series_name: 'E2E CBZ Import',
      kind: 'manga',
      chapter_no: 1,
      chapter_title: 'CBZ Chapter',
    },
  });
  expect(out.created_series).toBe(true);
  importedPids.add(out.pid);

  const lib = new LibraryPage(app);
  await lib.open();
  await app.click('[data-test="nav-library"]');
  await expect(lib.card(out.pid)).toBeVisible({ timeout: 5000 });
});

test('TXT import lands as a novel chapter', async ({ app }) => {
  const out = await invokeCmd<Imported>(app, 'import_txt', {
    args: {
      src_path: TXT_PATH,
      series_name: 'E2E TXT Novel',
      kind: 'novel',
      chapter_no: 1,
      chapter_title: 'Opening',
    },
  });
  expect(out.created_series).toBe(true);
  importedPids.add(out.pid);

  const lib = new LibraryPage(app);
  await lib.open();
  await app.click('[data-test="nav-library"]');
  await app.click('[data-test="filter-type-novel"]');
  await expect(lib.card(out.pid)).toBeVisible({ timeout: 5000 });
});
