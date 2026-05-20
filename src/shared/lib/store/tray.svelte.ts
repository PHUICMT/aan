import { app } from './state.svelte';

export function setCloseToTrayLocal(on: boolean) {
  app.closeToTray = on;
  localStorage.setItem('aan.close_to_tray', on ? '1' : '0');
}
