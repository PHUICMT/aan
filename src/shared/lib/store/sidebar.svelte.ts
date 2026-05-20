import { app } from './state.svelte';

export function toggleSidebar() {
  app.sidebarCollapsed = !app.sidebarCollapsed;
  localStorage.setItem('aan.sidebar', app.sidebarCollapsed ? 'collapsed' : 'expanded');
}
