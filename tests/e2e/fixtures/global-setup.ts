import { spawn, execSync } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CDP_PORT = 9223;
const HERE = path.dirname(fileURLToPath(import.meta.url));

async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => { socket.end(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}

// CDP /json/version returns 200 with a JSON body only once the renderer
// is actually serving DevTools — far stricter than a raw TCP probe.
async function isCdpReady(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (!res.ok) return false;
    const body = await res.text();
    return body.includes('webSocketDebuggerUrl') || body.includes('Browser');
  } catch {
    return false;
  }
}

// Point the freshly-spawned exe at the synthetic fixture build so tests
// see a known catalog. Stash the prior config so teardown can restore it.
function pointAppAtFixtures(exePath: string): { configPath: string; backup: string | null } {
  const exeDir = path.dirname(exePath);
  const configPath = path.join(exeDir, 'app_config.json');
  const fixtureRoot = path.resolve(HERE, '../../fixtures/build');
  let backup: string | null = null;
  if (fs.existsSync(configPath)) {
    backup = fs.readFileSync(configPath, 'utf8');
  }
  fs.writeFileSync(
    configPath,
    JSON.stringify({ data_root: fixtureRoot }, null, 2),
    'utf8',
  );
  return { configPath, backup };
}

export default async function () {
  const exe = process.env.AAN_EXE
    ?? path.resolve(HERE, '../../../src-tauri/target/debug/aan.exe');

  if (!fs.existsSync(exe)) {
    throw new Error(
      `aan.exe not found at ${exe}. Build first: \`cd src-tauri && cargo build\``
    );
  }

  // Stale aan.exe from a previous crashed/aborted run holds the WebView2
  // user-data-dir lock and starves the new instance of remote-debugging.
  try { execSync('taskkill /F /IM aan.exe', { stdio: 'ignore' }); } catch { /* none running */ }
  await wait(300);

  const { configPath, backup } = pointAppAtFixtures(exe);
  (globalThis as { __APP_CONFIG_PATH__?: string }).__APP_CONFIG_PATH__ = configPath;
  (globalThis as { __APP_CONFIG_BACKUP__?: string | null }).__APP_CONFIG_BACKUP__ = backup;

  const child = spawn(exe, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}` },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  for (let i = 0; i < 150; i++) {
    if (await isPortOpen(CDP_PORT) && await isCdpReady(CDP_PORT)) {
      // globalThis is per-process; env survives the fork to workers.
      process.env.AAN_CDP_PORT = String(CDP_PORT);
      return;
    }
    await wait(200);
  }
  throw new Error(`Tauri app did not open CDP port ${CDP_PORT} within 30s`);
}
