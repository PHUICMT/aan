import { test, expect, invokeCmd } from '../fixtures/app';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Native font picker can't be driven from Playwright, so the install path
// is exercised through the Tauri command directly (same pattern as import
// tests). Cleanup deletes the font + tmp file in afterEach so re-runs see
// a pristine fonts dir.

let tmpSrc = '';
let installed: string | null = null;

test.afterEach(async ({ app }) => {
  if (installed) {
    try { await invokeCmd(app, 'remove_custom_font', { filename: installed }); } catch {}
    installed = null;
  }
  if (tmpSrc) {
    try { fs.rmSync(path.dirname(tmpSrc), { recursive: true, force: true }); } catch {}
    tmpSrc = '';
  }
});

test('install_font registers the family and read_custom_font returns bytes', async ({ app }) => {
  // The Rust side only checks the extension + copies bytes, so a fake
  // TTF stub is enough — we never parse the file at runtime.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-fonts-'));
  tmpSrc = path.join(dir, 'Bookerly-Regular.ttf');
  fs.writeFileSync(tmpSrc, Buffer.from([0x00, 0x01, 0x00, 0x00, 0x66, 0x61, 0x6b, 0x65]));

  const got = await invokeCmd<{ family: string; filename: string }>(
    app, 'install_font', { srcPath: tmpSrc },
  );
  installed = got.filename;
  expect(got.family).toBe('Bookerly');
  expect(got.filename).toBe('Bookerly-Regular.ttf');

  const listed = await invokeCmd<Array<{ family: string; filename: string }>>(app, 'list_custom_fonts');
  expect(listed.find((f) => f.filename === got.filename)).toBeTruthy();

  const bytes = await invokeCmd<number[]>(app, 'read_custom_font', { filename: got.filename });
  expect(bytes.slice(0, 4)).toEqual([0x00, 0x01, 0x00, 0x00]);
});

test('remove_custom_font drops the entry from the list', async ({ app }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-fonts-'));
  tmpSrc = path.join(dir, 'Trasher.ttf');
  fs.writeFileSync(tmpSrc, Buffer.from([0x00, 0x01, 0x00, 0x00]));
  const got = await invokeCmd<{ filename: string }>(app, 'install_font', { srcPath: tmpSrc });

  await invokeCmd(app, 'remove_custom_font', { filename: got.filename });
  const listed = await invokeCmd<Array<{ filename: string }>>(app, 'list_custom_fonts');
  expect(listed.find((f) => f.filename === got.filename)).toBeFalsy();
  installed = null;
});
