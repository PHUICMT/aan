import { test, expect, invokeCmd } from '../fixtures/app';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Native save/open dialogs can't be driven from Playwright, so we hit the
// Rust commands directly. Restore is *not* exercised end-to-end because
// it would wipe the fixture data root mid-suite and break every later
// spec — we only verify that create_backup writes a valid archive and
// that read_backup_metadata can roundtrip it.

let tmpDest = '';

test.afterEach(async () => {
  if (tmpDest) {
    try { fs.rmSync(path.dirname(tmpDest), { recursive: true, force: true }); } catch {}
    tmpDest = '';
  }
});

test('create_backup writes a zip containing the manifest', async ({ app }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-backup-'));
  tmpDest = path.join(dir, 'snap.aan.zip');

  const stats = await invokeCmd<{ files: number; bytes: number }>(
    app, 'create_backup', { destPath: tmpDest },
  );
  expect(stats.files).toBeGreaterThan(0);
  expect(fs.existsSync(tmpDest)).toBe(true);
  // ZIP local-file header starts with 'PK\x03\x04'.
  const head = fs.readFileSync(tmpDest).slice(0, 4);
  expect(head[0]).toBe(0x50);
  expect(head[1]).toBe(0x4b);
});

test('read_backup_metadata returns the manifest fields', async ({ app }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-backup-'));
  tmpDest = path.join(dir, 'snap.aan.zip');
  await invokeCmd(app, 'create_backup', { destPath: tmpDest });
  const meta = await invokeCmd<{
    version: number;
    app: string;
    files: number;
    bytes: number;
    created_at: string;
  }>(app, 'read_backup_metadata', { srcPath: tmpDest });
  expect(meta.version).toBe(1);
  expect(meta.app).toBe('aan');
  expect(meta.files).toBeGreaterThan(0);
  expect(meta.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('read_backup_metadata rejects a non-aan zip', async ({ app }) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aan-backup-'));
  tmpDest = path.join(dir, 'not-a-backup.zip');
  fs.writeFileSync(tmpDest, Buffer.from('not even a real zip'));
  let err: unknown = null;
  try {
    await invokeCmd(app, 'read_backup_metadata', { srcPath: tmpDest });
  } catch (e) { err = e; }
  expect(err).toBeTruthy();
});
