import { test, expect, invokeCmd } from '../fixtures/app';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// Stand up a temp folder, register it with the watcher, drop a sample
// PDF in, then wait for the `aan:watch-imported` event to confirm the
// importer ran. Teardown stops watching and removes the imported series.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PDF = path.resolve(HERE, '../../fixtures/build/import-samples/sample.pdf');

let tempDir = '';
let createdPid: number | null = null;

test.afterEach(async ({ app }) => {
  if (tempDir) {
    try { await invokeCmd(app, 'remove_watch_folder', { path: tempDir }); } catch {}
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    tempDir = '';
  }
  if (createdPid != null) {
    try { await invokeCmd(app, 'delete_series_force', { pid: createdPid }); } catch {}
    createdPid = null;
  }
});

test('dropping a PDF into a watched folder triggers auto-import', async ({ app }) => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-watch-'));
  await invokeCmd(app, 'add_watch_folder', { path: tempDir });

  fs.copyFileSync(SAMPLE_PDF, path.join(tempDir, 'auto-import-1.pdf'));

  // Poll the series list — the watcher debounces ~700ms before importing,
  // and the file-stability check adds another ~400ms. Cap at 20s.
  const deadline = Date.now() + 20000;
  let created: { pid: number; name: string } | undefined;
  while (Date.now() < deadline) {
    const series = await invokeCmd<Array<{ pid: number; name: string }>>(app, 'list_local_series');
    created = series.find((s) =>
      s.name.toLowerCase().includes('auto-import') || s.name.toLowerCase().includes('auto import'),
    );
    if (created) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  expect(created, 'watcher should have created a series').toBeTruthy();
  if (created) createdPid = created.pid;
});
