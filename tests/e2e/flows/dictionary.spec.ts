import { test, expect, invokeCmd } from '../fixtures/app';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Native dialog can't be driven, so the install path goes through the
// Rust command directly. Cleanup removes the installed file in
// afterEach so re-runs see a pristine dicts/ dir.

let tmpSrc = '';
let installed: string | null = null;

test.afterEach(async ({ app }) => {
  if (installed) {
    try { await invokeCmd(app, 'remove_dictionary', { filename: installed }); } catch {}
    installed = null;
  }
  if (tmpSrc) {
    try { fs.rmSync(path.dirname(tmpSrc), { recursive: true, force: true }); } catch {}
    tmpSrc = '';
  }
});

test('install_dictionary + lookup_term returns the exact match', async ({ app }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-dict-'));
  tmpSrc = path.join(dir, 'TestEN.tsv');
  fs.writeFileSync(tmpSrc, 'hello\tสวัสดี\nbook\tหนังสือ\nreader\tผู้อ่าน\n');

  const got = await invokeCmd<{ name: string; filename: string; entries: number }>(
    app, 'install_dictionary', { srcPath: tmpSrc },
  );
  installed = got.filename;
  expect(got.name).toBe('TestEN');
  expect(got.entries).toBe(3);

  const matches = await invokeCmd<Array<{ dictionary: string; term: string; definition: string }>>(
    app, 'lookup_term', { term: 'hello' },
  );
  expect(matches).toHaveLength(1);
  expect(matches[0].dictionary).toBe('TestEN');
  expect(matches[0].definition).toBe('สวัสดี');
});

test('lookup_term strips punctuation and is case-insensitive', async ({ app }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-dict-'));
  tmpSrc = path.join(dir, 'Punct.tsv');
  fs.writeFileSync(tmpSrc, 'hello\tสวัสดี\n');
  const got = await invokeCmd<{ filename: string }>(
    app, 'install_dictionary', { srcPath: tmpSrc },
  );
  installed = got.filename;

  const matches = await invokeCmd<Array<{ definition: string }>>(
    app, 'lookup_term', { term: 'Hello,' },
  );
  expect(matches).toHaveLength(1);
  expect(matches[0].definition).toBe('สวัสดี');
});

test('lookup_term returns empty array when no match', async ({ app }) => {
  // No dict installed (afterEach from a prior test will have cleared any).
  const matches = await invokeCmd<unknown[]>(app, 'lookup_term', { term: 'zzzzzz' });
  expect(matches).toEqual([]);
});
