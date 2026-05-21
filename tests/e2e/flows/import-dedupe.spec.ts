import { test, expect, invokeCmd } from '../fixtures/app';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bit-identical re-imports are flagged as duplicates by the dedupe
// layer (SHA-256 of the source file/folder). The first import creates a
// row; the second returns the existing chapter with `duplicate: true`
// and no new row in `chapters`. Cleanup deletes any series created.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = path.resolve(HERE, '../../fixtures/build/import-samples/sample.pdf');

let createdPid: number | null = null;

test.afterEach(async ({ app }) => {
  if (createdPid != null) {
    try { await invokeCmd(app, 'delete_series_force', { pid: createdPid }); } catch {}
    createdPid = null;
  }
});

test('importing the same PDF twice flags the second as duplicate', async ({ app }) => {
  const first = await invokeCmd<{ pid: number; chapter_id: string; duplicate?: boolean }>(
    app, 'import_pdf', {
      args: {
        src_path: SAMPLE_PDF,
        series_name: 'Dedupe Test Series',
        kind: 'manga',
        chapter_no: 1,
        chapter_title: '',
        page_count: 0,
        cover_bytes: null,
      },
    },
  );
  expect(first.duplicate).toBeFalsy();
  createdPid = first.pid;

  const second = await invokeCmd<{ pid: number; chapter_id: string; duplicate?: boolean }>(
    app, 'import_pdf', {
      args: {
        src_path: SAMPLE_PDF,
        series_name: 'Different Series Name',
        kind: 'manga',
        chapter_no: 5,
        chapter_title: 'Different title',
        page_count: 0,
        cover_bytes: null,
      },
    },
  );

  expect(second.duplicate).toBe(true);
  expect(second.pid).toBe(first.pid);
  expect(second.chapter_id).toBe(first.chapter_id);

  // Confirm no second chapter row was inserted under either series.
  const chapters = await invokeCmd<Array<{ chapter_id: string }>>(app, 'list_chapters', { pid: first.pid });
  expect(chapters).toHaveLength(1);
});
