import { mount } from 'svelte'
import { invoke } from '@tauri-apps/api/core'
import './app.css'
import App from './App.svelte'
import TrayMenu from './app/TrayMenu.svelte'

// Expose the IPC entrypoint so e2e specs can drive backend setup and
// teardown directly. Commands are already invocable from any JS in this
// webview — this is a convenience, not a privilege gate.
;(window as unknown as { __aanInvoke?: typeof invoke }).__aanInvoke = invoke

// Clear legacy QA mock flag from localStorage (QA now uses sessionStorage).
try { localStorage.removeItem('aan.mock'); } catch {}

const win = new URLSearchParams(window.location.search).get('win');
const root = win === 'tray_menu' ? TrayMenu : App;
// Scopes tray-menu :global CSS to the tray webview only; without it the
// rules leak into the main window and break #app positioning.
if (win) document.documentElement.dataset.win = win;

const app = mount(root, {
  target: document.getElementById('app')!,
})

// Only the main window cares about custom fonts; the tray menu doesn't
// render novel content, so skip the scan there to keep startup snappy.
if (!win) {
  import('./shared/lib/custom-fonts.svelte').then((m) => m.refreshCustomFonts()).catch(() => {});
}

export default app
