import { exec } from 'node:child_process';
import fs from 'node:fs';

export default async function () {
  // Restore any pre-existing app_config.json so dev runs aren't pointed
  // at the synthetic fixture build after a test run.
  const configPath = (globalThis as { __APP_CONFIG_PATH__?: string }).__APP_CONFIG_PATH__;
  const backup = (globalThis as { __APP_CONFIG_BACKUP__?: string | null }).__APP_CONFIG_BACKUP__;
  if (configPath) {
    try {
      if (backup != null) fs.writeFileSync(configPath, backup, 'utf8');
      else if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    } catch { /* non-fatal */ }
  }
  await new Promise<void>((resolve) => {
    exec('taskkill /F /IM aan.exe 2>nul', () => resolve());
  });
}
