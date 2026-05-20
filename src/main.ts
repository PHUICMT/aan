import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import TrayMenu from './app/TrayMenu.svelte'

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

export default app
